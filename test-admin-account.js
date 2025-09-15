const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 管理員帳號（從 TEST_ACCOUNTS_README.md）
const ADMIN_ACCOUNT = {
  email: 'admin@bci-club.com',
  password: 'admin123456'
};

async function testAdminAccount() {
  try {
    console.log('🚀 開始測試管理員帳號...');
    
    // 1. 健康檢查
    console.log('\n1. 檢查 API 健康狀態...');
    try {
      const healthResponse = await axios.get(`${API_BASE}/api/health`);
      console.log('✅ API 健康狀態正常:', healthResponse.data);
    } catch (error) {
      console.log('❌ API 健康檢查失敗:', error.message);
      return;
    }
    
    // 2. 管理員登入
    console.log('\n2. 嘗試管理員登入...');
    let adminToken;
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: ADMIN_ACCOUNT.email,
        password: ADMIN_ACCOUNT.password
      });
      
      adminToken = loginResponse.data.token;
      console.log('✅ 管理員登入成功!');
      console.log('👤 管理員資訊:', {
        name: loginResponse.data.user.name,
        email: loginResponse.data.user.email,
        isAdmin: loginResponse.data.user.is_admin,
        membershipLevel: loginResponse.data.user.membership_level
      });
    } catch (error) {
      console.log('❌ 管理員登入失敗:', error.response?.data?.message || error.message);
      return;
    }
    
    // 3. 獲取所有用戶列表
    console.log('\n3. 獲取所有用戶列表...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ 用戶列表獲取成功');
      const users = usersResponse.data.users || [];
      console.log(`👥 總用戶數: ${users.length}`);
      
      if (users.length > 0) {
        // 分析用戶數據
        const coaches = users.filter(u => u.is_coach);
        const coachees = users.filter(u => u.coach_user_id);
        const activeUsers = users.filter(u => u.status === 'active');
        
        console.log('\n📊 用戶統計:');
        console.log(`  - 總用戶數: ${users.length}`);
        console.log(`  - 活躍用戶數: ${activeUsers.length}`);
        console.log(`  - 教練數量: ${coaches.length}`);
        console.log(`  - 有指派教練的學員數: ${coachees.length}`);
        
        // 顯示教練詳情
        if (coaches.length > 0) {
          console.log('\n👨‍🏫 教練列表:');
          coaches.forEach((coach, index) => {
            const coacheeCount = users.filter(u => u.coach_user_id === coach.id).length;
            console.log(`  ${index + 1}. ${coach.name} (${coach.email})`);
            console.log(`     - 學員數量: ${coacheeCount}`);
            console.log(`     - 會員等級: ${coach.membership_level}`);
            console.log(`     - 狀態: ${coach.status}`);
          });
        }
        
        // 顯示學員詳情
        if (coachees.length > 0) {
          console.log('\n👨‍🎓 有指派教練的學員:');
          coachees.forEach((coachee, index) => {
            const coach = users.find(u => u.id === coachee.coach_user_id);
            console.log(`  ${index + 1}. ${coachee.name} (${coachee.email})`);
            console.log(`     - 教練: ${coach ? coach.name : '未找到教練'}`);
            console.log(`     - 會員等級: ${coachee.membership_level}`);
            console.log(`     - 狀態: ${coachee.status}`);
          });
        }
        
        // 檢查特定用戶
        const xuanUser = users.find(u => u.email === 'xuanowind@gmail.com');
        if (xuanUser) {
          console.log('\n🔍 xuanowind@gmail.com 用戶詳情:');
          console.log(`  - ID: ${xuanUser.id}`);
          console.log(`  - 姓名: ${xuanUser.name}`);
          console.log(`  - 是否為教練: ${xuanUser.is_coach}`);
          console.log(`  - 教練ID: ${xuanUser.coach_user_id || '無'}`);
          console.log(`  - 狀態: ${xuanUser.status}`);
          console.log(`  - 會員等級: ${xuanUser.membership_level}`);
          
          // 如果是教練，查看其學員
          if (xuanUser.is_coach) {
            const myCoachees = users.filter(u => u.coach_user_id === xuanUser.id);
            console.log(`  - 指派的學員數: ${myCoachees.length}`);
            if (myCoachees.length > 0) {
              console.log('  - 學員列表:');
              myCoachees.forEach((coachee, idx) => {
                console.log(`    ${idx + 1}. ${coachee.name} (${coachee.email})`);
              });
            }
          }
        }
        
        // 檢查 a0983005071@gmail.com
        const coacheeUser = users.find(u => u.email === 'a0983005071@gmail.com');
        if (coacheeUser) {
          console.log('\n🔍 a0983005071@gmail.com 用戶詳情:');
          console.log(`  - ID: ${coacheeUser.id}`);
          console.log(`  - 姓名: ${coacheeUser.name}`);
          console.log(`  - 是否為教練: ${coacheeUser.is_coach}`);
          console.log(`  - 教練ID: ${coacheeUser.coach_user_id || '無'}`);
          console.log(`  - 狀態: ${coacheeUser.status}`);
          console.log(`  - 會員等級: ${coacheeUser.membership_level}`);
          
          if (coacheeUser.coach_user_id) {
            const coach = users.find(u => u.id === coacheeUser.coach_user_id);
            console.log(`  - 指派的教練: ${coach ? coach.name + ' (' + coach.email + ')' : '教練不存在'}`);
          }
        }
        
      } else {
        console.log('⚠️ 沒有找到任何用戶');
      }
      
    } catch (error) {
      console.log('❌ 獲取用戶列表失敗:', error.response?.data?.message || error.message);
    }
    
    // 4. 測試管理員用戶管理 API
    console.log('\n4. 測試管理員用戶管理 API...');
    try {
      const adminUsersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ 管理員用戶管理 API 成功');
      console.log(`👥 管理員視角用戶數: ${adminUsersResponse.data.users?.length || 0}`);
      
    } catch (error) {
      console.log('❌ 管理員用戶管理 API 失敗:', error.response?.data?.message || error.message);
    }
    
    // 5. 如果有教練，測試教練-學員關係 API
    console.log('\n5. 測試教練學員關係 API...');
    try {
      const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log('✅ 教練學員關係 API 成功');
      console.log('👥 管理員的學員列表:', coacheesResponse.data);
      
    } catch (error) {
      console.log('❌ 教練學員關係 API 失敗:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 測試完成！');
    console.log('\n💡 總結:');
    console.log('   - 如果看到教練和學員數據，說明系統正常運作');
    console.log('   - 如果沒有教練-學員關係，可能需要在管理界面中設置');
    console.log('   - 可以使用管理員帳號登入 Web 界面進行進一步配置');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
}

// 執行測試
testAdminAccount();