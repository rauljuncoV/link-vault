const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const metadataService = require('../services/metadataService');

const router = express.Router();

// Helper function to get tags for a link
const getTagsForLink = (linkId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT tags.name FROM tags
       JOIN link_tags ON tags.id = link_tags.tag_id
       WHERE link_tags.link_id = ?`,
      [linkId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => row.name));
        }
      }
    );
  });
};

// Helper function to add tags to a link
const addTagsToLink = (linkId, tags) => {
  return new Promise((resolve, reject) => {
    if (!tags || tags.length === 0) {
      resolve();
      return;
    }

    // Process each tag
    const promises = tags.map(tag => {
      return new Promise((resolveTag, rejectTag) => {
        // First, try to find if the tag already exists
        db.get('SELECT id FROM tags WHERE name = ?', [tag], (err, row) => {
          if (err) {
            rejectTag(err);
            return;
          }

          if (row) {
            // Tag exists, create link_tag relationship
            db.run(
              'INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)',
              [linkId, row.id],
              (err) => {
                if (err) rejectTag(err);
                else resolveTag();
              }
            );
          } else {
            // Tag doesn't exist, create it first
            db.run('INSERT INTO tags (name) VALUES (?)', [tag], function(err) {
              if (err) {
                rejectTag(err);
                return;
              }
              
              // Now create link_tag relationship
              db.run(
                'INSERT INTO link_tags (link_id, tag_id) VALUES (?, ?)',
                [linkId, this.lastID],
                (err) => {
                  if (err) rejectTag(err);
                  else resolveTag();
                }
              );
            });
          }
        });
      });
    });

    Promise.all(promises)
      .then(() => resolve())
      .catch(err => reject(err));
  });
};

// Helper function to remove all tags from a link
const removeTagsFromLink = (linkId) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM link_tags WHERE link_id = ?', [linkId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// GET /links/metadata - Fetch metadata for a URL without saving
router.get('/metadata', async (req, res) => {
  const { url } = req.query;
  
  // Validate required parameter
  if (!url) {
    return res.status(400).json({ 
      success: false,
      error: 'URL parameter is required',
      metadata: null
    });
  }
  
  try {
    // Use metadata service to fetch metadata
    const result = await metadataService.fetchMetadata(url);
    
    if (result.success) {
      res.json({
        success: true,
        metadata: result.metadata,
        error: null
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        metadata: null
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching metadata',
      metadata: null
    });
  }
});

// GET /links - Retrieve all links with optional filtering
router.get('/', (req, res) => {
  const { tag, search, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  let query = 'SELECT DISTINCT links.* FROM links';
  const params = [];
  
  // Add tag filter if provided
  if (tag) {
    query += ` JOIN link_tags ON links.id = link_tags.link_id 
               JOIN tags ON link_tags.tag_id = tags.id 
               WHERE tags.name = ?`;
    params.push(tag);
  }
  
  // Add search filter if provided
  if (search) {
    if (tag) {
      query += ' AND';
    } else {
      query += ' WHERE';
    }
    query += ` (links.title LIKE ? OR links.notes LIKE ? OR links.url LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  // Add sorting
  query += ` ORDER BY links.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  
  // Add pagination
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, async (err, links) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    try {
      // Get tags for each link
      const linksWithTags = await Promise.all(
        links.map(async (link) => {
          const tags = await getTagsForLink(link.id);
          return { ...link, tags };
        })
      );
      
      res.json(linksWithTags);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// GET /links/:id - Get link by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM links WHERE id = ?', [id], async (err, link) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    try {
      const tags = await getTagsForLink(id);
      res.json({ ...link, tags });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// POST /links - Create a new link
router.post('/', async (req, res) => {
  const { url, title, tags, notes, fetchMetadata = false } = req.body;
  
  // Validate required fields
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  let linkTitle = title;
  let linkNotes = notes || '';
  let linkDescription = null;
  let faviconUrl = null;
  let autoPopulated = false;
  let suggestedTags = tags || [];
  
  // Fetch metadata if requested and title is not provided
  if (fetchMetadata) {
    try {
      const metadataResult = await metadataService.fetchMetadata(url);
      
      if (metadataResult.success && metadataResult.metadata) {
        const metadata = metadataResult.metadata;
        
        // Use extracted title if not provided
        if (!linkTitle && metadata.title) {
          linkTitle = metadata.title;
          autoPopulated = true;
        }
        
        // Use extracted description
        if (metadata.description) {
          linkDescription = metadata.description;
        }
        
        // Use extracted favicon
        if (metadata.favicon) {
          faviconUrl = metadata.favicon;
        }
        
        // Merge suggested tags with provided tags
        if (metadata.suggestedTags && metadata.suggestedTags.length > 0) {
          const combinedTags = [...new Set([...suggestedTags, ...metadata.suggestedTags])];
          suggestedTags = combinedTags;
        }
      }
    } catch (error) {
      // Log error but continue with link creation
      console.warn('Failed to fetch metadata for URL:', url, error.message);
    }
  }
  
  // Validate that we have a title (either provided or extracted)
  if (!linkTitle) {
    return res.status(400).json({ error: 'Title is required (provide title or enable fetchMetadata)' });
  }
  
  const id = uuidv4();
  const now = new Date().toISOString();
  const createdAt = req.body.createdAt || now;
  
  db.run(
    'INSERT INTO links (id, url, title, notes, description, favicon_url, auto_populated, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, url, linkTitle, linkNotes, linkDescription, faviconUrl, autoPopulated, createdAt, now],
    async (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      try {
        // Add tags if provided
        if (suggestedTags && suggestedTags.length > 0) {
          await addTagsToLink(id, suggestedTags);
        }
        
        res.status(201).json({
          id,
          url,
          title: linkTitle,
          notes: linkNotes,
          description: linkDescription,
          favicon_url: faviconUrl,
          auto_populated: autoPopulated,
          tags: suggestedTags || [],
          createdAt,
          updatedAt: now
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
});

// PATCH /links/:id - Update a link
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { title, notes, description, tags } = req.body;
  const now = new Date().toISOString();
  
  // Check if link exists
  db.get('SELECT * FROM links WHERE id = ?', [id], async (err, link) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    try {
      // Update link details if provided
      if (title || notes !== undefined || description !== undefined) {
        const updates = [];
        const params = [];
        
        if (title) {
          updates.push('title = ?');
          params.push(title);
        }
        
        if (notes !== undefined) {
          updates.push('notes = ?');
          params.push(notes);
        }
        
        if (description !== undefined) {
          updates.push('description = ?');
          params.push(description);
        }
        
        updates.push('updatedAt = ?');
        params.push(now);
        params.push(id);
        
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE links SET ${updates.join(', ')} WHERE id = ?`,
            params,
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      
      // Update tags if provided
      if (tags) {
        await removeTagsFromLink(id);
        await addTagsToLink(id, tags);
      }
      
      // Get updated link with tags
      db.get('SELECT * FROM links WHERE id = ?', [id], async (err, updatedLink) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        const updatedTags = await getTagsForLink(id);
        res.json({ ...updatedLink, tags: updatedTags });
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

// DELETE /links/:id - Delete a link
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM links WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.status(204).send();
  });
});

module.exports = router;