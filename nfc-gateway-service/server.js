// Simple NFC Gateway Service
// Listens on localhost:3002 and exposes health + mock endpoints
// If ACR122U present, uses nfc-pcsc to read card UIDs and NDEF URLs and forward to cloud

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const ndef = require('ndef');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3002;
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://bci-connect.onrender.com';

let nfcActive = false;
let readerName = null;
let lastCardUid = null;
let lastScanTime = null;

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'nfc-gateway', port: PORT });
});

app.get('/api/nfc-checkin/status', (req, res) => {
  res.json({ 
    status: 'running', 
    nfcActive, 
    readerConnected: !!readerName, 
    readerName, 
    cloudApiUrl: CLOUD_API_URL, 
    lastCardUid,
    lastScanTime 
  });
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
        console.log('Card detected:', card);
        
        // Try to read NDEF records first (for URL)
        let cardUrl = null;
        let uid = null;
        
        try {
          // Read NDEF data if available
          if (card && card.data) {
            const ndefRecords = ndef.decodeMessage(card.data);
            console.log('NDEF records found:', ndefRecords.length);
            
            // Look for URI record
            for (const record of ndefRecords) {
              if (record.type && record.type.toString() === 'U') {
                cardUrl = ndef.uri.decodePayload(record.payload);
                console.log('Found URL in NDEF:', cardUrl);
                break;
              }
            }
          }
        } catch (ndefError) {
          console.log('NDEF reading failed or no NDEF data:', ndefError.message);
        }
        
        // Fallback to UID if no URL found
        if (!cardUrl && card && card.uid) {
          uid = String(card.uid).toUpperCase();
          console.log('Using UID as fallback:', uid);
        }
        
        // Send data to cloud (prefer URL over UID)
        const identifier = cardUrl || uid;
        if (identifier) {
          lastCardUid = identifier; // Store the identifier (URL or UID)
          lastScanTime = new Date().toISOString(); // Record scan time
          console.log('Card detected at:', lastScanTime);
          try {
            const payload = {
              timestamp: new Date().toISOString(),
              readerName: readerName,
              source: 'nfc-gateway'
            };
            
            // Add URL or UID to payload
            if (cardUrl) {
              payload.cardUrl = cardUrl;
              console.log('Sending card URL:', cardUrl);
            } else {
              payload.cardUid = uid;
              console.log('Sending card UID:', uid);
            }
            
            await axios.post(`${CLOUD_API_URL}/api/nfc-checkin-mongo/submit`, payload, { timeout: 30000 });
            console.log('Successfully forwarded to cloud');
          } catch (e) {
            console.error('Forward to cloud failed:', e?.message || e);
          }
        } else {
          console.log('No valid identifier found (neither URL nor UID)');
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
  const { cardUid, cardUrl } = req.body || {};
  if (!cardUid && !cardUrl) {
    return res.status(400).json({ success: false, message: 'cardUid or cardUrl required' });
  }
  
  try {
    const identifier = cardUrl || String(cardUid).toUpperCase();
    
    // Update local state for simulation
    lastCardUid = identifier;
    lastScanTime = new Date().toISOString();
    
    const payload = {
      timestamp: lastScanTime,
      readerName: 'SIMULATED',
      source: 'nfc-gateway'
    };
    
    // Prefer URL over UID
    if (cardUrl) {
      payload.cardUrl = cardUrl.trim();
      console.log('Simulating card URL:', cardUrl, 'at', lastScanTime);
    } else {
      payload.cardUid = String(cardUid).toUpperCase();
      console.log('Simulating card UID:', cardUid, 'at', lastScanTime);
    }
    
    await axios.post(`${CLOUD_API_URL}/api/nfc-checkin-mongo/submit`, payload, { timeout: 30000 });
    res.json({ success: true, identifier: identifier, scanTime: lastScanTime });
  } catch (e) {
    res.status(502).json({ success: false, message: 'Forward failed', error: e?.message });
  }
});

app.listen(PORT, () => {
  console.log(`NFC Gateway listening on http://localhost:${PORT}`);
});