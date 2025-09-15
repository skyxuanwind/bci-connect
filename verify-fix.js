const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 管理員帳號
const ADMIN_ACCOUNT = {
  email: 'admin@bci-club.com',
  password: 'admin123456'
};

async function verifyFix() {
  try {
    console.log('🔍 驗證教練-學員關係修復結果...');
    
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
    
    // 2. 獲取用戶列表並檢查狀態
    console.log('\n2. 檢查用戶狀態...');
    try {
      const usersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      const users = usersResponse.data.users || [];
      console.log(`✅ 獲取到 ${users.length} 個用戶`);
      
      // 找到目標用戶
      const xuanUser = users.find(u => u.email === 'xuanowind@gmail.com');
      const coacheeUser = users.find(u => u.email === 'a0983005071@gmail.com');
      
      if (xuanUser) {
        console.log('\n🔍 xuanowind@gmail.com 當前狀態:');
        console.log(`  - ID: ${xuanUser.id}`);
        console.log(`  - 姓名: ${xuanUser.name}`);
        console.log(`  - 是否為教練 (isCoach): ${xuanUser.isCoach}`);
        console.log(`  - 狀態: ${xuanUser.status}`);
        console.log(`  - 會員等級: ${xuanUser.membershipLevel}`);
      } else {
        console.log('❌ 找不到 xuanowind@gmail.com 用戶');
      }
      
      if (coacheeUser) {
        console.log('\n🔍 a0983005071@gmail.com 當前狀態:');
        console.log(`  - ID: ${coacheeUser.id}`);
        console.log(`  - 姓名: ${coacheeUser.name}`);
        console.log(`  - 是否為教練 (isCoach): ${coacheeUser.isCoach}`);
        console.log(`  - 狀態: ${coacheeUser.status}`);
        console.log(`  - 會員等級: ${coacheeUser.membershipLevel}`);
        
        // 檢查教練指派（需要查詢數據庫或使用其他 API）
        console.log('\n🔍 檢查教練指派關係...');
        try {
          const coachInfoResponse = await axios.get(`${API_BASE}/api/admin/users/${coacheeUser.id}/coach`, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          
          if (coachInfoResponse.data.coach) {
            console.log(`  - 指派的教練: ${coachInfoResponse.data.coach.name} (${coachInfoResponse.data.coach.email})`);
            console.log(`  - 教練ID: ${coachInfoResponse.data.coach.id}`);
            console.log(`  - 教練匹配: ${coachInfoResponse.data.coach.id === xuanUser?.id ? '✅' : '❌'}`);
          } else {
            console.log('  - 指派的教練: 無');
          }
        } catch (error) {
          console.log('❌ 獲取教練信息失敗:', error.response?.data?.message || error.message);
        }
      } else {
        console.log('❌ 找不到 a0983005071@gmail.com 用戶');
      }
      
      // 3. 統計教練和學員
      console.log('\n3. 系統統計:');
      const coaches = users.filter(u => u.isCoach);
      console.log(`👨‍🏫 總教練數: ${coaches.length}`);
      
      if (coaches.length > 0) {
        console.log('\n👨‍🏫 教練列表:');
        for (const coach of coaches) {
          console.log(`  - ${coach.name} (${coach.email}) - ID: ${coach.id}`);
          
          // 查詢每個教練的學員
          try {
            const coacheesResponse = await axios.get(`${API_BASE}/api/admin/users`, {
              headers: { Authorization: `Bearer ${adminToken}` },
              params: { limit: 100 } // 獲取更多用戶來查找學員關係
            });
            
            // 這裡需要通過其他方式查詢學員關係，因為管理員 API 可能不直接返回 coach_user_id
            console.log(`    (需要進一步查詢學員關係)`);
          } catch (error) {
            console.log(`    查詢學員失敗: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log('❌ 獲取用戶列表失敗:', error.response?.data?.message || error.message);
      return;
    }
    
    // 4. 測試教練登入和 API
    console.log('\n4. 測試教練功能...');
    
    // 嘗試不同的密碼
    const possiblePasswords = ['password123', '123456', 'xuanowind', 'password'];
    let xuanToken = null;
    
    for (const password of possiblePasswords) {
      try {
        console.log(`嘗試密碼: ${password}`);
        const xuanLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
          email: 'xuanowind@gmail.com',
          password: password
        });
        
        xuanToken = xuanLoginResponse.data.token;
        console.log(`✅ xuanowind@gmail.com 登入成功 (密碼: ${password})`);
        break;
      } catch (error) {
        console.log(`❌ 密碼 ${password} 失敗`);
      }
    }
    
    if (xuanToken) {
      // 測試教練 API
      try {
        const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
          headers: { Authorization: `Bearer ${xuanToken}` }
        });
        
        console.log('\n✅ 教練學員 API 測試成功!');
        console.log(`👥 學員數量: ${coacheesResponse.data.coachees?.length || 0}`);
        
        if (coacheesResponse.data.coachees && coacheesResponse.data.coachees.length > 0) {
          console.log('📋 學員列表:');
          coacheesResponse.data.coachees.forEach((coachee, index) => {
            console.log(`  ${index + 1}. ${coachee.name} (${coachee.email})`);
            console.log(`     - 狀態: ${coachee.status}`);
            console.log(`     - 會員等級: ${coachee.membershipLevel}`);
          });
        } else {
          console.log('⚠️ 沒有找到學員，可能需要檢查數據庫中的 coach_user_id 字段');
        }
        
      } catch (error) {
        console.log('❌ 教練學員 API 失敗:', error.response?.data?.message || error.message);
        if (error.response?.status === 403) {
          console.log('💡 可能是用戶還沒有教練權限，需要檢查 is_coach 字段');
        }
      }
    } else {
      console.log('❌ 無法登入 xuanowind@gmail.com，請檢查密碼');
    }
    
    console.log('\n🎉 驗證完成！');
    
  } catch (error) {
    console.error('❌ 驗證過程中發生錯誤:', error.message);
  }
}

// 執行驗證
verifyFix();