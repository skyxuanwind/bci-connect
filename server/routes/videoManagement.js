const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 資料庫連接配置
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gbc_connect',
    charset: 'utf8mb4'
};

// 創建資料庫連接池
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 影片存儲配置
const videoStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/videos');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('不支持的影片格式'), false);
    }
};

// Multer 配置
const upload = multer({
    storage: videoStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

// 工具函數：生成影片縮圖
const generateThumbnail = (videoPath, outputPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .screenshots({
                timestamps: ['10%'],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
                size: '320x240'
            })
            .on('end', () => resolve(outputPath))
            .on('error', reject);
    });
};

// 工具函數：獲取影片信息
const getVideoInfo = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);
            
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            const duration = Math.round(metadata.format.duration);
            const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : null;
            
            resolve({
                duration,
                resolution,
                size: metadata.format.size
            });
        });
    });
};

// API 路由

// 1. 獲取所有影片分類
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await pool.execute(
            'SELECT * FROM video_categories WHERE is_active = TRUE ORDER BY sort_order, name'
        );
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('獲取分類失敗:', error);
        res.status(500).json({ success: false, message: '獲取分類失敗' });
    }
});

// 2. 創建新分類
router.post('/categories', async (req, res) => {
    const { name, description, color_code, sort_order } = req.body;
    
    try {
        const [result] = await pool.execute(
            'INSERT INTO video_categories (name, description, color_code, sort_order) VALUES (?, ?, ?, ?)',
            [name, description, color_code || '#3B82F6', sort_order || 0]
        );
        
        res.json({ 
            success: true, 
            message: '分類創建成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('創建分類失敗:', error);
        res.status(500).json({ success: false, message: '創建分類失敗' });
    }
});

// 3. 獲取所有影片標籤
router.get('/tags', async (req, res) => {
    try {
        const [tags] = await pool.execute(
            'SELECT * FROM video_tags ORDER BY usage_count DESC, name'
        );
        res.json({ success: true, data: tags });
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
        let whereClause = 'WHERE v.is_active = ?';
        let params = [is_active === 'true'];
        
        if (category_id) {
            whereClause += ' AND v.category_id = ?';
            params.push(category_id);
        }
        
        if (search) {
            whereClause += ' AND (v.title LIKE ? OR v.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        const offset = (page - 1) * limit;
        
        // 獲取影片列表
        const [videos] = await pool.execute(`
            SELECT 
                v.*,
                c.name as category_name,
                c.color_code as category_color,
                GROUP_CONCAT(t.name) as tags
            FROM ceremony_videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            LEFT JOIN video_tag_relations vtr ON v.id = vtr.video_id
            LEFT JOIN video_tags t ON vtr.tag_id = t.id
            ${whereClause}
            GROUP BY v.id
            ORDER BY v.${sort_by} ${sort_order}
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);
        
        // 獲取總數
        const [countResult] = await pool.execute(`
            SELECT COUNT(DISTINCT v.id) as total
            FROM ceremony_videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            ${whereClause}
        `, params);
        
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            data: {
                videos,
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
        // 獲取影片信息
        const videoInfo = await getVideoInfo(videoPath);
        
        // 生成縮圖
        const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
        await fs.mkdir(thumbnailDir, { recursive: true });
        const thumbnailPath = path.join(thumbnailDir, `thumb-${filename}.jpg`);
        await generateThumbnail(videoPath, thumbnailPath);
        
        // 如果設為預設影片，先取消其他預設影片
        if (is_default === 'true') {
            await pool.execute('UPDATE ceremony_videos SET is_default = FALSE');
        }
        
        // 插入影片記錄
        const [result] = await pool.execute(`
            INSERT INTO ceremony_videos 
            (title, description, filename, file_path, file_url, file_size, duration, format, resolution, thumbnail_url, category_id, is_default, upload_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            description,
            req.file.originalname,
            videoPath,
            `/uploads/videos/${filename}`,
            req.file.size,
            videoInfo.duration,
            path.extname(req.file.originalname).substring(1).toLowerCase(),
            videoInfo.resolution,
            `/uploads/thumbnails/thumb-${filename}.jpg`,
            category_id || null,
            is_default === 'true',
            req.user?.id || 1 // 假設有用戶認證
        ]);
        
        const videoId = result.insertId;
        
        // 處理標籤
        if (tags) {
            const tagList = JSON.parse(tags);
            for (const tagName of tagList) {
                // 創建或獲取標籤
                let [tagResult] = await pool.execute(
                    'SELECT id FROM video_tags WHERE name = ?',
                    [tagName]
                );
                
                let tagId;
                if (tagResult.length === 0) {
                    const [newTag] = await pool.execute(
                        'INSERT INTO video_tags (name) VALUES (?)',
                        [tagName]
                    );
                    tagId = newTag.insertId;
                } else {
                    tagId = tagResult[0].id;
                }
                
                // 關聯標籤
                await pool.execute(
                    'INSERT INTO video_tag_relations (video_id, tag_id) VALUES (?, ?)',
                    [videoId, tagId]
                );
            }
        }
        
        res.json({
            success: true,
            message: '影片上傳成功',
            data: {
                id: videoId,
                filename: filename,
                duration: videoInfo.duration,
                resolution: videoInfo.resolution,
                size: req.file.size
            }
        });
        
    } catch (error) {
        console.error('影片上傳失敗:', error);
        
        // 清理已上傳的檔案
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
        const [videos] = await pool.execute(`
            SELECT 
                v.*,
                c.name as category_name,
                c.color_code as category_color,
                GROUP_CONCAT(t.name) as tags
            FROM ceremony_videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            LEFT JOIN video_tag_relations vtr ON v.id = vtr.video_id
            LEFT JOIN video_tags t ON vtr.tag_id = t.id
            WHERE v.id = ?
            GROUP BY v.id
        `, [id]);
        
        if (videos.length === 0) {
            return res.status(404).json({ success: false, message: '影片不存在' });
        }
        
        res.json({ success: true, data: videos[0] });
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
            await pool.execute('UPDATE ceremony_videos SET is_default = FALSE WHERE id != ?', [id]);
        }
        
        // 更新影片信息
        await pool.execute(`
            UPDATE ceremony_videos 
            SET title = ?, description = ?, category_id = ?, is_default = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [title, description, category_id, is_default, is_active, id]);
        
        // 更新標籤
        if (tags) {
            // 刪除現有標籤關聯
            await pool.execute('DELETE FROM video_tag_relations WHERE video_id = ?', [id]);
            
            // 添加新標籤
            for (const tagName of tags) {
                let [tagResult] = await pool.execute(
                    'SELECT id FROM video_tags WHERE name = ?',
                    [tagName]
                );
                
                let tagId;
                if (tagResult.length === 0) {
                    const [newTag] = await pool.execute(
                        'INSERT INTO video_tags (name) VALUES (?)',
                        [tagName]
                    );
                    tagId = newTag.insertId;
                } else {
                    tagId = tagResult[0].id;
                }
                
                await pool.execute(
                    'INSERT INTO video_tag_relations (video_id, tag_id) VALUES (?, ?)',
                    [id, tagId]
                );
            }
        }
        
        res.json({ success: true, message: '影片信息更新成功' });
    } catch (error) {
        console.error('更新影片信息失敗:', error);
        res.status(500).json({ success: false, message: '更新影片信息失敗' });
    }
});

// 8. 刪除影片
router.delete('/videos/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // 獲取影片信息
        const [videos] = await pool.execute(
            'SELECT file_path, thumbnail_url FROM ceremony_videos WHERE id = ?',
            [id]
        );
        
        if (videos.length === 0) {
            return res.status(404).json({ success: false, message: '影片不存在' });
        }
        
        const video = videos[0];
        
        // 刪除資料庫記錄
        await pool.execute('DELETE FROM ceremony_videos WHERE id = ?', [id]);
        
        // 刪除檔案
        try {
            if (video.file_path) {
                await fs.unlink(video.file_path);
            }
            if (video.thumbnail_url) {
                const thumbnailPath = path.join(__dirname, '..', video.thumbnail_url);
                await fs.unlink(thumbnailPath);
            }
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
        await pool.execute('UPDATE ceremony_videos SET is_default = FALSE');
        
        // 設定新的預設影片
        const [result] = await pool.execute(
            'UPDATE ceremony_videos SET is_default = TRUE WHERE id = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
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
        const [videos] = await pool.execute(`
            SELECT 
                v.*,
                c.name as category_name,
                c.color_code as category_color
            FROM ceremony_videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            WHERE v.is_default = TRUE AND v.is_active = TRUE
            LIMIT 1
        `);
        
        if (videos.length === 0) {
            return res.status(404).json({ success: false, message: '未設定預設影片' });
        }
        
        res.json({ success: true, data: videos[0] });
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
        let whereClause = 'WHERE video_id = ?';
        let params = [id];
        
        if (start_date && end_date) {
            whereClause += ' AND date BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        const [statistics] = await pool.execute(`
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
        
        res.json({ success: true, data: statistics });
    } catch (error) {
        console.error('獲取播放統計失敗:', error);
        res.status(500).json({ success: false, message: '獲取播放統計失敗' });
    }
});

module.exports = router;