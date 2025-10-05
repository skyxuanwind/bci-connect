const { pool } = require('../config/database');
const { AIMatchingService } = require('../services/aiMatchingService');

const aiMatchingService = new AIMatchingService();

// 測試許願數據
const testWishes = [
  {
    userEmail: 'zhang.zhiming@example.com',
    title: '尋找數位行銷合作夥伴',
    description: '我們是一家專精於企業數位轉型的科技公司，目前正在尋找有經驗的數位行銷團隊合作。希望能找到擅長社群媒體經營、SEO優化和內容行銷的夥伴，一起為中小企業客戶提供完整的數位解決方案。',
    category: 'partnership',
    tags: ['數位行銷', 'SEO', '社群媒體', '內容行銷'],
    priority: 2
  },
  {
    userEmail: 'li.meihua@example.com',
    title: '尋找台灣在地優質品牌代理',
    description: '美華國際貿易正在尋找台灣在地的優質品牌進行代理合作。我們有完整的歐美進口供應鏈經驗，希望能協助台灣品牌拓展海外市場，特別是歐美地區。歡迎有出口需求的優質品牌與我們聯繫。',
    category: 'business_development',
    tags: ['品牌代理', '國際貿易', '出口', '歐美市場'],
    priority: 3
  },
  {
    userEmail: 'wang.jianguo@example.com',
    title: '尋找室內設計合作夥伴',
    description: '建國建設正在尋找優秀的室內設計團隊合作。我們有多個新建案即將完工，需要專業的室內設計師為客戶提供裝潢服務。希望找到有豐富住宅設計經驗、重視品質和創新的設計團隊。',
    category: 'service_provider',
    tags: ['室內設計', '住宅裝潢', '建案合作', '設計服務'],
    priority: 2
  }
];

async function createTestWish() {
  try {
    console.log('🚀 開始創建測試許願...');
    
    // 連接資料庫
    console.log('🔗 連接資料庫...');
    
    for (const wishData of testWishes) {
      try {
        // 獲取用戶ID
        const userResult = await pool.query(
          'SELECT id, name FROM users WHERE email = $1',
          [wishData.userEmail]
        );
        
        if (userResult.rows.length === 0) {
          console.log(`❌ 找不到用戶: ${wishData.userEmail}`);
          continue;
        }
        
        const user = userResult.rows[0];
        console.log(`👤 為用戶 ${user.name} 創建許願: ${wishData.title}`);
        
        // 檢查是否已存在相同標題的許願
        const existingWish = await pool.query(
          'SELECT id FROM member_wishes WHERE user_id = $1 AND title = $2',
          [user.id, wishData.title]
        );
        
        if (existingWish.rows.length > 0) {
          console.log(`⚠️  許願「${wishData.title}」已存在，跳過創建`);
          continue;
        }
        
        // 使用AI分析許願內容
        console.log('🤖 開始AI分析許願內容...');
        const extractedIntents = await aiMatchingService.analyzeWishContent(
          wishData.description,
          wishData.title,
          wishData.category
        );
        
        // 創建許願記錄
        const result = await pool.query(`
          INSERT INTO member_wishes 
          (user_id, title, description, category, tags, ai_extracted_intents, priority)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
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
        console.log(`✅ 許願創建成功 - ID: ${wish.id}`);
        
        // 記錄用戶活動
        await pool.query(`
          INSERT INTO member_activities (user_id, activity_type, activity_data)
          VALUES ($1, 'wish_created', $2)
        `, [user.id, JSON.stringify({ wish_id: wish.id, title: wishData.title, category: wishData.category })]);
        
        // 不再進行AI媒合或發送通知，僅建立許願與記錄活動
        console.log('🔕 已停用願望相關AI通知與媒合流程');
        console.log('---');
        
      } catch (error) {
        console.error(`❌ 創建許願失敗 (${wishData.title}):`, error.message);
      }
    }
    
    console.log('🎉 測試許願創建完成！');
    console.log('\n📱 現在您可以：');
    console.log('1. 登入任一測試帳號查看願望板');
    console.log('2. 檢視許願詳情與AI分析結果（不含推薦與通知）');
    console.log('3. 測試帳號資訊：');
    console.log('   • zhang.zhiming@example.com (密碼: test123456)');
    console.log('   • li.meihua@example.com (密碼: test123456)');
    console.log('   • wang.jianguo@example.com (密碼: test123456)');
    console.log('   • chen.yating@example.com (密碼: test123456)');
    console.log('   • lin.zhiwei@example.com (密碼: test123456)');
    
  } catch (error) {
    console.error('❌ 創建測試許願失敗:', error);
  } finally {
    // 關閉資料庫連接
    await pool.end();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  createTestWish();
}

module.exports = { createTestWish };