// db.js — simple JSON-file storage for Bulga's transactions and budget
// Uses plain Node fs (no database library at all) to avoid any
// native-binary or ESM/CommonJS packaging issues on hosts like Railway.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'bulga-data.json');

function load() {
  if (!fs.existsSync(FILE)) {
    return { transactions: {}, settings: {} };
  }
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const data = JSON.parse(raw);
    data.transactions ||= {};
    data.settings ||= {};
    return data;
  } catch (err) {
    console.error('Failed to read/parse bulga-data.json, starting fresh:', err.message);
    return { transactions: {}, settings: {} };
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Insert/update transactions, but never overwrite a tag the user has already set.
function upsertTransactions(txns) {
  const data = load();
  for (const t of txns) {
    const existing = data.transactions[t.id];
    data.transactions[t.id] = {
      ...t,
      tag: existing ? existing.tag : t.tag, // preserve user's manual tag if already set
    };
  }
  save(data);
}

function getAllTransactions() {
  const data = load();
  return Object.values(data.transactions).sort((a, b) => {
    const da = a.date + a.time, dbb = b.date + b.time;
    return da < dbb ? 1 : da > dbb ? -1 : 0;
  });
}

function setTag(id, tag) {
  const data = load();
  if (data.transactions[id]) {
    data.transactions[id].tag = tag;
    save(data);
  }
}

function getBudget() {
  const data = load();
  return data.settings.budget ?? null;
}

function setBudget(amount) {
  const data = load();
  data.settings.budget = amount;
  save(data);
}

module.exports = { upsertTransactions, getAllTransactions, setTag, getBudget, setBudget };
