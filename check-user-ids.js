const { pool } = require('./config/database');

async function checkUserIds() {
  try {
    console.log('🔍 檢查用戶 8 和 9 的信息...');
    
    const result = await pool.query('SELECT id, name, email FROM users WHERE id IN (8, 9)');
    
    console.log('用戶信息:');
    result.rows.forEach(user => {
      console.log(`  ID ${user.id}: ${user.name} (${user.email})`);
    });
    
    // 檢查學員的教練指派
    console.log('\n🔍 檢查學員的教練指派...');
    const coacheeResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.coach_user_id, coach.name as coach_name, coach.email as coach_email
      FROM users u
      LEFT JOIN users coach ON u.coach_user_id = coach.id
      WHERE u.coach_user_id IN (8, 9)
      ORDER BY u.coach_user_id, u.name
    `);
    
    console.log('學員的教練指派:');
    coacheeResult.rows.forEach(coachee => {
      console.log(`  學員 ${coachee.id}: ${coachee.name} (${coachee.email})`);
      console.log(`    教練ID: ${coachee.coach_user_id}`);
      console.log(`    教練: ${coachee.coach_name} (${coachee.coach_email})`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkUserIds();