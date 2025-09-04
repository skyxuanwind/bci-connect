const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const geminiService = require('../services/geminiService');

// 從備註文字中抽取標籤（與前端邏輯對齊的簡易規則）
function extractTagsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const tags = new Set();
  // 1) Hashtags
  (text.match(/#([\u4e00-\u9fa5\w\-]{2,20})/g) || []).forEach(t => tags.add(t.replace(/^#/, '')));
  // 2) 產業關鍵字
  const industries = ['金融','保險','醫療','生技','科技','軟體','硬體','半導體','製造','教育','房地產','建築','裝修','行銷','廣告','顧問','法律','會計','電商','零售','餐飲','旅遊','物流','人資','設計','媒體'];
  industries.forEach(k => { if (text.includes(k)) tags.add(k); });
  // 3) 地區
  const regions = ['台北','新北','基隆','桃園','新竹','苗栗','台中','彰化','南投','雲林','嘉義','台南','高雄','屏東','宜蘭','花蓮','台東','澎湖','金門','連江'];
  regions.forEach(r => { if (text.includes(r)) tags.add(r); });
  // 4) 其他關鍵詞（英數詞彙）
  (text.match(/[A-Za-z]{3,}/g) || []).slice(0, 5).forEach(w => tags.add(w.toLowerCase()));
  return Array.from(tags).slice(0, 8);
}
function mergeTags(base, extra) {
  const a = Array.isArray(base) ? base.map(String).filter(Boolean) : [];
  const b = Array.isArray(extra) ? extra.map(String).filter(Boolean) : [];
  return Array.from(new Set([...a, ...b]));
}

// 獲取用戶的數位名片夾
router.get('/cards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取用戶收藏的名片（含掃描名片，使用 LEFT JOIN）
    const result = await pool.query(`
      SELECT 
        ncc.id as collection_id,
        ncc.notes,
        ncc.tags,
        ncc.is_favorite,
        ncc.folder_name,
        ncc.collected_at,
        ncc.last_viewed,
        ncc.scanned_data,
        ncc.is_scanned,
        nc.id as card_id,
        nc.card_title,
        nc.card_subtitle,
        nc.user_id as card_owner_id,
        u.name as card_owner_name,
        u.email as card_owner_email,
        u.contact_number as card_owner_phone,
        u.company as card_owner_company,
        u.title as card_owner_title
      FROM nfc_card_collections ncc
      LEFT JOIN nfc_cards nc ON ncc.card_id = nc.id
      LEFT JOIN users u ON nc.user_id = u.id
      WHERE ncc.user_id = $1
      ORDER BY ncc.collected_at DESC
    `, [userId]);
    
    // 轉換為前端需要的格式，含掃描名片
    const cards = result.rows.map(row => {
      if (row.is_scanned || !row.card_id) {
        const data = row.scanned_data || {};
        return {
          id: `scanned_${row.collection_id}`,
          collection_id: row.collection_id,
          card_title: data.name || '掃描名片',
          card_subtitle: data.title || '',
          contact_info: {
            phone: data.phone || data.mobile || '',
            email: data.email || '',
            company: data.company || ''
          },
          date_added: row.collected_at,
          last_viewed: row.last_viewed,
          personal_note: row.notes || '',
          tags: row.tags || [],
          is_favorite: row.is_favorite,
          folder_name: row.folder_name,
          is_scanned: true,
          scanned_data: data
        };
      }
      return ({
        id: row.card_id,
        collection_id: row.collection_id,
        card_title: row.card_title,
        card_subtitle: row.card_subtitle,
        contact_info: {
          phone: row.card_owner_phone || '',
          email: row.card_owner_email || '',
          company: row.card_owner_company || ''
        },
        date_added: row.collected_at,
        last_viewed: row.last_viewed,
        personal_note: row.notes || '',
        tags: row.tags || [],
        is_favorite: row.is_favorite,
        folder_name: row.folder_name,
        card_owner_id: row.card_owner_id
      });
    });
    
    res.json({ success: true, cards });
  } catch (error) {
    console.error('獲取數位名片夾失敗:', error);
    res.status(500).json({ success: false, message: '獲取數位名片夾失敗' });
  }
});

// 添加名片到數位名片夾
router.post('/cards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { card_id, notes, tags, folder_name } = req.body;

    const autoTags = await extractTagsFromTextAsync(notes);
    const mergedTags = mergeTags(tags, autoTags);

    // 檢查名片是否存在
    const cardCheck = await pool.query(
      'SELECT id FROM nfc_cards WHERE id = $1',
      [card_id]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: '名片不存在' });
    }

    // 檢查是否已收藏
    const existingCollection = await pool.query(
      'SELECT id FROM nfc_card_collections WHERE user_id = $1 AND card_id = $2',
      [userId, card_id]
    );

    if (existingCollection.rows.length > 0) {
      return res.status(400).json({ success: false, message: '名片已在收藏夾中' });
    }

    // 添加到收藏
    const result = await pool.query(`
      INSERT INTO nfc_card_collections (user_id, card_id, notes, tags, folder_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, collected_at
    `, [userId, card_id, notes, mergedTags, folder_name]);

    res.json({ 
      success: true, 
      message: '名片已添加到數位名片夾',
      collection_id: result.rows[0].id,
      collected_at: result.rows[0].collected_at
    });
  } catch (error) {
    console.error('添加名片到數位名片夾失敗:', error);
    res.status(500).json({ success: false, message: '添加名片失敗' });
  }
});

// 更新名片收藏信息
router.put('/cards/:collectionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const { notes, tags, is_favorite, folder_name } = req.body;

    const autoTags = await extractTagsFromTextAsync(notes);
    const mergedTags = mergeTags(tags, autoTags);

    const result = await pool.query(`
      UPDATE nfc_card_collections 
      SET notes = $1, tags = $2, is_favorite = $3, folder_name = $4, last_viewed = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [notes, mergedTags, is_favorite, folder_name, collectionId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '收藏記錄不存在' });
    }

    res.json({ success: true, message: '名片信息已更新' });
  } catch (error) {
    console.error('更新名片收藏信息失敗:', error);
    res.status(500).json({ success: false, message: '更新名片信息失敗' });
  }
});

// 從數位名片夾移除名片
router.delete('/cards/:collectionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM nfc_card_collections WHERE id = $1 AND user_id = $2 RETURNING id',
      [collectionId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: '收藏記錄不存在' });
    }
    
    res.json({ success: true, message: '名片已從數位名片夾移除' });
  } catch (error) {
    console.error('移除名片失敗:', error);
    res.status(500).json({ success: false, message: '移除名片失敗' });
  }
});

// 同步本地數位名片夾到雲端
router.post('/sync', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { cards } = req.body; // 本地的名片數據

    try {
      console.log('[DigitalWallet] /sync called', {
        userId,
        payloadType: Array.isArray(cards) ? 'array' : typeof cards,
        payloadCount: Array.isArray(cards) ? cards.length : 0
      });
    } catch {}
    
    if (!Array.isArray(cards)) {
      return res.status(400).json({ success: false, message: '無效的數據格式' });
    }

    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: '用戶不存在或未授權' });
    }

    const toSafeDate = (input, fallback = new Date()) => {
      if (!input) return fallback;
      const d = new Date(input);
      return isNaN(d.getTime()) ? fallback : d;
    };
    const toSafeTags = (arr) => Array.isArray(arr) ? arr.map(x => String(x)).filter(Boolean) : [];
    const toSafeFolder = (name) => name ? String(name).slice(0, 100) : null;
    const toSafeNote = (note) => typeof note === 'string' ? note : (note == null ? '' : String(note));
    // 正規化工具：提升去重準確性
    const normalizeString = (s) => (s == null ? '' : String(s).trim().toLowerCase());
    const normalizePhone = (s) => {
      if (!s) return '';
      let v = String(s).trim();
      // 轉 886/ +886 開頭為 0 開頭
      if (v.startsWith('+886')) v = '0' + v.slice(4);
      else if (v.startsWith('886')) v = '0' + v.slice(3);
      // 移除非數字與加號
      v = v.replace(/[^\d+]/g, '');
      return v;
    };
    
    const existingCollections = await client.query(
      'SELECT card_id FROM nfc_card_collections WHERE user_id = $1',
      [userId]
    );
    
    const existingCardIds = new Set(existingCollections.rows.map(row => Number(row.card_id)));
    const seenInPayload = new Set();
    
    for (const card of cards) {
      await client.query('SAVEPOINT sp_sync');
      try {
        const rawId = card && (card.id ?? card.card_id ?? card.memberId);
        const parsedId = Number.parseInt(rawId, 10);

        // 先處理掃描/手動名片（沒有有效的 nfc_cards.id）
        if (card?.is_scanned || !Number.isFinite(parsedId)) {
          const notes = toSafeNote(card.personal_note);
          let tags = toSafeTags(card.tags);
          const folderName = toSafeFolder(card.folder_name);
          const collectedAt = toSafeDate(card.date_added);
          const lastViewed = toSafeDate(card.last_viewed);

          // 從備註抽取自動標籤並合併
          const autoTags = await extractTagsFromTextAsync(notes);
          tags = mergeTags(tags, autoTags);

          const data = card.scanned_data || {
            name: card.card_title || null,
            title: card.card_subtitle || null,
            phone: (card.contact_info && (card.contact_info.phone)) || card.phone || card.mobile || null,
            email: (card.contact_info && (card.contact_info.email)) || card.email || null,
            company: (card.contact_info && (card.contact_info.company)) || card.company || null,
            website: card.website || null,
            address: card.address || null,
            tags: tags
          };

          // 嘗試用 正規化的 name+email+phone 去重，以避免重複插入
          const nameKey = normalizeString(data.name || card.card_title || '');
          const emailKey = normalizeString(data.email || '');
          const phoneKey = normalizePhone(data.phone || data.mobile || '');
          const exist = await client.query(`
            SELECT id FROM nfc_card_collections 
            WHERE user_id = $1 AND is_scanned = true
              AND LOWER(COALESCE(scanned_data->>'name','')) = $2
              AND LOWER(COALESCE(scanned_data->>'email','')) = $3
              AND regexp_replace(
                    CASE 
                      WHEN left(COALESCE(scanned_data->>'phone', COALESCE(scanned_data->>'mobile','')), 4) = '+886' THEN '0' || substring(COALESCE(scanned_data->>'phone', COALESCE(scanned_data->>'mobile','')) from 5)
                      WHEN left(COALESCE(scanned_data->>'phone', COALESCE(scanned_data->>'mobile','')), 3) = '886' THEN '0' || substring(COALESCE(scanned_data->>'phone', COALESCE(scanned_data->>'mobile','')) from 4)
                      ELSE COALESCE(scanned_data->>'phone', COALESCE(scanned_data->>'mobile',''))
                    END, '[^0-9+]', '', 'g'
                  ) = $4
            LIMIT 1
          `, [userId, nameKey, emailKey, phoneKey]);

          if (exist.rowCount > 0) {
            const cid = exist.rows[0].id;
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $2, tags = $3, folder_name = $4, last_viewed = $5, scanned_data = $6
              WHERE id = $1 AND user_id = $7
            `, [
              cid,
              notes,
              tags,
              folderName,
              lastViewed,
              data,
              userId
            ]);
          } else {
            await client.query(`
              INSERT INTO nfc_card_collections (user_id, card_id, notes, tags, folder_name, collected_at, last_viewed, is_scanned, scanned_data)
              VALUES ($1, NULL, $2, $3, $4, $5, $6, true, $7)
            `, [
              userId,
              notes,
              tags,
              folderName,
              collectedAt,
              lastViewed,
              data
            ]);
          }
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue; // 處理下一張
        }

        // 常規名片（存在於 nfc_cards ）
        if (!card || !Number.isFinite(parsedId)) {
          console.warn('[DigitalWallet] 跳過無效名片資料，缺少可用的 id:', card && { id: card && card.id, card_id: card && card.card_id, memberId: card && card.memberId });
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue;
        }
        if (seenInPayload.has(parsedId)) {
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue;
        }
        seenInPayload.add(parsedId);
  
        const cardExists = await client.query(
          'SELECT id FROM nfc_cards WHERE id = $1',
          [parsedId]
        );
        
        if (cardExists.rows.length === 0) {
          console.warn('[DigitalWallet] skip non-existent card id in nfc_cards:', parsedId);
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue;
        }

        const notes = toSafeNote(card.personal_note);
        let tags = toSafeTags(card.tags);
        const folderName = toSafeFolder(card.folder_name);
        const collectedAt = toSafeDate(card.date_added);
        const lastViewed = toSafeDate(card.last_viewed);

        // 從備註抽取自動標籤並合併
        const autoTags = await extractTagsFromTextAsync(notes);
        tags = mergeTags(tags, autoTags);

        try {
          if (!existingCardIds.has(parsedId)) {
            await client.query(`
              INSERT INTO nfc_card_collections (user_id, card_id, notes, tags, folder_name, collected_at, last_viewed)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              userId, 
              parsedId, 
              notes, 
              tags, 
              folderName,
              collectedAt,
              lastViewed
            ]);
            existingCardIds.add(parsedId);
          } else {
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $3, tags = $4, folder_name = $5, last_viewed = $6
              WHERE user_id = $1 AND card_id = $2
            `, [
              userId, 
              parsedId, 
              notes, 
              tags, 
              folderName,
              lastViewed
            ]);
          }
        } catch (err) {
          if (err && err.code === '23505') {
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $3, tags = $4, folder_name = $5, last_viewed = $6
              WHERE user_id = $1 AND card_id = $2
            `, [
              userId, 
              parsedId, 
              notes, 
              tags, 
              folderName,
              lastViewed
            ]);
          } else if (err && err.code === '22001') {
            const safeFolder = toSafeFolder(folderName);
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $3, tags = $4, folder_name = $5, last_viewed = $6
              WHERE user_id = $1 AND card_id = $2
            `, [
              userId, 
              parsedId, 
              notes, 
              tags, 
              safeFolder,
              lastViewed
            ]);
          } else {
            console.error('同步數位名片夾單筆處理失敗', {
              userId,
              cardId: parsedId,
              code: err && err.code,
              detail: err && err.detail,
              constraint: err && err.constraint,
              message: err && err.message
            });
            throw err;
          }
        }
        await client.query('RELEASE SAVEPOINT sp_sync');
      } catch (perCardErr) {
        await client.query('ROLLBACK TO SAVEPOINT sp_sync');
        await client.query('RELEASE SAVEPOINT sp_sync');
        console.error('同步數位名片夾單筆錯誤，已略過該卡片', {
          userId,
          cardId: (card && (card.id ?? card.card_id ?? card.memberId)),
          error: perCardErr && perCardErr.message,
          code: perCardErr && perCardErr.code
        });
        continue;
      }
    }
    
    await client.query('COMMIT');

    try {
      console.log('[DigitalWallet] /sync success commit for user', userId);
    } catch {}
    
    res.json({ success: true, message: '數位名片夾同步成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('同步數位名片夾失敗:', error);
    res.status(500).json({ success: false, message: '同步失敗' });
  } finally {
    client.release();
  }
});

// 獲取數位名片夾統計信息
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_cards,
        COUNT(CASE WHEN is_favorite = true THEN 1 END) as favorite_cards,
        COUNT(DISTINCT folder_name) as folders_count,
        COUNT(CASE WHEN last_viewed >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_viewed
      FROM nfc_card_collections 
      WHERE user_id = $1
    `, [userId]);
    
    // 熱門標籤：考慮最近 30 天的權重
    const tagStats = await pool.query(`
      SELECT t.tag as tag,
             COUNT(*) as count,
             SUM(CASE WHEN c.last_viewed >= NOW() - INTERVAL '30 days' THEN 2 ELSE 1 END) AS recency_weight
      FROM nfc_card_collections c, UNNEST(c.tags) AS t(tag)
      WHERE c.user_id = $1 AND c.tags IS NOT NULL
      GROUP BY t.tag
      ORDER BY recency_weight DESC, count DESC
      LIMIT 10
    `, [userId]);
    
    res.json({ 
      success: true, 
      stats: {
        ...stats.rows[0],
        popular_tags: tagStats.rows
      }
    });
  } catch (error) {
    console.error('獲取統計信息失敗:', error);
    res.status(500).json({ success: false, message: '獲取統計信息失敗' });
  }
});

// 清空數位名片夾
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 刪除用戶的所有名片收藏記錄
    const result = await pool.query(
      'DELETE FROM nfc_card_collections WHERE user_id = $1 RETURNING id',
      [userId]
    );
    
    const deletedCount = result.rows.length;
    
    res.json({ 
      success: true, 
      message: `已清空數位名片夾，共移除 ${deletedCount} 張名片`,
      deleted_count: deletedCount
    });
  } catch (error) {
    console.error('清空數位名片夾失敗:', error);
    res.status(500).json({ success: false, message: '清空數位名片夾失敗' });
  }
});

module.exports = router;