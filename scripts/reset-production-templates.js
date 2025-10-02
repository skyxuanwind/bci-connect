#!/usr/bin/env node

/**
 * 生產環境 NFC 模板重置腳本
 * 此腳本會清理所有舊模板並重新初始化新的五種模板
 */

const { Pool } = require('pg');

// 使用生產環境資料庫連接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const NEW_TEMPLATES = [
  {
    name: '質感商務感',
    description: '高質感商務設計，展現專業與品味的完美結合',
    category: 'premium-business',
    css_config: {
      className: 'template-premium-business',
      primaryColor: '#1a365d',
      secondaryColor: '#2d3748',
      accentColor: '#3182ce',
      backgroundColor: '#f7fafc',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '12px',
      cardShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      gradientFrom: '#1a365d',
      gradientTo: '#2d3748'
    },
    preview_image_url: '/nfc-templates/premium-business.svg'
  },
  {
    name: 'Cyberpunk風格',
    description: '未來科技感設計，霓虹色彩與數位美學的視覺衝擊',
    category: 'cyberpunk',
    css_config: {
      className: 'template-cyberpunk',
      primaryColor: '#0d1117',
      secondaryColor: '#21262d',
      accentColor: '#f85149',
      backgroundColor: '#010409',
      fontFamily: 'Orbitron, monospace',
      borderRadius: '8px',
      cardShadow: '0 0 20px rgba(248, 81, 73, 0.3)',
      gradientFrom: '#0d1117',
      gradientTo: '#21262d',
      neonGlow: true
    },
    preview_image_url: '/nfc-templates/cyberpunk.svg'
  },
  {
    name: '簡約日系風',
    description: '日式極簡美學，清新自然的設計語言',
    category: 'japanese-minimal',
    css_config: {
      className: 'template-japanese-minimal',
      primaryColor: '#2d3748',
      secondaryColor: '#4a5568',
      accentColor: '#38a169',
      backgroundColor: '#fffffe',
      fontFamily: 'Noto Sans JP, sans-serif',
      borderRadius: '16px',
      cardShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      minimalist: true,
      spacing: 'large'
    },
    preview_image_url: '/nfc-templates/japanese-minimal.svg'
  },
  {
    name: '創意行銷風格',
    description: '活潑創意設計，吸引眼球的行銷視覺效果',
    category: 'creative-marketing',
    css_config: {
      className: 'template-creative-marketing',
      primaryColor: '#d53f8c',
      secondaryColor: '#ed64a6',
      accentColor: '#f093fb',
      backgroundColor: '#fef5e7',
      fontFamily: 'Poppins, sans-serif',
      borderRadius: '20px',
      cardShadow: '0 15px 35px rgba(213, 63, 140, 0.2)',
      gradientFrom: '#d53f8c',
      gradientTo: '#f093fb',
      vibrant: true
    },
    preview_image_url: '/nfc-templates/creative-marketing.svg'
  },
  {
    name: '塗鴉可愛風',
    description: '手繪塗鴉風格，充滿童趣與創意的可愛設計',
    category: 'cute-graffiti',
    css_config: {
      className: 'template-cute-graffiti',
      primaryColor: '#ff6b6b',
      secondaryColor: '#4ecdc4',
      accentColor: '#ffe66d',
      backgroundColor: '#fff3e0',
      fontFamily: 'Comic Neue, cursive',
      borderRadius: '24px',
      cardShadow: '0 8px 20px rgba(255, 107, 107, 0.3)',
      playful: true,
      handDrawn: true
    },
    preview_image_url: '/nfc-templates/cute-graffiti.svg'
  }
];

async function resetProductionTemplates() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 開始重置生產環境 NFC 模板...');
    
    // 開始事務
    await client.query('BEGIN');
    
    // 1. 清理所有現有模板（級聯刪除相關數據）
    console.log('🗑️  清理現有模板數據...');
    await client.query('TRUNCATE TABLE nfc_card_templates RESTART IDENTITY CASCADE');
    
    // 2. 更新 category 約束以支持新的模板類別
    console.log('🔧 更新資料庫約束...');
    try {
      await client.query('ALTER TABLE nfc_card_templates DROP CONSTRAINT IF EXISTS nfc_card_templates_category_check');
    } catch (e) {
      console.log('約束不存在，跳過刪除');
    }
    
    await client.query(`
      ALTER TABLE nfc_card_templates 
      ADD CONSTRAINT nfc_card_templates_category_check 
      CHECK (category IN ('premium-business', 'cyberpunk', 'japanese-minimal', 'creative-marketing', 'cute-graffiti'))
    `);
    
    // 3. 插入新的模板
    console.log('📝 插入新的模板...');
    for (const template of NEW_TEMPLATES) {
      await client.query(
        `INSERT INTO nfc_card_templates (name, description, category, css_config, preview_image_url, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
        [
          template.name,
          template.description,
          template.category,
          JSON.stringify(template.css_config),
          template.preview_image_url
        ]
      );
      console.log(`✅ 已插入模板: ${template.name}`);
    }
    
    // 提交事務
    await client.query('COMMIT');
    
    // 4. 驗證結果
    const result = await client.query('SELECT id, name, category FROM nfc_card_templates ORDER BY id');
    console.log('\n📊 模板重置完成！當前模板列表:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}. ${row.name} (${row.category})`);
    });
    
    console.log(`\n🎉 成功重置 ${result.rows.length} 個模板！`);
    
  } catch (error) {
    // 回滾事務
    await client.query('ROLLBACK');
    console.error('❌ 重置失敗:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 執行腳本
if (require.main === module) {
  resetProductionTemplates()
    .then(() => {
      console.log('✅ 生產環境模板重置完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 重置失敗:', error);
      process.exit(1);
    });
}

module.exports = { resetProductionTemplates };