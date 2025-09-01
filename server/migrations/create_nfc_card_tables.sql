-- NFC 電子名片系統數據表創建腳本
-- 執行時間: 2024-01-01

-- 1. 創建 NFC 名片模板表
CREATE TABLE IF NOT EXISTS nfc_card_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    css_config JSONB DEFAULT '{}',
    preview_image VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 創建 NFC 名片主表
CREATE TABLE IF NOT EXISTS nfc_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES nfc_card_templates(id) ON DELETE SET NULL,
    card_title VARCHAR(200) NOT NULL,
    card_subtitle VARCHAR(300),
    custom_css TEXT,
    is_active BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- 每個用戶只能有一張名片
);

-- 3. 創建 NFC 名片內容區塊表
CREATE TABLE IF NOT EXISTS nfc_card_content (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- text, link, video, image, social, map
    content_data JSONB NOT NULL DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    custom_styles JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 創建 NFC 名片訪問記錄表（可選，用於統計）
CREATE TABLE IF NOT EXISTS nfc_card_visits (
    id SERIAL PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
    visitor_ip VARCHAR(45),
    visitor_user_agent TEXT,
    referrer VARCHAR(500),
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(100)
);

-- 5. 插入默認模板數據
INSERT INTO nfc_card_templates (name, description, css_config, display_order) VALUES 
('科技專業版', '採用柔和漸變色與半透明材質，搭配簡潔的卡片式區塊，營造科技感和沉穩氛圍。支援深色/淺色模式切換。', 
 '{
   "primary_color": "#667eea",
   "secondary_color": "#764ba2",
   "background_type": "gradient",
   "card_style": "glass",
   "supports_dark_mode": true
 }', 1),
('活力創意版', '使用高飽和度對比色，搭配大膽圓角和有機曲線。排版設計活潑，營造動態感。', 
 '{
   "primary_color": "#ff6b6b",
   "secondary_color": "#feca57",
   "accent_colors": ["#48dbfb", "#ff9ff3"],
   "background_type": "animated_gradient",
   "card_style": "creative",
   "supports_dark_mode": false
 }', 2),
('簡約質感版', '極簡設計、線條俐落，大量使用留白。採用沉穩色調，所有元素都使用圓潤造型。', 
 '{
   "primary_color": "#1e293b",
   "secondary_color": "#64748b",
   "background_type": "solid",
   "card_style": "minimal",
   "supports_dark_mode": false
 }', 3)
ON CONFLICT (name) DO NOTHING;

-- 6. 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_nfc_cards_user_id ON nfc_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_cards_is_active ON nfc_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_nfc_card_content_card_id ON nfc_card_content(card_id);
CREATE INDEX IF NOT EXISTS idx_nfc_card_content_display_order ON nfc_card_content(card_id, display_order);
CREATE INDEX IF NOT EXISTS idx_nfc_card_content_visible ON nfc_card_content(card_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_nfc_card_visits_card_id ON nfc_card_visits(card_id);
CREATE INDEX IF NOT EXISTS idx_nfc_card_visits_time ON nfc_card_visits(visit_time);

-- 7. 創建觸發器自動更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為相關表創建觸發器
DROP TRIGGER IF EXISTS update_nfc_card_templates_updated_at ON nfc_card_templates;
CREATE TRIGGER update_nfc_card_templates_updated_at 
    BEFORE UPDATE ON nfc_card_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nfc_cards_updated_at ON nfc_cards;
CREATE TRIGGER update_nfc_cards_updated_at 
    BEFORE UPDATE ON nfc_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nfc_card_content_updated_at ON nfc_card_content;
CREATE TRIGGER update_nfc_card_content_updated_at 
    BEFORE UPDATE ON nfc_card_content 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 添加註釋
COMMENT ON TABLE nfc_card_templates IS 'NFC名片模板配置表';
COMMENT ON TABLE nfc_cards IS 'NFC名片主表，每個用戶一張名片';
COMMENT ON TABLE nfc_card_content IS 'NFC名片內容區塊表，支援多種內容類型';
COMMENT ON TABLE nfc_card_visits IS 'NFC名片訪問記錄表，用於統計分析';

COMMENT ON COLUMN nfc_card_content.content_type IS '內容類型: text(文字), link(連結), video(影片), image(圖片), social(社群), map(地圖)';
COMMENT ON COLUMN nfc_card_content.content_data IS '內容數據，JSON格式存儲不同類型的具體內容';
COMMENT ON COLUMN nfc_card_content.custom_styles IS '自定義樣式，JSON格式存儲CSS樣式覆蓋';

-- 9. 創建視圖方便查詢
CREATE OR REPLACE VIEW nfc_cards_with_template AS
SELECT 
    nc.*,
    nct.name as template_name,
    nct.description as template_description,
    nct.css_config as template_css_config,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone,
    u.company as user_company,
    u.position as user_position
FROM nfc_cards nc
LEFT JOIN nfc_card_templates nct ON nc.template_id = nct.id
LEFT JOIN users u ON nc.user_id = u.id;

COMMENT ON VIEW nfc_cards_with_template IS '名片與模板、用戶信息的聯合視圖';

-- 10. 創建函數統計名片訪問量
CREATE OR REPLACE FUNCTION increment_card_view_count(card_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE nfc_cards 
    SET view_count = view_count + 1 
    WHERE user_id = card_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_card_view_count IS '增加名片查看次數';

-- 11. 創建函數獲取用戶名片統計
CREATE OR REPLACE FUNCTION get_card_statistics(card_user_id INTEGER)
RETURNS TABLE(
    total_views BIGINT,
    today_views BIGINT,
    this_week_views BIGINT,
    this_month_views BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nc.view_count::BIGINT as total_views,
        COALESCE(today.count, 0)::BIGINT as today_views,
        COALESCE(week.count, 0)::BIGINT as this_week_views,
        COALESCE(month.count, 0)::BIGINT as this_month_views
    FROM nfc_cards nc
    LEFT JOIN (
        SELECT card_id, COUNT(*) as count
        FROM nfc_card_visits 
        WHERE card_id = (SELECT id FROM nfc_cards WHERE user_id = card_user_id)
        AND visit_time >= CURRENT_DATE
        GROUP BY card_id
    ) today ON nc.id = today.card_id
    LEFT JOIN (
        SELECT card_id, COUNT(*) as count
        FROM nfc_card_visits 
        WHERE card_id = (SELECT id FROM nfc_cards WHERE user_id = card_user_id)
        AND visit_time >= DATE_TRUNC('week', CURRENT_DATE)
        GROUP BY card_id
    ) week ON nc.id = week.card_id
    LEFT JOIN (
        SELECT card_id, COUNT(*) as count
        FROM nfc_card_visits 
        WHERE card_id = (SELECT id FROM nfc_cards WHERE user_id = card_user_id)
        AND visit_time >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY card_id
    ) month ON nc.id = month.card_id
    WHERE nc.user_id = card_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_card_statistics IS '獲取指定用戶名片的訪問統計數據';

-- 完成提示
SELECT 'NFC電子名片系統數據表創建完成！' as message;

-- 顯示創建的表
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename LIKE 'nfc_%' 
ORDER BY tablename;