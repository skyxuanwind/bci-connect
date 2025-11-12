const crypto = require('crypto');

// AES-256-GCM encryption for sensitive JSON payloads
// Stores as base64 string: iv:tag:ciphertext
const getKey = () => {
  const raw = process.env.REFERRAL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-secret';
  // Derive 32-byte key via SHA256
  return crypto.createHash('sha256').update(String(raw)).digest();
};

const encryptJSON = (obj) => {
  if (!obj) return null;
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM recommended IV length
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(obj);
  const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
};

const decryptJSON = (payloadBase64) => {
  if (!payloadBase64) return null;
  const buf = Buffer.from(payloadBase64, 'base64');
  const iv = buf.slice(0, 12);
  const tag = buf.slice(12, 28);
  const ciphertext = buf.slice(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  try {
    return JSON.parse(plain);
  } catch (e) {
    return null;
  }
};

module.exports = { encryptJSON, decryptJSON };