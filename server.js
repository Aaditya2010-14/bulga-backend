// server.js — Bulga backend API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchFamPayTransactions } = require('./gmail');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple shared-secret check so random strangers on the internet can't hit your API.
// Bulga will send this back on every request via the X-Bulga-Key header.
function requireApiKey(req, res, next) {
  const key = req.header('X-Bulga-Key');
  if (!process.env.API_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: API_KEY not set' });
  }
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(requireApiKey);

// GET /transactions — returns all stored transactions
app.get('/transactions', (req, res) => {
  try {
    const txns = db.getAllTransactions();
    res.json({ transactions: txns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read transactions' });
  }
});

// POST /transactions/:id/tag — user tags a transaction { tag: "essential" | "miscellaneous" | "food" }
app.post('/transactions/:id/tag', (req, res) => {
  const { tag } = req.body;
  if (!['essential', 'miscellaneous', 'food', null].includes(tag)) {
    return res.status(400).json({ error: 'Invalid tag' });
  }
  try {
    db.setTag(req.params.id, tag);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set tag' });
  }
});

// GET /budget
app.get('/budget', (req, res) => {
  res.json({ budget: db.getBudget() });
});

// POST /budget { amount: 5000 }
app.post('/budget', (req, res) => {
  const { amount } = req.body;
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  db.setBudget(amount);
  res.json({ ok: true });
});

// POST /refresh — re-fetches Gmail and updates the transaction store.
// This is what Bulga calls every time the app is opened.
app.post('/refresh', async (req, res) => {
  try {
    const txns = await fetchFamPayTransactions();
    db.upsertTransactions(txns);
    res.json({ ok: true, count: txns.length });
  } catch (err) {
    console.error('Refresh failed:', err);
    res.status(500).json({ error: 'Failed to refresh from Gmail', detail: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Bulga backend is running' });
});

app.listen(PORT, () => {
  console.log(`Bulga backend listening on port ${PORT}`);
});
