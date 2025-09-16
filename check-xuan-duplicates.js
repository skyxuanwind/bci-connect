const { pool } = require('./config/database');

async function checkXuanDuplicates() {
  try {
    console.log('🔍 檢查 xuanowind@gmail.com 的所有記錄...');
    
    const result = await pool.query(`
      SELECT id, name, email, is_coach, membership_level, status, created_at
      FROM users 
      WHERE email = 'xuanowind@gmail.com'
      ORDER BY id
    `);
    
    console.log(`找到 ${result.rows.length} 條記錄:`);
    result.rows.forEach(user => {
      console.log(`  ID ${user.id}: ${user.name}`);
      console.log(`    郵箱: ${user.email}`);
      console.log(`    是否為教練: ${user.is_coach}`);
      console.log(`    會員等級: ${user.membership_level}`);
      console.log(`    狀態: ${user.status}`);
      console.log(`    創建時間: ${user.created_at}`);
      console.log('');
    });
    
    // 檢查哪個記錄有學員
    console.log('🔍 檢查哪個記錄有學員...');
    for (const user of result.rows) {
      const coacheeResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM users 
        WHERE coach_user_id = $1
      `, [user.id]);
      
      console.log(`  ID ${user.id} (${user.name}) 有 ${coacheeResult.rows[0].count} 個學員`);
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkXuanDuplicates();