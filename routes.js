const sqlite3 = require('sqlite3').verbose();
const { dbPath } = require('./models');
const { logAction } = require('./middleware');

function registerRoutes(app) {
  // Assets: CRUD
  app.get('/api/assets', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT * FROM assets', [], (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
    db.close();
  });

  app.post('/api/assets', (req, res) => {
    const { name, type, base, opening_balance } = req.body;
    const db = new sqlite3.Database(dbPath);
    db.run('INSERT INTO assets (name, type, base, opening_balance, closing_balance) VALUES (?, ?, ?, ?, ?)', [name, type, base, opening_balance, opening_balance], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      res.json({ id: this.lastID, name, type, base, opening_balance });
    });
    db.close();
  });

  app.put('/api/assets/:id', (req, res) => {
    const { name, type, base, opening_balance, closing_balance } = req.body;
    const db = new sqlite3.Database(dbPath);
    db.run('UPDATE assets SET name=?, type=?, base=?, opening_balance=?, closing_balance=? WHERE id=?', [name, type, base, opening_balance, closing_balance, req.params.id], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      res.json({ updated: this.changes });
    });
    db.close();
  });

  app.delete('/api/assets/:id', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.run('DELETE FROM assets WHERE id=?', [req.params.id], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      res.json({ deleted: this.changes });
    });
    db.close();
  });

  // Purchases
  app.get('/api/purchases', (req, res) => {
    const { date, type, base } = req.query;
    let query = 'SELECT purchases.*, assets.name as asset_name, assets.type as asset_type FROM purchases JOIN assets ON purchases.asset_id = assets.id WHERE 1=1';
    const params = [];
    if (date) { query += ' AND date = ?'; params.push(date); }
    if (type) { query += ' AND assets.type = ?'; params.push(type); }
    if (base) { query += ' AND purchases.base = ?'; params.push(base); }
    const db = new sqlite3.Database(dbPath);
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
    db.close();
  });

  app.post('/api/purchases', logAction('purchase'), (req, res) => {
    const { asset_id, quantity, date, base } = req.body;
    const db = new sqlite3.Database(dbPath);
    db.run('INSERT INTO purchases (asset_id, quantity, date, base) VALUES (?, ?, ?, ?)', [asset_id, quantity, date, base], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      // Update asset closing balance
      db.run('UPDATE assets SET closing_balance = closing_balance + ? WHERE id = ?', [quantity, asset_id]);
      res.json({ id: this.lastID, asset_id, quantity, date, base });
    });
    db.close();
  });

  // Transfers
  app.get('/api/transfers', (req, res) => {
    const { date, asset_id, base } = req.query;
    let query = 'SELECT * FROM transfers WHERE 1=1';
    const params = [];
    if (date) { query += ' AND date = ?'; params.push(date); }
    if (asset_id) { query += ' AND asset_id = ?'; params.push(asset_id); }
    if (base) { query += ' AND (from_base = ? OR to_base = ?)'; params.push(base, base); }
    const db = new sqlite3.Database(dbPath);
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
    db.close();
  });

  app.post('/api/transfers', logAction('transfer'), (req, res) => {
    const { asset_id, quantity, from_base, to_base, date } = req.body;
    const db = new sqlite3.Database(dbPath);
    db.run('INSERT INTO transfers (asset_id, quantity, from_base, to_base, date) VALUES (?, ?, ?, ?, ?)', [asset_id, quantity, from_base, to_base, date], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      // Update asset balances
      db.run('UPDATE assets SET closing_balance = closing_balance - ? WHERE id = ? AND base = ?', [quantity, asset_id, from_base]);
      db.run('UPDATE assets SET closing_balance = closing_balance + ? WHERE id = ? AND base = ?', [quantity, asset_id, to_base]);
      res.json({ id: this.lastID, asset_id, quantity, from_base, to_base, date });
    });
    db.close();
  });

  // Assignments & Expenditures
  app.get('/api/assignments', (req, res) => {
    const { date, asset_id, personnel } = req.query;
    let query = 'SELECT * FROM assignments WHERE 1=1';
    const params = [];
    if (date) { query += ' AND date = ?'; params.push(date); }
    if (asset_id) { query += ' AND asset_id = ?'; params.push(asset_id); }
    if (personnel) { query += ' AND personnel = ?'; params.push(personnel); }
    const db = new sqlite3.Database(dbPath);
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
    db.close();
  });

  app.post('/api/assignments', logAction('assignment'), (req, res) => {
    const { asset_id, personnel, quantity, date } = req.body;
    const db = new sqlite3.Database(dbPath);
    db.run('INSERT INTO assignments (asset_id, personnel, quantity, date) VALUES (?, ?, ?, ?)', [asset_id, personnel, quantity, date], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      // Update asset closing balance
      db.run('UPDATE assets SET closing_balance = closing_balance - ? WHERE id = ?', [quantity, asset_id]);
      res.json({ id: this.lastID, asset_id, personnel, quantity, date });
    });
    db.close();
  });

  app.post('/api/assignments/:id/expended', logAction('expenditure'), (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.run('UPDATE assignments SET expended = 1 WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(400).json({ message: 'DB error' });
      res.json({ updated: this.changes });
    });
    db.close();
  });

  // Logs
  app.get('/api/logs', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT logs.*, users.username FROM logs LEFT JOIN users ON logs.user_id = users.id ORDER BY timestamp DESC', [], (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
    db.close();
  });

  // Users: List all
  app.get('/api/users', (req, res) => {
    const db = new sqlite3.Database(dbPath);
    db.all('SELECT users.id, username, roles.name as role, base FROM users JOIN roles ON users.role_id = roles.id', [], (err, rows) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json(rows);
    });
    db.close();
  });

  // Users: Add new
  app.post('/api/users', (req, res) => {
    const { username, password, role, base } = req.body;
    const db = new sqlite3.Database(dbPath);
    db.get('SELECT id FROM roles WHERE name = ?', [role], (err, roleRow) => {
      if (!roleRow) return res.status(400).json({ message: 'Invalid role' });
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(password, 10);
      db.run('INSERT INTO users (username, password, role_id, base) VALUES (?, ?, ?, ?)', [username, hash, roleRow.id, base], function(err) {
        if (err) return res.status(400).json({ message: 'User exists or DB error' });
        res.json({ id: this.lastID, username, role, base });
      });
    });
    db.close();
  });
}

module.exports = { registerRoutes }; 