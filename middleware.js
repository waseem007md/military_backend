const jwt = require('jsonwebtoken');
const SECRET = 'supersecretkey'; // In production, use env variable
const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('./models');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

function logAction(action) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        const db = new sqlite3.Database(dbPath);
        const user_id = req.user ? req.user.id : null;
        const details = JSON.stringify({ body: req.body, params: req.params, query: req.query });
        const timestamp = new Date().toISOString();
        db.run('INSERT INTO logs (user_id, action, details, timestamp) VALUES (?, ?, ?, ?)', [user_id, action, details, timestamp]);
        db.close();
      }
    });
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles, SECRET, logAction }; 