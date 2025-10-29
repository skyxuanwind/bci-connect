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
const adminTemplatesRoutes = require('./routes/admin-templates');

const nfcCardsRoutes = require('./routes/nfc-cards');
const nfcAnalyticsRoutes = require('./routes/nfc-analytics');
const ocrScannerRoutes = require('./routes/ocr-scanner');
const digitalWalletRoutes = require('./routes/digital-wallet');
const businessMediaRoutes = require('./routes/business-media');
const feedbackRoutes = require('./routes/feedback');
const businessDashboardRoutes = require('./routes/business-dashboard');
const linksRoutes = require('./routes/links');

// 已移除：會員許願版與 AI 智慧通知路由
const aiProfilesRoutes = require('./routes/ai-profiles');
const emailRoutes = require('./routes/emails');
const ceremonyRoutes = require('./routes/ceremony');
const videoManagementRoutes = require('./routes/videoManagement');
const nfcTriggerRoutes = require('./routes/nfcTrigger');
const { initializeDatabase, pool } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');

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
      connectSrc: [
        "'self'",
        "http://localhost:3002",
        "https://*.onrender.com",
        "https://*.firebaseio.com",
        "wss://*.firebaseio.com",
        "https://*.firebasedatabase.app",
        "wss://*.firebasedatabase.app",
        "https://cloudflareinsights.com"
      ],
      imgSrc: ["'self'", "data:", "http://localhost:3000", "http://localhost:3001", "https:", "https://res.cloudinary.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://www.instagram.com", "https://static.cloudflareinsights.com"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:", "https://www.instagram.com", "https://static.cloudflareinsights.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com", "https://www.tiktok.com", "https://www.instagram.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));

// Additional CSP middleware for NFC Gateway Service
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:* https://*.onrender.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasedatabase.app wss://*.firebasedatabase.app https://cloudflareinsights.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.instagram.com https://static.cloudflareinsights.com; " +
    "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.instagram.com https://static.cloudflareinsights.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.tiktok.com https://www.instagram.com; " +
    "media-src 'self' data: blob:;"
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
      "https://bci-connect.onrender.com",
      process.env.CLIENT_URL,
        "https://www.gbc-connect.com",
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
  // Handle CORS preflight for all routes
  app.options('*', cors(corsOptions));
  app.options('*', cors(corsOptions));

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
app.use('/api/admin-templates', adminTemplatesRoutes);

app.use('/api/nfc-cards', nfcCardsRoutes);
app.use('/api/nfc-analytics', nfcAnalyticsRoutes);
app.use('/api/ocr', ocrScannerRoutes);
app.use('/api/digital-wallet', digitalWalletRoutes);
app.use('/api/business-media', businessMediaRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/business-dashboard', businessDashboardRoutes);
const aiStrategyRoutes = require('./routes/ai-strategy');
app.use('/api/ai-strategy', aiStrategyRoutes);

// 短網址 API 與根路徑轉址
app.use('/api/links', linksRoutes.router);
app.get('/l/:code', linksRoutes.redirectShortLink);

// 已移除：會員許願版與 AI 智慧通知 API
app.use('/api/ai-profiles', aiProfilesRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/ceremony', ceremonyRoutes);
app.use('/api/video-management', videoManagementRoutes);
app.use('/api/nfc-trigger', nfcTriggerRoutes);

// 新增 AI 聯絡人端點
const aiContactsRoutes = require('./routes/ai-contacts');
app.use('/api/ai', aiContactsRoutes);

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

// Add version endpoint for build identification
app.get('/api/version', async (req, res) => {
  try {
    // Prefer commit hash from environment (Render sets COMMIT if configured), fallback to package.json version
    const pkg = require('./package.json');
    const version = pkg.version || '0.0.0';
    const commit = process.env.RENDER_GIT_COMMIT || process.env.COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_VERSION || null;
    const shortCommit = commit ? commit.substring(0, 7) : null;
    res.json({ version, commit: shortCommit, fullCommit: commit, timestamp: new Date().toISOString() });
  } catch (e) {
    res.json({ version: 'unknown', error: e?.message || String(e) });
  }
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
  // 靜態資產：長快取（由打包雜湊檔名保證唯一性）
  app.use(express.static(path.join(__dirname, 'client/build'), {
    setHeaders: (res, filePath) => {
      if (path.basename(filePath) === 'index.html') {
        // index.html：禁止快取，避免舊版入口檔影響路由與資源載入
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        // 其他資產：可快取一年並標示不可變（雜湊檔名）
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // React 路由入口：index.html 也設置禁止快取標頭
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
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

  // 啟動提醒排程（每日與每週，以近似方式）
  try {
    const { notifyAllActiveUsers } = require('./services/goalReminderService');
    const THRESHOLD = Number(process.env.GOAL_REMINDER_THRESHOLD || 0.5);

    // 每日 9:00（每分鐘檢查一次，避免錯過時點）
    setInterval(async () => {
      const now = new Date();
      if (now.getMinutes() === 0 && now.getHours() === 9) {
        console.log('⏰ Daily goal reminder triggered');
        try {
          const result = await notifyAllActiveUsers('monthly', THRESHOLD);
          console.log('📣 Daily reminders result:', {
            total: result.count,
            sent: result.results.filter(r => r.sent).length
          });
        } catch (err) {
          console.error('Daily goal reminder failed:', err);
        }
      }
    }, 60 * 1000);

    // 每週一 9:00（每分鐘檢查一次）
    setInterval(async () => {
      const now = new Date();
      // getDay()：0=週日, 1=週一, ...
      if (now.getDay() === 1 && now.getMinutes() === 0 && now.getHours() === 9) {
        console.log('⏰ Weekly goal reminder triggered');
        try {
          const result = await notifyAllActiveUsers('monthly', THRESHOLD);
          console.log('📣 Weekly reminders result:', {
            total: result.count,
            sent: result.results.filter(r => r.sent).length
          });
        } catch (err) {
          console.error('Weekly goal reminder failed:', err);
        }
      }
    }, 60 * 1000);
  } catch (e) {
    console.error('❌ Failed to start goal reminder scheduler:', e);
  }
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
      name: 'Alice Chen',
      email: 'alice.chen@example.com',
      password: 'TestPass123!',
      company: 'Chen Tech Solutions',
      industry: '資訊科技',
      title: '執行長',
      contact_number: '0912-345-678',
      membership_level: 1,
      interview_form: {
        companyName: 'Chen Tech Solutions',
        brandLogo: '',
        industry: '資訊科技',
        coreServices: '企業數位轉型解決方案、雲端系統整合、AI應用開發',
        competitiveAdvantage: '擁有10年以上軟體開發經驗，專精於企業級應用系統，提供一站式數位轉型服務',
        targetMarket: '中大型企業、製造業、金融業',
        idealCustomer: '年營收5億以上的傳統企業，正在尋求數位轉型的公司',
        customerExamples: '台積電供應商、銀行業者、製造業龍頭',
        customerTraits: '重視技術創新、有長期合作意願、預算充足',
        customerPainPoints: '傳統流程效率低、數據分析能力不足、缺乏整合性解決方案',
        referralTrigger: '當企業面臨數位轉型挑戰或系統整合問題時',
        referralOpening: '我們專門協助企業進行數位轉型，已成功幫助多家公司提升營運效率50%以上',
        referralProblem: '解決企業數位化過程中的技術整合和流程優化問題',
        qualityReferral: '正在進行數位轉型的中大型企業，有明確預算和時程規劃',
        unsuitableReferral: '預算有限的小型企業或對技術創新接受度低的傳統公司',
        partnerTypes: '系統整合商、管理顧問公司、硬體設備商',
        businessGoals: '成為台灣領先的企業數位轉型解決方案提供商，3年內營收成長300%',
        personalInterests: '科技趨勢研究、登山健行、閱讀商業書籍'
      }
    },
    {
      name: 'Bob Wang',
      email: 'bob.wang@example.com',
      password: 'TestPass123!',
      company: 'Wang Marketing Group',
      industry: '行銷顧問',
      title: '創意總監',
      contact_number: '0923-456-789',
      membership_level: 2,
      interview_form: {
        companyName: 'Wang Marketing Group',
        brandLogo: '',
        industry: '行銷顧問',
        coreServices: '品牌策略規劃、數位行銷執行、創意內容製作、市場分析研究',
        competitiveAdvantage: '15年行銷顧問經驗，服務過多家知名企業，擅長整合傳統與數位行銷',
        targetMarket: '中小企業、新創公司、傳統產業轉型企業',
        idealCustomer: '重視品牌形象、願意投資行銷、有成長企圖心的企業主',
        customerExamples: '連鎖餐飲品牌、電商平台、製造業B2B企業',
        customerTraits: '決策快速、重視ROI、願意嘗試新的行銷方式',
        customerPainPoints: '品牌知名度不足、行銷預算效益不彰、缺乏專業行銷團隊',
        referralTrigger: '當企業面臨品牌定位模糊或行銷效果不佳的問題時',
        referralOpening: '我們專精於幫助企業建立強勢品牌，已協助200+企業提升品牌價值',
        referralProblem: '解決企業品牌定位不清、行銷策略分散、數位轉型困難等問題',
        qualityReferral: '有明確行銷預算、重視品牌建設的成長型企業',
        unsuitableReferral: '只重視短期銷售、不願投資品牌建設的企業',
        partnerTypes: '廣告代理商、公關公司、網站設計公司、媒體採購商',
        businessGoals: '成為業界領導品牌，拓展國際市場，建立行銷生態系',
        personalInterests: '攝影創作、旅遊探索、品酒收藏、設計美學'
      }
    },
    {
      name: 'Carol Liu',
      email: 'carol.liu@example.com',
      password: 'TestPass123!',
      company: 'Liu Construction Co.',
      industry: '建築營造',
      title: '專案經理',
      contact_number: '0934-567-890',
      membership_level: 3,
      interview_form: {
        companyName: 'Liu Construction Co.',
        brandLogo: '',
        industry: '建築營造',
        coreServices: '住宅大樓建設、商業不動產開發、綠建築設計施工、都市更新專案',
        competitiveAdvantage: '25年建築業經驗，完成多項大型建設專案，專精於綠建築和智慧建築',
        targetMarket: '房地產開發商、政府機關、企業總部建設',
        idealCustomer: '重視建築品質、有長期開發計畫的大型開發商',
        customerExamples: '知名建設公司、科技園區開發案、政府公共工程',
        customerTraits: '注重工程品質、按時完工、預算控制嚴格',
        customerPainPoints: '工期延誤風險、成本控制困難、法規變更適應',
        referralTrigger: '當客戶有大型建設需求或綠建築認證需求時',
        referralOpening: '我們專精於高品質建築工程，100%準時完工記錄，綠建築認證通過率95%',
        referralProblem: '解決建築工程品質控制、工期管理、綠建築認證等專業問題',
        qualityReferral: '有明確建設計畫、重視工程品質的大型開發案',
        unsuitableReferral: '預算過低、工期要求不合理的小型工程案',
        partnerTypes: '建築師事務所、室內設計公司、建材供應商、機電工程商',
        businessGoals: '發展綠建築和智慧建築項目，成為永續建築領導品牌',
        personalInterests: '建築設計欣賞、環保議題關注、高爾夫球、古典音樂'
      }
    },
    {
      name: 'David Zhang',
      email: 'david.zhang@example.com',
      password: 'TestPass123!',
      company: 'Zhang Restaurant Group',
      industry: '餐飲服務',
      title: '營運總監',
      contact_number: '0945-678-901',
      membership_level: 1,
      interview_form: {
        companyName: 'Zhang Restaurant Group',
        brandLogo: '',
        industry: '餐飲服務',
        coreServices: '連鎖餐廳營運管理、餐飲品牌加盟、食材供應鏈整合、餐飲顧問服務',
        competitiveAdvantage: '12年餐飲業經驗，管理20家連鎖餐廳，擅長品牌營運和供應鏈管理',
        targetMarket: '想要加盟餐飲品牌的投資者、需要餐飲顧問的新創餐廳',
        idealCustomer: '有餐飲投資經驗、重視品牌價值、願意遵循標準作業流程',
        customerExamples: '連鎖加盟主、餐飲創業者、食材供應商',
        customerTraits: '執行力強、重視食品安全、有長期經營規劃',
        customerPainPoints: '缺乏餐飲經營經驗、食材成本控制困難、人員管理問題',
        referralTrigger: '當有人想要投資餐飲業或現有餐廳經營遇到困難時',
        referralOpening: '我們擁有成功的連鎖餐飲營運模式，已幫助100+加盟主成功創業',
        referralProblem: '解決餐飲創業風險、營運效率提升、品牌建立等問題',
        qualityReferral: '有充足資金、認同品牌理念的潛在加盟主',
        unsuitableReferral: '資金不足、不願配合標準作業流程的投資者',
        partnerTypes: '食材供應商、餐飲設備商、物流配送公司、餐飲顧問',
        businessGoals: '擴展連鎖店數量至50家，提升品牌知名度，進軍海外市場',
        personalInterests: '美食品鑑、廚藝研習、旅遊美食探索、紅酒收藏'
      }
    },
    {
      name: 'Eva Lin',
      email: 'eva.lin@example.com',
      password: 'TestPass123!',
      company: 'Lin Financial Advisory',
      industry: '金融服務',
      title: '財務顧問',
      contact_number: '0956-789-012',
      membership_level: 2,
      interview_form: {
        companyName: 'Lin Financial Advisory',
        brandLogo: '',
        industry: '金融服務',
        coreServices: '個人理財規劃、企業財務顧問、投資組合管理、保險規劃、稅務諮詢',
        competitiveAdvantage: '8年金融服務經驗，專精於投資理財規劃，擁有CFP國際認證',
        targetMarket: '高淨值個人客戶、中小企業主、專業人士',
        idealCustomer: '年收入300萬以上、重視財務規劃、有長期投資觀念',
        customerExamples: '醫師、律師、企業主、科技業高階主管',
        customerTraits: '理性決策、重視專業建議、有明確財務目標',
        customerPainPoints: '投資知識不足、風險控制困難、稅務規劃複雜',
        referralTrigger: '當客戶面臨重大財務決策或投資規劃需求時',
        referralOpening: '我們提供專業的財務規劃服務，已幫助500+客戶達成財務目標',
        referralProblem: '解決投資風險控制、退休規劃、稅務優化等財務問題',
        qualityReferral: '有一定資產規模、重視專業理財建議的客戶',
        unsuitableReferral: '只想要短期投機、不願接受專業建議的客戶',
        partnerTypes: '會計師事務所、律師事務所、保險經紀公司、銀行理專',
        businessGoals: '建立專業財務顧問品牌，擴大高淨值客戶基礎，發展家族辦公室服務',
        personalInterests: '投資研究、經濟趨勢分析、瑜珈健身、古典音樂欣賞'
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

    // Ensure latest NFC templates exist (idempotent)
    try {
      const { ensureLatestTemplatesExist } = require('./config/database');
      await ensureLatestTemplatesExist();
    } catch (tplErr) {
      console.warn('⚠️ Failed ensuring latest NFC templates:', tplErr.message);
    }
    
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
    

    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't exit process, let the server continue running
    console.log('🔄 Server will continue running without full database initialization');
  }
}

module.exports = app;// Force rebuild 1758304197
