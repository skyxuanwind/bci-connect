const axios = require('axios');

const API = 'https://bci-connect.onrender.com';

async function main() {
  try {
    const login = await axios.post(`${API}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });

    const token = login.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    const resp = await axios.get(`${API}/api/admin/users?limit=50`, { headers });
    const users = resp.data.users || [];

    console.log(`\n👥 用戶總數(取樣): ${users.length}`);
    console.log('📋 前 10 筆用戶：');
    users.slice(0, 10).forEach((u, i) => {
      console.log(
        `${i + 1}. ${u.name || '(無名)'} <${u.email || '無Email'}> | status=${u.status} | level=${u.membership_level}`
      );
    });

    const hasTestLike = users.some(
      (u) => (u.email || '').includes('test') || (u.name || '').includes('測試')
    );
    console.log(`\n🧪 是否包含可能的測試資料: ${hasTestLike ? '是' : '否'}`);

  } catch (e) {
    console.error('❌ 查詢失敗:', e.response?.data || e.message);
    process.exit(1);
  }
}

main();