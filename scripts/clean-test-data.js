const { pool } = require('../config/database');

// 測試資料識別模式
const TEST_EMAIL_PATTERNS = [
  '@test.com',
  '@example.com',
  '@demo.com',
  'test@',
  'demo@',
  'sample@'
];

const TEST_COMPANY_PATTERNS = [
  '測試公司',
  '示範公司',
  'Test Company',
  'Demo Company',
  'Sample Company',
  'Example Corp'
];

const TEST_NAME_PATTERNS = [
  '測試',
  '示範',
  'Test',
  'Demo',
  'Sample'
];

/**
 * 檢查是否為測試用戶
 */
function isTestUser(user) {
  const email = user.email?.toLowerCase() || '';
  const company = user.company?.toLowerCase() || '';
  const name = user.name?.toLowerCase() || '';
  
  // 檢查郵箱模式
  const hasTestEmail = TEST_EMAIL_PATTERNS.some(pattern => 
    email.includes(pattern.toLowerCase())
  );
  
  // 檢查公司名稱模式
  const hasTestCompany = TEST_COMPANY_PATTERNS.some(pattern => 
    company.includes(pattern.toLowerCase())
  );
  
  // 檢查姓名模式
  const hasTestName = TEST_NAME_PATTERNS.some(pattern => 
    name.includes(pattern.toLowerCase())
  );
  
  return hasTestEmail || hasTestCompany || hasTestName;
}

/**
 * 檢查是否為測試分會
 */
function isTestChapter(chapter) {
  const name = chapter.name?.toLowerCase() || '';
  
  const testPatterns = [
    '測試',
    '示範',
    'test',
    'demo',
    'sample'
  ];
  
  return testPatterns.some(pattern => 
    name.includes(pattern.toLowerCase())
  );
}

/**
 * 獲取所有測試用戶
 */
async function getTestUsers() {
  try {
    const result = await pool.query(`
      SELECT id, name, email, company, status, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    
    return result.rows.filter(isTestUser);
  } catch (error) {
    console.error('獲取測試用戶失敗:', error);
    throw error;
  }
}

/**
 * 獲取所有測試分會
 */
async function getTestChapters() {
  try {
    const result = await pool.query(`
      SELECT id, name, created_at
      FROM chapters
      ORDER BY created_at DESC
    `);
    
    return result.rows.filter(isTestChapter);
  } catch (error) {
    console.error('獲取測試分會失敗:', error);
    throw error;
  }
}

/**
 * 軟刪除測試用戶（標記為已刪除）
 */
async function softDeleteTestUsers(dryRun = true) {
  try {
    const testUsers = await getTestUsers();
    
    if (testUsers.length === 0) {
      console.log('沒有找到測試用戶');
      return { affected: 0, users: [] };
    }
    
    console.log(`找到 ${testUsers.length} 個測試用戶:`);
    testUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.company}`);
    });
    
    if (dryRun) {
      console.log('\n這是預覽模式，沒有實際執行刪除操作');
      return { affected: testUsers.length, users: testUsers };
    }
    
    // 實際執行軟刪除
    const userIds = testUsers.map(user => user.id);
    const result = await pool.query(`
      UPDATE users 
      SET status = 'deleted', 
          updated_at = CURRENT_TIMESTAMP,
          email = CONCAT(email, '_deleted_', EXTRACT(EPOCH FROM NOW()))
      WHERE id = ANY($1::int[])
      RETURNING id, name, email
    `, [userIds]);
    
    console.log(`\n成功軟刪除 ${result.rows.length} 個測試用戶`);
    return { affected: result.rows.length, users: result.rows };
    
  } catch (error) {
    console.error('軟刪除測試用戶失敗:', error);
    throw error;
  }
}

/**
 * 硬刪除測試用戶（永久刪除）
 */
async function hardDeleteTestUsers(dryRun = true) {
  try {
    const testUsers = await getTestUsers();
    
    if (testUsers.length === 0) {
      console.log('沒有找到測試用戶');
      return { affected: 0, users: [] };
    }
    
    console.log(`找到 ${testUsers.length} 個測試用戶:`);
    testUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.company}`);
    });
    
    if (dryRun) {
      console.log('\n這是預覽模式，沒有實際執行刪除操作');
      console.log('⚠️  硬刪除將永久移除資料，無法恢復！');
      return { affected: testUsers.length, users: testUsers };
    }
    
    // 實際執行硬刪除
    const userIds = testUsers.map(user => user.id);
    
    // 先刪除相關的外鍵約束資料
    await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1::int[])', [userIds]);
    await pool.query('DELETE FROM meetings WHERE requester_id = ANY($1::int[]) OR attendee_id = ANY($1::int[])', [userIds]);
    await pool.query('DELETE FROM prospects WHERE created_by_id = ANY($1::int[])', [userIds]);
    
    // 刪除用戶
    const result = await pool.query(`
      DELETE FROM users 
      WHERE id = ANY($1::int[])
      RETURNING id, name, email
    `, [userIds]);
    
    console.log(`\n成功硬刪除 ${result.rows.length} 個測試用戶及相關資料`);
    return { affected: result.rows.length, users: result.rows };
    
  } catch (error) {
    console.error('硬刪除測試用戶失敗:', error);
    throw error;
  }
}

/**
 * 刪除測試分會
 */
async function deleteTestChapters(dryRun = true) {
  try {
    const testChapters = await getTestChapters();
    
    if (testChapters.length === 0) {
      console.log('沒有找到測試分會');
      return { affected: 0, chapters: [] };
    }
    
    console.log(`找到 ${testChapters.length} 個測試分會:`);
    testChapters.forEach(chapter => {
      console.log(`- ${chapter.name}`);
    });
    
    if (dryRun) {
      console.log('\n這是預覽模式，沒有實際執行刪除操作');
      return { affected: testChapters.length, chapters: testChapters };
    }
    
    // 檢查分會是否有成員
    const chapterIds = testChapters.map(chapter => chapter.id);
    const memberCheck = await pool.query(`
      SELECT chapter_id, COUNT(*) as member_count
      FROM users 
      WHERE chapter_id = ANY($1::int[]) AND status != 'deleted'
      GROUP BY chapter_id
    `, [chapterIds]);
    
    if (memberCheck.rows.length > 0) {
      console.log('\n以下測試分會仍有成員，無法刪除:');
      memberCheck.rows.forEach(row => {
        const chapter = testChapters.find(c => c.id === row.chapter_id);
        console.log(`- ${chapter.name}: ${row.member_count} 個成員`);
      });
      
      const chaptersToDelete = testChapters.filter(chapter => 
        !memberCheck.rows.some(row => row.chapter_id === chapter.id)
      );
      
      if (chaptersToDelete.length === 0) {
        console.log('沒有可以刪除的測試分會');
        return { affected: 0, chapters: [] };
      }
      
      const deleteIds = chaptersToDelete.map(chapter => chapter.id);
      const result = await pool.query(`
        DELETE FROM chapters 
        WHERE id = ANY($1::int[])
        RETURNING id, name
      `, [deleteIds]);
      
      console.log(`\n成功刪除 ${result.rows.length} 個空的測試分會`);
      return { affected: result.rows.length, chapters: result.rows };
    } else {
      // 所有測試分會都沒有成員，可以全部刪除
      const result = await pool.query(`
        DELETE FROM chapters 
        WHERE id = ANY($1::int[])
        RETURNING id, name
      `, [chapterIds]);
      
      console.log(`\n成功刪除 ${result.rows.length} 個測試分會`);
      return { affected: result.rows.length, chapters: result.rows };
    }
    
  } catch (error) {
    console.error('刪除測試分會失敗:', error);
    throw error;
  }
}

/**
 * 生成清理報告
 */
async function generateCleanupReport() {
  try {
    console.log('=== 測試資料清理報告 ===\n');
    
    const testUsers = await getTestUsers();
    const testChapters = await getTestChapters();
    
    console.log(`測試用戶數量: ${testUsers.length}`);
    if (testUsers.length > 0) {
      console.log('測試用戶列表:');
      testUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ${user.company} - ${user.status}`);
      });
    }
    
    console.log(`\n測試分會數量: ${testChapters.length}`);
    if (testChapters.length > 0) {
      console.log('測試分會列表:');
      testChapters.forEach(chapter => {
        console.log(`  - ${chapter.name}`);
      });
    }
    
    // 獲取總體統計
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE status != $1', ['deleted']);
    const totalChapters = await pool.query('SELECT COUNT(*) as count FROM chapters');
    
    console.log(`\n總用戶數: ${totalUsers.rows[0].count}`);
    console.log(`總分會數: ${totalChapters.rows[0].count}`);
    console.log(`測試用戶比例: ${((testUsers.length / totalUsers.rows[0].count) * 100).toFixed(2)}%`);
    console.log(`測試分會比例: ${((testChapters.length / totalChapters.rows[0].count) * 100).toFixed(2)}%`);
    
    return {
      testUsers,
      testChapters,
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalChapters: parseInt(totalChapters.rows[0].count)
    };
    
  } catch (error) {
    console.error('生成清理報告失敗:', error);
    throw error;
  }
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const dryRun = !args.includes('--execute');
  
  try {
    switch (command) {
      case 'report':
        await generateCleanupReport();
        break;
        
      case 'soft-delete-users':
        console.log('=== 軟刪除測試用戶 ===\n');
        if (dryRun) {
          console.log('預覽模式 - 使用 --execute 參數執行實際操作\n');
        }
        await softDeleteTestUsers(dryRun);
        break;
        
      case 'hard-delete-users':
        console.log('=== 硬刪除測試用戶 ===\n');
        if (dryRun) {
          console.log('預覽模式 - 使用 --execute 參數執行實際操作\n');
        }
        console.log('⚠️  警告：硬刪除將永久移除資料，無法恢復！\n');
        await hardDeleteTestUsers(dryRun);
        break;
        
      case 'delete-chapters':
        console.log('=== 刪除測試分會 ===\n');
        if (dryRun) {
          console.log('預覽模式 - 使用 --execute 參數執行實際操作\n');
        }
        await deleteTestChapters(dryRun);
        break;
        
      case 'clean-all':
        console.log('=== 清理所有測試資料 ===\n');
        if (dryRun) {
          console.log('預覽模式 - 使用 --execute 參數執行實際操作\n');
        }
        
        console.log('1. 軟刪除測試用戶...');
        await softDeleteTestUsers(dryRun);
        
        console.log('\n2. 刪除測試分會...');
        await deleteTestChapters(dryRun);
        break;
        
      default:
        console.log('使用方法:');
        console.log('  node scripts/clean-test-data.js report                    # 生成清理報告');
        console.log('  node scripts/clean-test-data.js soft-delete-users        # 軟刪除測試用戶（預覽）');
        console.log('  node scripts/clean-test-data.js soft-delete-users --execute  # 軟刪除測試用戶（執行）');
        console.log('  node scripts/clean-test-data.js hard-delete-users        # 硬刪除測試用戶（預覽）');
        console.log('  node scripts/clean-test-data.js hard-delete-users --execute  # 硬刪除測試用戶（執行）');
        console.log('  node scripts/clean-test-data.js delete-chapters          # 刪除測試分會（預覽）');
        console.log('  node scripts/clean-test-data.js delete-chapters --execute   # 刪除測試分會（執行）');
        console.log('  node scripts/clean-test-data.js clean-all                # 清理所有測試資料（預覽）');
        console.log('  node scripts/clean-test-data.js clean-all --execute      # 清理所有測試資料（執行）');
        console.log('\n注意：不使用 --execute 參數時為預覽模式，不會實際修改資料');
        break;
    }
  } catch (error) {
    console.error('執行失敗:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  isTestUser,
  isTestChapter,
  getTestUsers,
  getTestChapters,
  softDeleteTestUsers,
  hardDeleteTestUsers,
  deleteTestChapters,
  generateCleanupReport
};