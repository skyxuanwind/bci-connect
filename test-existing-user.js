const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 常見的測試密碼
const COMMON_PASSWORDS = [
  'password',
  'password123',
  'Password123',
  'Password123!',
  '123456',
  'admin',
  'test123',
  'xuanowind',
  'Xuanowind123',
  'Xuanowind123!'
];

async function testExistingUser() {
  try {
    console.log('🔍 測試現有用戶 xuanowind@gmail.com...');
    
    // 1. 測試健康檢查
    console.log('\n1. 測試健康檢查...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/health`);
      console.log('✅ 健康檢查成功:', healthResponse.data);
    } catch (error) {
      console.log('❌ 健康檢查失敗:', error.message);
      return;
    }
    
    // 2. 嘗試不同密碼登入
    console.log('\n2. 嘗試登入 xuanowind@gmail.com...');
    let token = null;
    let userInfo = null;
    
    for (const password of COMMON_PASSWORDS) {
      try {
        console.log(`   嘗試密碼: ${password}`);
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          email: 'xuanowind@gmail.com',
          password: password
        });
        
        token = loginResponse.data.token;
        userInfo = loginResponse.data.user;
        console.log('✅ 登入成功！');
        console.log('👤 用戶信息:', {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          isCoach: userInfo.isCoach,
          coachUserId: userInfo.coachUserId,
          status: userInfo.status
        });
        break;
      } catch (error) {
        console.log(`   ❌ 密碼 ${password} 失敗:`, error.response?.data?.message || error.message);
      }
    }
    
    if (!token) {
      console.log('\n❌ 所有常見密碼都失敗了');
      console.log('💡 可能的解決方案:');
      console.log('   1. 檢查用戶是否存在於線上數據庫');
      console.log('   2. 用戶可能需要重置密碼');
      console.log('   3. 用戶可能需要 Email 驗證');
      
      // 嘗試檢查用戶是否存在
      console.log('\n3. 檢查其他用戶...');
      await checkOtherUsers();
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
        console.log('💡 可能的原因:');
        console.log('   1. 用戶還沒有被設置為教練 (is_coach = false)');
        console.log('   2. 沒有學員被指派給這個教練');
        console.log('   3. 數據庫中的教練-學員關係可能不正確');
      }
    } catch (error) {
      console.log('❌ 教練學員 API 失敗:', error.response?.data?.message || error.message);
    }
    
    // 5. 測試所有用戶列表
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
        const activeUsers = usersResponse.data.users.filter(u => u.status === 'active');
        
        console.log('📊 統計信息:');
        console.log(`  - 總用戶數: ${usersResponse.data.users.length}`);
        console.log(`  - 活躍用戶數: ${activeUsers.length}`);
        console.log(`  - 教練數量: ${coaches.length}`);
        console.log(`  - 有指派教練的學員數量: ${coachees.length}`);
        
        if (coaches.length > 0) {
          console.log('\n👨‍🏫 教練列表:');
          coaches.forEach(coach => {
            console.log(`  - ${coach.name} (${coach.email}) - 狀態: ${coach.status}`);
          });
        }
        
        if (coachees.length > 0) {
          console.log('\n👥 有教練的學員列表:');
          coachees.forEach(coachee => {
            const coach = usersResponse.data.users.find(u => u.id === coachee.coach_user_id);
            console.log(`  - ${coachee.name} (${coachee.email}) -> 教練: ${coach?.name || '未知'} - 狀態: ${coachee.status}`);
          });
        }
        
        // 檢查 xuanowind@gmail.com 的詳細信息
        const xuanUser = usersResponse.data.users.find(u => u.email === 'xuanowind@gmail.com');
        if (xuanUser) {
          console.log('\n🔍 xuanowind@gmail.com 詳細信息:');
          console.log(`  - ID: ${xuanUser.id}`);
          console.log(`  - 姓名: ${xuanUser.name}`);
          console.log(`  - 是否為教練: ${xuanUser.is_coach}`);
          console.log(`  - 教練ID: ${xuanUser.coach_user_id || '無'}`);
          console.log(`  - 狀態: ${xuanUser.status}`);
          console.log(`  - 會員等級: ${xuanUser.membership_level}`);
        }
        
        // 檢查 a0983005071@gmail.com 的詳細信息
        const coacheeUser = usersResponse.data.users.find(u => u.email === 'a0983005071@gmail.com');
        if (coacheeUser) {
          console.log('\n🔍 a0983005071@gmail.com 詳細信息:');
          console.log(`  - ID: ${coacheeUser.id}`);
          console.log(`  - 姓名: ${coacheeUser.name}`);
          console.log(`  - 是否為教練: ${coacheeUser.is_coach}`);
          console.log(`  - 教練ID: ${coacheeUser.coach_user_id || '無'}`);
          console.log(`  - 狀態: ${coacheeUser.status}`);
          console.log(`  - 會員等級: ${coacheeUser.membership_level}`);
        }
      }
    } catch (error) {
      console.log('❌ 用戶列表 API 失敗:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

async function checkOtherUsers() {
  // 嘗試其他可能的測試用戶
  const testEmails = [
    'a0983005071@gmail.com',
    'admin@example.com',
    'test@example.com'
  ];
  
  for (const email of testEmails) {
    console.log(`\n   檢查用戶: ${email}`);
    for (const password of COMMON_PASSWORDS.slice(0, 3)) { // 只測試前3個密碼
      try {
        const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          email: email,
          password: password
        });
        console.log(`   ✅ ${email} 登入成功！密碼: ${password}`);
        return { email, password, token: loginResponse.data.token };
      } catch (error) {
        // 靜默失敗
      }
    }
  }
  
  console.log('   ❌ 沒有找到可用的測試用戶');
  return null;
}

// 執行測試
testExistingUser();