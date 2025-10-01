const { pool } = require('../config/database');

// 檢查測試資料的腳本
async function checkTestData() {
  try {
    console.log('🔍 檢查資料庫中的測試資料...\n');

    // 1. 檢查測試用戶
    console.log('1. 檢查測試用戶:');
    console.log('================');
    
    const testEmailPatterns = [
      'test%',
      '%@example.com',
      '%test%',
      'alice.chen@example.com',
      'zhang.zhiming@example.com'
    ];

    for (const pattern of testEmailPatterns) {
      const result = await pool.query(
        'SELECT id, name, email, company, status, membership_level, created_at FROM users WHERE email LIKE $1 ORDER BY created_at DESC',
        [pattern]
      );
      
      if (result.rows.length > 0) {
        console.log(`\n📧 Email 模式 "${pattern}" 找到 ${result.rows.length} 個用戶:`);
        result.rows.forEach(user => {
          console.log(`  • ID: ${user.id}, 姓名: ${user.name}, Email: ${user.email}`);
          console.log(`    公司: ${user.company}, 狀態: ${user.status}, 會員等級: ${user.membership_level}`);
          console.log(`    創建時間: ${user.created_at}`);
        });
      }
    }

    // 2. 檢查測試公司
    console.log('\n\n2. 檢查測試公司:');
    console.log('================');
    
    const testCompanyPatterns = [
      '%測試%',
      '%test%',
      '%Test%',
      '%明志科技%',
      '%Chen Tech%'
    ];

    for (const pattern of testCompanyPatterns) {
      const result = await pool.query(
        'SELECT id, name, email, company, status FROM users WHERE company LIKE $1 ORDER BY created_at DESC',
        [pattern]
      );
      
      if (result.rows.length > 0) {
        console.log(`\n🏢 公司模式 "${pattern}" 找到 ${result.rows.length} 個用戶:`);
        result.rows.forEach(user => {
          console.log(`  • ${user.name} (${user.email}) - ${user.company}`);
        });
      }
    }

    // 3. 檢查分會資料
    console.log('\n\n3. 檢查分會資料:');
    console.log('================');
    
    const chaptersResult = await pool.query(
      'SELECT id, name, created_at FROM chapters ORDER BY created_at DESC'
    );
    
    if (chaptersResult.rows.length > 0) {
      console.log(`找到 ${chaptersResult.rows.length} 個分會:`);
      chaptersResult.rows.forEach(chapter => {
        console.log(`  • ID: ${chapter.id}, 名稱: ${chapter.name}`);
        console.log(`    創建時間: ${chapter.created_at}`);
      });
    } else {
      console.log('沒有找到分會資料');
    }

    // 4. 檢查最近創建的用戶
    console.log('\n\n4. 最近創建的用戶 (最近10個):');
    console.log('================================');
    
    const recentUsers = await pool.query(
      'SELECT id, name, email, company, status, membership_level, created_at FROM users ORDER BY created_at DESC LIMIT 10'
    );
    
    if (recentUsers.rows.length > 0) {
      recentUsers.rows.forEach(user => {
        console.log(`  • ${user.name} (${user.email})`);
        console.log(`    公司: ${user.company}, 狀態: ${user.status}`);
        console.log(`    創建時間: ${user.created_at}`);
        console.log('');
      });
    }

    // 5. 統計資料
    console.log('\n5. 資料庫統計:');
    console.log('==============');
    
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    const activeUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['active']);
    const testUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE email LIKE $1 OR email LIKE $2', ['%test%', '%@example.com']);
    
    console.log(`總用戶數: ${totalUsers.rows[0].count}`);
    console.log(`活躍用戶數: ${activeUsers.rows[0].count}`);
    console.log(`疑似測試用戶數: ${testUsers.rows[0].count}`);

    console.log('\n✅ 檢查完成！');

  } catch (error) {
    console.error('❌ 檢查測試資料時發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  checkTestData();
}

module.exports = { checkTestData };