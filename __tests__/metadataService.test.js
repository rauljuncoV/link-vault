const metadataService = require('../src/services/metadataService');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockAxios = axios;

describe('MetadataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUrl', () => {
    test('should validate correct HTTP URL', () => {
      const result = metadataService.validateUrl('http://example.com');
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('http://example.com/');
    });

    test('should validate correct HTTPS URL', () => {
      const result = metadataService.validateUrl('https://example.com/path');
      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://example.com/path');
    });

    test('should reject FTP URLs', () => {
      const result = metadataService.validateUrl('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Only HTTP and HTTPS URLs are supported');
    });

    test('should reject localhost URLs', () => {
      const result = metadataService.validateUrl('http://localhost:3000');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Private IP addresses are not allowed');
    });

    test('should reject private IP addresses', () => {
      const testCases = [
        'http://192.168.1.1',
        'http://10.0.0.1',
        'http://172.16.0.1',
        'http://127.0.0.1'
      ];

      testCases.forEach(url => {
        const result = metadataService.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Private IP addresses are not allowed');
      });
    });

    test('should reject malformed URLs', () => {
      const result = metadataService.validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('extractMetadata', () => {
    test('should extract title from og:title', () => {
      const html = `
        <html>
          <head>
            <meta property=\"og:title\" content=\"OpenGraph Title\" />
            <title>Regular Title</title>
          </head>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.title).toBe('OpenGraph Title');
    });

    test('should fallback to title tag when og:title is not available', () => {
      const html = `
        <html>
          <head>
            <title>Regular Title</title>
          </head>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.title).toBe('Regular Title');
    });

    test('should extract description from og:description', () => {
      const html = `
        <html>
          <head>
            <meta property=\"og:description\" content=\"OpenGraph Description\" />
            <meta name=\"description\" content=\"Meta Description\" />
          </head>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.description).toBe('OpenGraph Description');
    });

    test('should extract favicon URL', () => {
      const html = `
        <html>
          <head>
            <link rel=\"icon\" href=\"/favicon.ico\" />
          </head>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.favicon).toBe('https://example.com/favicon.ico');
    });

    test('should generate tags from meta keywords', () => {
      const html = `
        <html>
          <head>
            <meta name=\"keywords\" content=\"javascript, react, programming\" />
          </head>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.suggestedTags).toContain('javascript');
      expect(metadata.suggestedTags).toContain('react');
      expect(metadata.suggestedTags).toContain('programming');
    });

    test('should generate tags from headings', () => {
      const html = `
        <html>
          <body>
            <h1>React Tutorial</h1>
            <h2>JavaScript Basics</h2>
          </body>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.suggestedTags).toContain('react');
      expect(metadata.suggestedTags).toContain('javascript');
    });

    test('should generate tags from URL patterns', () => {
      const html = '<html></html>';
      
      const metadata = metadataService.extractMetadata(html, 'https://github.com/user/react-project');
      expect(metadata.suggestedTags).toContain('react');
      expect(metadata.suggestedTags).toContain('development');
      expect(metadata.suggestedTags).toContain('code');
    });

    test('should limit suggested tags to 5', () => {
      const html = `
        <html>
          <head>
            <meta name=\"keywords\" content=\"a, b, c, d, e, f, g, h\" />
          </head>
        </html>
      `;
      
      const metadata = metadataService.extractMetadata(html, 'https://example.com');
      expect(metadata.suggestedTags.length).toBeLessThanOrEqual(5);
    });
  });

  describe('sanitizeMetadata', () => {
    test('should sanitize HTML entities in title', () => {
      const metadata = {
        title: 'Test &amp; Title &lt;script&gt;',
        description: 'Test &quot;description&quot;'
      };
      
      const sanitized = metadataService.sanitizeMetadata(metadata);
      expect(sanitized.title).toBe('Test & Title <script>');
      expect(sanitized.description).toBe('Test \"description\"');
    });

    test('should validate URLs', () => {
      const metadata = {
        favicon: 'https://example.com/favicon.ico',
        ogImage: 'invalid-url'
      };
      
      const sanitized = metadataService.sanitizeMetadata(metadata);
      expect(sanitized.favicon).toBe('https://example.com/favicon.ico');
      expect(sanitized.ogImage).toBeUndefined();
    });

    test('should filter empty tags', () => {
      const metadata = {
        suggestedTags: ['valid', '', '  ', 'another-valid']
      };
      
      const sanitized = metadataService.sanitizeMetadata(metadata);
      expect(sanitized.suggestedTags).toEqual(['valid', 'another-valid']);
    });
  });

  describe('fetchMetadata', () => {
    test('should successfully fetch and extract metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name=\"description\" content=\"Test description\" />
            <link rel=\"icon\" href=\"/favicon.ico\" />
          </head>
        </html>
      `;

      mockAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: mockHtml,
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
      });

      const result = await metadataService.fetchMetadata('https://example.com');
      
      expect(result.success).toBe(true);
      expect(result.metadata.title).toBe('Test Page');
      expect(result.metadata.description).toBe('Test description');
      expect(result.metadata.favicon).toBe('https://example.com/favicon.ico');
    });

    test('should handle network errors', async () => {
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Network error'))
      });

      const result = await metadataService.fetchMetadata('https://example.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metadata).toBeNull();
    });

    test('should handle invalid URLs', async () => {
      const result = await metadataService.fetchMetadata('not-a-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.metadata).toBeNull();
    });

    test('should handle non-HTML content', async () => {
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          data: '{ \"json\": \"data\" }',
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      });

      const result = await metadataService.fetchMetadata('https://example.com/api.json');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('HTML page');
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(timeoutError)
      });

      const result = await metadataService.fetchMetadata('https://slow-site.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });

    test('should handle domain not found errors', async () => {
      const dnsError = new Error('Domain not found');
      dnsError.code = 'ENOTFOUND';
      
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(dnsError)
      });

      const result = await metadataService.fetchMetadata('https://nonexistent-domain.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should handle HTTP error responses', async () => {
      const httpError = new Error('Request failed');
      httpError.response = {
        status: 404,
        statusText: 'Not Found'
      };
      
      mockAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(httpError)
      });

      const result = await metadataService.fetchMetadata('https://example.com/404');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });
  });

  describe('isValidUrl', () => {
    test('should validate HTTP URLs', () => {
      expect(metadataService.isValidUrl('http://example.com')).toBe(true);
    });

    test('should validate HTTPS URLs', () => {
      expect(metadataService.isValidUrl('https://example.com')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(metadataService.isValidUrl('not-a-url')).toBe(false);
      expect(metadataService.isValidUrl('ftp://example.com')).toBe(false);
      expect(metadataService.isValidUrl('')).toBe(false);
    });
  });
});