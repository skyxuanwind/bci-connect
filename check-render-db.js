const { Pool } = require('pg');

// Render PostgreSQL 連接配置
// 請將實際的 DATABASE_URL 替換到這裡
const DATABASE_URL = 'postgresql://bci_user:your_password@dpg-xxx-a.oregon-postgres.render.com/bci_connect';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkCoacheeRelationship() {
  try {
    console.log('🔍 連接到 Render PostgreSQL 數據庫...');
    
    // 檢查教練用戶
    const coachQuery = `
      SELECT id, email, name, is_coach 
      FROM users 
      WHERE email = 'xuanowind@gmail.com'
    `;
    const coachResult = await pool.query(coachQuery);
    console.log('\n👨‍🏫 教練信息:', coachResult.rows);
    
    if (coachResult.rows.length === 0) {
      console.log('❌ 教練用戶不存在');
      return;
    }
    
    const coachId = coachResult.rows[0].id;
    const isCoach = coachResult.rows[0].is_coach;
    
    console.log(`\n📊 教練 ID: ${coachId}, 是否為教練: ${isCoach}`);
    
    // 檢查指派給該教練的學員
    const coacheesQuery = `
      SELECT id, email, name, coach_user_id 
      FROM users 
      WHERE coach_user_id = $1
    `;
    const coacheesResult = await pool.query(coacheesQuery, [coachId]);
    console.log('\n👥 指派的學員:', coacheesResult.rows);
    
    // 檢查所有用戶的教練關係
    const allUsersQuery = `
      SELECT id, email, name, is_coach, coach_user_id 
      FROM users 
      ORDER BY id
    `;
    const allUsersResult = await pool.query(allUsersQuery);
    console.log('\n📋 所有用戶的教練關係:');
    allUsersResult.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Email: ${user.email}, 是教練: ${user.is_coach}, 教練ID: ${user.coach_user_id}`);
    });
    
  } catch (error) {
    console.error('❌ 數據庫查詢錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkCoacheeRelationship();