const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin or level 1 core member
const requireAdminOrLevel1 = (req, res, next) => {
  // Check if user is level 1 core member OR admin (level 1 with admin email)
  const isLevel1 = req.user.membership_level === 1;
  const isAdmin = req.user.membership_level === 1 && req.user.email.includes('admin');
  
  if (!isLevel1 && !isAdmin) {
    return res.status(403).json({ message: '權限不足：僅限管理員或一級核心成員' });
  }
  next();
};

// Middleware to check if user is level 1 core member (for voting)
const requireLevel1 = (req, res, next) => {
  if (req.user.membership_level !== 1) {
    return res.status(403).json({ message: '權限不足：僅限一級核心成員投票' });
  }
  next();
};

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/prospects
// @desc    Get all prospects (for admin and level 1 core members)
// @access  Private (Admin and Level 1 only)
router.get('/', requireAdminOrLevel1, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as created_by_name
       FROM prospects p
       LEFT JOIN users u ON p.created_by_id = u.id
       ORDER BY p.created_at DESC`
    );

    res.json({
      prospects: result.rows.map(prospect => ({
        id: prospect.id,
        name: prospect.name,
        industry: prospect.industry,
        company: prospect.company,
        contactInfo: prospect.contact_info,
        notes: prospect.notes,
        status: prospect.status,
        createdBy: prospect.created_by_name,
        createdAt: prospect.created_at,
        updatedAt: prospect.updated_at
      }))
    });
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ message: '獲取商訪準會員列表時發生錯誤' });
  }
});

// @route   GET /api/prospects/pending-votes
// @desc    Get prospects pending for votes (for level 1 core members)
// @access  Private (Level 1 only)
router.get('/pending-votes', requireLevel1, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name as created_by_name,
              COALESCE(vote_stats.total_votes, 0) as total_votes,
              COALESCE(vote_stats.approve_votes, 0) as approve_votes,
              CASE WHEN user_vote.voter_id IS NOT NULL THEN 1 ELSE 0 END as user_voted
       FROM prospects p
       LEFT JOIN users u ON p.created_by_id = u.id
       LEFT JOIN (
         SELECT prospect_id,
                COUNT(*) as total_votes,
                COUNT(CASE WHEN vote = 'approve' THEN 1 END) as approve_votes
         FROM prospect_votes
         GROUP BY prospect_id
       ) vote_stats ON p.id = vote_stats.prospect_id
       LEFT JOIN prospect_votes user_vote ON p.id = user_vote.prospect_id AND user_vote.voter_id = $1
       WHERE p.status = 'pending_vote'
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json({
      prospects: result.rows.map(prospect => ({
        id: prospect.id,
        name: prospect.name,
        industry: prospect.industry,
        company: prospect.company,
        contactInfo: prospect.contact_info,
        notes: prospect.notes,
        status: prospect.status,
        createdBy: prospect.created_by_name,
        createdAt: prospect.created_at,
        updatedAt: prospect.updated_at,
        totalVotes: parseInt(prospect.total_votes),
        approveVotes: parseInt(prospect.approve_votes),
        userVoted: parseInt(prospect.user_voted) > 0
      }))
    });
  } catch (error) {
    console.error('Get pending votes error:', error);
    res.status(500).json({ message: '獲取待投票列表時發生錯誤' });
  }
});

// @route   POST /api/prospects
// @desc    Create new prospect
// @access  Private (All authenticated users can submit applications)
router.post('/', async (req, res) => {
  try {
    const { name, industry, company, contactInfo, notes, status = 'pending_vote' } = req.body;

    // 驗證必填欄位
    if (!name || !industry || !company) {
      return res.status(400).json({ message: '姓名、專業別和公司名稱為必填欄位' });
    }

    const result = await pool.query(
      `INSERT INTO prospects (name, industry, company, contact_info, notes, created_by_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, industry, company, contactInfo, notes, req.user.id, status]
    );

    res.status(201).json({
      message: '商訪準會員資料創建成功',
      prospect: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        industry: result.rows[0].industry,
        company: result.rows[0].company,
        contactInfo: result.rows[0].contact_info,
        notes: result.rows[0].notes,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Create prospect error:', error);
    res.status(500).json({ message: '創建商訪準會員資料時發生錯誤' });
  }
});

// @route   PUT /api/prospects/:id
// @desc    Update prospect
// @access  Private (Admin and Level 1 only)
router.put('/:id', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, industry, company, contactInfo, notes } = req.body;

    if (!name) {
      return res.status(400).json({ message: '姓名為必填欄位' });
    }

    const result = await pool.query(
      `UPDATE prospects 
       SET name = $1, industry = $2, company = $3, contact_info = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, industry, company, contactInfo, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '找不到指定的商訪準會員資料' });
    }

    res.json({
      message: '商訪準會員資料更新成功',
      prospect: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        industry: result.rows[0].industry,
        company: result.rows[0].company,
        contactInfo: result.rows[0].contact_info,
        notes: result.rows[0].notes,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update prospect error:', error);
    res.status(500).json({ message: '更新商訪準會員資料時發生錯誤' });
  }
});

// @route   PUT /api/prospects/:id/status
// @desc    Update prospect status (start voting)
// @access  Private (Admin and Level 1 only)
router.put('/:id/status', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['vetting', 'pending_vote'].includes(status)) {
      return res.status(400).json({ message: '無效的狀態值' });
    }

    const result = await pool.query(
      `UPDATE prospects 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '找不到指定的商訪準會員資料' });
    }

    res.json({
      message: status === 'pending_vote' ? '投票已啟動' : '狀態更新成功',
      prospect: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update prospect status error:', error);
    res.status(500).json({ message: '更新狀態時發生錯誤' });
  }
});

// @route   POST /api/prospects/:id/vote
// @desc    Vote for a prospect
// @access  Private (Level 1 only)
router.post('/:id/vote', requireLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;

    if (!['approve', 'reject'].includes(vote)) {
      return res.status(400).json({ message: '無效的投票選項' });
    }

    // Check if prospect exists and is in pending_vote status
    const prospectResult = await pool.query(
      'SELECT * FROM prospects WHERE id = $1 AND status = $2',
      [id, 'pending_vote']
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ message: '找不到可投票的商訪準會員資料' });
    }

    // Check if user already voted
    const existingVote = await pool.query(
      'SELECT * FROM prospect_votes WHERE prospect_id = $1 AND voter_id = $2',
      [id, req.user.id]
    );

    if (existingVote.rows.length > 0) {
      return res.status(400).json({ message: '您已經投過票了' });
    }

    // Insert vote
    await pool.query(
      'INSERT INTO prospect_votes (prospect_id, voter_id, vote) VALUES ($1, $2, $3)',
      [id, req.user.id, vote]
    );

    // Check voting results and update prospect status if needed
    await checkVotingResults(id);

    res.json({ message: '投票成功' });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: '投票時發生錯誤' });
  }
});

// @route   DELETE /api/prospects/:id
// @desc    Delete prospect
// @access  Private (Admin and Level 1 only)
router.delete('/:id', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete related votes first
    await pool.query('DELETE FROM prospect_votes WHERE prospect_id = $1', [id]);
    
    // Delete prospect
    const result = await pool.query(
      'DELETE FROM prospects WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '找不到指定的商訪準會員資料' });
    }

    res.json({ message: '商訪準會員資料刪除成功' });
  } catch (error) {
    console.error('Delete prospect error:', error);
    res.status(500).json({ message: '刪除商訪準會員資料時發生錯誤' });
  }
});

// Helper function to check voting results
const checkVotingResults = async (prospectId) => {
  try {
    // Get total active level 1 core members
    const totalLevel1Result = await pool.query(
      "SELECT COUNT(*) FROM users WHERE membership_level = 1 AND status = 'active'"
    );
    const totalLevel1 = parseInt(totalLevel1Result.rows[0].count);

    // Get voting statistics
    const voteStatsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_votes,
         COUNT(CASE WHEN vote = 'approve' THEN 1 END) as approve_votes
       FROM prospect_votes 
       WHERE prospect_id = $1`,
      [prospectId]
    );

    const { total_votes, approve_votes } = voteStatsResult.rows[0];
    const totalVotes = parseInt(total_votes);
    const approveVotes = parseInt(approve_votes);
    const requiredVotes = Math.floor(totalLevel1 / 2) + 1;

    let newStatus = null;

    // Check if approved (more than half of total level 1 members voted approve)
    if (approveVotes >= requiredVotes) {
      newStatus = 'approved';
    }
    // Check if all level 1 members voted but didn't reach approval threshold
    else if (totalVotes >= totalLevel1 && approveVotes < requiredVotes) {
      newStatus = 'rejected';
    }

    // Update prospect status if decision is made
    if (newStatus) {
      await pool.query(
        'UPDATE prospects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, prospectId]
      );

      console.log(`Prospect ${prospectId} voting completed. Status: ${newStatus}`);
    }
  } catch (error) {
    console.error('Check voting results error:', error);
  }
};

module.exports = router;