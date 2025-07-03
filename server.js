const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initDb, seedRoles, seedAdminUser } = require('./models');
const { registerRoutes } = require('./routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Database setup
initDb(() => {
  seedRoles();
  seedAdminUser();
});
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite3'), (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Add routes for auth, assets, purchases, transfers, assignments, RBAC, and logging

registerRoutes(app);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 