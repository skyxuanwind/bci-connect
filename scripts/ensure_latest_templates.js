// Ensure latest NFC card templates exist in PostgreSQL
// Safe, idempotent inserts for new 5 templates
require('dotenv').config();
const { pool } = require('../config/database');

async function ensureTemplates() {
  const queries = [
    {
      name: '極簡高級風格',
      description: '一頁式極簡設計，黑金配色，圓形個人大頭照，大量留白，科技感UI，高級質感',
      category: 'minimal-luxury',
      css_config: {
        primaryColor: '#000000',
        secondaryColor: '#FFD700',
        backgroundColor: '#FFFFFF',
        accentColor: '#C9B037',
        textColor: '#333333',
        fontFamily: 'Inter, sans-serif',
        cardShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        borderRadius: '24px',
        spacing: 'generous',
        layoutStyle: 'minimal-luxury',
        avatarStyle: 'circle',
        goldAccent: true
      },
      preview_image_url: '/nfc-templates/minimal-luxury.svg'
    },
    {
      name: '未來科技感風格',
      description: '深藍與霓虹藍紫配色，流線科技元素，半透明光圈環繞的大頭照，未來科技Dashboard風格',
      category: 'futuristic-tech',
      css_config: {
        primaryColor: '#0A1628',
        secondaryColor: '#1E3A8A',
        backgroundColor: '#0F172A',
        accentColor: '#3B82F6',
        neonColor: '#8B5CF6',
        glowColor: '#06B6D4',
        fontFamily: 'Orbitron, sans-serif',
        cardShadow: '0 0 40px rgba(59, 130, 246, 0.3)',
        borderRadius: '16px',
        layoutStyle: 'dashboard',
        avatarGlow: true,
        neonEffects: true
      },
      preview_image_url: '/nfc-templates/futuristic-tech.svg'
    },
    {
      name: '創意品牌風格',
      description: '橘＋藍＋白亮色系，大膽排版，左側大頭照，右側姓名職稱與標語，活潑有活力的創意設計',
      category: 'creative-brand',
      css_config: {
        primaryColor: '#FF6B35',
        secondaryColor: '#004E89',
        backgroundColor: '#FFFFFF',
        accentColor: '#1A8FE3',
        brightOrange: '#FF8C42',
        brightBlue: '#0077BE',
        fontFamily: 'Poppins, sans-serif',
        cardShadow: '0 12px 24px rgba(255, 107, 53, 0.15)',
        borderRadius: '20px',
        layoutStyle: 'split-creative',
        boldTypography: true,
        vibrantColors: true
      },
      preview_image_url: '/nfc-templates/creative-brand.svg'
    },
    {
      name: '專業商務風格',
      description: '白底＋藏青色＋灰色，頂部姓名職稱，中間大頭照，企業Logo與QR Code，乾淨大方的專業風格',
      category: 'professional-business',
      css_config: {
        primaryColor: '#1E3A8A',
        secondaryColor: '#6B7280',
        backgroundColor: '#FFFFFF',
        accentColor: '#3B82F6',
        navyBlue: '#1E40AF',
        lightGray: '#F3F4F6',
        fontFamily: 'Inter, sans-serif',
        cardShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        borderRadius: '12px',
        layoutStyle: 'corporate',
        professionalSpacing: true,
        logoSupport: true
      },
      preview_image_url: '/nfc-templates/professional-business.svg'
    },
    {
      name: '動態互動風格',
      description: '紫＋粉＋藍漸層背景，流動動畫，中央大頭照，下方姓名職稱，底部大型QR code，互動性強的動態設計',
      category: 'dynamic-interactive',
      css_config: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        accentColor: '#06B6D4',
        gradientPurple: '#8B5CF6',
        gradientPink: '#EC4899',
        gradientBlue: '#3B82F6',
        fontFamily: 'Inter, sans-serif',
        cardShadow: '0 20px 40px rgba(139, 92, 246, 0.3)',
        borderRadius: '28px',
        layoutStyle: 'dynamic-center',
        animations: true,
        largeQR: true
      },
      preview_image_url: '/nfc-templates/dynamic-interactive.svg'
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
       WHERE name IN ('極簡高級風格','未來科技感風格','創意品牌風格','專業商務風格','動態互動風格') ORDER BY id`
    );
    console.log('📋 Verified templates:', result.rows);
  })
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });