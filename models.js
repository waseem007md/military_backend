const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'db.sqlite3');

function initDb(callback) {
  const db = new sqlite3.Database(dbPath);

  // Users and Roles
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      base TEXT,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    )`);

    // Assets
    db.run(`CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      base TEXT NOT NULL,
      opening_balance INTEGER DEFAULT 0,
      closing_balance INTEGER DEFAULT 0
    )`);

    // Purchases
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      date TEXT NOT NULL,
      base TEXT NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    )`);

    // Transfers
    db.run(`CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      from_base TEXT NOT NULL,
      to_base TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    )`);

    // Assignments & Expenditures
    db.run(`CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      personnel TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      date TEXT NOT NULL,
      expended INTEGER DEFAULT 0,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    )`);

    // Logs
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, callback);
  });

  db.close();
}

function seedRoles() {
  const db = new sqlite3.Database(dbPath);
  const roles = ['Admin', 'Base Commander', 'Logistics Officer'];
  roles.forEach(role => {
    db.run('INSERT OR IGNORE INTO roles (name) VALUES (?)', [role]);
  });
  db.close();
}

function seedAdminUser() {
  const db = new sqlite3.Database(dbPath);
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (!row) {
      db.get('SELECT id FROM roles WHERE name = ?', ['Admin'], (err, roleRow) => {
        if (roleRow) {
          const hash = bcrypt.hashSync('admin123', 10);
          db.run('INSERT INTO users (username, password, role_id, base) VALUES (?, ?, ?, ?)', ['admin', hash, roleRow.id, 'HQ']);
        }
      });
    }
  });
  db.close();
}

module.exports = { initDb, dbPath, seedRoles, seedAdminUser }; 