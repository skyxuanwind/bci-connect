-- 影片管理系統資料庫表結構
-- 支持多格式影片、分類標籤、播放規則和NFC觸發機制

-- 1. 影片分類表
CREATE TABLE IF NOT EXISTS video_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#3B82F6', -- 分類顏色標識
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 影片主表
CREATE TABLE IF NOT EXISTS ceremony_videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL, -- 原始檔案名
    file_path VARCHAR(500) NOT NULL, -- 存儲路徑
    file_url VARCHAR(500), -- 訪問URL (支持CDN)
    file_size BIGINT, -- 檔案大小 (bytes)
    duration INT, -- 影片長度 (秒)
    format VARCHAR(10) NOT NULL, -- 影片格式 (MP4, MOV, AVI等)
    resolution VARCHAR(20), -- 解析度 (1080p, 720p等)
    thumbnail_url VARCHAR(500), -- 縮圖URL
    category_id INT,
    is_default BOOLEAN DEFAULT FALSE, -- 是否為預設影片
    is_active BOOLEAN DEFAULT TRUE,
    upload_user_id INT, -- 上傳者ID
    view_count INT DEFAULT 0, -- 播放次數
    last_played_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES video_categories(id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_is_default (is_default),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
);

-- 3. 影片標籤表
CREATE TABLE IF NOT EXISTS video_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6B7280',
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 影片標籤關聯表
CREATE TABLE IF NOT EXISTS video_tag_relations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES ceremony_videos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES video_tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_video_tag (video_id, tag_id)
);

-- 5. 播放規則表
CREATE TABLE IF NOT EXISTS video_play_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    rule_type ENUM('default', 'member_type', 'industry', 'time_based', 'random') NOT NULL,
    conditions JSON, -- 播放條件 (JSON格式存儲複雜條件)
    video_id INT NOT NULL,
    priority INT DEFAULT 0, -- 規則優先級 (數字越大優先級越高)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES ceremony_videos(id) ON DELETE CASCADE,
    INDEX idx_rule_type (rule_type),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active)
);

-- 6. NFC觸發記錄表
CREATE TABLE IF NOT EXISTS nfc_video_triggers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nfc_card_id VARCHAR(100) NOT NULL,
    member_id INT,
    video_id INT NOT NULL,
    rule_id INT, -- 觸發的規則ID
    trigger_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INT, -- 響應時間 (毫秒)
    play_duration INT, -- 實際播放時長 (秒)
    is_completed BOOLEAN DEFAULT FALSE, -- 是否播放完成
    device_info JSON, -- 設備信息
    FOREIGN KEY (video_id) REFERENCES ceremony_videos(id),
    FOREIGN KEY (rule_id) REFERENCES video_play_rules(id),
    INDEX idx_nfc_card_id (nfc_card_id),
    INDEX idx_member_id (member_id),
    INDEX idx_trigger_time (trigger_time),
    INDEX idx_response_time (response_time_ms)
);

-- 7. 影片播放統計表
CREATE TABLE IF NOT EXISTS video_play_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    date DATE NOT NULL,
    play_count INT DEFAULT 0,
    total_duration INT DEFAULT 0, -- 總播放時長 (秒)
    completion_rate DECIMAL(5,2) DEFAULT 0.00, -- 完成率 (%)
    avg_response_time_ms INT DEFAULT 0, -- 平均響應時間
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES ceremony_videos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_video_date (video_id, date),
    INDEX idx_date (date)
);

-- 8. 系統設定表 (影片播放相關設定)
CREATE TABLE IF NOT EXISTS video_system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入預設系統設定
INSERT INTO video_system_settings (setting_key, setting_value, setting_type, description) VALUES
('max_response_time_ms', '500', 'number', 'NFC觸發最大響應時間 (毫秒)'),
('default_video_quality', '1080p', 'string', '預設影片播放品質'),
('auto_cache_enabled', 'true', 'boolean', '是否啟用自動緩存'),
('max_file_size_mb', '500', 'number', '最大上傳檔案大小 (MB)'),
('supported_formats', '["mp4", "mov", "avi", "mkv"]', 'json', '支持的影片格式'),
('cache_duration_hours', '24', 'number', '緩存保留時間 (小時)'),
('enable_analytics', 'true', 'boolean', '是否啟用播放統計'),
('welcome_message_template', '歡迎 {memberName} 加入 GBC！您的行業類別：{industry}', 'string', '歡迎訊息模板');

-- 插入預設影片分類
INSERT INTO video_categories (name, description, color_code, sort_order) VALUES
('歡迎影片', '新會員加入時播放的歡迎影片', '#10B981', 1),
('宣誓儀式', '正式宣誓儀式相關影片', '#3B82F6', 2),
('行業介紹', '各行業類別介紹影片', '#8B5CF6', 3),
('活動宣傳', '活動和會議宣傳影片', '#F59E0B', 4),
('教育培訓', '會員教育和培訓影片', '#EF4444', 5);

-- 插入預設標籤
INSERT INTO video_tags (name, color) VALUES
('新會員', '#10B981'),
('宣誓', '#3B82F6'),
('歡迎', '#F59E0B'),
('高清', '#8B5CF6'),
('重要', '#EF4444'),
('推薦', '#06B6D4');

-- 創建觸發器：更新影片播放次數
DELIMITER //
CREATE TRIGGER update_video_view_count 
AFTER INSERT ON nfc_video_triggers
FOR EACH ROW
BEGIN
    UPDATE ceremony_videos 
    SET view_count = view_count + 1, 
        last_played_at = NEW.trigger_time 
    WHERE id = NEW.video_id;
END//
DELIMITER ;

-- 創建觸發器：更新標籤使用次數
DELIMITER //
CREATE TRIGGER update_tag_usage_count 
AFTER INSERT ON video_tag_relations
FOR EACH ROW
BEGIN
    UPDATE video_tags 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.tag_id;
END//
DELIMITER ;

-- 創建索引優化查詢性能
CREATE INDEX idx_video_search ON ceremony_videos(title, description);
CREATE INDEX idx_trigger_performance ON nfc_video_triggers(trigger_time, response_time_ms);
CREATE INDEX idx_statistics_analysis ON video_play_statistics(date, play_count, completion_rate);