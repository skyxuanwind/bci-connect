const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB 連接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nfc-checkin';

// MongoDB 連接選項
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false
};

// 連接到 MongoDB
const connectMongoDB = async () => {
  // 檢查 MONGODB_URI 是否為有效配置
  if (!MONGODB_URI || MONGODB_URI.includes('your_mongodb_user') || MONGODB_URI.includes('your_mongodb_cluster')) {
    console.log('⚠️ MongoDB URI 未配置或為佔位符，跳過 MongoDB 連接');
    console.log('💡 如需啟用 NFC 功能，請在 Render Dashboard 中配置正確的 MONGODB_URI');
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI, mongoOptions);
    console.log('✅ MongoDB 連接成功');
  } catch (error) {
    console.error('❌ MongoDB 連接失敗:', error.message);
    // 不要強制退出，讓應用繼續運行
    console.log('⚠️ 應用將繼續運行，但 MongoDB 功能不可用');
  }
};

// MongoDB 連接事件監聽
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose 已連接到 MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose 連接錯誤:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose 已斷開 MongoDB 連接');
});

// 優雅關閉
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('✅ MongoDB 連接已關閉');
  process.exit(0);
});

module.exports = {
  connectMongoDB,
  mongoose
};