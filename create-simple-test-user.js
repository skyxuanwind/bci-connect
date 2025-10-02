const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function createTestUser() {
  try {
    // 生成密碼哈希
    const password = 'test123456';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('生成的密碼哈希:', hashedPassword);
    
    // 檢查用戶是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['testuser@example.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('用戶已存在，更新密碼...');
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, 'testuser@example.com']
      );
    } else {
      console.log('創建新用戶...');
      await pool.query(
        `INSERT INTO users (name, email, password, company, industry, title, contact_number, chapter_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['測試用戶', 'testuser@example.com', hashedPassword, '測試公司', '科技業', '工程師', '0912345678', 1, 'active']
      );
    }
    
    console.log('測試用戶創建/更新成功！');
    console.log('登入信息:');
    console.log('Email: testuser@example.com');
    console.log('Password: test123456');
    
    // 驗證密碼
    const testResult = await bcrypt.compare(password, hashedPassword);
    console.log('密碼驗證測試:', testResult ? '成功' : '失敗');
    
  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    process.exit(0);
  }
}

createTestUser();