const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class MetadataService {
  constructor() {
    // Configure axios with reasonable defaults
    this.httpClient = axios.create({
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
      headers: {
        'User-Agent': 'LinkVault/1.0 (Metadata Fetcher)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Common technology keywords for tag generation
    this.techKeywords = [
      'javascript', 'react', 'vue', 'angular', 'node', 'python', 'java', 'php',
      'css', 'html', 'typescript', 'golang', 'rust', 'docker', 'kubernetes',
      'aws', 'azure', 'mongodb', 'postgresql', 'mysql', 'redis', 'api',
      'frontend', 'backend', 'fullstack', 'devops', 'tutorial', 'guide',
      'documentation', 'framework', 'library', 'tool', 'development'
    ];

    // Domain to category mapping
    this.domainCategories = {
      'github.com': ['development', 'code', 'programming'],
      'stackoverflow.com': ['programming', 'help', 'qa'],
      'medium.com': ['article', 'blog', 'tutorial'],
      'dev.to': ['development', 'programming', 'community'],
      'hackernews.ycombinator.com': ['news', 'technology', 'startup'],
      'reddit.com': ['community', 'discussion'],
      'youtube.com': ['video', 'tutorial'],
      'docs.microsoft.com': ['documentation', 'microsoft'],
      'developer.mozilla.org': ['documentation', 'web', 'javascript'],
      'w3schools.com': ['tutorial', 'web', 'learning']
    };
  }

  /**
   * Validate URL format and check for security issues
   */
  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      // Check for private IP ranges (SSRF protection)
      const hostname = parsedUrl.hostname;
      
      // Block localhost and private IPs
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        throw new Error('Private IP addresses are not allowed');
      }

      return {
        isValid: true,
        normalizedUrl: parsedUrl.toString()
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Fetch HTML content from URL
   */
  async fetchHtmlContent(url) {
    try {
      const response = await this.httpClient.get(url, {
        maxContentLength: 1024 * 1024, // 1MB limit
        responseType: 'text'
      });

      return {
        success: true,
        html: response.data,
        statusCode: response.status,
        contentType: response.headers['content-type'] || ''
      };
    } catch (error) {
      let errorMessage = 'Failed to fetch page content';
      
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Domain not found';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timed out';
      } else if (error.response) {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Extract metadata from HTML content
   */
  extractMetadata(html, url) {
    const $ = cheerio.load(html);
    const metadata = {};

    // Extract title with priority order
    metadata.title = this.extractTitle($);
    
    // Extract description
    metadata.description = this.extractDescription($);
    
    // Extract favicon
    metadata.favicon = this.extractFavicon($, url);
    
    // Extract Open Graph image
    metadata.ogImage = this.extractOgImage($, url);
    
    // Generate suggested tags
    metadata.suggestedTags = this.generateTags($, url);

    return metadata;
  }

  /**
   * Extract page title using priority order
   */
  extractTitle($) {
    // Priority order: og:title, twitter:title, title tag
    let title = $('meta[property="og:title"]').attr('content') ||
                $('meta[name="twitter:title"]').attr('content') ||
                $('title').text();

    if (!title) {
      return null;
    }

    // Clean and truncate title
    title = title.trim().replace(/\s+/g, ' ');
    return title.length > 200 ? title.substring(0, 200) + '...' : title;
  }

  /**
   * Extract page description using priority order
   */
  extractDescription($) {
    // Priority order: og:description, twitter:description, meta description
    let description = $('meta[property="og:description"]').attr('content') ||
                     $('meta[name="twitter:description"]').attr('content') ||
                     $('meta[name="description"]').attr('content');

    if (!description) {
      // Fallback: extract first paragraph text
      const firstParagraph = $('p').first().text();
      if (firstParagraph) {
        description = firstParagraph.trim();
      }
    }

    if (!description) {
      return null;
    }

    // Clean and truncate description
    description = description.trim().replace(/\s+/g, ' ');
    return description.length > 500 ? description.substring(0, 500) + '...' : description;
  }

  /**
   * Extract favicon URL
   */
  extractFavicon($, baseUrl) {
    // Priority order: rel="icon", rel="shortcut icon", default favicon.ico
    let faviconPath = $('link[rel="icon"]').attr('href') ||
                     $('link[rel="shortcut icon"]').attr('href') ||
                     '/favicon.ico';

    if (!faviconPath) {
      return null;
    }

    try {
      // Convert relative URL to absolute
      const faviconUrl = new URL(faviconPath, baseUrl);
      return faviconUrl.toString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract Open Graph image
   */
  extractOgImage($, baseUrl) {
    let imagePath = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content');

    if (!imagePath) {
      // Fallback: find first substantial image
      const firstImg = $('img').first().attr('src');
      if (firstImg) {
        imagePath = firstImg;
      }
    }

    if (!imagePath) {
      return null;
    }

    try {
      // Convert relative URL to absolute
      const imageUrl = new URL(imagePath, baseUrl);
      return imageUrl.toString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate suggested tags using multiple strategies
   */
  generateTags($, url) {
    const tags = new Set();

    // Strategy 1: Extract from meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      metaKeywords.split(',').forEach(keyword => {
        const cleaned = keyword.trim().toLowerCase();
        if (cleaned.length > 1 && cleaned.length < 20) {
          tags.add(cleaned);
        }
      });
    }

    // Strategy 2: Extract from OG article tags
    $('meta[property="article:tag"]').each((i, el) => {
      const tag = $(el).attr('content');
      if (tag) {
        const cleaned = tag.trim().toLowerCase();
        if (cleaned.length > 1 && cleaned.length < 20) {
          tags.add(cleaned);
        }
      }
    });

    // Strategy 3: Analyze headings for keywords
    $('h1, h2, h3').each((i, el) => {
      const headingText = $(el).text().toLowerCase();
      this.techKeywords.forEach(keyword => {
        if (headingText.includes(keyword)) {
          tags.add(keyword);
        }
      });
    });

    // Strategy 4: Domain categorization
    try {
      const domain = new URL(url).hostname;
      if (this.domainCategories[domain]) {
        this.domainCategories[domain].forEach(category => {
          tags.add(category);
        });
      }
    } catch (error) {
      // Ignore URL parsing errors
    }

    // Strategy 5: URL pattern analysis
    this.techKeywords.forEach(keyword => {
      if (url.toLowerCase().includes(keyword)) {
        tags.add(keyword);
      }
    });

    // Convert to array and limit to top 5 tags
    return Array.from(tags).slice(0, 5);
  }

  /**
   * Sanitize extracted metadata
   */
  sanitizeMetadata(metadata) {
    const sanitized = {};

    // Sanitize title
    if (metadata.title) {
      sanitized.title = this.sanitizeText(metadata.title);
    }

    // Sanitize description
    if (metadata.description) {
      sanitized.description = this.sanitizeText(metadata.description);
    }

    // Validate URLs
    if (metadata.favicon && this.isValidUrl(metadata.favicon)) {
      sanitized.favicon = metadata.favicon;
    }

    if (metadata.ogImage && this.isValidUrl(metadata.ogImage)) {
      sanitized.ogImage = metadata.ogImage;
    }

    // Sanitize tags
    if (metadata.suggestedTags && Array.isArray(metadata.suggestedTags)) {
      sanitized.suggestedTags = metadata.suggestedTags
        .map(tag => this.sanitizeText(tag))
        .filter(tag => tag && tag.length > 0);
    }

    return sanitized;
  }

  /**
   * Sanitize text content
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .trim();
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return ['http:', 'https:'].includes(url.protocol);
    } catch (error) {
      return false;
    }
  }

  /**
   * Main method to fetch metadata for a URL
   */
  async fetchMetadata(url) {
    try {
      // Validate URL
      const validation = this.validateUrl(url);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          metadata: null
        };
      }

      // Fetch HTML content
      const contentResult = await this.fetchHtmlContent(validation.normalizedUrl);
      if (!contentResult.success) {
        return {
          success: false,
          error: contentResult.error,
          metadata: null
        };
      }

      // Check if content is HTML
      if (!contentResult.contentType.includes('text/html')) {
        return {
          success: false,
          error: 'URL does not point to an HTML page',
          metadata: null
        };
      }

      // Extract metadata
      const rawMetadata = this.extractMetadata(contentResult.html, validation.normalizedUrl);
      
      // Sanitize metadata
      const sanitizedMetadata = this.sanitizeMetadata(rawMetadata);

      return {
        success: true,
        metadata: sanitizedMetadata,
        extractionData: {
          statusCode: contentResult.statusCode,
          contentType: contentResult.contentType,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'An unexpected error occurred during metadata extraction',
        metadata: null
      };
    }
  }
}

module.exports = new MetadataService();