const axios = require('axios');
const jwt = require('jsonwebtoken');

// 測試實際的API端點
async function testActualAPI() {
  try {
    console.log('🔍 測試實際的API端點...');
    
    const API_BASE = 'https://bci-connect.onrender.com';
    
    // 1. 測試登錄API
    console.log('\n1. 調用登錄API...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'xuanowind@gmail.com',
      password: 'coach123456'
    });
    
    console.log('✅ 登錄成功');
    console.log('📝 登錄響應:', {
      message: loginResponse.data.message,
      user: {
        id: loginResponse.data.user.id,
        name: loginResponse.data.user.name,
        email: loginResponse.data.user.email,
        isCoach: loginResponse.data.user.isCoach
      }
    });
    
    const token = loginResponse.data.token;
    
    // 2. 解碼token
    console.log('\n2. 解碼JWT token...');
    const decoded = jwt.decode(token);
    console.log('🔍 Token payload:', decoded);
    
    // 3. 測試profile API
    console.log('\n3. 調用profile API...');
    try {
      const profileResponse = await axios.get(`${API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Profile API 成功');
      console.log('📝 Profile響應:', {
        id: profileResponse.data.profile.id,
        name: profileResponse.data.profile.name,
        email: profileResponse.data.profile.email
      });
    } catch (error) {
      console.log('❌ Profile API 失敗:', error.response?.data || error.message);
    }
    
    // 4. 測試my-coachees API
    console.log('\n4. 調用my-coachees API...');
    try {
      const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ My-coachees API 成功');
      console.log('📝 學員數量:', coacheesResponse.data.coachees.length);
      console.log('📝 前3個學員的coachUserId:', 
        coacheesResponse.data.coachees.slice(0, 3).map(c => ({
          name: c.name,
          coachUserId: c.coachUserId,
          coach: c.coach
        }))
      );
    } catch (error) {
      console.log('❌ My-coachees API 失敗:', error.response?.data || error.message);
    }
    
    console.log('\n🔍 總結:');
    console.log(`   - 登錄API返回的用戶ID: ${loginResponse.data.user.id}`);
    console.log(`   - JWT token中的userId: ${decoded.userId}`);
    
  } catch (error) {
    console.error('❌ 測試API失敗:', error.response?.data || error.message);
  }
}

testActualAPI();