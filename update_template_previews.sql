-- 更新NFC名片模板預覽圖片
UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/minimalist-premium.svg'
WHERE name = '極簡高級風格';

UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/tech-futuristic.svg'
WHERE name = '未來科技感風格';

UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/creative-brand.svg'
WHERE name = '創意品牌風格';

UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/business-professional.svg'
WHERE name = '專業商務風格';

UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/interactive-dynamic.svg'
WHERE name = '動態互動風格';

-- 檢查更新結果
SELECT id, name, preview_image_url FROM nfc_card_templates WHERE is_active = true;