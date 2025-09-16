const axios = require('axios');
const API_BASE = 'https://bci-connect.onrender.com';

async function checkXuanUser() {
  try {
    // 使用管理員身份登錄
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ 管理員登錄成功');
    
    // 獲取所有用戶列表
    const usersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const users = usersResponse.data.users || [];
    const xuanUser = users.find(u => u.email === 'xuanowind@gmail.com');
    
    if (xuanUser) {
      console.log('\n🔍 xuanowind@gmail.com 詳細信息:');
      console.log(`  - ID: ${xuanUser.id}`);
      console.log(`  - 姓名: ${xuanUser.name}`);
      console.log(`  - Email: ${xuanUser.email}`);
      console.log(`  - 是否為教練 (is_coach): ${xuanUser.is_coach}`);
      console.log(`  - 是否為管理員 (is_admin): ${xuanUser.is_admin}`);
      console.log(`  - 會員等級: ${xuanUser.membership_level}`);
      console.log(`  - 狀態: ${xuanUser.status}`);
      console.log(`  - 教練ID: ${xuanUser.coach_user_id || '無'}`);
      
      // 檢查這個用戶的學員
      const myCoachees = users.filter(u => u.coach_user_id === xuanUser.id);
      console.log(`  - 指派的學員數: ${myCoachees.length}`);
      
      if (myCoachees.length > 0) {
        console.log('  - 學員列表:');
        myCoachees.forEach((coachee, idx) => {
          console.log(`    ${idx + 1}. ${coachee.name} (${coachee.email})`);
        });
      }
      
      // 如果不是教練，嘗試設置為教練
      if (!xuanUser.is_coach) {
        console.log('\n⚠️ 用戶不是教練，嘗試設置為教練...');
        try {
          const updateResponse = await axios.put(`${API_BASE}/api/admin/users/${xuanUser.id}`, {
            is_coach: true
          }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          console.log('✅ 成功設置為教練');
        } catch (error) {
          console.log('❌ 設置教練失敗:', error.response?.data?.message || error.message);
        }
      }
      
    } else {
      console.log('❌ 找不到 xuanowind@gmail.com 用戶');
    }
    
    // 測試 xuanowind@gmail.com 登錄
    console.log('\n🔐 測試 xuanowind@gmail.com 登錄...');
    try {
      const xuanLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'xuanowind@gmail.com',
        password: 'coach123456'
      });
      
      const xuanToken = xuanLoginResponse.data.token;
      console.log('✅ xuanowind@gmail.com 登錄成功');
      
      // 檢查用戶信息
      const meResponse = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${xuanToken}` }
      });
      
      console.log('\n👤 登錄後的用戶信息:');
      console.log(`  - ID: ${meResponse.data.user.id}`);
      console.log(`  - 姓名: ${meResponse.data.user.name}`);
      console.log(`  - 是否為教練 (isCoach): ${meResponse.data.user.isCoach}`);
      console.log(`  - 是否為管理員 (isAdmin): ${meResponse.data.user.isAdmin}`);
      console.log(`  - 會員等級: ${meResponse.data.user.membershipLevel}`);
      
    } catch (error) {
      console.log('❌ xuanowind@gmail.com 登錄失敗:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.response?.data?.message || error.message);
  }
}

checkXuanUser();