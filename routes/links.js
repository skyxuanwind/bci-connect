const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const STORE_PATH = path.join(__dirname, '..', 'uploads', 'shortlinks.json');

function ensureStore() {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ items: [], clicks: {} }, null, 2));
  } catch (e) {
    console.error('ensureStore error', e);
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return { items: [], clicks: {} };
  }
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('writeStore error', e);
  }
}

function genCode() {
  return crypto.randomBytes(4).toString('hex');
}

router.post('/shorten', (req, res) => {
  const { url, label, tags } = req.body || {};
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ success: false, message: 'Invalid url' });
  }
  const store = readStore();
  const code = genCode();
  const item = { code, url, label: label || '', tags: tags || [], createdAt: Date.now() };
  store.items.push(item);
  store.clicks[code] = 0;
  writeStore(store);
  const base = process.env.PUBLIC_BASE_URL || '';
  const shortUrl = `${base}/l/${code}`;
  return res.json({ success: true, code, shortUrl });
});

router.post('/bulk', (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ success: false, message: 'items required' });
  const store = readStore();
  const results = [];
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!it?.url || typeof it.url !== 'string' || !it.url.startsWith('http')) continue;
    const code = genCode();
    store.items.push({ code, url: it.url, label: it.label || '', tags: it.tags || [], createdAt: Date.now() });
    store.clicks[code] = 0;
    const base = process.env.PUBLIC_BASE_URL || '';
    const shortUrl = `${base}/l/${code}`;
    results.push({ idx, code, shortUrl });
  }
  writeStore(store);
  res.json({ success: true, results });
});

router.get('/stats/:code', (req, res) => {
  const code = req.params.code;
  const store = readStore();
  const item = store.items.find(i => i.code === code);
  if (!item) return res.status(404).json({ success: false, message: 'not found' });
  const clicks = store.clicks[code] || 0;
  res.json({ success: true, item, clicks });
});

// 供 server.js 直接掛載根路徑短連結轉址
async function redirectShortLink(req, res) {
  try {
    const { code } = req.params;
    const store = readStore();
    const item = store.items.find(i => i.code === code);
    if (!item) return res.status(404).send('Not found');
    store.clicks[code] = (store.clicks[code] || 0) + 1;
    writeStore(store);
    res.redirect(item.url);
  } catch (e) {
    res.status(500).send('Server error');
  }
}

module.exports = { router, redirectShortLink };