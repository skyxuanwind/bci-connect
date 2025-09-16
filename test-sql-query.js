const axios = require('axios');
const { pool } = require('./config/database');

async function testSQLQuery() {
  try {
    console.log('🔍 測試 SQL 查詢邏輯...');
    
    // 1. 直接查詢數據庫，檢查用戶和教練關係
    console.log('\n1. 檢查數據庫中的用戶和教練關係...');
    
    const usersQuery = `
      SELECT u.id, u.name, u.email, u.is_coach, u.coach_user_id, u.membership_level,
             coach.id as coach_id, coach.name as coach_name, coach.email as coach_email
      FROM users u
      LEFT JOIN users coach ON u.coach_user_id = coach.id
      WHERE u.status = 'active'
      ORDER BY u.id
    `;
    
    const usersResult = await pool.query(usersQuery);
    
    console.log('📊 數據庫中的用戶關係:');
    usersResult.rows.forEach(user => {
      console.log(`  用戶 ${user.id}: ${user.name} (${user.email})`);
      console.log(`    是否為教練: ${user.is_coach}`);
      console.log(`    會員等級: ${user.membership_level}`);
      console.log(`    教練ID: ${user.coach_user_id || '無'}`);
      if (user.coach_user_id) {
        console.log(`    教練: ${user.coach_name} (${user.coach_email})`);
      }
      console.log('');
    });
    
    // 2. 測試教練 xuanowind@gmail.com (ID: 8) 的查詢
    console.log('\n2. 測試教練 xuanowind@gmail.com 的查詢...');
    
    const coachId = 8;
    const isRealAdmin = false; // xuanowind@gmail.com 不是真正的管理員
    
    let whereConditions = [
      'u.status = $1',
      `NOT (u.membership_level = 1 AND u.email LIKE '%admin%')`
    ];
    let params = ['active'];
    let idx = 2;
    
    // 非真正管理員只能查看自己的學員
    if (!isRealAdmin) {
      whereConditions.push(`u.coach_user_id = $${idx}`);
      params.push(coachId);
      idx++;
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    console.log('🔍 SQL WHERE 條件:', whereClause);
    console.log('🔍 SQL 參數:', params);
    
    const testQuery = `
      SELECT u.id, u.name, u.email, u.company, u.coach_user_id,
             coach.id as coach_id, coach.name as coach_name, coach.email as coach_email
      FROM users u
      LEFT JOIN users coach ON u.coach_user_id = coach.id
      ${whereClause}
      ORDER BY u.name ASC
    `;
    
    console.log('\n🔍 完整 SQL 查詢:');
    console.log(testQuery);
    
    const testResult = await pool.query(testQuery, params);
    
    console.log(`\n✅ 查詢結果: ${testResult.rows.length} 條記錄`);
    testResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (ID: ${row.id})`);
      console.log(`     郵箱: ${row.email}`);
      console.log(`     公司: ${row.company}`);
      console.log(`     教練ID: ${row.coach_user_id || '無'}`);
      if (row.coach_user_id) {
        console.log(`     教練: ${row.coach_name} (${row.coach_email})`);
      }
      console.log('');
    });
    
    // 3. 測試管理員的查詢
    console.log('\n3. 測試管理員的查詢...');
    
    const adminIsRealAdmin = true;
    let adminWhereConditions = [
      'u.status = $1',
      `NOT (u.membership_level = 1 AND u.email LIKE '%admin%')`
    ];
    let adminParams = ['active'];
    let adminIdx = 2;
    
    // 真正管理員可以看到所有學員
    if (!adminIsRealAdmin) {
      adminWhereConditions.push(`u.coach_user_id = $${adminIdx}`);
      adminParams.push(1); // 管理員ID
      adminIdx++;
    }
    
    const adminWhereClause = `WHERE ${adminWhereConditions.join(' AND ')}`;
    
    console.log('🔍 管理員 SQL WHERE 條件:', adminWhereClause);
    console.log('🔍 管理員 SQL 參數:', adminParams);
    
    const adminTestQuery = `
      SELECT u.id, u.name, u.email, u.company, u.coach_user_id,
             coach.id as coach_id, coach.name as coach_name, coach.email as coach_email
      FROM users u
      LEFT JOIN users coach ON u.coach_user_id = coach.id
      ${adminWhereClause}
      ORDER BY u.name ASC
    `;
    
    const adminTestResult = await pool.query(adminTestQuery, adminParams);
    
    console.log(`\n✅ 管理員查詢結果: ${adminTestResult.rows.length} 條記錄`);
    
  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

testSQLQuery();