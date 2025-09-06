// Simple NFC Gateway Service
// Listens on localhost:3002 and exposes health + mock endpoints
// If ACR122U present, uses nfc-pcsc to read card UIDs and forward to cloud

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3002;
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://bci-connect.onrender.com';

let nfcActive = false;
let readerName = null;
let lastCardUid = null;

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'nfc-gateway', port: PORT });
});

app.get('/api/nfc-checkin/status', (req, res) => {
  res.json({ status: 'running', nfcActive, readerConnected: !!readerName, readerName, cloudApiUrl: CLOUD_API_URL, lastCardUid });
});

app.post('/api/nfc-checkin/start-reader', async (req, res) => {
  try {
    // Lazy load nfc-pcsc to avoid init errors on systems without driver
    const { NFC } = require('nfc-pcsc');
    const nfc = new NFC();

    nfc.on('reader', reader => {
      readerName = reader.name;
      nfcActive = true;

      reader.aid = 'F222222222';

      reader.on('card', async card => {
        // Some readers provide uid in card.uid
        const uid = (card && card.uid) ? String(card.uid).toUpperCase() : null;
        if (uid) {
          lastCardUid = uid;
          try {
            await axios.post(`${CLOUD_API_URL}/api/nfc-checkin-mongo/submit`, {
              cardUid: uid,
              timestamp: new Date().toISOString(),
              readerName: readerName,
              source: 'nfc-gateway'
            }, { timeout: 5000 });
          } catch (e) {
            console.error('Forward to cloud failed:', e?.message || e);
          }
        }
      });

      reader.on('error', err => {
        console.error('Reader error', err?.message || err);
      });

      reader.on('end', () => {
        nfcActive = false;
        readerName = null;
      });
    });

    nfc.on('error', err => {
      console.error('NFC error', err?.message || err);
    });

    res.json({ success: true, message: 'Reader starting' });
  } catch (e) {
    console.error('Start reader failed:', e?.message || e);
    nfcActive = false;
    res.status(500).json({ success: false, message: 'Failed to start NFC reader', error: e?.message });
  }
});

app.post('/api/nfc-checkin/stop-reader', (req, res) => {
  // Simple flag; real teardown would require tracking reader instances
  nfcActive = false;
  res.json({ success: true });
});

app.post('/api/nfc-checkin/simulate-scan', async (req, res) => {
  const { cardUid } = req.body || {};
  if (!cardUid) return res.status(400).json({ success: false, message: 'cardUid required' });
  try {
    await axios.post(`${CLOUD_API_URL}/api/nfc-checkin-mongo/submit`, {
      cardUid: String(cardUid).toUpperCase(),
      timestamp: new Date().toISOString(),
      readerName: 'SIMULATED',
      source: 'nfc-gateway'
    }, { timeout: 5000 });
    res.json({ success: true });
  } catch (e) {
    res.status(502).json({ success: false, message: 'Forward failed', error: e?.message });
  }
});

app.listen(PORT, () => {
  console.log(`NFC Gateway listening on http://localhost:${PORT}`);
});