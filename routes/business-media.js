const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Helpers
function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-zA-Z0-9\s-]/g, '') // remove invalid chars
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function parsePlatform(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('vimeo.com')) return 'vimeo';
  return 'web';
}

// Create content (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      speakerId,
      contentType, // 'video_long' | 'video_short' | 'article'
      externalUrl,
      summary,
      body,
      ctas = [], // [{ label, url, style, targetMemberId }]
      status = 'draft',
      publishedAt
    } = req.body;

    if (!title || !speakerId || !contentType) {
      return res.status(400).json({ success: false, message: '缺少必要欄位' });
    }

    const platform = parsePlatform(externalUrl);
    const baseSlug = slugify(title);

    const insertResult = await pool.query(
      `INSERT INTO business_media (title, speaker_id, content_type, platform, external_url, summary, body, ctas, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [title, speakerId, contentType, platform, externalUrl || null, summary || null, body || null, JSON.stringify(ctas || []), status, publishedAt || null]
    );

    const id = insertResult.rows[0].id;
    const slug = baseSlug ? `${baseSlug}-${id}` : `content-${id}`;
    await pool.query('UPDATE business_media SET slug = $1 WHERE id = $2', [slug, id]);

    res.json({ success: true, id, slug });
  } catch (error) {
    console.error('Create business media error:', error);
    res.status(500).json({ success: false, message: '建立內容失敗' });
  }
});

// Update content (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      speakerId,
      contentType,
      externalUrl,
      summary,
      body,
      ctas,
      status,
      publishedAt
    } = req.body;

    const platform = externalUrl ? parsePlatform(externalUrl) : undefined;

    const result = await pool.query(
      `UPDATE business_media SET 
        title = COALESCE($1, title),
        speaker_id = COALESCE($2, speaker_id),
        content_type = COALESCE($3, content_type),
        platform = COALESCE($4, platform),
        external_url = COALESCE($5, external_url),
        summary = COALESCE($6, summary),
        body = COALESCE($7, body),
        ctas = COALESCE($8, ctas),
        status = COALESCE($9, status),
        published_at = COALESCE($10, published_at),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [title ?? null, speakerId ?? null, contentType ?? null, platform ?? null, externalUrl ?? null, summary ?? null, body ?? null, ctas != null ? JSON.stringify(ctas) : null, status ?? null, publishedAt ?? null, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: '內容不存在' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update business media error:', error);
    res.status(500).json({ success: false, message: '更新內容失敗' });
  }
});

// Publish or unpublish (Admin)
router.post('/:id/publish', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'publish' | 'draft'
    if (!['publish', 'draft'].includes(action)) {
      return res.status(400).json({ success: false, message: '無效的操作' });
    }
    const status = action === 'publish' ? 'published' : 'draft';
    const publishedAt = action === 'publish' ? new Date() : null;

    const result = await pool.query(
      `UPDATE business_media SET status = $1, published_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [status, publishedAt, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: '內容不存在' });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Publish business media error:', error);
    res.status(500).json({ success: false, message: '發布/取消發布失敗' });
  }
});

// List contents (Members/Admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, q, type, speakerId, status } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    // Only published for non-admins
    if (!req.user?.is_admin) {
      conditions.push(`bm.status = 'published'`);
    } else if (status) {
      values.push(status);
      conditions.push(`bm.status = $${values.length}`);
    }

    if (q) {
      values.push(`%${q}%`);
      conditions.push(`(bm.title ILIKE $${values.length} OR bm.summary ILIKE $${values.length})`);
    }
    if (type) {
      values.push(type);
      conditions.push(`bm.content_type = $${values.length}`);
    }
    if (speakerId) {
      values.push(speakerId);
      conditions.push(`bm.speaker_id = $${values.length}`);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT bm.*, 
              u.name as speaker_name, u.company as speaker_company, u.title as speaker_title,
              u.profile_picture_url as speaker_avatar
       FROM business_media bm
       JOIN users u ON bm.speaker_id = u.id
       ${whereSql}
       ORDER BY COALESCE(bm.published_at, bm.created_at) DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    res.json({ success: true, items: result.rows });
  } catch (error) {
    console.error('List business media error:', error);
    res.status(500).json({ success: false, message: '獲取內容列表失敗' });
  }
});

// Get by slug
router.get('/slug/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT bm.*, 
              u.name as speaker_name, u.company as speaker_company, u.title as speaker_title,
              u.profile_picture_url as speaker_avatar
       FROM business_media bm
       JOIN users u ON bm.speaker_id = u.id
       WHERE bm.slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: '內容不存在' });

    const item = result.rows[0];
    if (item.status !== 'published' && !req.user?.is_admin) {
      return res.status(403).json({ success: false, message: '內容未發布' });
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error('Get business media by slug error:', error);
    res.status(500).json({ success: false, message: '獲取內容失敗' });
  }
});

// Simple stats for admin
router.get('/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const views = await pool.query(`SELECT COUNT(*)::int as count FROM business_media_analytics WHERE content_id = $1 AND event_type = 'view'`, [id]);
    const ctaClicks = await pool.query(`SELECT COUNT(*)::int as count FROM business_media_analytics WHERE content_id = $1 AND event_type = 'cta_click'`, [id]);
    const cardClicks = await pool.query(`SELECT COUNT(*)::int as count FROM business_media_analytics WHERE content_id = $1 AND event_type = 'card_click'`, [id]);

    const viewsCount = views.rows[0].count || 0;
    const cardClicksCount = cardClicks.rows[0].count || 0;
    const conversionRate = viewsCount > 0 ? Math.round((cardClicksCount / viewsCount) * 10000) / 100 : 0;

    res.json({ success: true, stats: {
      views: viewsCount,
      ctaClicks: ctaClicks.rows[0].count || 0,
      cardClicks: cardClicksCount,
      conversionRate
    }});
  } catch (error) {
    console.error('Get business media stats error:', error);
    res.status(500).json({ success: false, message: '獲取統計數據失敗' });
  }
});

// Track view
router.post('/:id/track/view', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userAgent, referrer } = req.body;
    const ip = req.ip || (req.connection && req.connection.remoteAddress);

    await pool.query(
      `INSERT INTO business_media_analytics (content_id, event_type, visitor_ip, user_agent, referrer)
       VALUES ($1, 'view', $2, $3, $4)`,
      [id, ip || null, userAgent || null, referrer || null]
    );

    // increment counter
    await pool.query(`UPDATE business_media SET view_count = view_count + 1 WHERE id = $1`, [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ success: false, message: '記錄瀏覽失敗' });
  }
});

// Track CTA click
router.post('/:id/track/cta', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ctaLabel, ctaUrl, targetMemberId } = req.body;
    const ip = req.ip || (req.connection && req.connection.remoteAddress);
    const userAgent = req.get('User-Agent');
    const referrer = req.get('Referer');

    await pool.query(
      `INSERT INTO business_media_analytics (content_id, event_type, visitor_ip, user_agent, referrer, cta_label, cta_url, target_member_id)
       VALUES ($1, 'cta_click', $2, $3, $4, $5, $6, $7)`,
      [id, ip || null, userAgent || null, referrer || null, ctaLabel || null, ctaUrl || null, targetMemberId || null]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Track CTA error:', error);
    res.status(500).json({ success: false, message: '記錄CTA點擊失敗' });
  }
});

// Track card click (speaker card or target card)
router.post('/:id/track/card', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetMemberId } = req.body; // usually speakerId
    const ip = req.ip || (req.connection && req.connection.remoteAddress);
    const userAgent = req.get('User-Agent');
    const referrer = req.get('Referer');

    await pool.query(
      `INSERT INTO business_media_analytics (content_id, event_type, visitor_ip, user_agent, referrer, target_member_id)
       VALUES ($1, 'card_click', $2, $3, $4, $5)`,
      [id, ip || null, userAgent || null, referrer || null, targetMemberId || null]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Track card click error:', error);
    res.status(500).json({ success: false, message: '記錄名片點擊失敗' });
  }
});

module.exports = router;