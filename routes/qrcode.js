const express = require('express');
const QRCode = require('qrcode');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/qrcode/member/:id
// @desc    Generate QR code for member
// @access  Private
router.get('/member/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get member information
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company, u.title, u.contact_number, 
              u.membership_level, u.status, c.name as chapter_name
       FROM users u
       LEFT JOIN chapters c ON u.chapter_id = c.id
       WHERE u.id = $1 AND u.status = 'active'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '會員不存在或未啟用' });
    }

    const member = result.rows[0];
    
    // Check permission to view this member
    const canAccess = (
      (req.user.membership_level === 1) || // Level 1 can see all
      (req.user.membership_level === 2 && member.membership_level >= 2) || // Level 2 can see 2,3
      (req.user.membership_level === 3 && member.membership_level === 3) || // Level 3 can see only 3
      (req.user.id === parseInt(id)) // Users can always see their own QR code
    );

    if (!canAccess) {
      return res.status(403).json({ message: '無權限查看此會員的QR Code' });
    }

    // Create QR code data
    const qrData = {
      type: 'member',
      id: member.id,
      name: member.name,
      email: member.email,
      company: member.company,
      title: member.title,
      contactNumber: member.contact_number,
      chapterName: member.chapter_name,
      membershipLevel: member.membership_level,
      url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/members/${member.id}`
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    // Extract base64 data from data URL
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    // Set response headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imgBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Send the image
    res.send(imgBuffer);

  } catch (error) {
    console.error('QR Code generation error:', error);
    res.status(500).json({ message: '生成QR Code時發生錯誤' });
  }
});

module.exports = router;