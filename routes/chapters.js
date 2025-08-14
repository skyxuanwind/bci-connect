const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chapters
// @desc    Get all chapters
// @access  Public (needed for registration)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM chapters ORDER BY name ASC'
    );

    res.json({
      chapters: result.rows
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

    const memberCountResult = await pool.query(
      'SELECT COUNT(*) as member_count FROM users WHERE chapter_id = $1 AND status = $2',
      [id, 'active']
    );

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
    const memberCount = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE chapter_id = $1',
      [id]
    );

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

module.exports = router;