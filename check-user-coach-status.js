const axios = require('axios');

// 線上 API 基礎 URL
const API_BASE = 'https://bci-connect.onrender.com';

// 管理員帳號
const ADMIN_ACCOUNT = {
  email: 'admin@bci-club.com',
  password: 'admin123456'
};

async function checkAndSetCoachStatus() {
  try {
    console.log('🚀 開始檢查用戶教練狀態...');
    
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
    
    // 3. 檢查 xuanowind@gmail.com 的狀態
    console.log('\n3. 檢查 xuanowind@gmail.com 狀態...');
    const xuanUser = users.find(u => u.email === 'xuanowind@gmail.com');
    
    if (!xuanUser) {
      console.log('❌ 找不到 xuanowind@gmail.com 用戶');
      return;
    }
    
    console.log('🔍 xuanowind@gmail.com 當前狀態:');
    console.log(`  - ID: ${xuanUser.id}`);
    console.log(`  - 姓名: ${xuanUser.name}`);
    console.log(`  - 是否為教練: ${xuanUser.is_coach}`);
    console.log(`  - 教練ID: ${xuanUser.coach_user_id || '無'}`);
    console.log(`  - 狀態: ${xuanUser.status}`);
    console.log(`  - 會員等級: ${xuanUser.membership_level}`);
    
    // 4. 檢查 a0983005071@gmail.com 的狀態
    console.log('\n4. 檢查 a0983005071@gmail.com 狀態...');
    const coacheeUser = users.find(u => u.email === 'a0983005071@gmail.com');
    
    if (coacheeUser) {
      console.log('🔍 a0983005071@gmail.com 當前狀態:');
      console.log(`  - ID: ${coacheeUser.id}`);
      console.log(`  - 姓名: ${coacheeUser.name}`);
      console.log(`  - 是否為教練: ${coacheeUser.is_coach}`);
      console.log(`  - 教練ID: ${coacheeUser.coach_user_id || '無'}`);
      console.log(`  - 狀態: ${coacheeUser.status}`);
      console.log(`  - 會員等級: ${coacheeUser.membership_level}`);
    } else {
      console.log('❌ 找不到 a0983005071@gmail.com 用戶');
    }
    
    // 5. 檢查教練-學員關係
    console.log('\n5. 分析教練-學員關係...');
    const coaches = users.filter(u => u.is_coach);
    const coachees = users.filter(u => u.coach_user_id);
    
    console.log(`👨‍🏫 總教練數: ${coaches.length}`);
    console.log(`👥 有指派教練的學員數: ${coachees.length}`);
    
    if (coaches.length > 0) {
      console.log('\n👨‍🏫 教練列表:');
      coaches.forEach((coach, index) => {
        const myCoachees = users.filter(u => u.coach_user_id === coach.id);
        console.log(`  ${index + 1}. ${coach.name} (${coach.email}) - 學員數: ${myCoachees.length}`);
        if (myCoachees.length > 0) {
          myCoachees.forEach((coachee, idx) => {
            console.log(`     ${idx + 1}. ${coachee.name} (${coachee.email})`);
          });
        }
      });
    }
    
    // 6. 如果 xuanowind@gmail.com 不是教練，詢問是否要設置為教練
    if (!xuanUser.is_coach) {
      console.log('\n⚠️ xuanowind@gmail.com 目前不是教練身份');
      console.log('💡 這就是為什麼在任務進度頁面看不到學員的原因');
      console.log('\n🔧 解決方案:');
      console.log('   1. 將 xuanowind@gmail.com 設置為教練 (is_coach = true)');
      console.log('   2. 將 a0983005071@gmail.com 指派給 xuanowind@gmail.com 作為學員');
      
      // 嘗試設置教練狀態（如果有相應的 API）
      console.log('\n🔄 嘗試通過管理員 API 設置教練狀態...');
      
      try {
        // 檢查是否有設置教練狀態的 API
        const updateResponse = await axios.put(`${API_BASE}/api/admin/users/${xuanUser.id}/coach-status`, 
          { is_coach: true },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('✅ 成功設置 xuanowind@gmail.com 為教練');
      } catch (error) {
        console.log('❌ 設置教練狀態失敗:', error.response?.data?.message || error.message);
        console.log('💡 可能需要直接在數據庫中修改或通過管理界面操作');
      }
      
      // 如果有學員，嘗試指派教練
      if (coacheeUser && !coacheeUser.coach_user_id) {
        console.log('\n🔄 嘗試將 a0983005071@gmail.com 指派給 xuanowind@gmail.com...');
        
        try {
          const assignResponse = await axios.put(`${API_BASE}/api/admin/users/${coacheeUser.id}/coach`, 
            { coach_user_id: xuanUser.id },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          );
          console.log('✅ 成功指派教練關係');
        } catch (error) {
          console.log('❌ 指派教練失敗:', error.response?.data?.message || error.message);
          console.log('💡 可能需要直接在數據庫中修改或通過管理界面操作');
        }
      }
    } else {
      console.log('\n✅ xuanowind@gmail.com 已經是教練身份');
      
      // 檢查是否有指派的學員
      const myCoachees = users.filter(u => u.coach_user_id === xuanUser.id);
      console.log(`👥 指派的學員數: ${myCoachees.length}`);
      
      if (myCoachees.length === 0) {
        console.log('⚠️ 沒有指派的學員，這可能是問題所在');
        
        if (coacheeUser && !coacheeUser.coach_user_id) {
          console.log('\n🔄 嘗試將 a0983005071@gmail.com 指派給 xuanowind@gmail.com...');
          
          try {
            const assignResponse = await axios.put(`${API_BASE}/api/admin/users/${coacheeUser.id}/coach`, 
              { coach_user_id: xuanUser.id },
              { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            console.log('✅ 成功指派教練關係');
          } catch (error) {
            console.log('❌ 指派教練失敗:', error.response?.data?.message || error.message);
          }
        }
      } else {
        console.log('✅ 已有指派的學員:');
        myCoachees.forEach((coachee, idx) => {
          console.log(`  ${idx + 1}. ${coachee.name} (${coachee.email})`);
        });
      }
    }
    
    console.log('\n🎉 檢查完成！');
    console.log('\n💡 總結:');
    console.log('   - 如果用戶不是教練身份，需要設置 is_coach = true');
    console.log('   - 如果沒有指派學員，需要設置 coach_user_id 關係');
    console.log('   - 設置完成後，用戶就能在任務進度頁面看到學員了');
    
  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error.message);
  }
}

// 執行檢查
checkAndSetCoachStatus();