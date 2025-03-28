# LinkVault

A lightweight, platform-agnostic API service and minimalist UI to save, retrieve, and manage URLs with tags. Ideal for personal research workflows.

## Features

- Save URLs with title, tags, and notes
- Search and filter saved links
- Tag management
- Responsive UI
- Keyboard shortcuts
- Fast and lightweight

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, TailwindCSS
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

### Save a URL
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

## License

MIT