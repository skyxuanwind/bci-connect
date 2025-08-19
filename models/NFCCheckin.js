const mongoose = require('mongoose');

// NFC 報到記錄 Schema
const nfcCheckinSchema = new mongoose.Schema({
  cardUid: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  checkinTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  readerName: {
    type: String,
    default: null
  },
  source: {
    type: String,
    enum: ['nfc-gateway', 'manual', 'simulation'],
    default: 'nfc-gateway'
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // 自動添加 createdAt 和 updatedAt
  collection: 'nfc_checkins'
});

// 索引設定
nfcCheckinSchema.index({ cardUid: 1, checkinTime: -1 });
nfcCheckinSchema.index({ checkinTime: -1 });
nfcCheckinSchema.index({ isDeleted: 1 });

// 虛擬欄位：格式化的報到時間
nfcCheckinSchema.virtual('formattedCheckinTime').get(function() {
  return this.checkinTime.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// 實例方法：獲取格式化時間
nfcCheckinSchema.methods.getFormattedTime = function() {
  return this.checkinTime.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 實例方法：軟刪除
nfcCheckinSchema.methods.softDelete = function() {
  this.isDeleted = true;
  return this.save();
};

// 靜態方法：獲取活躍的報到記錄
nfcCheckinSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

// 靜態方法：獲取最後一筆報到記錄
nfcCheckinSchema.statics.findLastCheckin = function() {
  return this.findOne({ isDeleted: false })
    .sort({ checkinTime: -1 })
    .exec();
};

// 靜態方法：獲取特定卡號的報到記錄
nfcCheckinSchema.statics.findByCardUid = function(cardUid) {
  return this.find({ cardUid, isDeleted: false })
    .sort({ checkinTime: -1 })
    .exec();
};

// 靜態方法：獲取今日報到記錄
nfcCheckinSchema.statics.findTodayCheckins = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    checkinTime: {
      $gte: today,
      $lt: tomorrow
    },
    isDeleted: false
  }).sort({ checkinTime: -1 }).exec();
};

// 靜態方法：統計報到次數
nfcCheckinSchema.statics.countCheckins = function(filter = {}) {
  return this.countDocuments({ ...filter, isDeleted: false });
};

// 中間件：保存前處理
nfcCheckinSchema.pre('save', function(next) {
  // 確保卡號為大寫
  if (this.cardUid) {
    this.cardUid = this.cardUid.toUpperCase();
  }
  next();
});

// 中間件：查詢前處理（排除已刪除的記錄）
nfcCheckinSchema.pre(/^find/, function(next) {
  // 如果查詢條件中沒有明確指定 isDeleted，則預設排除已刪除的記錄
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// 導出模型
const NFCCheckin = mongoose.model('NFCCheckin', nfcCheckinSchema);

module.exports = NFCCheckin;