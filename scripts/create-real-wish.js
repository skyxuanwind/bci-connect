const { pool } = require('../config/database');
const { AIMatchingService } = require('../services/aiMatchingService');
const { AINotificationService } = require('../services/aiNotificationService');

const aiMatchingService = new AIMatchingService();
const aiNotificationService = new AINotificationService();

/**
 * 為吳岳軒創建一個實際的許願
 */
async function createRealWish() {
  try {
    console.log('🚀 開始為吳岳軒創建實際許願...');
    
    // 獲取吳岳軒的用戶資料
    const userResult = await pool.query(
      'SELECT * FROM users WHERE name = $1 AND email LIKE $2',
      ['吳岳軒', '%xuanowind%']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ 找不到吳岳軒用戶');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`👤 找到用戶: ${user.name} (${user.email}) - ${user.company}`);
    
    // 實際的許願內容 - 基於吳岳軒的影音行銷背景
    const wishData = {
      title: '尋找企業品牌影片製作合作夥伴',
      description: `我們軒偲樂創意行銷正在尋找優質的企業客戶，希望能為貴公司製作專業的品牌形象影片和行銷內容。\n\n我們的服務包括：\n• 企業形象影片製作\n• 產品宣傳短片\n• 社群媒體影音內容\n• 活動紀錄與直播\n• 品牌故事影片\n\n特別適合：\n- 正在進行品牌升級的企業\n- 需要數位行銷轉型的傳統產業\n- 準備上市或擴展市場的公司\n- 重視品牌形象的服務業\n\n我們擁有專業的攝影團隊和後製能力，已成功服務多家知名企業。希望能與有影音行銷需求的企業建立長期合作關係。`,
      category: '商業合作',
      tags: ['影音製作', '品牌行銷', '企業服務', '數位轉型', '創意設計'],
      priority: 2
    };
    
    // 檢查是否已存在相同標題的許願
    const existingWish = await pool.query(
      'SELECT id FROM member_wishes WHERE user_id = $1 AND title = $2',
      [user.id, wishData.title]
    );
    
    if (existingWish.rows.length > 0) {
      console.log(`⚠️  許願「${wishData.title}」已存在，先刪除舊的`);
      await pool.query('DELETE FROM member_wishes WHERE id = $1', [existingWish.rows[0].id]);
    }
    
    // 使用AI分析許願內容
    console.log('🤖 開始AI分析許願內容...');
    const extractedIntents = await aiMatchingService.analyzeWishContent(
      wishData.description,
      wishData.title,
      wishData.category
    );
    
    console.log('🔍 AI分析結果:', JSON.stringify(extractedIntents, null, 2));
    
    // 創建許願記錄
    const result = await pool.query(`
      INSERT INTO member_wishes 
      (user_id, title, description, category, tags, ai_extracted_intents, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [
      user.id,
      wishData.title,
      wishData.description,
      wishData.category,
      wishData.tags,
      JSON.stringify(extractedIntents),
      wishData.priority
    ]);
    
    const wish = result.rows[0];
    console.log(`✅ 許願創建成功！`);
    console.log(`📋 許願ID: ${wish.id}`);
    console.log(`📝 標題: ${wish.title}`);
    console.log(`📅 創建時間: ${wish.created_at}`);
    
    // 記錄用戶活動
    await pool.query(`
      INSERT INTO member_activities (user_id, activity_type, activity_data)
      VALUES ($1, 'wish_created', $2)
    `, [user.id, JSON.stringify({ 
      wish_id: wish.id, 
      title: wishData.title, 
      category: wishData.category 
    })]);
    
    // 執行AI媒合和通知
    console.log('\n🔍 開始尋找匹配會員...');
    const matchingResults = await aiMatchingService.findMatchingMembers(
      wish.id,
      extractedIntents,
      20 // 增加搜尋數量
    );
    
    console.log(`✅ 找到 ${matchingResults.length} 個匹配會員`);
    
    // 為匹配度較高的會員發送通知
    let notificationCount = 0;
    for (const match of matchingResults) {
      if (match.score >= 60) { // 降低門檻以便更多人收到通知
        try {
          console.log(`📤 發送通知給: ${match.member.name} (匹配度: ${match.score}%)`);
          await aiNotificationService.sendWishOpportunityNotification(
            match.member.id,
            wish.id,
            wish,
            match.score
          );
          notificationCount++;
        } catch (error) {
          console.error(`❌ 發送通知失敗 (${match.member.name}):`, error.message);
        }
      }
    }
    
    console.log(`\n🎉 許願發布完成！`);
    console.log(`📊 統計資訊:`);
    console.log(`   - 許願ID: ${wish.id}`);
    console.log(`   - 找到匹配會員: ${matchingResults.length} 個`);
    console.log(`   - 發送通知數量: ${notificationCount} 個`);
    console.log(`   - 匹配門檻: 60% 以上`);
    
    if (notificationCount > 0) {
      console.log(`\n💡 提示: 收到通知的會員可以在「AI智能通知」頁面查看詳情`);
      console.log(`🔗 通知頁面: http://localhost:8000/ai-notification-test`);
    }
    
    // 顯示匹配結果詳情
    if (matchingResults.length > 0) {
      console.log(`\n📋 匹配結果詳情:`);
      matchingResults.forEach((match, index) => {
        console.log(`${index + 1}. ${match.member.name} (${match.member.company})`);
        console.log(`   匹配度: ${match.score}% | 行業: ${match.member.industry}`);
        console.log(`   原因: ${match.reasons.join(', ')}`);
        console.log(`   ${match.score >= 60 ? '✅ 已發送通知' : '⏸️  匹配度不足，未發送通知'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ 創建許願失敗:', error);
  } finally {
    await pool.end();
  }
}

// 執行腳本
if (require.main === module) {
  createRealWish();
}

module.exports = { createRealWish };