const axios = require('axios');
const API_BASE = 'https://bci-connect.onrender.com';

async function testCoacheeDirectory() {
  try {
    // 使用教練身份登錄
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'xuanowind@gmail.com',
      password: 'coach123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 教練登錄成功');
    
    // 測試學員目錄 API
    const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 學員目錄 API 成功');
    console.log('👥 學員數量:', coacheesResponse.data.coachees?.length || 0);
    
    if (coacheesResponse.data.coachees && coacheesResponse.data.coachees.length > 0) {
      console.log('\n📋 學員列表（含教練資訊）:');
      coacheesResponse.data.coachees.forEach((coachee, index) => {
        console.log(`  ${index + 1}. ${coachee.name} (${coachee.company || '無公司'})`);
        if (coachee.coach && coachee.coach.name) {
          console.log(`     教練: ${coachee.coach.name} (${coachee.coach.email})`);
        } else {
          console.log('     教練: 未指派');
        }
      });
    } else {
      console.log('⚠️ 沒有找到學員');
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.response?.data?.message || error.message);
  }
}

testCoacheeDirectory();