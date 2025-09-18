const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { sendCoachToMemberEmail } = require('../services/emailService');

// @route   POST /api/emails/send
// @desc    Send email from coach to member using GBC system email
// @access  Private (Authenticated users only)
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, content, type = 'general' } = req.body;
    const coachId = req.user.id;
    const coachName = req.user.name;

    // 驗證必要參數
    if (!to || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: '收件人、主旨和內容為必填項目'
      });
    }

    // 驗證郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        message: '收件人郵件格式不正確'
      });
    }

    // 發送郵件
    const result = await sendCoachToMemberEmail({
      to,
      subject,
      content,
      type,
      coachId,
      coachName
    });

    if (result.success) {
      res.json({
        success: true,
        message: '郵件已成功發送',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || '郵件發送失敗'
      });
    }

  } catch (error) {
    console.error('郵件發送路由錯誤:', error);
    res.status(500).json({
      success: false,
      message: '郵件發送過程中發生錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;