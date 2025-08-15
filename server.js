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
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self", "data:", "http://localhost:3000", "http://localhost:3001", "https:", "https://res.cloudinary.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));

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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    // Add development origins only in development
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push(
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://192.168.0.14:3000',
        'http://192.168.0.14:3001'
      );
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
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

// Static files are now served by Cloudinary

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

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 BCI Business Elite Club server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});

module.exports = app;