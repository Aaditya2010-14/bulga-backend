// gmail.js — fetches and parses FamPay transaction emails from Gmail
const { google } = require('googleapis');

const MONTHS = {
  January:1, February:2, March:3, April:4, May:5, June:6,
  July:7, August:8, September:9, October:10, November:11, December:12
};

function getAuthedClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oAuth2Client;
}

// Auto-tagging for merchants we can identify with confidence.
// Everything else comes through untagged for the user to tag in-app.
function guessTag(name, isCredit) {
  if (isCredit) return null;
  const n = name.toLowerCase();
  if (n.includes('mc donalds') || n.includes('taco bell')) return 'food';
  if (n.includes('airtel') || n.includes('fresh mart') || n.includes('vibgyor')) return 'essential';
  if (n.includes('zudio') || n.includes('champion sports')) return 'miscellaneous';
  return null;
}

function glyphFor(name, isCredit) {
  if (isCredit) return '➕';
  const n = name.toLowerCase();
  if (n.includes('mc donalds') || n.includes('taco bell')) return '🍔';
  if (n.includes('fresh mart')) return '🛒';
  if (n.includes('zudio') || n.includes('champion sports')) return '🛍️';
  if (n.includes('airtel')) return '📱';
  return '💸';
}

function parseSnippetToTxn(subject, snippet, fallbackDate, id) {
  const isCredit = /received/i.test(subject);

  const amtMatch = subject.match(/₹([\d,]+\.?\d*)/);
  const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;

  let name = 'Unknown';
  const nameMatch = isCredit
    ? snippet.match(/received ₹[\d,.]+ from (.+?) Transaction ID/)
    : snippet.match(/paid ₹[\d,.]+ to (.+?) Transaction ID/);
  if (nameMatch) {
    name = nameMatch[1].trim();
    if (name === name.toUpperCase()) {
      name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  const tidMatch = snippet.match(/Transaction ID\s*:\s*(\S+)/);
  const tid = tidMatch ? tidMatch[1] : `unknown-${id}`;

  let date, time;
  const dtMatch = snippet.match(/Date\s*:\s*(\d{1,2}:\d{2} [AP]M) IST,\s*(\d{1,2}) (\w+) (\d{4})/);
  if (dtMatch) {
    const [, timeStr, day, monthName, year] = dtMatch;
    const month = MONTHS[monthName] || 1;
    date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    time = timeStr;
  } else {
    const d = new Date(fallbackDate);
    date = d.toISOString().slice(0,10);
    time = d.toLocaleTimeString('en-IN', { hour:'numeric', minute:'2-digit' });
  }

  const category = isCredit ? 'Top-up' : 'FamPay Transfer';
  const tag = guessTag(name, isCredit);
  const glyph = glyphFor(name, isCredit);

  return {
    id: `fp-${tid}`,
    name,
    category,
    amount: Math.round(amount * 100) / 100,
    type: isCredit ? 'credit' : 'debit',
    date,
    time,
    glyph,
    tag,
  };
}

// Fetches ALL FamPay transaction emails from Gmail and returns parsed transactions.
async function fetchFamPayTransactions() {
  const auth = getAuthedClient();
  const gmail = google.gmail({ version: 'v1', auth });

  let messages = [];
  let pageToken = undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:no-reply@famapp.in',
      maxResults: 100,
      pageToken,
    });
    messages = messages.concat(res.data.messages || []);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const txns = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'Date'],
    });

    const headers = full.data.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const dateHeader = headers.find(h => h.name === 'Date')?.value || '';
    const snippet = full.data.snippet || '';

    if (!subject) continue;
    const txn = parseSnippetToTxn(subject, snippet, dateHeader, msg.id);
    txns.push(txn);
  }

  // newest first
  txns.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return txns;
}

module.exports = { fetchFamPayTransactions };
