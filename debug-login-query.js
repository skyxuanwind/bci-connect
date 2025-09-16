const { pool } = require('./config/database');

async function debugLoginQuery() {
  try {
    console.log('=== 調試登錄查詢 ===');
    
    const email = 'xuanowind@gmail.com';
    console.log(`查詢郵箱: ${email}`);
    
    // 執行與登錄API相同的查詢
    const result = await pool.query(
      `SELECT u.*, c.name as chapter_name 
       FROM users u 
       LEFT JOIN chapters c ON u.chapter_id = c.id 
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    
    console.log(`\n查詢結果數量: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((user, index) => {
        console.log(`\n用戶 ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  姓名: ${user.name}`);
        console.log(`  郵箱: ${user.email}`);
        console.log(`  狀態: ${user.status}`);
        console.log(`  是否教練: ${user.is_coach}`);
        console.log(`  創建時間: ${user.created_at}`);
        console.log(`  更新時間: ${user.updated_at}`);
      });
    }
    
    // 檢查是否有多個記錄
    if (result.rows.length > 1) {
      console.log('\n⚠️  發現多個記錄！這可能是問題的根源。');
    }
    
    // 檢查所有xuanowind@gmail.com的記錄（不區分大小寫）
    console.log('\n=== 檢查所有相關記錄 ===');
    const allResult = await pool.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY id`,
      [email]
    );
    
    console.log(`所有相關記錄數量: ${allResult.rows.length}`);
    allResult.rows.forEach((user, index) => {
      console.log(`\n記錄 ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  郵箱: ${user.email}`);
      console.log(`  狀態: ${user.status}`);
      console.log(`  是否教練: ${user.is_coach}`);
      console.log(`  創建時間: ${user.created_at}`);
    });
    
  } catch (error) {
    console.error('調試查詢錯誤:', error);
  } finally {
    await pool.end();
  }
}

debugLoginQuery();