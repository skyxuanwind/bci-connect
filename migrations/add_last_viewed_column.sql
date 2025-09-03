-- 添加 last_viewed 欄位到 nfc_card_collections 表
-- 這個遷移腳本確保在 Render 部署時正確添加缺少的欄位

-- 添加 last_viewed 欄位（如果不存在）
ALTER TABLE nfc_card_collections 
ADD COLUMN IF NOT EXISTS last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 為現有記錄設置預設值
UPDATE nfc_card_collections 
SET last_viewed = collected_at 
WHERE last_viewed IS NULL;

-- 確認欄位已添加
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'nfc_card_collections' 
AND column_name = 'last_viewed';

SELECT 'last_viewed 欄位已成功添加到 nfc_card_collections 表' as message;