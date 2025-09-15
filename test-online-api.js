const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 測試用戶憑證
const TEST_CREDENTIALS = {
  email: 'xuanowind@gmail.com',
  password: 'your_password_here' // 請替換為實際密碼
};

async function testOnlineAPI() {
  try {
    console.log('🔍 測試線上 API...');
    
    // 1. 測試健康檢查
    console.log('\n1. 測試健康檢查...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`);
      console.log('✅ 健康檢查成功:', healthResponse.data);
    } catch (error) {
      console.log('❌ 健康檢查失敗:', error.message);
    }
    
    // 2. 嘗試登入獲取令牌
    console.log('\n2. 嘗試登入...');
    let token = null;
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, TEST_CREDENTIALS);
      token = loginResponse.data.token;
      console.log('✅ 登入成功');
      console.log('👤 用戶信息:', {
        name: loginResponse.data.user.name,
        email: loginResponse.data.user.email,
        isCoach: loginResponse.data.user.isCoach,
        coachUserId: loginResponse.data.user.coachUserId
      });
    } catch (error) {
      console.log('❌ 登入失敗:', error.response?.data?.message || error.message);
      console.log('💡 請確認用戶憑證是否正確');
      return;
    }
    
    // 3. 測試認證端點
    console.log('\n3. 測試認證端點...');
    try {
      const meResponse = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 認證端點成功:', {
        name: meResponse.data.user.name,
        isCoach: meResponse.data.user.isCoach,
        coachUserId: meResponse.data.user.coachUserId
      });
    } catch (error) {
      console.log('❌ 認證端點失敗:', error.response?.data?.message || error.message);
    }
    
    // 4. 測試教練學員關係 API
    console.log('\n4. 測試教練學員關係...');
    try {
      const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 教練學員 API 成功');
      console.log('👥 學員列表:', coacheesResponse.data);
      
      if (coacheesResponse.data.coachees && coacheesResponse.data.coachees.length > 0) {
        console.log('📊 學員詳情:');
        coacheesResponse.data.coachees.forEach((coachee, index) => {
          console.log(`  ${index + 1}. ${coachee.name} (${coachee.email})`);
        });
      } else {
        console.log('⚠️ 沒有找到指派的學員');
      }
    } catch (error) {
      console.log('❌ 教練學員 API 失敗:', error.response?.data?.message || error.message);
    }
    
    // 5. 測試所有用戶列表（如果有權限）
    console.log('\n5. 測試用戶列表...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ 用戶列表 API 成功');
      console.log('👥 總用戶數:', usersResponse.data.users?.length || 0);
      
      if (usersResponse.data.users) {
        const coaches = usersResponse.data.users.filter(u => u.is_coach);
        const coachees = usersResponse.data.users.filter(u => u.coach_user_id);
        
        console.log('📊 統計信息:');
        console.log(`  - 教練數量: ${coaches.length}`);
        console.log(`  - 有指派教練的學員數量: ${coachees.length}`);
        
        console.log('\n👨‍🏫 教練列表:');
        coaches.forEach(coach => {
          console.log(`  - ${coach.name} (${coach.email})`);
        });
        
        console.log('\n👥 有教練的學員列表:');
        coachees.forEach(coachee => {
          const coach = usersResponse.data.users.find(u => u.id === coachee.coach_user_id);
          console.log(`  - ${coachee.name} (${coachee.email}) -> 教練: ${coach?.name || '未知'}`);
        });
      }
    } catch (error) {
      console.log('❌ 用戶列表 API 失敗:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

// 執行測試
testOnlineAPI();