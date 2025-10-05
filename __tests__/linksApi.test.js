const request = require('supertest');
const express = require('express');
const linksRouter = require('../src/routes/links');
const metadataService = require('../src/services/metadataService');

// Mock the database
jest.mock('../src/database', () => ({
  db: {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn(),
    serialize: jest.fn(callback => callback())
  },
  initializeDatabase: jest.fn()
}));

// Mock the metadata service
jest.mock('../src/services/metadataService');

const app = express();
app.use(express.json());
app.use('/links', linksRouter);

describe('Links API with Metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /links/metadata', () => {
    test('should fetch metadata for a valid URL', async () => {
      const mockMetadata = {
        title: 'Test Page',
        description: 'Test description',
        favicon: 'https://example.com/favicon.ico',
        suggestedTags: ['test', 'example'],
        ogImage: 'https://example.com/image.jpg'
      };

      metadataService.fetchMetadata.mockResolvedValue({
        success: true,
        metadata: mockMetadata
      });

      const response = await request(app)
        .get('/links/metadata')
        .query({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.metadata).toEqual(mockMetadata);
      expect(metadataService.fetchMetadata).toHaveBeenCalledWith('https://example.com');
    });

    test('should return 400 when URL parameter is missing', async () => {
      const response = await request(app)
        .get('/links/metadata');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('URL parameter is required');
    });

    test('should return 400 when metadata fetching fails', async () => {
      metadataService.fetchMetadata.mockResolvedValue({
        success: false,
        error: 'Failed to fetch page content'
      });

      const response = await request(app)
        .get('/links/metadata')
        .query({ url: 'https://invalid-url.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch page content');
    });

    test('should handle internal server errors', async () => {
      metadataService.fetchMetadata.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/links/metadata')
        .query({ url: 'https://example.com' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Internal server error');
    });
  });

  describe('POST /links with metadata', () => {
    const { db } = require('../src/database');

    beforeEach(() => {
      // Mock successful database operations
      db.run.mockImplementation((query, params, callback) => {
        callback(null);
      });
    });

    test('should create link with auto-fetched metadata', async () => {
      const mockMetadata = {
        title: 'Auto-fetched Title',
        description: 'Auto-fetched description',
        favicon: 'https://example.com/favicon.ico',
        suggestedTags: ['auto', 'test']
      };

      metadataService.fetchMetadata.mockResolvedValue({
        success: true,
        metadata: mockMetadata
      });

      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          fetchMetadata: true
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Auto-fetched Title');
      expect(response.body.description).toBe('Auto-fetched description');
      expect(response.body.favicon_url).toBe('https://example.com/favicon.ico');
      expect(response.body.auto_populated).toBe(true);
      expect(response.body.tags).toEqual(['auto', 'test']);
    });

    test('should use provided title over auto-fetched title', async () => {
      const mockMetadata = {
        title: 'Auto-fetched Title',
        description: 'Auto-fetched description'
      };

      metadataService.fetchMetadata.mockResolvedValue({
        success: true,
        metadata: mockMetadata
      });

      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          title: 'User Provided Title',
          fetchMetadata: true
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('User Provided Title');
      expect(response.body.description).toBe('Auto-fetched description');
      expect(response.body.auto_populated).toBe(false);
    });

    test('should merge provided tags with suggested tags', async () => {
      const mockMetadata = {
        title: 'Test Page',
        suggestedTags: ['suggested1', 'suggested2']
      };

      metadataService.fetchMetadata.mockResolvedValue({
        success: true,
        metadata: mockMetadata
      });

      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          title: 'Test',
          tags: ['provided1', 'provided2'],
          fetchMetadata: true
        });

      expect(response.status).toBe(201);
      expect(response.body.tags).toEqual(['provided1', 'provided2', 'suggested1', 'suggested2']);
    });

    test('should continue with link creation when metadata fetching fails', async () => {
      metadataService.fetchMetadata.mockResolvedValue({
        success: false,
        error: 'Failed to fetch metadata'
      });

      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          title: 'Manual Title',
          fetchMetadata: true
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Manual Title');
      expect(response.body.auto_populated).toBe(false);
    });

    test('should require title when fetchMetadata is false and no title provided', async () => {
      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          fetchMetadata: false
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Title is required');
    });

    test('should require title when fetchMetadata is true but no title can be extracted', async () => {
      metadataService.fetchMetadata.mockResolvedValue({
        success: true,
        metadata: {
          description: 'No title here'
        }
      });

      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          fetchMetadata: true
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Title is required');
    });

    test('should handle metadata service errors gracefully', async () => {
      metadataService.fetchMetadata.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          title: 'Manual Title',
          fetchMetadata: true
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Manual Title');
      expect(response.body.auto_populated).toBe(false);
    });

    test('should create link without metadata when fetchMetadata is false', async () => {
      const response = await request(app)
        .post('/links')
        .send({
          url: 'https://example.com',
          title: 'Manual Title',
          notes: 'Manual notes',
          tags: ['manual', 'tags'],
          fetchMetadata: false
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Manual Title');
      expect(response.body.notes).toBe('Manual notes');
      expect(response.body.tags).toEqual(['manual', 'tags']);
      expect(response.body.auto_populated).toBe(false);
      expect(metadataService.fetchMetadata).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /links/:id with description', () => {
    const { db } = require('../src/database');

    beforeEach(() => {
      // Mock existing link
      db.get.mockImplementation((query, params, callback) => {
        callback(null, {
          id: 'test-id',
          url: 'https://example.com',
          title: 'Original Title',
          notes: 'Original notes'
        });
      });

      // Mock successful update
      db.run.mockImplementation((query, params, callback) => {
        callback(null);
      });

      // Mock updated link with description
      db.get.mockImplementationOnce((query, params, callback) => {
        callback(null, {
          id: 'test-id',
          url: 'https://example.com',
          title: 'Original Title',
          notes: 'Original notes'
        });
      }).mockImplementationOnce((query, params, callback) => {
        callback(null, {
          id: 'test-id',
          url: 'https://example.com',
          title: 'Updated Title',
          notes: 'Updated notes',
          description: 'Updated description'
        });
      });
    });

    test('should update link with description field', async () => {
      const response = await request(app)
        .patch('/links/test-id')
        .send({
          title: 'Updated Title',
          notes: 'Updated notes',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('Updated description');
    });
  });
});