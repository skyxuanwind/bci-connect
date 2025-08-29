const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const chapterRoutes = require('./routes/chapters');
const qrcodeRoutes = require('./routes/qrcode');
const referralRoutes = require('./routes/referrals');
const meetingRoutes = require('./routes/meetings');
const eventRoutes = require('./routes/events');
const prospectRoutes = require('./routes/prospects');
const blacklistRoutes = require('./routes/blacklist');
const transactionRoutes = require('./routes/transactions');
const complaintRoutes = require('./routes/complaints');
const contentRoutes = require('./routes/content');
const attendanceRoutes = require('./routes/attendance');
const companyLookupRoutes = require('./routes/company-lookup');
const aiAnalysisRoutes = require('./routes/ai-analysis');
const judicialLookupRoutes = require('./routes/judicial-lookup');
const judgmentSyncRoutes = require('./routes/judgment-sync');
const nfcCheckinRoutes = require('./routes/nfc-checkin');
const memberCardRoutes = require('./routes/member-cards');
const { initializeDatabase, pool } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const judgmentSyncService = require('./services/judgmentSyncService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// 信任反向代理（Render/Heroku 等），以正確取得 HTTPS 與真實客戶端 IP
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:3002", "https://*.onrender.com"],
      imgSrc: ["'self'", "data:", "http://localhost:3000", "http://localhost:3001", "https:", "https://res.cloudinary.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));

// Additional CSP middleware for NFC Gateway Service
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' http://localhost:* https://*.onrender.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-src 'self' https://www.youtube.com https://player.vimeo.com; media-src 'self' data:;"
  );
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for development
    return process.env.NODE_ENV === 'development';
  }
});
app.use(limiter);

// CORS configuration
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // In development, allow all origins to simplify local testing
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // In production, restrict to explicit allowlist
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/qrcode', qrcodeRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/blacklist', blacklistRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/company-lookup', companyLookupRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/judicial-lookup', judicialLookupRoutes);
app.use('/api/judgment-sync', judgmentSyncRoutes);
app.use('/api/nfc-checkin', nfcCheckinRoutes);
app.use('/api/member-cards', memberCardRoutes);

// 添加MongoDB NFC報到路由
const nfcMongodbRoutes = require('./routes/nfc-mongodb');
app.use('/api/nfc-checkin-mongo', nfcMongodbRoutes);

// Health check endpoint - critical for Render deployment
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// API Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple readiness check
app.get('/ready', (req, res) => {
  res.status(200).send('Ready');
});

// Root endpoint for basic info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'GBC Business Elite Club API Server', 
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
} else {
  // Development: Add a root route for basic info
  app.get('/', (req, res) => {
    res.json({ 
      message: 'GBC Business Elite Club API Server', 
      version: '1.0.0',
      environment: 'development',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth/*',
        users: '/api/users/*'
      }
    });
  });
  
  // 404 handler for development - only for unmatched routes
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found', path: req.originalUrl });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// Start server first, then initialize databases asynchronously
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GBC Business Elite Club server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize databases asynchronously after server starts
  initializeDatabasesAsync();
});

// Set server timeout for Render deployment
server.timeout = 30000; // 30 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Function to create test accounts if they don't exist
async function createTestAccountsIfNeeded() {
  const testUsers = [
    {
      name: '張志明',
      email: 'test1@example.com',
      password: 'Test123!',
      company: '創新科技有限公司',
      industry: '資訊科技',
      title: '技術總監',
      contact_number: '0912-345-678',
      membership_level: 1,
      interview_form: {
        business_experience: '10年軟體開發經驗，專精於企業級應用系統開發',
        expertise_areas: ['軟體開發', '系統架構', '團隊管理'],
        business_goals: '擴展企業客戶群，建立長期合作關係',
        networking_interests: '尋找技術合作夥伴和潛在客戶',
        referral_willingness: '非常願意',
        meeting_frequency: '每月2-3次',
        contribution_ideas: '分享技術趨勢和數位轉型經驗',
        questions_concerns: '希望了解更多關於商業拓展的策略'
      }
    },
    {
      name: '李美華',
      email: 'test2@example.com',
      password: 'Test123!',
      company: '美華行銷顧問',
      industry: '行銷顧問',
      title: '執行長',
      contact_number: '0923-456-789',
      membership_level: 2,
      interview_form: {
        business_experience: '15年行銷顧問經驗，服務過多家知名企業',
        expertise_areas: ['數位行銷', '品牌策略', '市場分析'],
        business_goals: '成為業界領導品牌，拓展國際市場',
        networking_interests: '尋找策略合作夥伴和新客戶',
        referral_willingness: '非常願意',
        meeting_frequency: '每週1-2次',
        contribution_ideas: '提供行銷策略諮詢和市場洞察',
        questions_concerns: '關心如何在競爭激烈的市場中脫穎而出'
      }
    },
    {
      name: '王大明',
      email: 'test3@example.com',
      password: 'Test123!',
      company: '大明建設股份有限公司',
      industry: '建築營造',
      title: '董事長',
      contact_number: '0934-567-890',
      membership_level: 3,
      interview_form: {
        business_experience: '25年建築業經驗，完成多項大型建設專案',
        expertise_areas: ['建築設計', '專案管理', '土地開發'],
        business_goals: '發展綠建築和智慧建築項目',
        networking_interests: '尋找投資機會和合作夥伴',
        referral_willingness: '願意',
        meeting_frequency: '每月1-2次',
        contribution_ideas: '分享建築業趨勢和投資機會',
        questions_concerns: '關注永續發展和環保建築的未來'
      }
    },
    {
      name: '陳小芳',
      email: 'test4@example.com',
      password: 'Test123!',
      company: '芳華餐飲集團',
      industry: '餐飲服務',
      title: '營運總監',
      contact_number: '0945-678-901',
      membership_level: 1,
      interview_form: {
        business_experience: '12年餐飲業經驗，管理多家連鎖餐廳',
        expertise_areas: ['餐廳營運', '食品安全', '客戶服務'],
        business_goals: '擴展連鎖店數量，提升品牌知名度',
        networking_interests: '尋找供應商和加盟夥伴',
        referral_willingness: '非常願意',
        meeting_frequency: '每月2-3次',
        contribution_ideas: '分享餐飲業營運經驗和趨勢',
        questions_concerns: '關心食安法規和消費者偏好變化'
      }
    },
    {
      name: '林志偉',
      email: 'test5@example.com',
      password: 'Test123!',
      company: '志偉金融服務',
      industry: '金融服務',
      title: '財務顧問',
      contact_number: '0956-789-012',
      membership_level: 2,
      interview_form: {
        business_experience: '8年金融服務經驗，專精於投資理財規劃',
        expertise_areas: ['投資理財', '保險規劃', '稅務諮詢'],
        business_goals: '建立專業財務顧問品牌，擴大客戶基礎',
        networking_interests: '尋找高淨值客戶和合作夥伴',
        referral_willingness: '願意',
        meeting_frequency: '每週1次',
        contribution_ideas: '提供財務規劃和投資建議',
        questions_concerns: '關注金融法規變化和市場波動影響'
      }
    }
  ];

  let createdCount = 0;
  let skippedCount = 0;

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        skippedCount++;
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Generate unique NFC card ID
      const nfcCardId = crypto.randomBytes(8).toString('hex').toUpperCase();

      // Insert user
      await pool.query(`
        INSERT INTO users (
          name, email, password, company, industry, title, 
          contact_number, membership_level, status, nfc_card_id, interview_form
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        userData.name,
        userData.email,
        hashedPassword,
        userData.company,
        userData.industry,
        userData.title,
        userData.contact_number,
        userData.membership_level,
        'active',
        nfcCardId,
        JSON.stringify(userData.interview_form)
      ]);

      createdCount++;
      console.log(`✅ Created test user: ${userData.name} (${userData.email})`);
    } catch (error) {
      console.error(`❌ Failed to create test user ${userData.email}:`, error.message);
    }
  }

  console.log(`📊 Test account creation summary: ${createdCount} created, ${skippedCount} skipped`);
}

// Async database initialization
async function initializeDatabasesAsync() {
  try {
    console.log('🔄 Starting database initialization...');
    
    // Initialize PostgreSQL with timeout
    const dbInitPromise = Promise.race([
      initializeDatabase(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timeout')), 25000)
      )
    ]);
    
    await dbInitPromise;
    console.log('✅ PostgreSQL database initialized successfully');
    
    // Create test accounts in production if they don't exist
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('🔄 Checking for test accounts...');
        await createTestAccountsIfNeeded();
      } catch (testAccountError) {
        console.warn('⚠️ Test account creation failed (non-critical):', testAccountError.message);
      }
    }
    
    // Initialize MongoDB for NFC system (non-blocking)
    try {
      await connectMongoDB();
      console.log('✅ MongoDB initialized successfully');
    } catch (mongoError) {
      console.warn('⚠️ MongoDB initialization failed (non-critical):', mongoError.message);
    }
    
    // Start judgment sync scheduler
    try {
      judgmentSyncService.startScheduler();
      console.log('⏰ 裁判書同步排程已啟動');
    } catch (schedulerError) {
      console.warn('⚠️ Scheduler initialization failed (non-critical):', schedulerError.message);
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't exit process, let the server continue running
    console.log('🔄 Server will continue running without full database initialization');
  }
}

module.exports = app;