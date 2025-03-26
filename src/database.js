const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a database connection
const dbPath = path.resolve(__dirname, '../data/linkvault.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
  }
});

// Initialize database with required tables
function initializeDatabase() {
  db.serialize(() => {
    // Create links table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create tags table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    // Create link_tags junction table for many-to-many relationship
    db.run(`
      CREATE TABLE IF NOT EXISTS link_tags (
        link_id TEXT,
        tag_id INTEGER,
        PRIMARY KEY (link_id, tag_id),
        FOREIGN KEY (link_id) REFERENCES links (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )
    `);

    console.log('Database initialized with required tables');
  });
}

module.exports = {
  db,
  initializeDatabase
}