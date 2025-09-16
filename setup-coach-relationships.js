const { pool } = require('./config/database');

async function setupCoachRelationships() {
  try {
    console.log('🚀 開始設置教練關係...');
    
    // 1. 設置 xuanowind@gmail.com 為教練
    console.log('\n1. 設置 xuanowind@gmail.com 為教練...');
    const setCoachResult = await pool.query(
      'UPDATE users SET is_coach = true WHERE email = $1 RETURNING id, name, email, is_coach',
      ['xuanowind@gmail.com']
    );
    
    if (setCoachResult.rows.length > 0) {
      const coach = setCoachResult.rows[0];
      console.log(`✅ 成功設置 ${coach.name} (${coach.email}) 為教練`);
      console.log(`   教練ID: ${coach.id}, is_coach: ${coach.is_coach}`);
      
      // 2. 指派一些學員給這個教練
      console.log('\n2. 指派學員給教練...');
      const studentsToAssign = [
        'a0983005071@gmail.com',
        'test@example.com'
      ];
      
      for (const studentEmail of studentsToAssign) {
        try {
          const assignResult = await pool.query(
            'UPDATE users SET coach_user_id = $1 WHERE email = $2 AND email != $3 RETURNING id, name, email, coach_user_id',
            [coach.id, studentEmail, 'xuanowind@gmail.com']
          );
          
          if (assignResult.rows.length > 0) {
            const student = assignResult.rows[0];
            console.log(`✅ 成功指派 ${student.name} (${student.email}) 給教練`);
            console.log(`   學員ID: ${student.id}, 教練ID: ${student.coach_user_id}`);
          } else {
            console.log(`⚠️ 找不到學員: ${studentEmail}`);
          }
        } catch (error) {
          console.log(`❌ 指派學員 ${studentEmail} 失敗:`, error.message);
        }
      }
      
      // 3. 隨機指派其他一些學員給教練
      console.log('\n3. 隨機指派其他學員...');
      const randomStudentsResult = await pool.query(
        `UPDATE users 
         SET coach_user_id = $1 
         WHERE id IN (
           SELECT id FROM users 
           WHERE email NOT LIKE '%admin%' 
           AND email != 'xuanowind@gmail.com'
           AND coach_user_id IS NULL
           AND status = 'active'
           LIMIT 3
         )
         RETURNING id, name, email`,
        [coach.id]
      );
      
      console.log(`✅ 隨機指派了 ${randomStudentsResult.rows.length} 個學員`);
      randomStudentsResult.rows.forEach(student => {
        console.log(`   - ${student.name} (${student.email})`);
      });
      
    } else {
      console.log('❌ 找不到 xuanowind@gmail.com 用戶');
    }
    
    // 4. 驗證設置結果
    console.log('\n4. 驗證設置結果...');
    const coachesResult = await pool.query(
      'SELECT id, name, email, is_coach FROM users WHERE is_coach = true'
    );
    
    const coacheesResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.coach_user_id, c.name as coach_name
       FROM users u
       LEFT JOIN users c ON u.coach_user_id = c.id
       WHERE u.coach_user_id IS NOT NULL`
    );
    
    console.log(`\n📊 最終統計:`);
    console.log(`  - 教練數量: ${coachesResult.rows.length}`);
    console.log(`  - 有教練的學員數量: ${coacheesResult.rows.length}`);
    
    if (coachesResult.rows.length > 0) {
      console.log('\n👨‍🏫 教練列表:');
      coachesResult.rows.forEach(coach => {
        console.log(`  - ${coach.name} (${coach.email}) - ID: ${coach.id}`);
      });
    }
    
    if (coacheesResult.rows.length > 0) {
      console.log('\n👥 學員-教練關係:');
      coacheesResult.rows.forEach(student => {
        console.log(`  - ${student.name} (${student.email}) -> 教練: ${student.coach_name}`);
      });
    }
    
    console.log('\n🎉 教練關係設置完成！');
    
  } catch (error) {
    console.error('❌ 設置過程中發生錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

setupCoachRelationships();