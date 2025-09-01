const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const nfcCardController = require('../controllers/nfcCardController');

// 獲取模板列表
router.get('/templates', nfcCardController.getTemplates);

// 會員相關路由（需要認證）
router.get('/my-card', authenticateToken, nfcCardController.getMyCard);
router.put('/my-card', authenticateToken, nfcCardController.updateMyCard);
router.post('/my-card/content', authenticateToken, nfcCardController.updateMyCardContent);

// 公開路由（無需認證）
router.get('/member/:memberId', nfcCardController.getMemberCard);
router.get('/:cardId/vcard', nfcCardController.generateVCard);

module.exports = router;