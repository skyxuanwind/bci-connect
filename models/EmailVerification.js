const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  verificationCode: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10分鐘後過期
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 自動刪除過期的驗證碼
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 確保同一個email在同一時間只有一個有效的驗證碼
emailVerificationSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);