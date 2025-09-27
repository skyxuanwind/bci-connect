const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 根據 NFC 卡片 ID 獲取對應的影片
router.get('/video/:nfcId', async (req, res) => {
  try {
    const { nfcId } = req.params;
    
    // 首先查找是否有為該 NFC 卡片指定的特定影片
    const nfcVideoResult = await pool.query(`
      SELECT v.* FROM videos v
      JOIN nfc_video_mappings nvm ON v.id = nvm.video_id
      WHERE nvm.nfc_card_id = $1 AND v.is_active = true
    `, [nfcId]);
    
    if (nfcVideoResult.rows.length > 0) {
      return res.json({
        success: true,
        video: nfcVideoResult.rows[0],
        source: 'nfc_specific'
      });
    }
    
    // 如果沒有特定影片，返回默認影片
    const defaultVideoResult = await pool.query(
      'SELECT * FROM videos WHERE is_default = true AND is_active = true LIMIT 1'
    );
    
    if (defaultVideoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '沒有可用的影片'
      });
    }
    
    res.json({
      success: true,
      video: defaultVideoResult.rows[0],
      source: 'default'
    });
  } catch (error) {
    console.error('獲取 NFC 觸發影片錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取影片失敗',
      error: error.message
    });
  }
});

// 獲取默認歡迎影片
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

// 為 NFC 卡片設置特定影片
router.post('/mapping', async (req, res) => {
  try {
    const { nfc_card_id, video_id } = req.body;
    
    if (!nfc_card_id || !video_id) {
      return res.status(400).json({
        success: false,
        message: 'NFC 卡片 ID 和影片 ID 都是必需的'
      });
    }
    
    // 檢查影片是否存在
    const videoResult = await pool.query('SELECT id FROM videos WHERE id = $1', [video_id]);
    if (videoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '指定的影片不存在'
      });
    }
    
    // 檢查是否已存在映射，如果存在則更新，否則創建
    const existingMapping = await pool.query(
      'SELECT id FROM nfc_video_mappings WHERE nfc_card_id = $1',
      [nfc_card_id]
    );
    
    let result;
    if (existingMapping.rows.length > 0) {
      // 更新現有映射
      result = await pool.query(`
        UPDATE nfc_video_mappings 
        SET video_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE nfc_card_id = $2
        RETURNING *
      `, [video_id, nfc_card_id]);
    } else {
      // 創建新映射
      result = await pool.query(`
        INSERT INTO nfc_video_mappings (nfc_card_id, video_id)
        VALUES ($1, $2)
        RETURNING *
      `, [nfc_card_id, video_id]);
    }
    
    res.json({
      success: true,
      message: 'NFC 影片映射設置成功',
      mapping: result.rows[0]
    });
  } catch (error) {
    console.error('設置 NFC 影片映射錯誤:', error);
    res.status(500).json({
      success: false,
      message: '設置映射失敗',
      error: error.message
    });
  }
});

// 獲取所有 NFC 影片映射
router.get('/mappings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT nvm.*, v.title as video_title, v.description as video_description
      FROM nfc_video_mappings nvm
      JOIN videos v ON nvm.video_id = v.id
      ORDER BY nvm.created_at DESC
    `);
    
    res.json({
      success: true,
      mappings: result.rows
    });
  } catch (error) {
    console.error('獲取 NFC 映射錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取映射失敗',
      error: error.message
    });
  }
});

// 刪除 NFC 影片映射
router.delete('/mapping/:nfcId', async (req, res) => {
  try {
    const { nfcId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM nfc_video_mappings WHERE nfc_card_id = $1 RETURNING *',
      [nfcId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '映射不存在'
      });
    }
    
    res.json({
      success: true,
      message: 'NFC 影片映射刪除成功'
    });
  } catch (error) {
    console.error('刪除 NFC 映射錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除映射失敗',
      error: error.message
    });
  }
});

// 記錄影片播放事件
router.post('/play-log', async (req, res) => {
  try {
    const { nfc_card_id, video_id, member_id, play_duration } = req.body;
    
    const result = await pool.query(`
      INSERT INTO video_play_logs (nfc_card_id, video_id, member_id, play_duration)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nfc_card_id, video_id, member_id, play_duration]);
    
    res.json({
      success: true,
      message: '播放記錄已保存',
      log: result.rows[0]
    });
  } catch (error) {
    console.error('記錄播放事件錯誤:', error);
    res.status(500).json({
      success: false,
      message: '記錄播放事件失敗',
      error: error.message
    });
  }
});

// 獲取播放統計
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    let params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE vpl.created_at BETWEEN $1 AND $2';
      params = [start_date, end_date];
    }
    
    const result = await pool.query(`
      SELECT 
        v.title,
        v.id as video_id,
        COUNT(vpl.id) as play_count,
        AVG(vpl.play_duration) as avg_duration,
        SUM(vpl.play_duration) as total_duration
      FROM videos v
      LEFT JOIN video_play_logs vpl ON v.id = vpl.video_id
      ${dateFilter}
      GROUP BY v.id, v.title
      ORDER BY play_count DESC
    `, params);
    
    res.json({
      success: true,
      stats: result.rows
    });
  } catch (error) {
    console.error('獲取播放統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取統計失敗',
      error: error.message
    });
  }
});

module.exports = router;