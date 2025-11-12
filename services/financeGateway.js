const axios = require('axios');

const FINANCE_API_URL = process.env.FINANCE_API_URL || '';
const FINANCE_API_TOKEN = process.env.FINANCE_API_TOKEN || '';

async function verifyTransaction({ transactionId, amount, currency }) {
  if (!transactionId || !amount || Number(amount) <= 0) {
    return { verified: false, reason: '缺少交易資訊或金額不正確' };
  }
  // External API integration if available
  if (FINANCE_API_URL) {
    try {
      const res = await axios.get(`${FINANCE_API_URL}/transactions/${encodeURIComponent(transactionId)}`, {
        headers: FINANCE_API_TOKEN ? { Authorization: `Bearer ${FINANCE_API_TOKEN}` } : undefined,
        timeout: 8000
      });
      const tx = res.data || {};
      const verified = String(tx.currency || '').toUpperCase() === String(currency || 'TWD').toUpperCase()
        && Number(tx.amount) === Number(amount)
        && ['paid','captured','settled'].includes(String(tx.status || '').toLowerCase());
      return {
        verified,
        source: 'external',
        payload: tx
      };
    } catch (err) {
      return { verified: false, reason: '外部金流查詢失敗', error: String(err && err.message || err) };
    }
  }
  // Fallback stub verification
  return {
    verified: true,
    source: 'stub',
    payload: { transactionId, amount: Number(amount), currency: String(currency || 'TWD').toUpperCase(), status: 'paid' }
  };
}

module.exports = { verifyTransaction };