const { pool } = require('./config/database');

async function fixCoachIssue() {
  try {
    console.log('🔍 開始修復吳岳軒教練身份問題...');
    
    // 1. 檢查users表結構
    console.log('\n1. 檢查users表結構...');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users表欄位:');
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 檢查是否有admin相關欄位
    const hasAdminField = tableStructure.rows.some(col => 
      col.column_name.includes('admin') || col.column_name.includes('role')
    );
    
    // 2. 查詢吳岳軒和軒軒的用戶資訊
    console.log('\n2. 查詢用戶資訊...');
    const usersQuery = `
      SELECT id, name, email, is_coach, coach_user_id
      FROM users 
      WHERE name IN ('吳岳軒', '軒軒') 
      ORDER BY name
    `;
    
    const usersResult = await pool.query(usersQuery);
    console.log('用戶資訊:', usersResult.rows);
    
    // 找到教練用戶（is_coach = true的吳岳軒）
    const wuYueXuan = usersResult.rows.find(user => user.name === '吳岳軒' && user.is_coach === true);
    const xuanXuan = usersResult.rows.find(user => user.name === '軒軒') || usersResult.rows.find(user => user.name === '吳岳軒' && user.is_coach !== true);
    
    console.log('所有吳岳軒相關用戶:', usersResult.rows.filter(user => user.name === '吳岳軒'));
    
    if (!wuYueXuan) {
      throw new Error('找不到教練用戶（is_coach=true的吳岳軒）');
    }
    
    if (!xuanXuan) {
      console.log('未找到軒軒用戶，將使用非教練的吳岳軒作為學員');
      // 如果沒有找到軒軒，使用非教練的吳岳軒
      const nonCoachWuYueXuan = usersResult.rows.find(user => user.name === '吳岳軒' && user.is_coach !== true);
      if (nonCoachWuYueXuan) {
        console.log('使用非教練吳岳軒作為學員:', nonCoachWuYueXuan);
      }
    }
    
    console.log(`\n吳岳軒 ID: ${wuYueXuan.id}, is_coach: ${wuYueXuan.is_coach}`);
    console.log(`軒軒 ID: ${xuanXuan.id}, coach_user_id: ${xuanXuan.coach_user_id}`);
    
    // 3. 檢查當前問題
    console.log('\n3. 檢查當前問題...');
    let needsFix = false;
    
    if (wuYueXuan.is_coach !== true) {
      console.log('❌ 問題確認：吳岳軒的 is_coach 不是 true');
      needsFix = true;
    }
    
    if (xuanXuan.coach_user_id !== wuYueXuan.id) {
      console.log('❌ 問題確認：軒軒沒有正確指派給吳岳軒');
      needsFix = true;
    }
    
    // 4. 檢查吳岳軒是否有特殊權限導致看到所有學員
    console.log('\n4. 檢查權限問題...');
    
    // 查詢所有活躍用戶數量
    const allActiveUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'active'"
    );
    const totalActiveUsers = parseInt(allActiveUsersResult.rows[0].count);
    console.log(`總活躍用戶數: ${totalActiveUsers}`);
    
    // 查詢吳岳軒應該看到的學員
    const coacheesQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.company,
        u.profile_picture_url,
        u.membership_level,
        u.status,
        u.created_at
      FROM users u
      WHERE u.status = 'active'
        AND u.coach_user_id = $1
      ORDER BY u.created_at DESC
    `;
    
    const coacheesResult = await pool.query(coacheesQuery, [wuYueXuan.id]);
    console.log(`吳岳軒的學員數量: ${coacheesResult.rows.length}`);
    console.log('學員列表:', coacheesResult.rows.map(m => m.name));
    
    if (coacheesResult.rows.length === 13) {
      console.log('❌ 問題確認：吳岳軒看到13位學員，這表示可能有權限問題');
      
      // 檢查是否所有用戶都被錯誤地指派給吳岳軒
      const allUsersWithCoach = await pool.query(
        "SELECT name, coach_user_id FROM users WHERE status = 'active' AND coach_user_id IS NOT NULL"
      );
      console.log('所有有教練的用戶:', allUsersWithCoach.rows);
    }
    
    if (!needsFix && coacheesResult.rows.length === 1 && coacheesResult.rows[0].name === '軒軒') {
      console.log('✅ 沒有發現問題，配置看起來正確');
      return;
    }
    
    // 5. 修復步驟1：設置吳岳軒為教練
    console.log('\n5. 修復吳岳軒的身份設置...');
    
    if (wuYueXuan.is_coach !== true) {
      await pool.query(
        'UPDATE users SET is_coach = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [wuYueXuan.id]
      );
      console.log('✅ 已設置吳岳軒為教練');
    }
    
    // 6. 修復步驟2：確保只有軒軒被指派給吳岳軒
    console.log('\n6. 修復學員指派...');
    
    // 首先清除所有錯誤的指派（除了軒軒）
    const clearWrongAssignments = await pool.query(
      'UPDATE users SET coach_user_id = NULL WHERE coach_user_id = $1 AND name != $2',
      [wuYueXuan.id, '軒軒']
    );
    
    if (clearWrongAssignments.rowCount > 0) {
      console.log(`✅ 已清除 ${clearWrongAssignments.rowCount} 個錯誤的教練指派`);
    }
    
    // 確保軒軒被正確指派給吳岳軒
    if (xuanXuan.coach_user_id !== wuYueXuan.id) {
      await pool.query(
        'UPDATE users SET coach_user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [wuYueXuan.id, xuanXuan.id]
      );
      console.log('✅ 已將軒軒指派給吳岳軒');
    } else {
      console.log('✅ 軒軒已經正確指派給吳岳軒');
    }
    
    // 7. 驗證修復結果
    console.log('\n7. 驗證修復結果...');
    
    const verifyResult = await pool.query(usersQuery);
    const updatedWuYueXuan = verifyResult.rows.find(user => user.name === '吳岳軒');
    const updatedXuanXuan = verifyResult.rows.find(user => user.name === '軒軒');
    
    console.log('修復後的用戶資訊:');
    console.log(`吳岳軒: is_coach=${updatedWuYueXuan.is_coach}`);
    console.log(`軒軒: coach_user_id=${updatedXuanXuan.coach_user_id}`);
    
    // 重新測試教練查詢邏輯
    const finalCoacheesResult = await pool.query(coacheesQuery, [updatedWuYueXuan.id]);
    
    console.log('\n✅ 最終教練查詢結果:');
    console.log(`學員數量: ${finalCoacheesResult.rows.length}`);
    console.log('學員列表:', finalCoacheesResult.rows.map(m => m.name));
    
    if (finalCoacheesResult.rows.length === 1 && finalCoacheesResult.rows[0].name === '軒軒') {
      console.log('\n🎉 修復成功！吳岳軒現在只能看到軒軒一位學員');
    } else if (finalCoacheesResult.rows.length === 0) {
      console.log('\n⚠️  沒有找到學員，可能需要檢查數據');
    } else {
      console.log('\n⚠️  修復可能未完全成功，學員數量:', finalCoacheesResult.rows.length);
    }
    
  } catch (error) {
    console.error('❌ 修復過程中發生錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

// 執行修復
fixCoachIssue();