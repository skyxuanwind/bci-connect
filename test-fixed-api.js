const axios = require('axios');
const jwt = require('jsonwebtoken');

// 測試修復後的API
async function testFixedAPI() {
  try {
    console.log('🔍 測試修復後的my-coachees API...');
    
    const API_BASE = 'http://localhost:8000'; // 測試本地修復
    
    // 1. 登錄獲取token
    console.log('\n1. 教練登錄...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'xuanowind@gmail.com',
      password: 'coach123456'
    });
    
    console.log('✅ 登錄成功');
    console.log(`👤 用戶ID: ${loginResponse.data.user.id}`);
    
    const token = loginResponse.data.token;
    const decoded = jwt.decode(token);
    console.log(`🔍 Token中的userId: ${decoded.userId}`);
    
    // 2. 調用my-coachees API
    console.log('\n2. 調用my-coachees API...');
    const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ My-coachees API 成功');
    console.log(`📊 學員總數: ${coacheesResponse.data.coachees.length}`);
    
    // 3. 檢查每個學員的coachUserId
    console.log('\n3. 檢查學員的coachUserId字段...');
    coacheesResponse.data.coachees.forEach((coachee, index) => {
      console.log(`\n學員 ${index + 1}:`);
      console.log(`  姓名: ${coachee.name}`);
      console.log(`  coachUserId: ${coachee.coachUserId}`);
      console.log(`  coach.id: ${coachee.coach?.id}`);
      console.log(`  是否匹配登錄用戶: ${coachee.coachUserId === loginResponse.data.user.id ? '✅' : '❌'}`);
    });
    
    // 4. 驗證過濾邏輯
    console.log('\n4. 驗證過濾邏輯...');
    const shouldShowCoachees = coacheesResponse.data.coachees.filter(c => 
      c.coachUserId === loginResponse.data.user.id
    );
    
    console.log(`\n🎯 結果分析:`);
    console.log(`   - 教練ID: ${loginResponse.data.user.id}`);
    console.log(`   - API返回的學員數: ${coacheesResponse.data.coachees.length}`);
    console.log(`   - 應該顯示的學員數: ${shouldShowCoachees.length}`);
    
    if (shouldShowCoachees.length === coacheesResponse.data.coachees.length) {
      console.log('✅ 過濾邏輯正確，所有返回的學員都屬於當前教練');
    } else {
      console.log('❌ 過濾邏輯有問題，返回了不屬於當前教練的學員');
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ 無法連接到本地服務器，請確保服務器正在運行');
      console.log('💡 請運行: npm start 或 node server.js');
    } else {
      console.error('❌ 測試失敗:', error.response?.data || error.message);
    }
  }
}

testFixedAPI();