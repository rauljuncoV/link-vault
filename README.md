# LinkVault

A lightweight, platform-agnostic API service and minimalist UI to save, retrieve, and manage URLs with tags. Now featuring automatic metadata extraction for enhanced link management.

## Features

- **URL Management**: Save, retrieve, update, and delete URLs with titles and notes
- **Automatic Metadata Extraction**: Automatically fetch page titles, descriptions, favicons, and suggested tags
- **Smart Tag Suggestions**: AI-powered tag generation based on page content and URL patterns
- **Real-time Form Enhancement**: Auto-populate form fields as you type URLs
- **Visual Indicators**: Clear indication of auto-populated vs. manually entered content
- **Favicon Display**: Visual identification of bookmarked sites
- **Tagging System**: Organize links with flexible tagging
- **Search & Filter**: Find links by title, notes, URL content, or tags
- **Responsive UI**: Clean, modern interface with TailwindCSS
- **Keyboard shortcuts**: Quick navigation and actions
- **Fast and lightweight**: Optimized for performance

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, TailwindCSS
- **Metadata Extraction**: Axios, Cheerio
- **Testing**: Jest, Supertest, React Testing Library
- **Deployment**: Docker ready

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/linkvault.git
   cd linkvault
   ```

2. Install backend dependencies:
   ```
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd frontend
   npm install
   cd ..
   ```

### Development

1. Start the backend server:
   ```
   npm run dev
   ```

2. In a separate terminal, start the frontend development server:
   ```
   cd frontend
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

### Production Build

1. Build the frontend:
   ```
   cd frontend
   npm run build
   cd ..
   ```

2. Start the production server:
   ```
   npm start
   ```

### Docker Deployment

1. Build and run with Docker Compose:
   ```
   docker-compose up -d
   ```

2. Access the application at `http://localhost:3000`

## API Endpoints

### Fetch URL Metadata (New!)
```
GET /links/metadata?url={url}
```
Fetches metadata for a URL without saving it.

Response:
```json
{
  "success": true,
  "metadata": {
    "title": "Page Title",
    "description": "Page description",
    "favicon": "https://example.com/favicon.ico",
    "suggestedTags": ["tag1", "tag2"],
    "ogImage": "https://example.com/image.jpg"
  }
}
```

### Save a URL (Enhanced!)
```
POST /links
```
Payload:
```json
{
  "url": "https://example.com/article",
  "title": "An Example Article",
  "tags": ["ai", "machine-learning"],
  "notes": "Important reference",
  "description": "Auto-extracted or manual description",
  "fetchMetadata": true,
  "createdAt": "optional"
}
```

### Retrieve All Links
```
GET /links
```
Query parameters:
- `tag`: Filter by tag
- `search`: Search in title, notes, and URL
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: Sort order (asc or desc, default: desc)

### Get Link by ID
```
GET /links/{id}
```

### Update a Link
```
PATCH /links/{id}
```

### Delete a Link
```
DELETE /links/{id}
```

### Health Check
```
GET /health
```

## Keyboard Shortcuts

- `/`: Focus on search input
- `n`: Open "Add Link" modal (when implemented)

## New Metadata Feature

LinkVault now automatically extracts metadata from URLs, including:
- Page titles and descriptions
- Site favicons for visual identification
- Smart tag suggestions based on content analysis
- Real-time form population as you type

For detailed information about the metadata feature, see [METADATA_FEATURE.md](./METADATA_FEATURE.md).

## Testing

Run the test suite:

```bash
# Backend tests
npm test

# Frontend tests
cd frontend
npm test
```

## License

MIT