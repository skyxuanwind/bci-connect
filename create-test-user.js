const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 創建測試用戶
const TEST_USER = {
  name: '測試教練',
  email: 'test-coach@example.com',
  password: 'TestPassword123!',
  company: '測試公司',
  industry: '科技業',
  title: '技術總監',
  contactNumber: '0912345678',
  chapterId: 1
};

const TEST_COACHEE = {
  name: '測試學員',
  email: 'test-coachee@example.com',
  password: 'TestPassword123!',
  company: '學員公司',
  industry: '服務業',
  title: '專案經理',
  contactNumber: '0987654321',
  chapterId: 1
};

async function createTestUsers() {
  try {
    console.log('🔍 創建測試用戶...');
    
    // 1. 創建教練用戶
    console.log('\n1. 創建教練用戶...');
    let coachToken = null;
    try {
      const coachResponse = await axios.post(`${API_BASE}/api/auth/register`, TEST_USER);
      console.log('✅ 教練用戶創建成功:', coachResponse.data.message);
      
      // 嘗試登入獲取令牌
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      coachToken = loginResponse.data.token;
      console.log('✅ 教練登入成功');
      console.log('👤 教練信息:', {
        id: loginResponse.data.user.id,
        name: loginResponse.data.user.name,
        email: loginResponse.data.user.email,
        isCoach: loginResponse.data.user.isCoach
      });
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('已存在')) {
        console.log('ℹ️ 教練用戶已存在，嘗試登入...');
        try {
          const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
          });
          coachToken = loginResponse.data.token;
          console.log('✅ 教練登入成功');
        } catch (loginError) {
          console.log('❌ 教練登入失敗:', loginError.response?.data?.message || loginError.message);
          return;
        }
      } else {
        console.log('❌ 教練用戶創建失敗:', error.response?.data?.message || error.message);
        return;
      }
    }
    
    // 2. 創建學員用戶
    console.log('\n2. 創建學員用戶...');
    let coacheeToken = null;
    try {
      const coacheeResponse = await axios.post(`${API_BASE}/api/auth/register`, TEST_COACHEE);
      console.log('✅ 學員用戶創建成功:', coacheeResponse.data.message);
      
      // 嘗試登入獲取令牌
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: TEST_COACHEE.email,
        password: TEST_COACHEE.password
      });
      coacheeToken = loginResponse.data.token;
      console.log('✅ 學員登入成功');
      console.log('👤 學員信息:', {
        id: loginResponse.data.user.id,
        name: loginResponse.data.user.name,
        email: loginResponse.data.user.email,
        coachUserId: loginResponse.data.user.coachUserId
      });
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('已存在')) {
        console.log('ℹ️ 學員用戶已存在，嘗試登入...');
        try {
          const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
            email: TEST_COACHEE.email,
            password: TEST_COACHEE.password
          });
          coacheeToken = loginResponse.data.token;
          console.log('✅ 學員登入成功');
        } catch (loginError) {
          console.log('❌ 學員登入失敗:', loginError.response?.data?.message || loginError.message);
        }
      } else {
        console.log('❌ 學員用戶創建失敗:', error.response?.data?.message || error.message);
      }
    }
    
    // 3. 測試教練-學員關係 API
    if (coachToken) {
      console.log('\n3. 測試教練學員關係...');
      try {
        const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
          headers: { Authorization: `Bearer ${coachToken}` }
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
          console.log('💡 這可能是因為：');
          console.log('   1. 用戶還沒有被設置為教練');
          console.log('   2. 沒有學員被指派給這個教練');
          console.log('   3. 需要管理員審核用戶');
        }
      } catch (error) {
        console.log('❌ 教練學員 API 失敗:', error.response?.data?.message || error.message);
      }
    }
    
    // 4. 測試所有用戶列表
    if (coachToken) {
      console.log('\n4. 測試用戶列表...');
      try {
        const usersResponse = await axios.get(`${API_BASE}/api/users`, {
          headers: { Authorization: `Bearer ${coachToken}` }
        });
        console.log('✅ 用戶列表 API 成功');
        console.log('👥 總用戶數:', usersResponse.data.users?.length || 0);
        
        if (usersResponse.data.users) {
          const coaches = usersResponse.data.users.filter(u => u.is_coach);
          const coachees = usersResponse.data.users.filter(u => u.coach_user_id);
          
          console.log('📊 統計信息:');
          console.log(`  - 教練數量: ${coaches.length}`);
          console.log(`  - 有指派教練的學員數量: ${coachees.length}`);
          
          if (coaches.length > 0) {
            console.log('\n👨‍🏫 教練列表:');
            coaches.forEach(coach => {
              console.log(`  - ${coach.name} (${coach.email})`);
            });
          }
          
          if (coachees.length > 0) {
            console.log('\n👥 有教練的學員列表:');
            coachees.forEach(coachee => {
              const coach = usersResponse.data.users.find(u => u.id === coachee.coach_user_id);
              console.log(`  - ${coachee.name} (${coachee.email}) -> 教練: ${coach?.name || '未知'}`);
            });
          }
        }
      } catch (error) {
        console.log('❌ 用戶列表 API 失敗:', error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n🎯 測試完成！');
    console.log('\n📝 測試用戶憑證:');
    console.log(`教練: ${TEST_USER.email} / ${TEST_USER.password}`);
    console.log(`學員: ${TEST_COACHEE.email} / ${TEST_COACHEE.password}`);
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

// 執行測試
createTestUsers();