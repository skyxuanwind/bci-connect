const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// 測試用戶數據
const testUsers = [
  {
    name: '張志明',
    email: 'zhang.zhiming@example.com',
    password: 'test123456',
    company: '明志科技有限公司',
    industry: '資訊科技',
    title: '執行長',
    contactNumber: '0912-345-678',
    membershipLevel: 1,
    status: 'active',
    interviewForm: {
      companyName: '明志科技有限公司',
      industry: '資訊科技',
      coreServices: '提供企業數位轉型解決方案，包括雲端服務、數據分析和AI應用開發',
      competitiveAdvantage: '擁有15年以上的技術團隊，專精於金融科技和電商平台開發',
      targetMarket: '中小企業和新創公司',
      idealCustomer: '年營收1000萬以上，希望進行數位轉型的傳統企業',
      customerExamples: '已協助超過50家企業完成數位轉型，包括製造業、零售業和服務業',
      customerTraits: '重視效率提升、成本控制，願意投資新技術',
      customerPainPoints: '缺乏技術人才、不知道如何開始數位轉型、擔心投資風險',
      referralTrigger: '當企業主提到營運效率低落、人工作業繁瑣時',
      referralOpening: '我們公司專門協助像您這樣的企業進行數位轉型',
      referralProblem: '解決企業數位化過程中的技術障礙和人才缺口',
      qualityReferral: '有明確數位轉型需求且預算充足的企業',
      unsuitableReferral: '預算不足或對新技術抗拒的傳統企業',
      partnerTypes: '系統整合商、管理顧問公司、會計師事務所',
      businessGoals: '3年內成為台灣中小企業數位轉型的領導品牌',
      personalInterests: '喜歡閱讀科技趨勢書籍、參加創新論壇、登山健行'
    }
  },
  {
    name: '李美華',
    email: 'li.meihua@example.com',
    password: 'test123456',
    company: '美華國際貿易股份有限公司',
    industry: '國際貿易',
    title: '總經理',
    contactNumber: '0923-456-789',
    membershipLevel: 2,
    status: 'active',
    interviewForm: {
      companyName: '美華國際貿易股份有限公司',
      industry: '國際貿易',
      coreServices: '專營歐美高端消費品進口，包括精品服飾、家居用品和健康食品',
      competitiveAdvantage: '與歐美20多個知名品牌建立獨家代理關係，擁有完整的進口供應鏈',
      targetMarket: '台灣高端零售通路和電商平台',
      idealCustomer: '追求品質的消費者和高端零售商',
      customerExamples: '合作夥伴包括百貨公司、精品店和知名電商平台',
      customerTraits: '重視品牌價值、產品品質和服務水準',
      customerPainPoints: '尋找獨特商品、供應穩定性、價格競爭力',
      referralTrigger: '當零售商在尋找新品牌或獨家商品時',
      referralOpening: '我們代理多個歐美知名品牌，可以提供獨家商品',
      referralProblem: '協助零售商找到差異化商品，提升競爭優勢',
      qualityReferral: '有實體通路或成熟電商平台的零售商',
      unsuitableReferral: '只追求低價、不重視品牌價值的客戶',
      partnerTypes: '物流公司、行銷公司、零售顧問',
      businessGoals: '成為台灣進口精品的首選供應商，拓展東南亞市場',
      personalInterests: '熱愛旅行、品酒、藝術收藏'
    }
  },
  {
    name: '王建國',
    email: 'wang.jianguo@example.com',
    password: 'test123456',
    company: '建國建設開發有限公司',
    industry: '建築營造',
    title: '董事長',
    contactNumber: '0934-567-890',
    membershipLevel: 1,
    status: 'active',
    interviewForm: {
      companyName: '建國建設開發有限公司',
      industry: '建築營造',
      coreServices: '住宅大樓開發、商業不動產投資、建築工程承包',
      competitiveAdvantage: '30年建築經驗，擁有優秀的設計和施工團隊，注重品質和創新',
      targetMarket: '首購族、換屋族和投資客',
      idealCustomer: '重視居住品質和投資價值的購屋者',
      customerExamples: '已完成超過20個建案，客戶滿意度達95%以上',
      customerTraits: '注重地段、品質、設計和增值潛力',
      customerPainPoints: '擔心建商信譽、施工品質、交屋延遲',
      referralTrigger: '當有人提到買房、換屋或投資需求時',
      referralOpening: '我們是有30年信譽的建設公司，專注品質住宅',
      referralProblem: '提供優質住宅選擇，確保投資保值增值',
      qualityReferral: '有明確購屋需求和足夠預算的客戶',
      unsuitableReferral: '預算不足或對地段要求過高的客戶',
      partnerTypes: '房仲業者、銀行、室內設計公司',
      businessGoals: '成為區域知名建商，開發更多優質建案',
      personalInterests: '高爾夫球、書法、古董收藏'
    }
  },
  {
    name: '陳雅婷',
    email: 'chen.yating@example.com',
    password: 'test123456',
    company: '雅婷美學診所',
    industry: '醫療美容',
    title: '院長',
    contactNumber: '0945-678-901',
    membershipLevel: 3,
    status: 'active',
    interviewForm: {
      companyName: '雅婷美學診所',
      industry: '醫療美容',
      coreServices: '提供專業醫學美容服務，包括微整形、雷射治療、皮膚保養',
      competitiveAdvantage: '擁有專業醫師團隊和先進設備，注重自然美感',
      targetMarket: '25-50歲注重外表的女性和男性',
      idealCustomer: '追求自然美、重視專業和安全的客戶',
      customerExamples: '服務過眾多藝人和企業主，口碑良好',
      customerTraits: '注重效果、安全性和服務品質',
      customerPainPoints: '擔心手術風險、效果不自然、價格透明度',
      referralTrigger: '當有人提到想要改善外表或抗老需求時',
      referralOpening: '我們診所專精自然美學，安全有效',
      referralProblem: '協助客戶安全地提升外表，增強自信',
      qualityReferral: '有明確美容需求且重視安全的客戶',
      unsuitableReferral: '期望過高或只追求低價的客戶',
      partnerTypes: '美容保養品牌、健身中心、時尚產業',
      businessGoals: '成為區域最受信賴的醫美診所',
      personalInterests: '瑜伽、美食、時尚穿搭'
    }
  },
  {
    name: '林志偉',
    email: 'lin.zhiwei@example.com',
    password: 'test123456',
    company: '志偉法律事務所',
    industry: '法律服務',
    title: '主持律師',
    contactNumber: '0956-789-012',
    membershipLevel: 2,
    status: 'active',
    interviewForm: {
      companyName: '志偉法律事務所',
      industry: '法律服務',
      coreServices: '提供企業法律顧問、契約審查、爭議處理等法律服務',
      competitiveAdvantage: '15年執業經驗，專精商事法和智慧財產權',
      targetMarket: '中小企業和新創公司',
      idealCustomer: '重視法律風險管控的企業主',
      customerExamples: '擔任50多家企業的法律顧問',
      customerTraits: '謹慎、重視專業、希望預防法律問題',
      customerPainPoints: '不了解法律風險、契約條款複雜、爭議處理困難',
      referralTrigger: '當企業面臨法律問題或需要契約審查時',
      referralOpening: '我專精企業法務，可以協助預防法律風險',
      referralProblem: '協助企業建立完善的法律風險管控機制',
      qualityReferral: '有法律顧問需求的成長型企業',
      unsuitableReferral: '只在出問題時才找律師的企業',
      partnerTypes: '會計師、管理顧問、銀行',
      businessGoals: '成為中小企業最信賴的法律夥伴',
      personalInterests: '閱讀、攝影、馬拉松'
    }
  }
];

// 創建測試用戶的函數
const createTestUsers = async () => {
  try {
    console.log('🚀 開始創建測試用戶...');
    
    for (const userData of testUsers) {
      // 檢查用戶是否已存在
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );
      
      if (existingUser.rows.length > 0) {
        console.log(`⚠️  用戶 ${userData.email} 已存在，跳過創建`);
        continue;
      }
      
      // 加密密碼
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // 生成NFC卡號
      const nfcCardId = `NFC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 插入用戶數據
      const result = await pool.query(
        `INSERT INTO users (
          name, email, password, company, industry, title, 
          contact_number, membership_level, status, nfc_card_id, interview_form
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, name, email`,
        [
          userData.name,
          userData.email,
          hashedPassword,
          userData.company,
          userData.industry,
          userData.title,
          userData.contactNumber,
          userData.membershipLevel,
          userData.status,
          nfcCardId,
          JSON.stringify(userData.interviewForm)
        ]
      );
      
      console.log(`✅ 成功創建用戶: ${result.rows[0].name} (${result.rows[0].email})`);
    }
    
    console.log('🎉 所有測試用戶創建完成！');
    console.log('\n📋 測試帳號列表:');
    testUsers.forEach(user => {
      console.log(`• ${user.name} - ${user.email} (密碼: ${user.password})`);
    });
    
  } catch (error) {
    console.error('❌ 創建測試用戶時發生錯誤:', error);
  } finally {
    await pool.end();
  }
};

// 如果直接執行此腳本
if (require.main === module) {
  createTestUsers();
}

module.exports = { createTestUsers, testUsers };