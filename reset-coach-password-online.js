const axios = require('axios');

const API_BASE = 'https://bci-connect.onrender.com';

async function resetCoachPasswordOnline() {
  try {
    console.log('🔑 在線重置教練密碼...');
    
    // 1. 管理員登錄
    console.log('1. 管理員登錄...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 管理員登錄成功');
    
    // 2. 調用密碼重置端點
    console.log('2. 重置教練密碼...');
    const resetResponse = await axios.post(`${API_BASE}/api/auth/temp-reset-coach-password`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 密碼重置成功');
    console.log('響應:', resetResponse.data);
    
    // 3. 測試教練登錄
    console.log('\n3. 測試教練登錄...');
    const coachLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'xuanowind@gmail.com',
      password: 'coach123456'
    });
    
    console.log('✅ 教練登錄成功');
    console.log('教練信息:', {
      name: coachLoginResponse.data.user.name,
      email: coachLoginResponse.data.user.email,
      isCoach: coachLoginResponse.data.user.is_coach
    });
    
  } catch (error) {
    console.error('❌ 操作失敗:', error.response?.data?.message || error.message);
  }
}

resetCoachPasswordOnline();