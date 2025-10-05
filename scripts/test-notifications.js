const axios = require('axios');

(async () => {
  try {
    const base = process.env.API_BASE || 'http://localhost:5001';
    const email = process.env.TEST_EMAIL || 'chen.yating@example.com';
    const password = process.env.TEST_PASSWORD || 'test123456';

    const login = await axios.post(`${base}/api/auth/login`, { email, password });
    const token = login.data.token;
    console.log('LOGIN_OK', Boolean(token));

    const headers = { headers: { Authorization: `Bearer ${token}` } };

    const list = await axios.get(`${base}/api/notifications`, headers);
    console.log('LIST_OK', list.data.success, 'COUNT', (list.data.data?.notifications?.length || 0));

    const prefs = await axios.get(`${base}/api/notifications/preferences`, headers);
    console.log('PREFS_OK', prefs.data.success, 'PREFS_KEYS', Object.keys(prefs.data.data?.preferences || {}));

    process.exit(0);
  } catch (e) {
    console.error('TEST_FAIL', e.response?.status, e.response?.data || e.message);
    process.exit(1);
  }
})();