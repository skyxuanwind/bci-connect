const { pool } = require('../config/database');
const { AINotificationService } = require('../services/aiNotificationService');

const aiNotificationService = new AINotificationService();

// 測試通知數據
const testNotifications = [
  {
    recipientEmail: 'zhang.zhiming@example.com',
    type: 'wish_opportunity',
    title: '🎯 AI為您發現新商機！',
    content: 'AI合作網絡發現新機會！李美華（美華國際貿易股份有限公司）剛剛發布了「尋找台灣在地優質品牌代理」的商業需求。這與您的數位轉型專業背景高度吻合，匹配度達85分。',
    relatedUserEmail: 'li.meihua@example.com',
    matchingScore: 85,
    aiReasoning: '基於您的AI深度畫像分析，該商業需求與您的專業能力和合作意向高度匹配，評分為85分。雙方在品牌數位化和市場拓展方面具有互補性。',
    priority: 2
  },
  {
    recipientEmail: 'li.meihua@example.com',
    type: 'collaboration_opportunity',
    title: '🤝 AI發現新的合作機會！',
    content: 'AI合作網絡發現新機會！根據您的商業畫像，王建國（建國建設開發有限公司）與您有高度合作潛力。系統評估匹配度達92分，建議您立即發起商務面談。',
    relatedUserEmail: 'wang.jianguo@example.com',
    matchingScore: 92,
    aiReasoning: '基於商業互補性和協同效應分析，該會員與您的合作潛力評分為92分。雙方在高端客戶服務和品牌價值提升方面具有高度互補性。',
    priority: 3
  },
  {
    recipientEmail: 'wang.jianguo@example.com',
    type: 'wish_opportunity',
    title: '🎯 AI為您發現新商機！',
    content: 'AI合作網絡發現新機會！張志明（明志科技有限公司）剛剛發布了「尋找數位行銷合作夥伴」的商業需求。這與您的建案行銷需求高度吻合，匹配度達78分。',
    relatedUserEmail: 'zhang.zhiming@example.com',
    matchingScore: 78,
    aiReasoning: '基於您的AI深度畫像分析，該數位行銷服務與您的建案推廣需求高度匹配，評分為78分。可協助提升建案的數位曝光度。',
    priority: 2
  },
  {
    recipientEmail: 'chen.yating@example.com',
    type: 'meeting_insights',
    title: '💡 會議智慧洞察',
    content: '根據您最近的商務活動分析，AI發現您與高端消費品牌的合作機會正在增加。建議您關注美容科技和個人形象管理的新趨勢，這可能為您的診所帶來新的服務項目。',
    matchingScore: null,
    aiReasoning: '基於您的行業趨勢分析和客戶需求變化，AI預測美容科技將是未來重要發展方向。',
    priority: 2
  },
  {
    recipientEmail: 'lin.zhiwei@example.com',
    type: 'market_opportunity',
    title: '📈 市場趨勢機會',
    content: '市場分析顯示，隨著數位轉型加速，企業對法律科技服務的需求正在快速增長。建議您考慮拓展智慧財產權和數據保護相關的法律服務，預估市場成長率達30%。',
    matchingScore: null,
    aiReasoning: '基於市場趨勢分析和您的專業領域，法律科技服務將是未來3年的重要成長機會。',
    priority: 2
  }
];

async function triggerTestNotifications() {
  try {
    console.log('🚀 開始觸發測試 AI 智慧通知...');
    
    // 連接資料庫
    console.log('🔗 連接資料庫...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const notificationData of testNotifications) {
      try {
        // 獲取接收者用戶ID
        const recipientResult = await pool.query(
          'SELECT id, name FROM users WHERE email = $1',
          [notificationData.recipientEmail]
        );
        
        if (recipientResult.rows.length === 0) {
          console.log(`❌ 找不到接收者: ${notificationData.recipientEmail}`);
          errorCount++;
          continue;
        }
        
        const recipient = recipientResult.rows[0];
        
        // 獲取相關用戶ID（如果有）
        let relatedUserId = null;
        if (notificationData.relatedUserEmail) {
          const relatedUserResult = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [notificationData.relatedUserEmail]
          );
          
          if (relatedUserResult.rows.length > 0) {
            relatedUserId = relatedUserResult.rows[0].id;
          }
        }
        
        // 檢查是否已存在相同的通知（避免重複）
        const existingNotification = await pool.query(`
          SELECT id FROM ai_notifications 
          WHERE user_id = $1 AND title = $2 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
        `, [recipient.id, notificationData.title]);
        
        if (existingNotification.rows.length > 0) {
          console.log(`⚠️  通知「${notificationData.title}」已存在，跳過創建`);
          continue;
        }
        
        // 創建通知數據
        const notificationPayload = {
          title: notificationData.title,
          content: notificationData.content,
          relatedUserId: relatedUserId,
          relatedWishId: null, // 測試通知不關聯特定許願
          matchingScore: notificationData.matchingScore,
          aiReasoning: notificationData.aiReasoning,
          priority: notificationData.priority
        };
        
        // 創建通知
        const notificationId = await aiNotificationService.createNotification(
          recipient.id,
          notificationData.type,
          notificationPayload
        );
        
        console.log(`✅ 已為 ${recipient.name} 創建通知: ${notificationData.title} (ID: ${notificationId})`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ 創建通知失敗 (${notificationData.recipientEmail}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 測試 AI 智慧通知觸發完成！');
    console.log(`📊 統計結果: 成功 ${successCount} 個，失敗 ${errorCount} 個`);
    
    console.log('\n📱 現在您可以：');
    console.log('1. 登入任一測試帳號');
    console.log('2. 前往 AI 智慧通知頁面 (/notifications)');
    console.log('3. 查看收到的 AI 智慧通知');
    console.log('4. 測試 AI 通知測試頁面 (/ai-notification-test)');
    
    console.log('\n🔑 測試帳號資訊：');
    console.log('   • zhang.zhiming@example.com (密碼: test123456) - 張志明');
    console.log('   • li.meihua@example.com (密碼: test123456) - 李美華');
    console.log('   • wang.jianguo@example.com (密碼: test123456) - 王建國');
    console.log('   • chen.yating@example.com (密碼: test123456) - 陳雅婷');
    console.log('   • lin.zhiwei@example.com (密碼: test123456) - 林志偉');
    
  } catch (error) {
    console.error('❌ 觸發測試通知失敗:', error);
  } finally {
    // 關閉資料庫連接
    await pool.end();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  triggerTestNotifications();
}

module.exports = { triggerTestNotifications };