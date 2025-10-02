-- 添加新的電子名片模板：五種全新風格模板
-- 此腳本是冪等的，可以安全地重複執行

-- 檢查並添加極簡高級風格模板
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
    '極簡高級風格',
    '簡潔優雅的設計，注重留白與層次，展現專業品味',
    'minimalist',
    '{"className": "template-minimalist-premium"}',
    '/nfc-templates/minimalist-premium.svg',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM nfc_card_templates WHERE name = '極簡高級風格'
);

-- 檢查並添加未來科技感風格模板
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
    '未來科技感風格',
    '前衛科技設計，動態效果與漸變色彩，展現創新精神',
    'tech-futuristic',
    '{"className": "template-tech-futuristic"}',
    '/nfc-templates/tech-futuristic.svg',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM nfc_card_templates WHERE name = '未來科技感風格'
);

-- 檢查並添加創意品牌風格模板
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
    '創意品牌風格',
    '活潑創意設計，豐富色彩與動畫效果，展現品牌個性',
    'creative-brand',
    '{"className": "template-creative-brand"}',
    '/nfc-templates/creative-brand.svg',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM nfc_card_templates WHERE name = '創意品牌風格'
);

-- 檢查並添加專業商務風格模板
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
    '專業商務風格',
    '正式商務設計，穩重配色與清晰佈局，展現專業形象',
    'business-professional',
    '{"className": "template-business-professional"}',
    '/nfc-templates/business-professional.svg',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM nfc_card_templates WHERE name = '專業商務風格'
);

-- 檢查並添加動態互動風格模板
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
    '動態互動風格',
    '豐富互動效果，動態元素與視覺反饋，提升用戶體驗',
    'interactive-dynamic',
    '{"className": "template-interactive-dynamic"}',
    '/nfc-templates/interactive-dynamic.svg',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM nfc_card_templates WHERE name = '動態互動風格'
);

-- 驗證插入結果
SELECT id, name, description, category, is_active 
FROM nfc_card_templates 
WHERE name IN ('極簡高級風格', '未來科技感風格', '創意品牌風格', '專業商務風格', '動態互動風格')
ORDER BY created_at DESC;