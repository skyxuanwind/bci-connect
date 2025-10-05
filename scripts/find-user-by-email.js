const axios = require('axios');

const API = 'https://bci-connect.onrender.com';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('請提供Email: node scripts/find-user-by-email.js <email>');
    process.exit(1);
  }

  try {
    const login = await axios.post(`${API}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });

    const token = login.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 先用 search 參數查找
    const searchResp = await axios.get(
      `${API}/api/admin/users?limit=50&search=${encodeURIComponent(email)}`,
      { headers }
    );
    let users = searchResp.data.users || [];
    let user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());

    // 若 search 未找到，改為抓取較大的列表再精確比對
    if (!user) {
      const allResp = await axios.get(`${API}/api/admin/users?limit=500`, { headers });
      users = allResp.data.users || [];
      user = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    }

    if (user) {
      console.log(
        JSON.stringify(
          {
            found: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              status: user.status,
              membershipLevel: user.membership_level,
              chapterName: user.chapter_name,
              isCoach: user.is_coach,
              coachUserId: user.coach_user_id
            }
          },
          null,
          2
        )
      );
    } else {
      console.log(JSON.stringify({ found: false }, null, 2));
    }
  } catch (e) {
    console.error('ERROR', e.response?.data || e.message);
    process.exit(1);
  }
}

main();