// db.js — simple SQLite storage for Bulga's transactions and budget
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bulga.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    glyph TEXT,
    tag TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Insert new transactions, but never overwrite a tag the user has already set.
function upsertTransactions(txns) {
  const insert = db.prepare(`
    INSERT INTO transactions (id, name, category, amount, type, date, time, glyph, tag)
    VALUES (@id, @name, @category, @amount, @type, @date, @time, @glyph, @tag)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      category=excluded.category,
      amount=excluded.amount,
      type=excluded.type,
      date=excluded.date,
      time=excluded.time,
      glyph=excluded.glyph
      -- NOTE: tag is deliberately NOT updated here, so a user's manual tag never gets clobbered
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(txns);
}

function getAllTransactions() {
  return db.prepare(`SELECT * FROM transactions ORDER BY date DESC, time DESC`).all();
}

function setTag(id, tag) {
  db.prepare(`UPDATE transactions SET tag = ? WHERE id = ?`).run(tag, id);
}

function getBudget() {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'budget'`).get();
  return row ? parseFloat(row.value) : null;
}

function setBudget(amount) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('budget', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(amount));
}

module.exports = { upsertTransactions, getAllTransactions, setTag, getBudget, setBudget };
