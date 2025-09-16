const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_BASE = 'https://bci-connect.onrender.com';

async function debugLoginToken() {
  try {
    console.log('🔍 調試登錄token...');
    
    // 1. 教練登錄
    console.log('\n1. 教練登錄...');
    const coachLoginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'xuanowind@gmail.com',
      password: 'coach123456'
    });
    
    const coachToken = coachLoginResponse.data.token;
    const coachUser = coachLoginResponse.data.user;
    
    console.log('✅ 教練登錄成功');
    console.log('👤 登錄響應中的用戶信息:', {
      id: coachUser.id,
      name: coachUser.name,
      email: coachUser.email,
      isCoach: coachUser.isCoach,
      isAdmin: coachUser.isAdmin,
      membershipLevel: coachUser.membershipLevel
    });
    
    // 2. 解碼JWT token
    console.log('\n2. 解碼JWT token...');
    try {
      // 不驗證簽名，只解碼payload
      const decoded = jwt.decode(coachToken);
      console.log('🔍 Token payload:', decoded);
    } catch (error) {
      console.log('❌ 解碼token失敗:', error.message);
    }
    
    // 3. 使用token調用API，檢查req.user
    console.log('\n3. 使用token調用profile API...');
    try {
      const profileResponse = await axios.get(`${API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${coachToken}` }
      });
      
      console.log('✅ Profile API 成功');
      console.log('👤 Profile API 返回的用戶信息:', {
        id: profileResponse.data.user.id,
        name: profileResponse.data.user.name,
        email: profileResponse.data.user.email,
        isCoach: profileResponse.data.user.isCoach,
        isAdmin: profileResponse.data.user.isAdmin,
        membershipLevel: profileResponse.data.user.membershipLevel
      });
    } catch (error) {
      console.log('❌ Profile API 失敗:', error.response?.data?.message || error.message);
    }
    
    // 4. 直接查詢數據庫確認
    console.log('\n4. 直接查詢數據庫確認...');
    const { pool } = require('./config/database');
    
    try {
      const dbResult = await pool.query(`
        SELECT id, name, email, is_coach, membership_level
        FROM users 
        WHERE email = 'xuanowind@gmail.com'
      `);
      
      if (dbResult.rows.length > 0) {
        const dbUser = dbResult.rows[0];
        console.log('📊 數據庫中的用戶信息:', {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          isCoach: dbUser.is_coach,
          membershipLevel: dbUser.membership_level
        });
      } else {
        console.log('❌ 數據庫中找不到該用戶');
      }
      
      await pool.end();
    } catch (error) {
      console.log('❌ 數據庫查詢失敗:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 調試過程發生錯誤:', error.response?.data?.message || error.message);
  }
}

debugLoginToken();