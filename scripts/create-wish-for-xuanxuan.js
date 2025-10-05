const { pool } = require('../config/database');
const { AIMatchingService } = require('../services/aiMatchingService');

const aiMatchingService = new AIMatchingService();

/**
 * 創建一個能讓吳岳軒收到通知的許願
 */
async function createWishForXuanxuan() {
  try {
    console.log('🚀 開始創建能讓吳岳軒收到通知的許願...');
    
    // 使用系統管理員或其他用戶來發布許願
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [1] // 系統管理員
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ 找不到發布用戶');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`👤 使用用戶: ${user.name} (${user.email}) - ${user.company}`);
    
    // 創建一個需要影音行銷服務的許願
    const wishData = {
      title: '急需專業品牌形象影片製作服務',
      description: `我們公司正在進行品牌重塑，急需專業的影音製作團隊協助我們製作以下內容：\n\n需求項目：\n• 企業形象宣傳片（3-5分鐘）\n• 產品介紹短片系列\n• 社群媒體影音內容\n• 高階主管專訪影片\n• 公司活動紀錄片\n\n我們的要求：\n- 具備豐富的企業影片製作經驗\n- 能夠理解B2B企業的品牌需求\n- 提供從企劃到後製的完整服務\n- 有成功的大型企業合作案例\n- 能配合緊急時程安排\n\n預算充足，希望能找到真正專業且有創意的影音製作團隊，建立長期合作關係。特別歡迎有數位行銷背景的製作公司。`,
      category: '專業服務',
      tags: ['影片製作', '品牌行銷', '企業宣傳', '影音服務', '數位行銷', '創意製作'],
      priority: 3 // 高優先級
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
    
    // 不再進行AI媒合或發送通知，僅建立許願與記錄活動
    console.log(`\n🎉 許願發布完成！`);
    console.log(`📊 統計資訊:`);
    console.log(`   - 許願ID: ${wish.id}`);
    console.log(`   - 已停用願望相關AI通知與媒合流程`);
    
  } catch (error) {
    console.error('❌ 創建許願失敗:', error);
  } finally {
    await pool.end();
  }
}

// 執行腳本
if (require.main === module) {
  createWishForXuanxuan();
}

module.exports = { createWishForXuanxuan };