const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');

// 配置 multer 用於文件上傳
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
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

// 1. 獲取所有影片分類
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM video_categories 
      WHERE is_active = true 
      ORDER BY sort_order, name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取分類失敗:', error);
    res.status(500).json({ success: false, message: '獲取分類失敗' });
  }
});

// 2. 創建新分類
router.post('/categories', async (req, res) => {
  const { name, description, color_code, sort_order } = req.body;
  
  try {
    const result = await pool.query(`
      INSERT INTO video_categories (name, description, color_code, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, color_code || '#3B82F6', sort_order || 0]);
    
    res.json({ 
      success: true, 
      message: '分類創建成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('創建分類失敗:', error);
    res.status(500).json({ success: false, message: '創建分類失敗' });
  }
});

// 3. 獲取所有影片標籤
router.get('/tags', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM video_tags 
      ORDER BY usage_count DESC, name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取標籤失敗:', error);
    res.status(500).json({ success: false, message: '獲取標籤失敗' });
  }
});

// 4. 獲取影片列表 (支持分頁、篩選、搜索)
router.get('/videos', async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    category_id, 
    search, 
    is_active = true,
    sort_by = 'created_at',
    sort_order = 'DESC'
  } = req.query;
  
  try {
    let whereClause = 'WHERE v.is_active = $1';
    let params = [is_active === 'true'];
    let paramCount = 1;
    
    if (category_id) {
      paramCount++;
      whereClause += ` AND v.category_id = $${paramCount}`;
      params.push(category_id);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND (v.title ILIKE $${paramCount} OR v.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    const offset = (page - 1) * limit;
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    
    // 獲取影片列表
    const videosResult = await pool.query(`
      SELECT 
        v.*,
        c.name as category_name,
        c.color_code as category_color,
        STRING_AGG(t.name, ', ') as tags
      FROM ceremony_videos v
      LEFT JOIN video_categories c ON v.category_id = c.id
      LEFT JOIN video_tag_relations vtr ON v.id = vtr.video_id
      LEFT JOIN video_tags t ON vtr.tag_id = t.id
      ${whereClause}
      GROUP BY v.id, c.name, c.color_code
      ORDER BY v.${sort_by} ${sort_order}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, [...params, parseInt(limit), offset]);
    
    // 獲取總數
    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT v.id) as total
      FROM ceremony_videos v
      LEFT JOIN video_categories c ON v.category_id = c.id
      ${whereClause}
    `, params);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: {
        videos: videosResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('獲取影片列表失敗:', error);
    res.status(500).json({ success: false, message: '獲取影片列表失敗' });
  }
});

// 5. 上傳影片
router.post('/videos/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '請選擇要上傳的影片檔案' });
  }
  
  const { title, description, category_id, tags, is_default } = req.body;
  const videoPath = req.file.path;
  const filename = req.file.filename;
  
  try {
    // 如果設為預設影片，先取消其他預設影片
    if (is_default === 'true') {
      await pool.query('UPDATE ceremony_videos SET is_default = false');
    }
    
    // 插入影片記錄
    const result = await pool.query(`
      INSERT INTO ceremony_videos 
      (title, description, filename, file_path, file_url, file_size, format, category_id, is_default, upload_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      title,
      description,
      req.file.originalname,
      videoPath,
      `/uploads/videos/${filename}`,
      req.file.size,
      path.extname(req.file.originalname).substring(1).toLowerCase(),
      category_id || null,
      is_default === 'true',
      req.user?.id || 1 // 假設有用戶認證
    ]);
    
    const videoId = result.rows[0].id;
    
    // 處理標籤
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
      
      for (const tagName of tagArray) {
        if (tagName) {
          // 查找或創建標籤
          let tagResult = await pool.query('SELECT id FROM video_tags WHERE name = $1', [tagName]);
          
          let tagId;
          if (tagResult.rows.length === 0) {
            const newTag = await pool.query(
              'INSERT INTO video_tags (name) VALUES ($1) RETURNING id',
              [tagName]
            );
            tagId = newTag.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }
          
          // 創建標籤關聯
          await pool.query(
            'INSERT INTO video_tag_relations (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [videoId, tagId]
          );
          
          // 更新標籤使用次數
          await pool.query(
            'UPDATE video_tags SET usage_count = usage_count + 1 WHERE id = $1',
            [tagId]
          );
        }
      }
    }
    
    res.json({
      success: true,
      message: '影片上傳成功',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('影片上傳失敗:', error);
    
    // 清理上傳的檔案
    try {
      await fs.unlink(videoPath);
    } catch (cleanupError) {
      console.error('清理檔案失敗:', cleanupError);
    }
    
    res.status(500).json({ success: false, message: '影片上傳失敗' });
  }
});

// 6. 獲取單個影片詳情
router.get('/videos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        v.*,
        c.name as category_name,
        c.color_code as category_color,
        STRING_AGG(t.name, ', ') as tags
      FROM ceremony_videos v
      LEFT JOIN video_categories c ON v.category_id = c.id
      LEFT JOIN video_tag_relations vtr ON v.id = vtr.video_id
      LEFT JOIN video_tags t ON vtr.tag_id = t.id
      WHERE v.id = $1
      GROUP BY v.id, c.name, c.color_code
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '影片不存在' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('獲取影片詳情失敗:', error);
    res.status(500).json({ success: false, message: '獲取影片詳情失敗' });
  }
});

// 7. 更新影片信息
router.put('/videos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, category_id, tags, is_default, is_active } = req.body;
  
  try {
    // 如果設為預設影片，先取消其他預設影片
    if (is_default === true) {
      await pool.query('UPDATE ceremony_videos SET is_default = false WHERE id != $1', [id]);
    }
    
    // 更新影片信息
    await pool.query(`
      UPDATE ceremony_videos 
      SET title = $1, description = $2, category_id = $3, is_default = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `, [title, description, category_id, is_default, is_active, id]);
    
    // 更新標籤
    if (tags) {
      // 刪除現有標籤關聯
      await pool.query('DELETE FROM video_tag_relations WHERE video_id = $1', [id]);
      
      // 添加新標籤
      const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
      
      for (const tagName of tagArray) {
        if (tagName) {
          let tagResult = await pool.query('SELECT id FROM video_tags WHERE name = $1', [tagName]);
          
          let tagId;
          if (tagResult.rows.length === 0) {
            const newTag = await pool.query(
              'INSERT INTO video_tags (name) VALUES ($1) RETURNING id',
              [tagName]
            );
            tagId = newTag.rows[0].id;
          } else {
            tagId = tagResult.rows[0].id;
          }
          
          await pool.query(
            'INSERT INTO video_tag_relations (video_id, tag_id) VALUES ($1, $2)',
            [id, tagId]
          );
          
          await pool.query(
            'UPDATE video_tags SET usage_count = usage_count + 1 WHERE id = $1',
            [tagId]
          );
        }
      }
    }
    
    res.json({ success: true, message: '影片更新成功' });
  } catch (error) {
    console.error('更新影片失敗:', error);
    res.status(500).json({ success: false, message: '更新影片失敗' });
  }
});

// 8. 刪除影片
router.delete('/videos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 獲取影片信息
    const videoResult = await pool.query('SELECT file_path FROM ceremony_videos WHERE id = $1', [id]);
    
    if (videoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '影片不存在' });
    }
    
    const filePath = videoResult.rows[0].file_path;
    
    // 刪除資料庫記錄
    await pool.query('DELETE FROM ceremony_videos WHERE id = $1', [id]);
    
    // 刪除檔案
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error('刪除檔案失敗:', fileError);
    }
    
    res.json({ success: true, message: '影片刪除成功' });
  } catch (error) {
    console.error('刪除影片失敗:', error);
    res.status(500).json({ success: false, message: '刪除影片失敗' });
  }
});

// 9. 設定預設影片
router.post('/videos/:id/set-default', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 取消所有預設影片
    await pool.query('UPDATE ceremony_videos SET is_default = false');
    
    // 設定新的預設影片
    const result = await pool.query(
      'UPDATE ceremony_videos SET is_default = true WHERE id = $1',
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '影片不存在' });
    }
    
    res.json({ success: true, message: '預設影片設定成功' });
  } catch (error) {
    console.error('設定預設影片失敗:', error);
    res.status(500).json({ success: false, message: '設定預設影片失敗' });
  }
});

// 10. 獲取預設影片
router.get('/videos/default/current', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        v.*,
        c.name as category_name,
        c.color_code as category_color
      FROM ceremony_videos v
      LEFT JOIN video_categories c ON v.category_id = c.id
      WHERE v.is_default = true AND v.is_active = true
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '未設定預設影片' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('獲取預設影片失敗:', error);
    res.status(500).json({ success: false, message: '獲取預設影片失敗' });
  }
});

// 11. 獲取影片播放統計
router.get('/videos/:id/statistics', async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;
  
  try {
    let whereClause = 'WHERE video_id = $1';
    let params = [id];
    
    if (start_date && end_date) {
      whereClause += ' AND date BETWEEN $2 AND $3';
      params.push(start_date, end_date);
    }
    
    const result = await pool.query(`
      SELECT 
        date,
        play_count,
        total_duration,
        completion_rate,
        avg_response_time_ms
      FROM video_play_statistics
      ${whereClause}
      ORDER BY date DESC
    `, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('獲取播放統計失敗:', error);
    res.status(500).json({ success: false, message: '獲取播放統計失敗' });
  }
});

module.exports = router;