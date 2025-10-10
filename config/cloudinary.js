const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bci-connect/events', // Organize uploads in folders
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [
      // 自動修剪去除邊緣白邊
      { effect: 'trim' },
      // 控制寬度上限，保持原始比例
      { width: 1100, crop: 'limit' },
      // 最佳化輸出
      { quality: 'auto' },
      { fetch_format: 'auto' },
      { dpr: 'auto' }
    ]
  }
});

module.exports = {
  cloudinary,
  storage
};