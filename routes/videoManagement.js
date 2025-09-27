const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

// 配置 multer 用於文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB 限制
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允許上傳影片文件！'));
    }
  }
});

// 獲取所有影片
router.get('/videos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, description, file_url, file_size, duration, 
             is_default, created_at, updated_at 
      FROM videos 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      videos: result.rows
    });
  } catch (error) {
    console.error('獲取影片列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取影片列表失敗',
      error: error.message
    });
  }
});

// 獲取單個影片
router.get('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '影片不存在'
      });
    }
    
    res.json({
      success: true,
      video: result.rows[0]
    });
  } catch (error) {
    console.error('獲取影片錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取影片失敗',
      error: error.message
    });
  }
});

// 創建影片記錄
router.post('/videos', async (req, res) => {
  try {
    const { title, description, file_url, file_size, duration, is_default, is_active } = req.body;
    
    // 驗證必需字段
    if (!title || !file_url) {
      return res.status(400).json({
        success: false,
        message: '標題和文件URL是必需的'
      });
    }
    
    // 如果設置為默認影片，先將其他影片的默認狀態設為 false
    if (is_default) {
      await pool.query('UPDATE videos SET is_default = false');
    }
    
    const result = await pool.query(`
      INSERT INTO videos (title, description, file_url, file_size, duration, is_default, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, description, file_url, file_size || null, duration || null, is_default || false, is_active !== false]);
    
    res.status(201).json({
      success: true,
      message: '影片記錄創建成功',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('創建影片記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建影片記錄失敗',
      error: error.message
    });
  }
});

// 上傳影片
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的影片文件'
      });
    }
    
    const { title, description, is_default } = req.body;
    const file_url = `/uploads/videos/${req.file.filename}`;
    const file_size = req.file.size;
    
    // 如果設置為默認影片，先將其他影片的默認狀態取消
    if (is_default === 'true') {
      await pool.query('UPDATE videos SET is_default = false');
    }
    
    const result = await pool.query(`
      INSERT INTO videos (title, description, file_url, file_size, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, description, file_url, file_size, is_default === 'true']);
    
    res.json({
      success: true,
      message: '影片上傳成功',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('上傳影片錯誤:', error);
    res.status(500).json({
      success: false,
      message: '上傳影片失敗',
      error: error.message
    });
  }
});

// 更新影片信息
router.put('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_default, duration } = req.body;
    
    // 如果設置為默認影片，先將其他影片的默認狀態取消
    if (is_default) {
      await pool.query('UPDATE videos SET is_default = false WHERE id != $1', [id]);
    }
    
    const result = await pool.query(`
      UPDATE videos 
      SET title = $1, description = $2, is_default = $3, duration = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [title, description, is_default, duration, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '影片不存在'
      });
    }
    
    res.json({
      success: true,
      message: '影片更新成功',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('更新影片錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新影片失敗',
      error: error.message
    });
  }
});

// 刪除影片
router.delete('/videos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 獲取影片信息以刪除文件
    const videoResult = await pool.query('SELECT file_url FROM videos WHERE id = $1', [id]);
    
    if (videoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '影片不存在'
      });
    }
    
    const video = videoResult.rows[0];
    
    // 刪除數據庫記錄
    await pool.query('DELETE FROM videos WHERE id = $1', [id]);
    
    // 刪除文件
    const filePath = path.join(__dirname, '..', video.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      success: true,
      message: '影片刪除成功'
    });
  } catch (error) {
    console.error('刪除影片錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除影片失敗',
      error: error.message
    });
  }
});

// 獲取默認影片
router.get('/default-video', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM videos WHERE is_default = true LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '沒有設置默認影片'
      });
    }
    
    res.json({
      success: true,
      video: result.rows[0]
    });
  } catch (error) {
    console.error('獲取默認影片錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取默認影片失敗',
      error: error.message
    });
  }
});

module.exports = router;