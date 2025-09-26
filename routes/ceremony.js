const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireMembershipLevel } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GBC 連結之橋儀式 - NFC 會員激活驗證
// @route   POST /api/ceremony/activate-member
// @desc    Verify NFC card and activate member in ceremony
// @access  Private (Core/Admin only)
router.post('/activate-member', requireMembershipLevel(['core', 'admin']), async (req, res) => {
  try {
    const { nfc_card_id } = req.body;
    
    if (!nfc_card_id) {
      return res.status(400).json({
        success: false,
        message: 'NFC 卡片 ID 為必填項目'
      });
    }

    // 查找對應的會員
    const memberResult = await pool.query(
      `SELECT 
        id as userId,
        name,
        title as profession,
        profile_picture_url as profilePictureUrl,
        company,
        industry,
        status,
        membership_level
       FROM users 
       WHERE nfc_card_id = $1`,
      [nfc_card_id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到對應的會員 NFC 卡片'
      });
    }

    const member = memberResult.rows[0];

    // 檢查會員狀態
    if (member.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: '該會員狀態不是活躍狀態，無法參與儀式'
      });
    }

    // 記錄儀式參與日誌
    await pool.query(
      `INSERT INTO ceremony_logs (user_id, ceremony_type, nfc_card_id, created_at)
       VALUES ($1, 'bridge_ceremony', $2, NOW())`,
      [member.userid, nfc_card_id]
    );

    res.json({
      success: true,
      message: '會員 NFC 驗證成功',
      member: {
        userId: member.userid,
        name: member.name,
        profession: member.profession,
        profilePictureUrl: member.profilepictureurl,
        company: member.company,
        industry: member.industry,
        membershipLevel: member.membership_level
      }
    });

  } catch (error) {
    console.error('Error activating member in ceremony:', error);
    res.status(500).json({
      success: false,
      message: '儀式會員激活失敗'
    });
  }
});

// GBC 連結之橋儀式 - 獲取會員誓詞
// @route   GET /api/ceremony/oath
// @desc    Get ceremony oath text
// @access  Private (Core/Admin only)
router.get('/oath', requireMembershipLevel(['core', 'admin']), async (req, res) => {
  try {
    // 從設定表中獲取誓詞內容，如果沒有則使用預設值
    const oathResult = await pool.query(
      `SELECT value FROM settings WHERE key = 'ceremony_oath'`
    );

    let oathText = `我，[會員姓名]，謹此宣誓：
加入 GBC 大家庭，我將秉持誠信、互助、共贏的精神，
與所有夥伴攜手合作，共同搭建通往成功的橋樑。
我承諾以專業服務社群，以真誠建立連結，
讓 GBC 的價值在我們每一個人身上發光發熱。
願我們的合作之橋，連接無限可能的未來！`;

    if (oathResult.rows.length > 0) {
      oathText = oathResult.rows[0].value;
    }

    res.json({
      success: true,
      oath: oathText
    });

  } catch (error) {
    console.error('Error fetching ceremony oath:', error);
    res.status(500).json({
      success: false,
      message: '獲取誓詞失敗'
    });
  }
});

// GBC 連結之橋儀式 - 更新會員誓詞
// @route   PUT /api/ceremony/oath
// @desc    Update ceremony oath text
// @access  Private (Admin only)
router.put('/oath', requireMembershipLevel(['admin']), async (req, res) => {
  try {
    const { oath } = req.body;
    
    if (!oath) {
      return res.status(400).json({
        success: false,
        message: '誓詞內容為必填項目'
      });
    }

    // 更新或插入誓詞設定
    await pool.query(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('ceremony_oath', $1, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = $1, updated_at = NOW()`,
      [oath]
    );

    res.json({
      success: true,
      message: '誓詞更新成功'
    });

  } catch (error) {
    console.error('Error updating ceremony oath:', error);
    res.status(500).json({
      success: false,
      message: '更新誓詞失敗'
    });
  }
});

// GBC 連結之橋儀式 - 獲取儀式設置
// @route   GET /api/ceremony/settings
// @desc    Get ceremony settings
// @access  Private (Core/Admin only)
router.get('/settings', requireMembershipLevel(['core', 'admin']), async (req, res) => {
  try {
    // 從設定表中獲取儀式設置
    const settingsResult = await pool.query(
      `SELECT key, value FROM settings WHERE key LIKE 'ceremony_%'`
    );

    // 預設設置
    const defaultSettings = {
      ceremony_enable_sound: 'true',
      ceremony_enable_particles: 'true',
      ceremony_enable_guide: 'true',
      ceremony_auto_progress: 'false',
      ceremony_transition_duration: '500'
    };

    // 合併資料庫設置和預設設置
    const settings = { ...defaultSettings };
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    // 轉換為前端需要的格式
    const ceremonySettings = {
      enableSound: settings.ceremony_enable_sound === 'true',
      enableParticles: settings.ceremony_enable_particles === 'true',
      enableGuide: settings.ceremony_enable_guide === 'true',
      autoProgress: settings.ceremony_auto_progress === 'true',
      transitionDuration: parseInt(settings.ceremony_transition_duration)
    };

    res.json({
      success: true,
      settings: ceremonySettings
    });

  } catch (error) {
    console.error('Error fetching ceremony settings:', error);
    res.status(500).json({
      success: false,
      message: '獲取儀式設置失敗'
    });
  }
});

// GBC 連結之橋儀式 - 更新儀式設置
// @route   PUT /api/ceremony/settings
// @desc    Update ceremony settings
// @access  Private (Admin only)
router.put('/settings', requireMembershipLevel(['admin']), async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      return res.status(400).json({
        success: false,
        message: '設置內容為必填項目'
      });
    }

    // 轉換為資料庫格式
    const dbSettings = [
      ['ceremony_enable_sound', settings.enableSound ? 'true' : 'false'],
      ['ceremony_enable_particles', settings.enableParticles ? 'true' : 'false'],
      ['ceremony_enable_guide', settings.enableGuide ? 'true' : 'false'],
      ['ceremony_auto_progress', settings.autoProgress ? 'true' : 'false'],
      ['ceremony_transition_duration', settings.transitionDuration.toString()]
    ];

    // 批量更新設置
    for (const [key, value] of dbSettings) {
      await pool.query(
        `INSERT INTO settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key)
         DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }

    res.json({
      success: true,
      message: '儀式設置更新成功'
    });

  } catch (error) {
    console.error('Error updating ceremony settings:', error);
    res.status(500).json({
      success: false,
      message: '更新儀式設置失敗'
    });
  }
});

module.exports = router;