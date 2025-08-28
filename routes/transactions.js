const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 自定義中間件：允許核心會員(1)和管理員(2)
const requireAdminOrLevel1 = (req, res, next) => {
  if (req.user.membership_level === 1 || req.user.membership_level === 2) {
    next();
  } else {
    res.status(403).json({ message: '權限不足，僅限管理員和核心會員' });
  }
};

// 獲取所有交易記錄和統計數據 - 僅限管理員和核心
router.get('/', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    // 獲取交易記錄
    let transactionQuery = `
      SELECT t.*, u.name as created_by_name
      FROM transactions t
      LEFT JOIN users u ON t.created_by_id = u.id
      WHERE 1=1
    `;
    const transactionParams = [];
    
    if (startDate) {
      transactionParams.push(startDate);
      transactionQuery += ` AND t.date >= $${transactionParams.length}`;
    }
    
    if (endDate) {
      transactionParams.push(endDate);
      transactionQuery += ` AND t.date <= $${transactionParams.length}`;
    }
    
    if (type && (type === 'income' || type === 'expense')) {
      transactionParams.push(type);
      transactionQuery += ` AND t.type = $${transactionParams.length}`;
    }
    
    transactionQuery += ' ORDER BY t.date DESC, t.created_at DESC';
    
    const transactionResult = await pool.query(transactionQuery, transactionParams);
    
    // 獲取統計數據
    let statisticsQuery = `
      SELECT 
        type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM transactions
      WHERE 1=1
    `;
    const statisticsParams = [];
    
    if (startDate) {
      statisticsParams.push(startDate);
      statisticsQuery += ` AND date >= $${statisticsParams.length}`;
    }
    
    if (endDate) {
      statisticsParams.push(endDate);
      statisticsQuery += ` AND date <= $${statisticsParams.length}`;
    }
    
    // 注意：統計數據不應該按 type 篩選，因為我們需要完整的統計
    
    statisticsQuery += ' GROUP BY type';
    
    const statisticsResult = await pool.query(statisticsQuery, statisticsParams);
    
    // 計算統計數據
    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      incomeCount: 0,
      expenseCount: 0
    };
    
    statisticsResult.rows.forEach(row => {
      if (row.type === 'income') {
        stats.totalIncome = parseFloat(row.total_amount) || 0;
        stats.incomeCount = parseInt(row.count) || 0;
      } else if (row.type === 'expense') {
        stats.totalExpense = parseFloat(row.total_amount) || 0;
        stats.expenseCount = parseInt(row.count) || 0;
      }
    });
    
    stats.netIncome = stats.totalIncome - stats.totalExpense;
    
    res.json({
      success: true,
      transactions: transactionResult.rows,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: '獲取交易記錄失敗'
    });
  }
});

// 獲取財務統計數據 - 僅限管理員和核心
router.get('/statistics', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM transactions
      WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
      params.push(startDate);
      query += ` AND date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      query += ` AND date <= $${params.length}`;
    }
    
    query += ' GROUP BY type';
    
    const result = await pool.query(query, params);
    
    // 計算總收入、總支出和淨收益
    const stats = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      incomeCount: 0,
      expenseCount: 0
    };
    
    result.rows.forEach(row => {
      if (row.type === 'income') {
        stats.totalIncome = parseFloat(row.total_amount);
        stats.incomeCount = parseInt(row.count);
      } else if (row.type === 'expense') {
        stats.totalExpense = parseFloat(row.total_amount);
        stats.expenseCount = parseInt(row.count);
      }
    });
    
    stats.netIncome = stats.totalIncome - stats.totalExpense;
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching transaction statistics:', error);
    res.status(500).json({
      success: false,
      message: '獲取統計數據失敗'
    });
  }
});

// 新增交易記錄 - 僅限管理員和核心
router.post('/', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { date, item_name, type, amount, notes } = req.body;
    const created_by_id = req.user.id;
    
    // 驗證必填欄位
    if (!date || !item_name || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 驗證交易類型
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        success: false,
        message: '交易類型必須是收入或支出'
      });
    }
    
    // 驗證金額
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '金額必須是正數'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO transactions (date, item_name, type, amount, notes, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [date, item_name, type, parseFloat(amount), notes || null, created_by_id]
    );
    
    res.status(201).json({
      success: true,
      message: '交易記錄新增成功',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: '新增交易記錄失敗'
    });
  }
});

// 更新交易記錄 - 僅限管理員和核心
router.put('/:id', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, item_name, type, amount, notes } = req.body;
    
    // 檢查交易記錄是否存在
    const existingTransaction = await pool.query(
      'SELECT id FROM transactions WHERE id = $1',
      [id]
    );
    
    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '交易記錄不存在'
      });
    }
    
    // 驗證必填欄位
    if (!date || !item_name || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 驗證交易類型
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        success: false,
        message: '交易類型必須是收入或支出'
      });
    }
    
    // 驗證金額
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: '金額必須是正數'
      });
    }
    
    const result = await pool.query(
      `UPDATE transactions 
       SET date = $1, item_name = $2, type = $3, amount = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [date, item_name, type, parseFloat(amount), notes || null, id]
    );
    
    res.json({
      success: true,
      message: '交易記錄更新成功',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: '更新交易記錄失敗'
    });
  }
});

// 刪除交易記錄 - 僅限管理員和核心
router.delete('/:id', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查交易記錄是否存在
    const existingTransaction = await pool.query(
      'SELECT id, item_name FROM transactions WHERE id = $1',
      [id]
    );
    
    if (existingTransaction.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '交易記錄不存在'
      });
    }
    
    await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: `交易記錄 "${existingTransaction.rows[0].item_name}" 已刪除`
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: '刪除交易記錄失敗'
    });
  }
});

module.exports = router;