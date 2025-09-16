const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 模擬登錄API的完整流程
async function debugLoginStepByStep() {
  try {
    console.log('🔍 逐步調試登錄流程...');
    
    const email = 'xuanowind@gmail.com';
    const password = 'coach123456';
    
    console.log(`\n1. 輸入參數:`);
    console.log(`   郵箱: ${email}`);
    console.log(`   密碼: ${password}`);
    
    // 步驟1: 查詢用戶
    console.log('\n2. 執行數據庫查詢...');
    const result = await pool.query(
      `SELECT u.*, c.name as chapter_name 
       FROM users u 
       LEFT JOIN chapters c ON u.chapter_id = c.id 
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    
    console.log(`   查詢結果數量: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      console.log('❌ 用戶不存在');
      return;
    }
    
    const user = result.rows[0];
    console.log(`   找到用戶:`);
    console.log(`     ID: ${user.id}`);
    console.log(`     姓名: ${user.name}`);
    console.log(`     郵箱: ${user.email}`);
    console.log(`     狀態: ${user.status}`);
    console.log(`     是否教練: ${user.is_coach}`);
    
    // 步驟2: 驗證密碼
    console.log('\n3. 驗證密碼...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(`   密碼驗證結果: ${isValidPassword}`);
    
    if (!isValidPassword) {
      console.log('❌ 密碼錯誤');
      return;
    }
    
    // 步驟3: 檢查用戶狀態
    console.log('\n4. 檢查用戶狀態...');
    console.log(`   用戶狀態: ${user.status}`);
    
    if (user.status !== 'active') {
      console.log(`❌ 用戶狀態不是active: ${user.status}`);
      return;
    }
    
    // 步驟4: 生成token
    console.log('\n5. 生成JWT token...');
    console.log(`   傳遞給generateToken的userId: ${user.id}`);
    
    const generateToken = (userId) => {
      console.log(`   generateToken函數接收到的userId: ${userId}`);
      const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      console.log(`   生成的token: ${token.substring(0, 50)}...`);
      return token;
    };
    
    const token = generateToken(user.id);
    
    // 步驟5: 解碼token驗證
    console.log('\n6. 解碼生成的token驗證...');
    const decoded = jwt.decode(token);
    console.log(`   解碼後的payload:`, decoded);
    console.log(`   token中的userId: ${decoded.userId}`);
    
    // 步驟6: 構建響應用戶對象
    console.log('\n7. 構建響應用戶對象...');
    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company,
      industry: user.industry,
      title: user.title,
      profilePictureUrl: user.profile_picture_url,
      contactNumber: user.contact_number,
      chapterId: user.chapter_id,
      chapterName: user.chapter_name,
      membershipLevel: user.membership_level,
      status: user.status,
      nfcCardId: user.nfc_card_id,
      qrCodeUrl: user.qr_code_url,
      isCoach: !!user.is_coach,
      coachUserId: user.coach_user_id,
      mbti: user.mbti,
      mbtiPublic: user.mbti_public
    };
    
    console.log(`   響應用戶對象:`);
    console.log(`     ID: ${responseUser.id}`);
    console.log(`     姓名: ${responseUser.name}`);
    console.log(`     郵箱: ${responseUser.email}`);
    console.log(`     是否教練: ${responseUser.isCoach}`);
    
    console.log('\n✅ 登錄流程調試完成');
    console.log('\n🔍 關鍵發現:');
    console.log(`   - 數據庫中的用戶ID: ${user.id}`);
    console.log(`   - 傳遞給generateToken的ID: ${user.id}`);
    console.log(`   - JWT token中的userId: ${decoded.userId}`);
    console.log(`   - 響應中的用戶ID: ${responseUser.id}`);
    
    if (user.id === decoded.userId && decoded.userId === responseUser.id) {
      console.log('✅ 所有ID一致，登錄邏輯正常');
    } else {
      console.log('❌ ID不一致，存在問題！');
    }
    
  } catch (error) {
    console.error('❌ 調試過程中發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

debugLoginStepByStep();