const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetCoachPassword() {
  try {
    console.log('🔑 重置教練密碼...');
    
    // 生成新密碼的哈希
    const newPassword = 'coach123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // 更新教練密碼
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, name, email',
      [hashedPassword, 'xuanowind@gmail.com']
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`✅ 成功重置教練密碼`);
      console.log(`   用戶: ${user.name} (${user.email})`);
      console.log(`   新密碼: ${newPassword}`);
    } else {
      console.log('❌ 找不到教練用戶');
    }
    
  } catch (error) {
    console.error('❌ 重置密碼失敗:', error.message);
  } finally {
    await pool.end();
  }
}

resetCoachPassword();