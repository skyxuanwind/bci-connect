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

// 新增：地基閱讀狀態（會員自行勾選「已看過」）
router.get('/foundation/view-status', authenticateToken, async (req, res) => {
  try {
    const q = await pool.query(
      `SELECT 1 FROM member_activities WHERE user_id = $1 AND activity_type = 'foundation_viewed' LIMIT 1`,
      [req.user.id]
    );
    const viewed = q.rows.length > 0;
    res.json({ success: true, viewed });
  } catch (err) {
    console.error('Error fetching foundation view status:', err);
    res.status(500).json({ success: false, message: '獲取閱讀狀態失敗' });
  }
});

router.post('/foundation/viewed', authenticateToken, async (req, res) => {
  try {
    // Idempotent insert：已勾選的不重複插入
    await pool.query(
      `INSERT INTO member_activities (user_id, activity_type, activity_data, ip_address, user_agent)
       SELECT $1, 'foundation_viewed', $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM member_activities WHERE user_id = $1 AND activity_type = 'foundation_viewed'
       )`,
      [
        req.user.id,
        JSON.stringify({ checkedAt: new Date().toISOString() }),
        req.ip || null,
        req.headers['user-agent'] || null
      ]
    );
    res.json({ success: true, viewed: true });
  } catch (err) {
    console.error('Error marking foundation viewed:', err);
    res.status(500).json({ success: false, message: '設定閱讀狀態失敗' });
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

// 新增：地基卡片式內容 - 以 JSON 儲存於 static_content
router.get('/foundation/cards', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT content FROM static_content WHERE type = $1',
      ['foundation_cards']
    );
    const raw = result.rows.length > 0 ? result.rows[0].content : '[]';
    let cards = [];
    try {
      cards = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cards)) cards = [];
    } catch (e) {
      cards = [];
    }
    res.json({ success: true, cards });
  } catch (error) {
    console.error('Error fetching foundation cards:', error);
    res.status(500).json({ success: false, message: '獲取地基卡片內容失敗' });
  }
});

router.put('/foundation/cards', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { cards } = req.body;
    if (!Array.isArray(cards)) {
      return res.status(400).json({ success: false, message: '資料格式錯誤：cards 應為陣列' });
    }
    // 基本欄位驗證
    const normalized = cards.map((c, idx) => ({
      id: String(c.id || `${Date.now()}_${idx}`),
      title: String(c.title || '').trim(),
      description: String(c.description || '').trim(),
      icon: c.icon ? String(c.icon) : null,
      updatedAt: new Date().toISOString()
    })).filter(c => c.title && c.description);

    await pool.query(`
      INSERT INTO static_content (type, content, updated_by_id, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (type)
      DO UPDATE SET 
        content = EXCLUDED.content,
        updated_by_id = EXCLUDED.updated_by_id,
        updated_at = CURRENT_TIMESTAMP
    `, ['foundation_cards', JSON.stringify(normalized), req.user.id]);

    res.json({ success: true, message: '地基卡片內容更新成功', count: normalized.length });
  } catch (error) {
    console.error('Error updating foundation cards:', error);
    res.status(500).json({ success: false, message: '更新地基卡片內容失敗' });
  }
});

module.exports = router;