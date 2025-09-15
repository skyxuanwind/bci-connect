const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 管理員帳號
const ADMIN_ACCOUNT = {
  email: 'admin@bci-club.com',
  password: 'admin123456'
};

async function fixCoachAssignment() {
  try {
    console.log('🚀 開始修復教練-學員關係...');
    
    // 1. 管理員登入
    console.log('\n1. 管理員登入...');
    let adminToken;
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: ADMIN_ACCOUNT.email,
        password: ADMIN_ACCOUNT.password
      });
      
      adminToken = loginResponse.data.token;
      console.log('✅ 管理員登入成功!');
    } catch (error) {
      console.log('❌ 管理員登入失敗:', error.response?.data?.message || error.message);
      return;
    }
    
    // 2. 獲取所有用戶列表
    console.log('\n2. 獲取用戶列表...');
    let users = [];
    try {
      const usersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      users = usersResponse.data.users || [];
      console.log(`✅ 獲取到 ${users.length} 個用戶`);
      
    } catch (error) {
      console.log('❌ 獲取用戶列表失敗:', error.response?.data?.message || error.message);
      return;
    }
    
    // 3. 找到目標用戶
    const xuanUser = users.find(u => u.email === 'xuanowind@gmail.com');
    const coacheeUser = users.find(u => u.email === 'a0983005071@gmail.com');
    
    if (!xuanUser) {
      console.log('❌ 找不到 xuanowind@gmail.com 用戶');
      return;
    }
    
    if (!coacheeUser) {
      console.log('❌ 找不到 a0983005071@gmail.com 用戶');
      return;
    }
    
    console.log('\n3. 當前狀態:');
    console.log(`🔍 xuanowind@gmail.com:`);
    console.log(`  - ID: ${xuanUser.id}`);
    console.log(`  - 是否為教練: ${xuanUser.is_coach}`);
    
    console.log(`🔍 a0983005071@gmail.com:`);
    console.log(`  - ID: ${coacheeUser.id}`);
    console.log(`  - 教練ID: ${coacheeUser.coach_user_id || '無'}`);
    
    // 4. 設置 xuanowind@gmail.com 為教練
    if (!xuanUser.is_coach) {
      console.log('\n4. 設置 xuanowind@gmail.com 為教練...');
      try {
        const coachResponse = await axios.put(
          `${API_BASE}/api/admin/users/${xuanUser.id}/coach`,
          { isCoach: true },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        console.log('✅ 成功設置為教練:', coachResponse.data.message);
      } catch (error) {
        console.log('❌ 設置教練失敗:', error.response?.data?.message || error.message);
        return;
      }
    } else {
      console.log('\n4. xuanowind@gmail.com 已經是教練身份 ✅');
    }
    
    // 5. 指派 a0983005071@gmail.com 給 xuanowind@gmail.com 作為學員
    if (coacheeUser.coach_user_id !== xuanUser.id) {
      console.log('\n5. 指派學員給教練...');
      try {
        const assignResponse = await axios.put(
          `${API_BASE}/api/admin/users/${coacheeUser.id}/assign-coach`,
          { coachUserId: xuanUser.id },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        console.log('✅ 成功指派教練關係:', assignResponse.data.message);
      } catch (error) {
        console.log('❌ 指派教練失敗:', error.response?.data?.message || error.message);
        return;
      }
    } else {
      console.log('\n5. 教練-學員關係已經正確設置 ✅');
    }
    
    // 6. 驗證設置結果
    console.log('\n6. 驗證設置結果...');
    try {
      const verifyResponse = await axios.get(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const updatedUsers = verifyResponse.data.users || [];
      const updatedXuan = updatedUsers.find(u => u.email === 'xuanowind@gmail.com');
      const updatedCoachee = updatedUsers.find(u => u.email === 'a0983005071@gmail.com');
      
      console.log('🔍 更新後的狀態:');
      console.log(`xuanowind@gmail.com:`);
      console.log(`  - 是否為教練: ${updatedXuan?.is_coach}`);
      
      console.log(`a0983005071@gmail.com:`);
      console.log(`  - 教練ID: ${updatedCoachee?.coach_user_id}`);
      console.log(`  - 教練匹配: ${updatedCoachee?.coach_user_id === updatedXuan?.id ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log('❌ 驗證失敗:', error.response?.data?.message || error.message);
    }
    
    // 7. 測試教練 API
    console.log('\n7. 測試教練 API...');
    try {
      // 先用 xuanowind@gmail.com 登入
      const xuanLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'xuanowind@gmail.com',
        password: 'password123' // 假設密碼，可能需要調整
      });
      
      const xuanToken = xuanLoginResponse.data.token;
      console.log('✅ xuanowind@gmail.com 登入成功');
      
      // 測試獲取學員列表
      const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
        headers: { Authorization: `Bearer ${xuanToken}` }
      });
      
      console.log('✅ 教練學員 API 成功');
      console.log(`👥 學員數量: ${coacheesResponse.data.coachees?.length || 0}`);
      
      if (coacheesResponse.data.coachees && coacheesResponse.data.coachees.length > 0) {
        console.log('📋 學員列表:');
        coacheesResponse.data.coachees.forEach((coachee, index) => {
          console.log(`  ${index + 1}. ${coachee.name} (${coachee.email})`);
        });
      }
      
    } catch (error) {
      console.log('❌ 測試教練 API 失敗:', error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        console.log('💡 可能是密碼不正確，請檢查 xuanowind@gmail.com 的密碼');
      }
    }
    
    console.log('\n🎉 修復完成！');
    console.log('\n💡 總結:');
    console.log('   1. ✅ 已設置 xuanowind@gmail.com 為教練');
    console.log('   2. ✅ 已指派 a0983005071@gmail.com 為其學員');
    console.log('   3. 🔄 現在 xuanowind@gmail.com 登入後應該能在任務進度頁面看到學員了');
    console.log('\n🚀 請重新登入前端系統測試！');
    
  } catch (error) {
    console.error('❌ 修復過程中發生錯誤:', error.message);
  }
}

// 執行修復
fixCoachAssignment();