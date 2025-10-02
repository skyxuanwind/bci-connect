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

    // Add nfc_card_url column for NFC card URL identification
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS nfc_card_url VARCHAR(500) UNIQUE
    `);

    // Add nfc_uid column for NFC card UID identification
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS nfc_uid VARCHAR(50) UNIQUE
    `);

    // Add coaching related columns
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_coach BOOLEAN DEFAULT FALSE
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS coach_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_coach ON users(is_coach)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_coach_user_id ON users(coach_user_id)
    `);

    // Add MBTI fields
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mbti VARCHAR(10)
    `);
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mbti_public BOOLEAN DEFAULT FALSE
    `);
    // 新增：MBTI 測評結果的標準欄位（與既有 mbti 欄位並存，向下相容）
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mbti_type VARCHAR(10)
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

    // Create meeting_feedbacks table (雙向回饋問卷)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meeting_feedbacks (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ratee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        answers JSONB,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(meeting_id, rater_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meeting_feedbacks_meeting_id ON meeting_feedbacks(meeting_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meeting_feedbacks_ratee_id ON meeting_feedbacks(ratee_id)`);

    // Create onboarding tasks table for members
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_onboarding_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_by_coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safety migrations for existing deployments (e.g., Render) where the table may exist without newer columns
    await pool.query(`
      ALTER TABLE user_onboarding_tasks
      ADD COLUMN IF NOT EXISTS created_by_coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_onboarding_tasks_user ON user_onboarding_tasks(user_id)`);

    // Create coach logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coach_logs (
        id SERIAL PRIMARY KEY,
        coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coach_logs_member ON coach_logs(member_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coach_logs_coach ON coach_logs(coach_id)`);

    // Safety migration: ensure attachments column exists on older deployments
    await pool.query(`ALTER TABLE coach_logs ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`);

    // Create email_verifications table for email verification during registration
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        verification_code VARCHAR(6) NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create unique index for email_verifications
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_email_verification ON email_verifications (email)
    `);

    // Create indexes for email_verifications
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_code ON email_verifications (email, verification_code);
      CREATE INDEX IF NOT EXISTS idx_expires_at ON email_verifications (expires_at)
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

    // Create business_media table (商媒體內容中心)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_media (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        speaker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('video_long', 'video_short', 'article')),
        platform VARCHAR(30),
        external_url VARCHAR(500),
        slug VARCHAR(255) UNIQUE,
        summary TEXT,
        body TEXT,
        ctas JSONB DEFAULT '[]',
        published_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        view_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure pinned & sort_order columns exist for business_media
    await pool.query(`
      ALTER TABLE business_media
      ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
    `);
    await pool.query(`
      ALTER TABLE business_media
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    `);
    await pool.query(`
      ALTER TABLE business_media
      ADD COLUMN IF NOT EXISTS embed_code TEXT;
    `);
    await pool.query(`
      ALTER TABLE business_media
      ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_speaker_id ON business_media(speaker_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_content_type ON business_media(content_type);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_published_at ON business_media(published_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_pinned ON business_media(pinned);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_sort_order ON business_media(sort_order);
    `);

    // Create business_media_analytics table (商媒體分析)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS business_media_analytics (
        id SERIAL PRIMARY KEY,
        content_id INTEGER NOT NULL REFERENCES business_media(id) ON DELETE CASCADE,
        event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('view', 'cta_click', 'card_click')),
        visitor_ip VARCHAR(45),
        user_agent TEXT,
        referrer VARCHAR(500),
        cta_label VARCHAR(200),
        cta_url VARCHAR(500),
        target_member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_analytics_content_id ON business_media_analytics(content_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_business_media_analytics_event_type ON business_media_analytics(event_type);
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
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        notes TEXT,
        tags TEXT[],
        is_favorite BOOLEAN DEFAULT false,
        folder_name VARCHAR(100),
        collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, card_id)
      )
    `);

    // Ensure required columns exist for nfc_card_collections in existing databases
    await pool.query(`
      ALTER TABLE nfc_card_collections 
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[],
      ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS folder_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // NEW: Support scanned contacts stored directly in collections (no nfc_cards reference)
    try {
      // 允許 card_id 為 NULL 以便儲存掃描/手動名片
      await pool.query(`
        ALTER TABLE nfc_card_collections
        ALTER COLUMN card_id DROP NOT NULL
      `);
    } catch (e) {
      console.warn('⚠️ Skip dropping NOT NULL on nfc_card_collections.card_id:', e.message);
    }
    await pool.query(`
      ALTER TABLE nfc_card_collections
      ADD COLUMN IF NOT EXISTS scanned_data JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_scanned BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)
    `);

    // 新增索引：依 image_url 查詢更快
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_nfc_card_collections_image_url ON nfc_card_collections(image_url)
    `);

    // Ensure foreign key references users(id) instead of digital_card_users(id)
    try {
      await pool.query(`
        ALTER TABLE nfc_card_collections
        DROP CONSTRAINT IF EXISTS nfc_card_collections_user_id_fkey
      `);
      await pool.query(`
        ALTER TABLE nfc_card_collections
        ADD CONSTRAINT nfc_card_collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (fkErr) {
      console.warn('⚠️ Unable to update FK for nfc_card_collections.user_id:', fkErr.message);
    }

    // Create nfc_card_content_analytics table (內容區塊點擊分析)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_card_content_analytics (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        content_block_id INTEGER,
        content_type VARCHAR(50) NOT NULL,
        content_title VARCHAR(200),
        click_count INTEGER DEFAULT 0,
        visitor_ip VARCHAR(45),
        visitor_user_agent TEXT,
        referrer VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nfc_card_visit_sources table (訪問來源分析)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_card_visit_sources (
        id SERIAL PRIMARY KEY,
        card_id INTEGER NOT NULL REFERENCES nfc_cards(id) ON DELETE CASCADE,
        source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('nfc', 'qr_code', 'direct_link', 'social_media', 'email', 'other')),
        source_detail VARCHAR(200),
        visitor_count INTEGER DEFAULT 1,
        last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create scanned_business_cards table (掃描的紙本名片)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scanned_business_cards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        original_image_path VARCHAR(500),
        extracted_data JSONB,
        confidence_score DECIMAL(3,2),
        manual_corrections JSONB,
        is_verified BOOLEAN DEFAULT false,
        tags TEXT[],
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert new card templates (5 new styles)
    await pool.query(`
      INSERT INTO nfc_card_templates (name, description, category, css_config) VALUES 
        ('極簡高級風格', '一頁式極簡設計，黑金配色，圓形個人大頭照，大量留白，科技感UI，高級質感', 'minimal-luxury', 
         '{"primaryColor": "#000000", "secondaryColor": "#FFD700", "backgroundColor": "#FFFFFF", "accentColor": "#C9B037", "textColor": "#333333", "fontFamily": "Inter, sans-serif", "cardShadow": "0 8px 32px rgba(0, 0, 0, 0.12)", "borderRadius": "24px", "spacing": "generous", "layoutStyle": "minimal-luxury", "avatarStyle": "circle", "goldAccent": true}'),
        ('未來科技感風格', '深藍與霓虹藍紫配色，流線科技元素，半透明光圈環繞的大頭照，未來科技Dashboard風格', 'futuristic-tech', 
         '{"primaryColor": "#0A1628", "secondaryColor": "#1E3A8A", "backgroundColor": "#0F172A", "accentColor": "#3B82F6", "neonColor": "#8B5CF6", "glowColor": "#06B6D4", "fontFamily": "Orbitron, sans-serif", "cardShadow": "0 0 40px rgba(59, 130, 246, 0.3)", "borderRadius": "16px", "layoutStyle": "dashboard", "avatarGlow": true, "neonEffects": true}'),
        ('創意品牌風格', '橘＋藍＋白亮色系，大膽排版，左側大頭照，右側姓名職稱與標語，活潑有活力的創意設計', 'creative-brand', 
         '{"primaryColor": "#FF6B35", "secondaryColor": "#004E89", "backgroundColor": "#FFFFFF", "accentColor": "#1A8FE3", "brightOrange": "#FF8C42", "brightBlue": "#0077BE", "fontFamily": "Poppins, sans-serif", "cardShadow": "0 12px 24px rgba(255, 107, 53, 0.15)", "borderRadius": "20px", "layoutStyle": "split-creative", "boldTypography": true, "vibrantColors": true}'),
        ('專業商務風格', '白底＋藏青色＋灰色，頂部姓名職稱，中間大頭照，企業Logo與QR Code，乾淨大方的專業風格', 'professional-business', 
         '{"primaryColor": "#1E3A8A", "secondaryColor": "#6B7280", "backgroundColor": "#FFFFFF", "accentColor": "#3B82F6", "navyBlue": "#1E40AF", "lightGray": "#F3F4F6", "fontFamily": "Inter, sans-serif", "cardShadow": "0 4px 16px rgba(0, 0, 0, 0.08)", "borderRadius": "12px", "layoutStyle": "corporate", "professionalSpacing": true, "logoSupport": true}'),
        ('動態互動風格', '紫＋粉＋藍漸層背景，流動動畫，中央大頭照，下方姓名職稱，底部大型QR code，互動性強的動態設計', 'dynamic-interactive', 
         '{"primaryColor": "#8B5CF6", "secondaryColor": "#EC4899", "backgroundColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "accentColor": "#06B6D4", "gradientPurple": "#8B5CF6", "gradientPink": "#EC4899", "gradientBlue": "#3B82F6", "fontFamily": "Inter, sans-serif", "cardShadow": "0 20px 40px rgba(139, 92, 246, 0.3)", "borderRadius": "28px", "layoutStyle": "dynamic-center", "animations": true, "largeQR": true}')
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        css_config = EXCLUDED.css_config
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

    // Create honor badges tables (榮譽徽章)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS honor_badges (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        color_class VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_honor_badges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id INTEGER NOT NULL REFERENCES honor_badges(id) ON DELETE CASCADE,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source_type VARCHAR(50),
        source_id INTEGER,
        notes TEXT,
        UNIQUE(user_id, badge_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_honor_badges_user_id ON user_honor_badges(user_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_honor_badges_badge_id ON user_honor_badges(badge_id);
    `);

    // Seed default badges
    await pool.query(`
      INSERT INTO honor_badges (code, name, description, icon, color_class) VALUES
        ('gbc_profile_complete','GBC 檔案完成','完成 GBC 深度交流表','🏅','badge-success'),
        ('first_task_completed','首個任務完成','完成第一個入職任務','✅','badge-info'),
        ('referral_confirmed_first','首筆引薦成交','第一筆已確認的引薦','🤝','badge-warning')
      ON CONFLICT (code) DO NOTHING
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

    // Create ceremony_logs table (儀式日誌)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ceremony_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ceremony_type VARCHAR(50) NOT NULL,
        nfc_card_id VARCHAR(255),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table (系統設定)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create video_categories table (影片分類)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color_code VARCHAR(7) DEFAULT '#3B82F6',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ceremony_videos table (儀式影片主表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ceremony_videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_url VARCHAR(500),
        file_size BIGINT,
        duration INTEGER,
        format VARCHAR(10) NOT NULL,
        resolution VARCHAR(20),
        thumbnail_url VARCHAR(500),
        category_id INTEGER REFERENCES video_categories(id) ON DELETE SET NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        upload_user_id INTEGER,
        view_count INTEGER DEFAULT 0,
        last_played_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create video_tags table (影片標籤)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#6B7280',
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create video_tag_relations table (影片標籤關聯)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_tag_relations (
        id SERIAL PRIMARY KEY,
        video_id INTEGER NOT NULL REFERENCES ceremony_videos(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES video_tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, tag_id)
      )
    `);

    // Create video_play_statistics table (影片播放統計)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_play_statistics (
        id SERIAL PRIMARY KEY,
        video_id INTEGER NOT NULL REFERENCES ceremony_videos(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        play_count INTEGER DEFAULT 0,
        total_duration INTEGER DEFAULT 0,
        completion_rate DECIMAL(5,2) DEFAULT 0.00,
        avg_response_time_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(video_id, date)
      )
    `);

    // Create videos table (保持向後兼容)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url VARCHAR(500) NOT NULL,
        file_size BIGINT,
        duration INTEGER, -- 影片時長（秒）
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create nfc_video_mappings table (NFC 卡片與影片的映射關係)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nfc_video_mappings (
        id SERIAL PRIMARY KEY,
        nfc_card_id VARCHAR(255) NOT NULL,
        video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(nfc_card_id)
      )
    `);

    // Create video_play_logs table (影片播放記錄)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_play_logs (
        id SERIAL PRIMARY KEY,
        nfc_card_id VARCHAR(255),
        video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        play_duration INTEGER, -- 實際播放時長（秒）
        completed BOOLEAN DEFAULT false, -- 是否播放完成
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`

      
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
      
      -- 影片管理系統索引
      CREATE INDEX IF NOT EXISTS idx_videos_is_default ON videos(is_default);
      CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(is_active);
      CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_nfc_video_mappings_nfc_card_id ON nfc_video_mappings(nfc_card_id);
      CREATE INDEX IF NOT EXISTS idx_nfc_video_mappings_video_id ON nfc_video_mappings(video_id);
      CREATE INDEX IF NOT EXISTS idx_video_play_logs_nfc_card_id ON video_play_logs(nfc_card_id);
      CREATE INDEX IF NOT EXISTS idx_video_play_logs_video_id ON video_play_logs(video_id);
      CREATE INDEX IF NOT EXISTS idx_video_play_logs_member_id ON video_play_logs(member_id);
      CREATE INDEX IF NOT EXISTS idx_video_play_logs_created_at ON video_play_logs(created_at DESC);
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
  initializeDatabase,
  // Ensure latest templates exist (idempotent)
  ensureLatestTemplatesExist: async () => {
    try {
      const templates = [
        {
          name: '極簡高級風格',
          description: '簡潔優雅的設計，注重留白與層次，展現專業品味',
          category: 'minimalist',
          className: 'template-minimalist-premium'
        },
        {
          name: '未來科技感風格',
          description: '前衛科技設計，動態效果與漸變色彩，展現創新精神',
          category: 'tech-futuristic',
          className: 'template-tech-futuristic'
        },
        {
          name: '創意品牌風格',
          description: '活潑創意設計，豐富色彩與動畫效果，展現品牌個性',
          category: 'creative-brand',
          className: 'template-creative-brand'
        },
        {
          name: '專業商務風格',
          description: '正式商務設計，穩重配色與清晰佈局，展現專業形象',
          category: 'business-professional',
          className: 'template-business-professional'
        },
        {
          name: '動態互動風格',
          description: '豐富互動效果，動態元素與視覺反饋，提升用戶體驗',
          category: 'interactive-dynamic',
          className: 'template-interactive-dynamic'
        }
      ];

      for (const template of templates) {
        await pool.query(
          `INSERT INTO nfc_card_templates (
             name, description, category, css_config, preview_image_url, is_active, created_at, updated_at
           )
           SELECT $1::text, $2::text, $3::text, $4::jsonb, $5::text, true, NOW(), NOW()
           WHERE NOT EXISTS (
             SELECT 1 FROM nfc_card_templates WHERE name = $1::text
           )`,
          [
            template.name,
            template.description,
            template.category,
            JSON.stringify({ className: template.className }),
            `/nfc-templates/${template.className.replace('template-', '')}.svg`
          ]
        );
      }

      // 停用舊版模板名稱，避免混雜在前端下拉選單
      const deprecatedNames = [
        '科技專業版',
        '活力創意版',
        '簡約質感版',
        '商務專業版',
        '現代簡約版',
        '環保綠意版',
        '質感黑金版',
        '插畫塗鴉版'
      ];

      await pool.query(
        `UPDATE nfc_card_templates
         SET is_active = false, updated_at = NOW()
         WHERE name = ANY($1::text[])`,
        [deprecatedNames]
      );
      
      console.log('✅ Ensured latest NFC templates exist');
    } catch (e) {
      console.warn('⚠️ Ensure latest templates failed (non-critical):', e.message);
    }
  }
};