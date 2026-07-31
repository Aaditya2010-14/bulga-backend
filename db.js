// db.js — simple JSON-file storage for Bulga's transactions and budget
// Uses lowdb (pure JavaScript, no native compilation) instead of better-sqlite3
// to avoid native-binary crashes on hosts like Railway.
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const file = path.join(__dirname, 'bulga-data.json');
const adapter = new JSONFile(file);
const defaultData = { transactions: {}, settings: {} };
const db = new Low(adapter, defaultData);

// lowdb needs an async read before first use; we keep a ready promise
// and every exported function awaits it first.
const ready = db.read().then(() => {
  db.data ||= defaultData;
  db.data.transactions ||= {};
  db.data.settings ||= {};
});

// Insert/update transactions, but never overwrite a tag the user has already set.
async function upsertTransactions(txns) {
  await ready;
  for (const t of txns) {
    const existing = db.data.transactions[t.id];
    db.data.transactions[t.id] = {
      ...t,
      tag: existing ? existing.tag : t.tag, // preserve user's manual tag if already set
    };
  }
  await db.write();
}

async function getAllTransactions() {
  await ready;
  return Object.values(db.data.transactions).sort((a, b) => {
    const da = a.date + a.time, dbb = b.date + b.time;
    return da < dbb ? 1 : da > dbb ? -1 : 0;
  });
}

async function setTag(id, tag) {
  await ready;
  if (db.data.transactions[id]) {
    db.data.transactions[id].tag = tag;
    await db.write();
  }
}

async function getBudget() {
  await ready;
  return db.data.settings.budget ?? null;
}

async function setBudget(amount) {
  await ready;
  db.data.settings.budget = amount;
  await db.write();
}

module.exports = { upsertTransactions, getAllTransactions, setTag, getBudget, setBudget };
