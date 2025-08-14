const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 獲取商會地基內容 - 所有會員可查看
router.get('/foundation', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT content FROM static_content WHERE type = $1',
      ['foundation']
    );
    
    const content = result.rows.length > 0 ? result.rows[0].content : '';
    
    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Error fetching foundation content:', error);
    res.status(500).json({
      success: false,
      message: '獲取商會地基內容失敗'
    });
  }
});

// 更新商會地基內容 - 僅限管理員
router.put('/foundation', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '內容不能為空'
      });
    }
    
    // 使用 UPSERT 操作
    await pool.query(`
      INSERT INTO static_content (type, content, updated_by_id, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (type)
      DO UPDATE SET 
        content = EXCLUDED.content,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = CURRENT_TIMESTAMP
    `, ['foundation', content, req.user.id]);
    
    res.json({
      success: true,
      message: '商會地基內容更新成功'
    });
  } catch (error) {
    console.error('Error updating foundation content:', error);
    res.status(500).json({
      success: false,
      message: '更新商會地基內容失敗'
    });
  }
});

// 獲取商會簡報URL - 所有會員可查看
router.get('/presentation-url', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT content FROM static_content WHERE type = $1',
      ['presentation_url']
    );
    
    const url = result.rows.length > 0 ? result.rows[0].content : '';
    
    res.json({
      success: true,
      url
    });
  } catch (error) {
    console.error('Error fetching presentation URL:', error);
    res.status(500).json({
      success: false,
      message: '獲取商會簡報URL失敗'
    });
  }
});

// 更新商會簡報URL - 僅限管理員
router.put('/presentation-url', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL不能為空'
      });
    }
    
    // 簡單的URL驗證
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        message: '請輸入有效的URL（需以http://或https://開頭）'
      });
    }
    
    // 使用 UPSERT 操作
    await pool.query(`
      INSERT INTO static_content (type, content, updated_by_id, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (type)
      DO UPDATE SET 
        content = EXCLUDED.content,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = CURRENT_TIMESTAMP
    `, ['presentation_url', url, req.user.id]);
    
    res.json({
      success: true,
      message: '商會簡報URL更新成功'
    });
  } catch (error) {
    console.error('Error updating presentation URL:', error);
    res.status(500).json({
      success: false,
      message: '更新商會簡報URL失敗'
    });
  }
});

module.exports = router;