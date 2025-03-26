const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');
const linksRouter = require('./routes/links');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.use('/links', linksRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Service is running' });
});

// Serve static files from the frontend build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('frontend/build'));
}

// Start server
app.listen(PORT, () => {
  console.log(`LinkVault API running on port ${PORT}`);
});

module.exports = app; // For testing purposes