const axios = require('axios');
const API_BASE = 'https://bci-connect.onrender.com';

async function checkCoachAssignments() {
  try {
    // 使用管理員身份登錄
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 管理員登錄成功');
    
    // 獲取所有用戶列表（使用管理員 API）
    const usersResponse = await axios.get(`${API_BASE}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 獲取用戶列表成功');
    console.log('👥 總用戶數:', usersResponse.data.users?.length || 0);
    
    if (usersResponse.data.users) {
      const coaches = usersResponse.data.users.filter(u => u.is_coach);
      const coachees = usersResponse.data.users.filter(u => u.coach_user_id);
      
      console.log('\n📊 統計信息:');
      console.log(`  - 教練數量: ${coaches.length}`);
      console.log(`  - 有指派教練的學員數量: ${coachees.length}`);
      
      if (coaches.length > 0) {
        console.log('\n👨‍🏫 教練列表:');
        coaches.forEach(coach => {
          console.log(`  - ${coach.name} (${coach.email}) - ID: ${coach.id}`);
        });
      }
      
      if (coachees.length > 0) {
        console.log('\n👥 有教練的學員列表:');
        coachees.forEach(coachee => {
          const coach = usersResponse.data.users.find(u => u.id === coachee.coach_user_id);
          console.log(`  - ${coachee.name} (${coachee.email}) -> 教練ID: ${coachee.coach_user_id}, 教練: ${coach?.name || '未找到'}`);
        });
      } else {
        console.log('\n⚠️ 沒有學員被指派給教練');
      }
      
      // 檢查特定用戶
      const xuanUser = usersResponse.data.users.find(u => u.email === 'xuanowind@gmail.com');
      const testUser = usersResponse.data.users.find(u => u.email === 'a0983005071@gmail.com');
      
      if (xuanUser) {
        console.log('\n🔍 xuanowind@gmail.com 詳情:');
        console.log(`  - ID: ${xuanUser.id}`);
        console.log(`  - 是否為教練: ${xuanUser.is_coach}`);
        console.log(`  - 教練ID: ${xuanUser.coach_user_id || '無'}`);
      }
      
      if (testUser) {
        console.log('\n🔍 a0983005071@gmail.com 詳情:');
        console.log(`  - ID: ${testUser.id}`);
        console.log(`  - 是否為教練: ${testUser.is_coach}`);
        console.log(`  - 教練ID: ${testUser.coach_user_id || '無'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.response?.data?.message || error.message);
  }
}

checkCoachAssignments();