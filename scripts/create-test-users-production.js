const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// 生產環境測試帳號創建腳本
// 此腳本設計為在 Render 生產環境中運行

const testUsers = [
  {
    name: '張志明',
    email: 'test1@example.com',
    password: 'test123456',
    company: '創新科技有限公司',
    industry: '資訊科技',
    title: '技術總監',
    contact_number: '0912-345-678',
    chapter_id: 1,
    membership_level: 2,
    status: 'active',
    interview_form: {
      company_description: '專注於AI和機器學習解決方案的科技公司',
      services: ['AI諮詢', '機器學習開發', '數據分析'],
      competitive_advantage: '擁有頂尖的AI研發團隊和豐富的產業經驗',
      target_market: '中大型企業的數位轉型需求',
      referral_strategy: '透過技術研討會和產業合作建立人脈網絡',
      business_goals: '成為台灣領先的AI解決方案提供商',
      networking_interests: ['技術創新', '產業趨勢', '投資機會'],
      personal_interests: ['閱讀科技書籍', '參加技術會議', '戶外運動']
    }
  },
  {
    name: '李美華',
    email: 'test2@example.com',
    password: 'test123456',
    company: '綠能環保股份有限公司',
    industry: '環保能源',
    title: '營運經理',
    contact_number: '0923-456-789',
    chapter_id: 1,
    membership_level: 3,
    status: 'active',
    interview_form: {
      company_description: '致力於可再生能源和環保技術的推廣',
      services: ['太陽能系統安裝', '節能諮詢', '環保產品銷售'],
      competitive_advantage: '完整的綠能解決方案和專業的技術團隊',
      target_market: '住宅和商業建築的綠能需求',
      referral_strategy: '透過環保展覽和社區推廣活動拓展客戶',
      business_goals: '推動台灣綠能產業發展，創造永續未來',
      networking_interests: ['環保政策', '綠能技術', '永續發展'],
      personal_interests: ['環保活動', '登山健行', '有機農業']
    }
  },
  {
    name: '王建國',
    email: 'test3@example.com',
    password: 'test123456',
    company: '精品餐飲集團',
    industry: '餐飲服務',
    title: '執行長',
    contact_number: '0934-567-890',
    chapter_id: 1,
    membership_level: 1,
    status: 'active',
    interview_form: {
      company_description: '經營多家高端餐廳和咖啡廳的餐飲集團',
      services: ['精緻餐飲', '宴會服務', '餐飲顧問'],
      competitive_advantage: '獨特的料理風格和優質的服務品質',
      target_market: '追求高品質餐飲體驗的消費者',
      referral_strategy: '透過美食評論和口碑行銷建立品牌知名度',
      business_goals: '成為台灣最具影響力的精品餐飲品牌',
      networking_interests: ['美食文化', '品牌經營', '服務創新'],
      personal_interests: ['品酒', '旅遊美食', '烹飪藝術']
    }
  },
  {
    name: '陳淑芬',
    email: 'test4@example.com',
    password: 'test123456',
    company: '健康生活顧問公司',
    industry: '健康醫療',
    title: '創辦人',
    contact_number: '0945-678-901',
    chapter_id: 1,
    membership_level: 2,
    status: 'active',
    interview_form: {
      company_description: '提供個人化健康管理和生活方式改善服務',
      services: ['健康諮詢', '營養規劃', '運動指導'],
      competitive_advantage: '結合醫學專業和個人化服務的全方位健康管理',
      target_market: '注重健康生活品質的中高收入族群',
      referral_strategy: '透過健康講座和醫療機構合作推廣服務',
      business_goals: '幫助更多人建立健康的生活方式',
      networking_interests: ['預防醫學', '營養科學', '運動健康'],
      personal_interests: ['瑜伽', '健康料理', '馬拉松']
    }
  },
  {
    name: '林志偉',
    email: 'test5@example.com',
    password: 'test123456',
    company: '數位行銷策略公司',
    industry: '數位行銷',
    title: '策略總監',
    contact_number: '0956-789-012',
    chapter_id: 1,
    membership_level: 3,
    status: 'active',
    interview_form: {
      company_description: '專業的數位行銷和品牌策略顧問公司',
      services: ['數位行銷策略', '社群媒體管理', '品牌顧問'],
      competitive_advantage: '深度的市場洞察和創新的行銷手法',
      target_market: '需要數位轉型的傳統企業和新創公司',
      referral_strategy: '透過成功案例分享和行銷研討會建立專業形象',
      business_goals: '成為企業數位轉型的最佳夥伴',
      networking_interests: ['數位趨勢', '行銷創新', '品牌策略'],
      personal_interests: ['攝影', '設計', '新媒體藝術']
    }
  }
];

async function createTestUsers() {
  let pool;
  
  try {
    // 使用 Render 提供的 DATABASE_URL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('🔗 連接到生產資料庫...');
    
    // 測試資料庫連接
    await pool.query('SELECT NOW()');
    console.log('✅ 資料庫連接成功');

    console.log('👥 開始創建測試帳號...');

    for (const user of testUsers) {
      try {
        // 檢查用戶是否已存在
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length > 0) {
          console.log(`⚠️  用戶 ${user.email} 已存在，跳過創建`);
          continue;
        }

        // 加密密碼
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        // 生成唯一的 NFC 卡號
        let nfcCardId;
        let isUnique = false;
        while (!isUnique) {
          nfcCardId = 'NFC' + Math.random().toString(36).substr(2, 8).toUpperCase();
          const existingCard = await pool.query(
            'SELECT id FROM users WHERE nfc_card_id = $1',
            [nfcCardId]
          );
          isUnique = existingCard.rows.length === 0;
        }

        // 插入用戶
        const result = await pool.query(`
          INSERT INTO users (
            name, email, password, company, industry, title, 
            contact_number, chapter_id, membership_level, status, 
            nfc_card_id, interview_form, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
          ) RETURNING id, name, email
        `, [
          user.name,
          user.email,
          hashedPassword,
          user.company,
          user.industry,
          user.title,
          user.contact_number,
          user.chapter_id,
          user.membership_level,
          user.status,
          nfcCardId,
          JSON.stringify(user.interview_form)
        ]);

        console.log(`✅ 成功創建用戶: ${result.rows[0].name} (${result.rows[0].email})`);
        
      } catch (userError) {
        console.error(`❌ 創建用戶 ${user.email} 失敗:`, userError.message);
      }
    }

    console.log('\n🎉 測試帳號創建完成！');
    console.log('\n📋 測試帳號資訊:');
    console.log('================================');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   公司: ${user.company}`);
      console.log(`   職位: ${user.title}`);
      console.log(`   會員等級: ${user.membership_level}`);
      console.log('');
    });
    console.log('🔑 所有測試帳號密碼: test123456');
    console.log('\n💡 您現在可以使用這些帳號登入系統進行測試');
    
  } catch (error) {
    console.error('❌ 創建測試帳號時發生錯誤:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('🔌 資料庫連接已關閉');
    }
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  createTestUsers();
}

module.exports = { createTestUsers };