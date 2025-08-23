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
const { initializeDatabase } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');
const judgmentSyncService = require('./services/judgmentSyncService');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
      message: 'BCI Business Elite Club API Server', 
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

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 BCI Business Elite Club server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize databases
  try {
    // Initialize PostgreSQL
    await initializeDatabase();
    console.log('✅ PostgreSQL database initialized successfully');
    
    // Initialize MongoDB for NFC system
    await connectMongoDB();
    console.log('✅ MongoDB initialized successfully');
    
    // Start judgment sync scheduler
    judgmentSyncService.startScheduler();
    console.log('⏰ 裁判書同步排程已啟動');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});

module.exports = app;