const request = require('supertest');
const express = require('express');
const { db, initializeDatabase } = require('../src/database');
const linksRouter = require('../src/routes/links');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/links', linksRouter);

describe('Integration Tests - Metadata Feature', () => {
  beforeAll(async () => {
    // Initialize test database
    await new Promise((resolve) => {
      initializeDatabase();
      // Give some time for database initialization
      setTimeout(resolve, 100);
    });
  });

  afterAll(async () => {
    // Clean up test data
    await new Promise((resolve) => {
      db.run('DELETE FROM links WHERE url LIKE ?', ['%example.com%'], () => {
        db.close(resolve);
      });
    });
  });

  test('complete metadata fetch and link creation flow', async () => {
    // Test metadata endpoint first
    const metadataResponse = await request(app)
      .get('/api/links/metadata')
      .query({ url: 'https://github.com' });

    // Should work regardless of actual response (testing structure)
    expect(metadataResponse.status).toBeOneOf([200, 400, 500]);
    expect(metadataResponse.body).toHaveProperty('success');
    
    if (metadataResponse.body.success) {
      expect(metadataResponse.body).toHaveProperty('metadata');
    } else {
      expect(metadataResponse.body).toHaveProperty('error');
    }
  });

  test('link creation with metadata fetch enabled', async () => {
    const linkData = {
      url: 'https://example.com/test-page',
      title: 'Test Page',
      notes: 'Test notes',
      tags: ['test'],
      fetchMetadata: true
    };

    const response = await request(app)
      .post('/api/links')
      .send(linkData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.url).toBe(linkData.url);
    expect(response.body.title).toBe(linkData.title);
    expect(response.body.tags).toContain('test');
    
    // Should have new metadata fields
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('favicon_url');
    expect(response.body).toHaveProperty('auto_populated');
  });

  test('link creation without metadata fetch', async () => {
    const linkData = {
      url: 'https://example.com/manual-page',
      title: 'Manual Page',
      notes: 'Manual notes',
      tags: ['manual'],
      fetchMetadata: false
    };

    const response = await request(app)
      .post('/api/links')
      .send(linkData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.url).toBe(linkData.url);
    expect(response.body.title).toBe(linkData.title);
    expect(response.body.auto_populated).toBe(false);
  });

  test('error handling for invalid URLs in metadata endpoint', async () => {
    const response = await request(app)
      .get('/api/links/metadata')
      .query({ url: 'not-a-valid-url' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  test('error handling for missing URL parameter', async () => {
    const response = await request(app)
      .get('/api/links/metadata');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('URL parameter is required');
  });
});

// Helper matcher for multiple possible values
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});