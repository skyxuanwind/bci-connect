// Ensure latest NFC card templates exist in PostgreSQL
// Safe, idempotent inserts for: 質感黑金版, 插畫塗鴉版
require('dotenv').config();
const { pool } = require('../config/database');

async function ensureTemplates() {
  const queries = [
    {
      name: '質感黑金版',
      description: '高級商務質感，黑金配色搭配粒子動效和光束效果，展現專業與奢華',
      category: 'tech-professional',
      css_config: { className: 'template-luxury' },
      preview_image_url: '/nfc-templates/luxury-gold.svg'
    },
    {
      name: '插畫塗鴉版',
      description: '美式塗鴉風格，活潑創意設計，豐富色彩和動態效果，展現個性與創意',
      category: 'creative-vibrant',
      css_config: { className: 'template-graffiti' },
      preview_image_url: '/nfc-templates/graffiti-style.svg'
    }
  ];

  for (const t of queries) {
    try {
      const exists = await pool.query(
        'SELECT 1 FROM nfc_card_templates WHERE name = $1 LIMIT 1',
        [t.name]
      );
      if (exists.rowCount === 0) {
        await pool.query(
          `INSERT INTO nfc_card_templates 
           (name, description, category, css_config, preview_image_url, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, true, NOW(), NOW())`,
          [t.name, t.description, t.category, JSON.stringify(t.css_config), t.preview_image_url]
        );
        console.log(`✅ Inserted template: ${t.name}`);
      } else {
        console.log(`ℹ️ Template already exists: ${t.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed ensuring template ${t.name}:`, err.message);
      throw err;
    }
  }
}

ensureTemplates()
  .then(async () => {
    // Verify
    const result = await pool.query(
      `SELECT id, name, category, is_active FROM nfc_card_templates 
       WHERE name IN ('質感黑金版','插畫塗鴉版') ORDER BY id`
    );
    console.log('📋 Verified templates:', result.rows);
  })
  .catch((e) => {
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await pool.end(); } catch {}
  });