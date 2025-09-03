const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 獲取用戶的數位名片夾
router.get('/cards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 獲取用戶收藏的名片
    const result = await pool.query(`
      SELECT 
        ncc.id as collection_id,
        ncc.notes,
        ncc.tags,
        ncc.is_favorite,
        ncc.folder_name,
        ncc.collected_at,
        ncc.last_viewed,
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
      JOIN nfc_cards nc ON ncc.card_id = nc.id
      JOIN users u ON nc.user_id = u.id
      WHERE ncc.user_id = $1
      ORDER BY ncc.collected_at DESC
    `, [userId]);
    
    // 轉換為前端需要的格式
    const cards = result.rows.map(row => ({
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
      folder_name: row.folder_name
    }));
    
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
    `, [userId, card_id, notes, tags, folder_name]);
    
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
    
    const result = await pool.query(`
      UPDATE nfc_card_collections 
      SET notes = $1, tags = $2, is_favorite = $3, folder_name = $4, last_viewed = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [notes, tags, is_favorite, folder_name, collectionId, userId]);
    
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

    // 調試日誌：觀察請求是否到達與負載規模
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

    // 在交易內確認使用者存在，避免外鍵錯誤造成交易中止
    const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: '用戶不存在或未授權' });
    }

    // 內部安全轉換工具
    const toSafeDate = (input, fallback = new Date()) => {
      if (!input) return fallback;
      const d = new Date(input);
      return isNaN(d.getTime()) ? fallback : d;
    };
    const toSafeTags = (arr) => Array.isArray(arr) ? arr.map(x => String(x)).filter(Boolean) : [];
    const toSafeFolder = (name) => name ? String(name).slice(0, 100) : null;
    const toSafeNote = (note) => typeof note === 'string' ? note : (note == null ? '' : String(note));
    
    // 獲取現有的收藏記錄
    const existingCollections = await client.query(
      'SELECT card_id FROM nfc_card_collections WHERE user_id = $1',
      [userId]
    );
    
    const existingCardIds = new Set(existingCollections.rows.map(row => row.card_id));
    const seenInPayload = new Set();
    
    // 處理每張名片
    for (const card of cards) {
      // 為每筆卡片操作建立 SAVEPOINT，避免單筆失敗導致整個交易中止
      await client.query('SAVEPOINT sp_sync');
      try {
        // 跳過無效資料或在本次 payload 中重複的卡片
        if (!card || !card.id) {
          console.warn('跳過無效名片資料，缺少 id:', card);
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue;
        }
        if (seenInPayload.has(card.id)) {
          // 已在本次請求中處理過，避免重複插入
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue;
        }
        seenInPayload.add(card.id);
  
        // 檢查名片是否存在於 nfc_cards 表中
        const cardExists = await client.query(
          'SELECT id FROM nfc_cards WHERE id = $1',
          [card.id]
        );
        
        if (cardExists.rows.length === 0) {
          // 名片不存在則略過（可能是本地舊資料）
          console.warn('[DigitalWallet] skip non-existent card id in nfc_cards:', card.id);
          await client.query('RELEASE SAVEPOINT sp_sync');
          continue;
        }

        // 正規化資料型別
        const notes = toSafeNote(card.personal_note);
        const tags = toSafeTags(card.tags);
        const folderName = toSafeFolder(card.folder_name);
        const collectedAt = toSafeDate(card.date_added);
        const lastViewed = toSafeDate(card.last_viewed);
  
        try {
          if (!existingCardIds.has(card.id)) {
            // 添加新的收藏記錄
            await client.query(`
              INSERT INTO nfc_card_collections (user_id, card_id, notes, tags, folder_name, collected_at, last_viewed)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              userId, 
              card.id, 
              notes, 
              tags, 
              folderName,
              collectedAt,
              lastViewed
            ]);
            // 更新集合，避免同一個 payload 再次插入同一張卡片導致唯一性衝突
            existingCardIds.add(card.id);
          } else {
            // 更新現有記錄
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $3, tags = $4, folder_name = $5, last_viewed = $6
              WHERE user_id = $1 AND card_id = $2
            `, [
              userId, 
              card.id, 
              notes, 
              tags, 
              folderName,
              lastViewed
            ]);
          }
        } catch (err) {
          // 23505: unique_violation (例如 payload 內同一張卡片重複，或別處已插入)
          if (err && err.code === '23505') {
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $3, tags = $4, folder_name = $5, last_viewed = $6
              WHERE user_id = $1 AND card_id = $2
            `, [
              userId, 
              card.id, 
              notes, 
              tags, 
              folderName,
              lastViewed
            ]);
          } else if (err && err.code === '22001') {
            // value too long for type character varying(100) 等情況，再次以截斷後資料更新
            const safeFolder = toSafeFolder(folderName);
            await client.query(`
              UPDATE nfc_card_collections 
              SET notes = $3, tags = $4, folder_name = $5, last_viewed = $6
              WHERE user_id = $1 AND card_id = $2
            `, [
              userId, 
              card.id, 
              notes, 
              tags, 
              safeFolder,
              lastViewed
            ]);
          } else {
            console.error('同步數位名片夾單筆處理失敗', {
              userId,
              cardId: card.id,
              code: err && err.code,
              detail: err && err.detail,
              constraint: err && err.constraint,
              message: err && err.message
            });
            throw err;
          }
        }
        // 單筆流程成功，釋放 SAVEPOINT
        await client.query('RELEASE SAVEPOINT sp_sync');
      } catch (perCardErr) {
        // 單筆錯誤回滾至 SAVEPOINT，避免交易中止
        await client.query('ROLLBACK TO SAVEPOINT sp_sync');
        await client.query('RELEASE SAVEPOINT sp_sync');
        // 單筆錯誤紀錄後繼續處理其他卡，避免整批失敗
        console.error('同步數位名片夾單筆錯誤，已略過該卡片', {
          userId,
          cardId: card && card.id,
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
    
    const tagStats = await pool.query(`
      SELECT UNNEST(tags) as tag, COUNT(*) as count
      FROM nfc_card_collections 
      WHERE user_id = $1 AND tags IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC
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

module.exports = router;