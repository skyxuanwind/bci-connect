-- 添加新的電子名片模板：質感黑金版和插畫塗鴉版
-- 執行日期: 2025-10-01
-- 描述: 為電子名片編輯器添加兩個新的設計模板

-- 檢查並添加質感黑金版模板
INSERT INTO nfc_card_templates (
  name, 
  description, 
  category,
  css_config, 
  preview_image_url, 
  is_active,
  created_at,
  updated_at
) 
SELECT 
  '質感黑金版',
  '高級商務質感，黑金配色搭配粒子動效和光束效果，展現專業與奢華',
  'tech-professional',
  '{"className": "template-luxury"}',
  '/nfc-templates/luxury-gold.svg',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM nfc_card_templates WHERE name = '質感黑金版'
);

-- 檢查並添加插畫塗鴉版模板
INSERT INTO nfc_card_templates (
  name, 
  description, 
  category,
  css_config, 
  preview_image_url, 
  is_active,
  created_at,
  updated_at
) 
SELECT 
  '插畫塗鴉版',
  '美式塗鴉風格，活潑創意設計，豐富色彩和動態效果，展現個性與創意',
  'creative-vibrant',
  '{"className": "template-graffiti"}',
  '/nfc-templates/graffiti-style.svg',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM nfc_card_templates WHERE name = '插畫塗鴉版'
);

-- 驗證插入結果
SELECT 
  id, 
  name, 
  category, 
  is_active,
  created_at
FROM nfc_card_templates 
WHERE name IN ('質感黑金版', '插畫塗鴉版')
ORDER BY created_at DESC;