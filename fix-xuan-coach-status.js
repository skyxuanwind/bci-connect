const axios = require('axios');

const API_BASE = 'https://bci-connect.onrender.com';

async function fixXuanCoachStatus() {
  try {
    console.log('🔧 修復 xuanowind@gmail.com 的教練狀態...');
    
    // 1. 管理員登錄
    console.log('\n1. 管理員登錄...');
    const adminLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@bci-club.com',
      password: 'admin123456'
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ 管理員登錄成功');
    
    // 2. 獲取 xuanowind@gmail.com 的用戶ID
    console.log('\n2. 查找 xuanowind@gmail.com 用戶...');
    const usersResponse = await axios.get(`${API_BASE}/api/admin/users?search=xuanowind@gmail.com`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const xuanUser = usersResponse.data.users.find(u => u.email === 'xuanowind@gmail.com');
    if (!xuanUser) {
      console.log('❌ 找不到 xuanowind@gmail.com 用戶');
      return;
    }
    
    console.log('✅ 找到用戶:', {
      id: xuanUser.id,
      name: xuanUser.name,
      email: xuanUser.email,
      isCoach: xuanUser.isCoach,
      membershipLevel: xuanUser.membershipLevel
    });
    
    // 3. 設置為教練
    console.log('\n3. 設置為教練...');
    try {
      const setCoachResponse = await axios.put(
        `${API_BASE}/api/admin/users/${xuanUser.id}/coach`,
        { isCoach: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      console.log('✅ 設置教練成功:', setCoachResponse.data);
    } catch (error) {
      console.log('❌ 設置教練失敗:', error.response?.data?.message || error.message);
    }
    
    // 4. 驗證設置結果
    console.log('\n4. 驗證設置結果...');
    const verifyResponse = await axios.get(`${API_BASE}/api/admin/users?search=xuanowind@gmail.com`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const updatedUser = verifyResponse.data.users.find(u => u.email === 'xuanowind@gmail.com');
    console.log('📊 更新後的用戶狀態:', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      isCoach: updatedUser.isCoach,
      membershipLevel: updatedUser.membershipLevel
    });
    
    // 5. 測試教練登錄
    console.log('\n5. 測試教練登錄...');
    try {
      const coachLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'xuanowind@gmail.com',
        password: 'coach123456'
      });
      
      const coachToken = coachLoginResponse.data.token;
      console.log('✅ 教練登錄成功');
      console.log('👤 登錄後用戶信息:', {
        id: coachLoginResponse.data.user.id,
        name: coachLoginResponse.data.user.name,
        email: coachLoginResponse.data.user.email,
        isCoach: coachLoginResponse.data.user.isCoach,
        isAdmin: coachLoginResponse.data.user.isAdmin,
        membershipLevel: coachLoginResponse.data.user.membershipLevel
      });
      
      // 6. 測試學員目錄API
      console.log('\n6. 測試學員目錄API...');
      const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
        headers: { Authorization: `Bearer ${coachToken}` }
      });
      
      console.log('✅ 學員目錄API成功');
      console.log(`👥 學員數量: ${coacheesResponse.data.coachees?.length || 0}`);
      
      if (coacheesResponse.data.coachees && coacheesResponse.data.coachees.length > 0) {
        console.log('\n📋 學員列表:');
        coacheesResponse.data.coachees.forEach((coachee, index) => {
          console.log(`  ${index + 1}. ${coachee.name} (${coachee.email}) - ${coachee.company}`);
          if (coachee.coach) {
            console.log(`     教練: ${coachee.coach.name} (${coachee.coach.email})`);
          }
        });
      } else {
        console.log('📝 沒有學員數據');
      }
      
    } catch (error) {
      console.log('❌ 教練登錄失敗:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ 修復過程發生錯誤:', error.response?.data?.message || error.message);
  }
}

fixXuanCoachStatus();