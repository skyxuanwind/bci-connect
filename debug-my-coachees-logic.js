const axios = require('axios');

const API_BASE = 'https://bci-connect.onrender.com';

async function debugMyCoacheesLogic() {
  try {
    console.log('🔍 調試 my-coachees 端點邏輯...');
    
    // 1. 教練登錄
    console.log('\n1. 教練登錄...');
    const coachLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'xuanowind@gmail.com',
      password: 'coach123456'
    });
    
    const coachToken = coachLoginResponse.data.token;
    const coachUser = coachLoginResponse.data.user;
    console.log('✅ 教練登錄成功');
    console.log('👤 教練信息:', {
      id: coachUser.id,
      name: coachUser.name,
      email: coachUser.email,
      isCoach: coachUser.isCoach,
      isAdmin: coachUser.isAdmin,
      membershipLevel: coachUser.membershipLevel
    });
    
    // 2. 檢查教練是否被認為是「真正的管理員」
    const isRealAdmin = coachUser.membershipLevel === 1 && coachUser.email.includes('admin');
    console.log(`\n🔍 是否為真正管理員: ${isRealAdmin}`);
    console.log(`   - 會員等級: ${coachUser.membershipLevel}`);
    console.log(`   - 郵箱包含admin: ${coachUser.email.includes('admin')}`);
    
    // 3. 調用 my-coachees API
    console.log('\n2. 調用 my-coachees API...');
    const coacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
      headers: { Authorization: `Bearer ${coachToken}` }
    });
    
    console.log('✅ my-coachees API 成功');
    console.log(`👥 返回的學員數量: ${coacheesResponse.data.coachees?.length || 0}`);
    
    if (coacheesResponse.data.coachees && coacheesResponse.data.coachees.length > 0) {
      console.log('\n📋 學員列表:');
      coacheesResponse.data.coachees.forEach((coachee, index) => {
        console.log(`  ${index + 1}. ${coachee.name} (ID: ${coachee.id})`);
        console.log(`     郵箱: ${coachee.email || '未提供'}`);
        console.log(`     公司: ${coachee.company}`);
        console.log(`     教練ID: ${coachee.coachUserId || '無'}`);
        if (coachee.coach) {
          console.log(`     教練: ${coachee.coach.name} (${coachee.coach.email})`);
        }
        console.log('');
      });
      
      // 4. 分析哪些學員應該被過濾掉
      console.log('\n🔍 分析結果:');
      console.log(`教練ID: ${coachUser.id}`);
      
      const shouldSeeCoachees = coacheesResponse.data.coachees.filter(coachee => 
        coachee.coachUserId === coachUser.id
      );
      
      console.log(`\n✅ 應該看到的學員數量: ${shouldSeeCoachees.length}`);
      shouldSeeCoachees.forEach((coachee, index) => {
        console.log(`  ${index + 1}. ${coachee.name} (教練ID: ${coachee.coachUserId})`);
      });
      
      const shouldNotSeeCoachees = coacheesResponse.data.coachees.filter(coachee => 
        coachee.coachUserId !== coachUser.id
      );
      
      console.log(`\n❌ 不應該看到的學員數量: ${shouldNotSeeCoachees.length}`);
      shouldNotSeeCoachees.forEach((coachee, index) => {
        console.log(`  ${index + 1}. ${coachee.name} (教練ID: ${coachee.coachUserId})`);
      });
      
    } else {
      console.log('📝 沒有學員數據');
    }
    
    // 5. 管理員登錄測試對比
    console.log('\n\n5. 管理員登錄測試對比...');
    try {
      const adminLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'admin@bci-club.com',
        password: 'admin123456'
      });
      
      const adminToken = adminLoginResponse.data.token;
      const adminUser = adminLoginResponse.data.user;
      console.log('✅ 管理員登錄成功');
      console.log('👤 管理員信息:', {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        isCoach: adminUser.isCoach,
        isAdmin: adminUser.isAdmin,
        membershipLevel: adminUser.membershipLevel
      });
      
      const adminIsRealAdmin = adminUser.membershipLevel === 1 && adminUser.email.includes('admin');
      console.log(`🔍 管理員是否為真正管理員: ${adminIsRealAdmin}`);
      
      // 管理員調用 my-coachees API
      const adminCoacheesResponse = await axios.get(`${API_BASE}/api/users/my-coachees`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log(`👥 管理員看到的學員數量: ${adminCoacheesResponse.data.coachees?.length || 0}`);
      
    } catch (error) {
      console.log('❌ 管理員測試失敗:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error.response?.data?.message || error.message);
  }
}

debugMyCoacheesLogic();