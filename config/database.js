const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - supports both DATABASE_URL (Render) and individual env vars (local)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Production: Use DATABASE_URL (Render PostgreSQL)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10, // Reduced for faster startup
    idleTimeoutMillis: 10000, // Reduced timeout
    connectionTimeoutMillis: 5000, // Increased connection timeout
    acquireTimeoutMillis: 10000, // Added acquire timeout
    createTimeoutMillis: 10000, // Added create timeout
    destroyTimeoutMillis: 5000, // Added destroy timeout
    reapIntervalMillis: 1000, // Added reap interval
    createRetryIntervalMillis: 200, // Added retry interval
  };
} else {
  // Development: Use individual environment variables
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bci_business_club',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

// Log the connection method being used
console.log('🔗 Database connection method:', process.env.DATABASE_URL ? 'DATABASE_URL' : 'Individual env vars');

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Create chapters table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        company VARCHAR(200),
        industry VARCHAR(100),
        title VARCHAR(100),
        profile_picture_url VARCHAR(500),
        contact_number VARCHAR(20),
        chapter_id INTEGER REFERENCES chapters(id),
        membership_level INTEGER CHECK (membership_level IN (1, 2, 3)),
        status VARCHAR(20) DEFAULT 'pending_approval' CHECK (status IN ('active', 'pending_approval', 'suspended', 'blacklisted')),
        nfc_card_id VARCHAR(50) UNIQUE,
        qr_code_url VARCHAR(500),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add reset_token columns if they don't exist (for existing databases)
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)
    `);
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP
    `);

    // Add interview_form column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS interview_form JSONB
    `);

    // Add ai_deep_profile column for AI-driven member profiling
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS ai_deep_profile JSONB
    `);

    // Create referrals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES users(id),
        referred_to_id INTEGER NOT NULL REFERENCES users(id),
        referral_amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create meetings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id),
        attendee_id INTEGER NOT NULL REFERENCES users(id),
        meeting_time_start TIMESTAMP NOT NULL,
        meeting_time_end TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location VARCHAR(300),
        max_attendees INTEGER DEFAULT 0,
        poster_image_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'finished', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add poster_image_url column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS poster_image_url VARCHAR(500)
    `);

    // Add tag column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE events 
      ADD COLUMN IF NOT EXISTS tag VARCHAR(50)
    `);

    // Create event_registrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        event_id INTEGER NOT NULL REFERENCES events(id),
        invited_by_id INTEGER REFERENCES users(id),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      )
    `);

    // Create guest_registrations table (來賓報名表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS guest_registrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(200) NOT NULL,
        industry VARCHAR(100) NOT NULL,
        desired_connections TEXT,
        event_id INTEGER NOT NULL REFERENCES events(id),
        inviter_id INTEGER NOT NULL REFERENCES users(id),
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email, event_id)
      )
    `);

    // Create prospects table (商訪準會員資料表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prospects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        industry VARCHAR(100),
        company VARCHAR(200),
        contact_info TEXT,
        notes TEXT,
        unified_business_number VARCHAR(8),
        ai_analysis_report JSONB,
        status VARCHAR(20) DEFAULT 'vetting' CHECK (status IN ('vetting', 'pending_vote', 'approved', 'rejected')),
        created_by_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns if they don't exist (for existing databases)
    await pool.query(`
      ALTER TABLE prospects 
      ADD COLUMN IF NOT EXISTS unified_business_number VARCHAR(8)
    `);
    
    await pool.query(`
      ALTER TABLE prospects 
      ADD COLUMN IF NOT EXISTS ai_analysis_report JSONB
    `);
    
    await pool.query(`
      ALTER TABLE prospects 
      ADD COLUMN IF NOT EXISTS analysis_progress TEXT
    `);

    // Create prospect_votes table (投票紀錄表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prospect_votes (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER NOT NULL REFERENCES prospects(id),
        voter_id INTEGER NOT NULL REFERENCES users(id),
        vote VARCHAR(10) NOT NULL CHECK (vote IN ('approve', 'reject')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(prospect_id, voter_id)
      )
    `);

    // Create transactions table (財務收支表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
        amount DECIMAL(10,2) NOT NULL,
        notes TEXT,
        created_by_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create complaints table (申訴信箱)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        submitter_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT FALSE,
        status VARCHAR(10) DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create static_content table (靜態內容管理)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS static_content (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL UNIQUE,
        content TEXT NOT NULL,
        updated_by_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create blacklist_entries table (黑名單專區)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklist_entries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        industry VARCHAR(100),
        company VARCHAR(200),
        contact_info VARCHAR(100),
        reason TEXT,
        notes TEXT,
        created_by_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance_records table (報到系統)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        event_id INTEGER NOT NULL REFERENCES events(id),
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id)
      )
    `);

    // Create judgments table (裁判書資料表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS judgments (
        id SERIAL PRIMARY KEY,
        jid VARCHAR(50) NOT NULL UNIQUE,
        case_number VARCHAR(100),
        judgment_date DATE,
        case_type VARCHAR(100),
        court_name VARCHAR(100),
        judgment_content TEXT,
        parties TEXT,
        summary TEXT,
        risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create judgment_sync_logs table (裁判書同步日誌表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS judgment_sync_logs (
        id SERIAL PRIMARY KEY,
        sync_date DATE NOT NULL,
        total_fetched INTEGER DEFAULT 0,
        new_records INTEGER DEFAULT 0,
        updated_records INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        UNIQUE(sync_date)
      )
    `);







    // ========== NFC 電子名片系統 ==========
    
    // Create nfc_card_templates table (電子名片視覺模板)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_card_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL CHECK (category IN ('tech-professional', 'creative-vibrant', 'minimal-elegant')),
        css_config JSONB NOT NULL,
        preview_image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nfc_cards table (會員電子名片主表)
    await pool.query(`
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
        UNIQUE(user_id)
      )
    `);

    // Create nfc_content_blocks table (內容區塊)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_content_blocks (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('text', 'link', 'video', 'image', 'social', 'map')),
        title VARCHAR(200),
        content TEXT,
        url VARCHAR(1000),
        image_url VARCHAR(500),
        social_platform VARCHAR(50),
        map_address TEXT,
        map_coordinates JSONB,
        display_order INTEGER DEFAULT 0,
        is_visible BOOLEAN DEFAULT true,
        custom_styles JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nfc_card_content table (NFC 名片內容區塊表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_card_content (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        content_type VARCHAR(50) NOT NULL,
        content_data JSONB NOT NULL DEFAULT '{}',
        display_order INTEGER DEFAULT 0,
        is_visible BOOLEAN DEFAULT true,
        custom_styles JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nfc_card_analytics table (名片分析數據)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_card_analytics (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'share', 'vcard_download', 'contact_click')),
        visitor_ip VARCHAR(45),
        visitor_user_agent TEXT,
        referrer VARCHAR(500),
        device_type VARCHAR(50),
        browser VARCHAR(50),
        location_country VARCHAR(100),
        location_city VARCHAR(100),
        additional_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create digital_card_users table (數位名片夾用戶系統)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS digital_card_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        company VARCHAR(200),
        title VARCHAR(100),
        avatar_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nfc_card_collections table (名片收藏)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_card_collections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES digital_card_users(id) ON DELETE CASCADE,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        notes TEXT,
        tags TEXT[],
        is_favorite BOOLEAN DEFAULT false,
        folder_name VARCHAR(100),
        collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, card_id)
      )
    `);

    // Insert default card templates
    await pool.query(`
      INSERT INTO nfc_card_templates (name, description, category, css_config) VALUES 
        ('科技專業版', '具備深色與淺色模式切換，資訊區塊採卡片式設計，背景帶有科技或抽象的幾何漸變，圖標現代且線條感強', 'tech-professional', 
         '{"primaryColor": "#1e293b", "secondaryColor": "#64748b", "backgroundColor": "#0f172a", "accentColor": "#3b82f6", "gradientFrom": "#1e293b", "gradientTo": "#334155", "fontFamily": "Inter, sans-serif", "cardShadow": "0 25px 50px -12px rgba(0, 0, 0, 0.25)", "borderRadius": "16px", "hasLightMode": true, "hasDarkMode": true, "iconStyle": "modern-line"}'),
        ('活力創意版', '色彩鮮明活潑，使用柔和的波浪形狀或有機曲線作為背景，按鈕設計具備漸變或特殊陰影，排版靈活', 'creative-vibrant', 
         '{"primaryColor": "#f59e0b", "secondaryColor": "#ec4899", "backgroundColor": "#fef3c7", "accentColor": "#8b5cf6", "gradientFrom": "#f59e0b", "gradientTo": "#ec4899", "fontFamily": "Poppins, sans-serif", "cardShadow": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", "borderRadius": "24px", "hasWaveBackground": true, "buttonGradient": true, "layoutStyle": "flexible"}'),
        ('簡約質感版', '設計簡潔線條俐落，注重留白，選用自然色調，圖標和字體極簡且具質感，排版整齊對稱', 'minimal-elegant', 
         '{"primaryColor": "#374151", "secondaryColor": "#9ca3af", "backgroundColor": "#ffffff", "accentColor": "#059669", "naturalColor1": "#f3f4f6", "naturalColor2": "#e5e7eb", "fontFamily": "Inter, sans-serif", "cardShadow": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)", "borderRadius": "8px", "minimalist": true, "spacing": "large", "layoutStyle": "symmetric"}'),
        ('商務專業版', '參考SpiderCard風格，簡潔卡片設計，專業配色方案，清晰的資訊層次結構', 'tech-professional', 
         '{"primaryColor": "#1f2937", "secondaryColor": "#6b7280", "backgroundColor": "#f9fafb", "accentColor": "#3b82f6", "cardBackground": "#ffffff", "fontFamily": "Inter, sans-serif", "cardShadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", "borderRadius": "12px", "layoutStyle": "card-based", "spacing": "comfortable"}'),
        ('現代簡約版', '參考SpiderCard風格，大膽留白設計，現代化排版，優雅的過渡效果', 'minimal-elegant', 
         '{"primaryColor": "#111827", "secondaryColor": "#9ca3af", "backgroundColor": "#ffffff", "accentColor": "#10b981", "lightGray": "#f3f4f6", "fontFamily": "Inter, sans-serif", "cardShadow": "0 1px 3px 0 rgba(0, 0, 0, 0.1)", "borderRadius": "8px", "layoutStyle": "modern-minimal", "spacing": "generous", "transitions": "elegant"}'),
        ('環保綠意版', '參考SpiderCard風格，自然綠色主題，環保理念設計，溫暖質感體驗', 'creative-vibrant', 
         '{"primaryColor": "#065f46", "secondaryColor": "#6b7280", "backgroundColor": "#f0fdf4", "accentColor": "#10b981", "greenLight": "#d1fae5", "greenDark": "#047857", "fontFamily": "Inter, sans-serif", "cardShadow": "0 4px 6px -1px rgba(16, 185, 129, 0.1)", "borderRadius": "16px", "layoutStyle": "nature-inspired", "theme": "eco-friendly"}')
      ON CONFLICT DO NOTHING
    `);

    // Create member_wishes table (會員許願版)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS member_wishes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50),
        tags TEXT[],
        ai_extracted_intents JSONB,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
        priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ai_matching_results table (AI媒合結果)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_matching_results (
        id SERIAL PRIMARY KEY,
        wish_id INTEGER NOT NULL REFERENCES member_wishes(id) ON DELETE CASCADE,
        matched_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        matching_score DECIMAL(5,2) NOT NULL CHECK (matching_score >= 0 AND matching_score <= 100),
        matching_reasons JSONB,
        ai_explanation TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'dismissed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create member_activities table (會員活動記錄)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS member_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        activity_data JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ai_notifications table (AI智慧通知)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        related_user_id INTEGER REFERENCES users(id),
        related_wish_id INTEGER REFERENCES member_wishes(id),
        matching_score DECIMAL(5,2),
        ai_reasoning TEXT,
        status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
        priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `);

    // Create meeting_ai_analysis table (會議AI分析)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meeting_ai_analysis (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        summary TEXT,
        key_insights JSONB,
        business_intents JSONB,
        collaboration_opportunities JSONB,
        extracted_needs JSONB,
        participant_consent JSONB,
        analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);



    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_judgments_jid ON judgments(jid);
      CREATE INDEX IF NOT EXISTS idx_judgments_date ON judgments(judgment_date);
      CREATE INDEX IF NOT EXISTS idx_judgments_case_type ON judgments(case_type);
      CREATE INDEX IF NOT EXISTS idx_judgments_content_search ON judgments USING gin(to_tsvector('english', judgment_content));
      CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON judgment_sync_logs(sync_date);
      
      -- NFC 電子名片系統索引
      CREATE INDEX IF NOT EXISTS idx_nfc_cards_user_id ON nfc_cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_nfc_cards_is_active ON nfc_cards(is_active);
      CREATE INDEX IF NOT EXISTS idx_nfc_content_blocks_card_id ON nfc_content_blocks(card_id);
      CREATE INDEX IF NOT EXISTS idx_nfc_content_blocks_display_order ON nfc_content_blocks(display_order);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_analytics_card_id ON nfc_card_analytics(card_id);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_analytics_event_type ON nfc_card_analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_analytics_created_at ON nfc_card_analytics(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_collections_user_id ON nfc_card_collections(user_id);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_collections_card_id ON nfc_card_collections(card_id);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_templates_category ON nfc_card_templates(category);
      CREATE INDEX IF NOT EXISTS idx_nfc_card_templates_is_active ON nfc_card_templates(is_active);
      
      CREATE INDEX IF NOT EXISTS idx_member_wishes_user_id ON member_wishes(user_id);
      CREATE INDEX IF NOT EXISTS idx_member_wishes_status ON member_wishes(status);
      CREATE INDEX IF NOT EXISTS idx_member_wishes_category ON member_wishes(category);
      CREATE INDEX IF NOT EXISTS idx_ai_matching_results_wish_id ON ai_matching_results(wish_id);
      CREATE INDEX IF NOT EXISTS idx_ai_matching_results_matched_user_id ON ai_matching_results(matched_user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_matching_results_score ON ai_matching_results(matching_score DESC);
      CREATE INDEX IF NOT EXISTS idx_member_activities_user_id ON member_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_member_activities_type ON member_activities(activity_type);
      CREATE INDEX IF NOT EXISTS idx_member_activities_created_at ON member_activities(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_notifications_user_id ON ai_notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_notifications_status ON ai_notifications(status);
      CREATE INDEX IF NOT EXISTS idx_ai_notifications_created_at ON ai_notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_meeting_ai_analysis_meeting_id ON meeting_ai_analysis(meeting_id);
      CREATE INDEX IF NOT EXISTS idx_users_ai_deep_profile ON users USING gin(ai_deep_profile);
    `);

    // Insert default chapters
    await pool.query(`
      INSERT INTO chapters (name) VALUES 
        ('台北分會'),
        ('新竹分會'),
        ('台中分會'),
        ('台南分會'),
        ('高雄分會')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bci-club.com';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123456', 12);
    
    await pool.query(`
      INSERT INTO users (name, email, password, company, industry, title, membership_level, status, created_at)
      VALUES ('系統管理員', $1, $2, 'GBC', '系統管理', '管理員', 1, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, hashedPassword]);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initializeDatabase
};