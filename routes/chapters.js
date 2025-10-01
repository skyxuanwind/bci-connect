const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getProductionWhereClause, getProductionChapterWhereClause, shouldShowTestData, logDataFilter } = require('../utils/dataFilter');

const router = express.Router();

// @route   GET /api/chapters
// @desc    Get all chapters
// @access  Public (needed for registration)
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT id, name FROM chapters WHERE 1=1';
    
    // 在正式環境中過濾測試分會
    if (!shouldShowTestData()) {
      const chapterFilter = getProductionChapterWhereClause('');
      if (chapterFilter) {
        query += ` ${chapterFilter}`;
        logDataFilter('chapters', 'all', 'filtered');
      }
    }
    
    query += ' ORDER BY name ASC';
    
    const result = await pool.query(query);

    res.json({
      chapters: result.rows,
      isProduction: process.env.NODE_ENV === 'production',
      showTestData: shouldShowTestData()
    });

  } catch (error) {
    console.error('Get chapters error:', error);
    res.status(500).json({ message: '獲取分會列表時發生錯誤' });
  }
});

// @route   GET /api/chapters/:id
// @desc    Get chapter by ID with member count
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const chapterResult = await pool.query(
      'SELECT id, name, created_at FROM chapters WHERE id = $1',
      [id]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ message: '分會不存在' });
    }

    let memberCountQuery = 'SELECT COUNT(*) as member_count FROM users WHERE chapter_id = $1 AND status = $2';
    let memberCountParams = [id, 'active'];
    
    // 在正式環境中過濾測試資料
    if (!shouldShowTestData()) {
      const productionFilter = getProductionWhereClause('');
      if (productionFilter) {
        memberCountQuery += ` ${productionFilter}`;
      }
    }
    
    const memberCountResult = await pool.query(memberCountQuery, memberCountParams);

    const chapter = chapterResult.rows[0];
    const memberCount = parseInt(memberCountResult.rows[0].member_count);

    res.json({
      chapter: {
        ...chapter,
        memberCount
      }
    });

  } catch (error) {
    console.error('Get chapter error:', error);
    res.status(500).json({ message: '獲取分會信息時發生錯誤' });
  }
});

// @route   POST /api/chapters
// @desc    Create new chapter
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: '分會名稱為必填項目' });
    }

    // Check if chapter already exists
    const existingChapter = await pool.query(
      'SELECT id FROM chapters WHERE name = $1',
      [name.trim()]
    );

    if (existingChapter.rows.length > 0) {
      return res.status(400).json({ message: '此分會名稱已存在' });
    }

    const result = await pool.query(
      'INSERT INTO chapters (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );

    res.status(201).json({
      message: '分會創建成功',
      chapter: result.rows[0]
    });

  } catch (error) {
    console.error('Create chapter error:', error);
    res.status(500).json({ message: '創建分會時發生錯誤' });
  }
});

// @route   PUT /api/chapters/:id
// @desc    Update chapter
// @access  Private (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: '分會名稱為必填項目' });
    }

    // Check if chapter exists
    const chapterExists = await pool.query(
      'SELECT id FROM chapters WHERE id = $1',
      [id]
    );

    if (chapterExists.rows.length === 0) {
      return res.status(404).json({ message: '分會不存在' });
    }

    // Check if new name already exists (excluding current chapter)
    const nameExists = await pool.query(
      'SELECT id FROM chapters WHERE name = $1 AND id != $2',
      [name.trim(), id]
    );

    if (nameExists.rows.length > 0) {
      return res.status(400).json({ message: '此分會名稱已存在' });
    }

    const result = await pool.query(
      'UPDATE chapters SET name = $1 WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );

    res.json({
      message: '分會更新成功',
      chapter: result.rows[0]
    });

  } catch (error) {
    console.error('Update chapter error:', error);
    res.status(500).json({ message: '更新分會時發生錯誤' });
  }
});

// @route   DELETE /api/chapters/:id
// @desc    Delete chapter
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if chapter has members
    let memberCheckQuery = 'SELECT COUNT(*) as count FROM users WHERE chapter_id = $1';
    let memberCheckParams = [id];
    
    // 在正式環境中過濾測試資料
    if (!shouldShowTestData()) {
      const productionFilter = getProductionWhereClause('');
      if (productionFilter) {
        memberCheckQuery += ` ${productionFilter}`;
      }
    }
    
    const memberCount = await pool.query(memberCheckQuery, memberCheckParams);

    if (parseInt(memberCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: '無法刪除有會員的分會，請先將會員轉移到其他分會' 
      });
    }

    const result = await pool.query(
      'DELETE FROM chapters WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '分會不存在' });
    }

    res.json({
      message: '分會刪除成功',
      chapter: result.rows[0]
    });

  } catch (error) {
    console.error('Delete chapter error:', error);
    res.status(500).json({ message: '刪除分會時發生錯誤' });
  }
});

// @route   GET /api/chapters/:id/members
// @desc    Get chapter members list
// @access  Private (Admin only)
router.get('/:id/members', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // 檢查分會是否存在
    const chapterResult = await pool.query(
      'SELECT id, name FROM chapters WHERE id = $1',
      [id]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ message: '分會不存在' });
    }

    // 構建查詢條件
    let memberQuery = `
      SELECT u.id, u.name, u.email, u.company, u.industry, u.title, 
             u.membership_level, u.status, u.created_at, u.contact_number,
             u.profile_picture_url
      FROM users u 
      WHERE u.chapter_id = $1 AND u.status = 'active'
    `;
    let countQuery = `
      SELECT COUNT(*) as total_count 
      FROM users u 
      WHERE u.chapter_id = $1 AND u.status = 'active'
    `;
    
    let queryParams = [id];
    let countParams = [id];
    
    // 在正式環境中過濾測試資料
    if (!shouldShowTestData()) {
      const productionFilter = getProductionWhereClause('u');
      if (productionFilter) {
        memberQuery += ` ${productionFilter}`;
        countQuery += ` ${productionFilter}`;
        logDataFilter('chapter_members', id, 'filtered');
      }
    }
    
    // 添加排序和分頁
    memberQuery += ` ORDER BY u.name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // 執行查詢
    const [membersResult, countResult] = await Promise.all([
      pool.query(memberQuery, queryParams),
      pool.query(countQuery, countParams)
    ]);

    const members = membersResult.rows.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      company: member.company,
      industry: member.industry,
      title: member.title,
      membershipLevel: member.membership_level,
      status: member.status,
      contactNumber: member.contact_number,
      profilePictureUrl: member.profile_picture_url,
      createdAt: member.created_at
    }));

    const totalCount = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      chapter: chapterResult.rows[0],
      members,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      isProduction: process.env.NODE_ENV === 'production',
      showTestData: shouldShowTestData()
    });

  } catch (error) {
    console.error('Get chapter members error:', error);
    res.status(500).json({ message: '獲取分會成員列表時發生錯誤' });
  }
});

module.exports = router;