const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - supports both DATABASE_URL (Render) and individual env vars (local)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Production: Use DATABASE_URL (Render PostgreSQL)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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

    // Create prospects table (商訪準會員資料表)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prospects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        industry VARCHAR(100),
        company VARCHAR(200),
        contact_info TEXT,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'vetting' CHECK (status IN ('vetting', 'pending_vote', 'approved', 'rejected')),
        created_by_id INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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
      VALUES ('系統管理員', $1, $2, 'BCI', '系統管理', '管理員', 1, 'active', CURRENT_TIMESTAMP)
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