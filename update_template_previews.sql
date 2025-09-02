-- 更新NFC名片模板預覽圖片
UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/tech-professional.svg'
WHERE name = '科技專業版';

UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/creative-vibrant.svg'
WHERE name = '活力創意版';

UPDATE nfc_card_templates 
SET preview_image_url = '/nfc-templates/minimal-elegant.svg'
WHERE name = '簡約質感版';

-- 檢查更新結果
SELECT id, name, preview_image_url FROM nfc_card_templates WHERE is_active = true;