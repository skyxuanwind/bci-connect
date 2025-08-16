const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const judicialService = require('../services/judicialService');

// 測試司法院 API 連線
router.get('/test-connection', authenticateToken, async (req, res) => {
  try {
    const categories = await judicialService.getCategories();
    res.json({
      success: true,
      message: '司法院 API 連線成功',
      categoriesCount: categories.length
    });
  } catch (error) {
    console.error('司法院 API 連線測試失敗:', error);
    res.status(500).json({
      success: false,
      message: '司法院 API 連線失敗',
      error: error.message
    });
  }
});

// 搜尋公司判決書
router.post('/search-judgments', authenticateToken, async (req, res) => {
  try {
    const { companyName, options = {} } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: '請提供公司名稱'
      });
    }

    // 搜尋判決書
    const searchResult = await judicialService.searchJudgments(companyName, options);
    
    // 分析風險等級
    const riskAnalysis = judicialService.analyzeJudgmentRisk(searchResult.data);

    res.json({
      success: searchResult.success,
      companyName: companyName,
      judgments: searchResult.data,
      total: searchResult.total,
      riskAnalysis: riskAnalysis,
      searchOptions: options,
      error: searchResult.error || null
    });
  } catch (error) {
    console.error('搜尋判決書失敗:', error);
    res.status(500).json({
      success: false,
      message: '搜尋判決書時發生錯誤',
      error: error.message
    });
  }
});

// 取得司法院資料分類
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await judicialService.getCategories();
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('取得分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得分類時發生錯誤',
      error: error.message
    });
  }
});

// 取得特定分類的資料源
router.get('/categories/:categoryNo/resources', authenticateToken, async (req, res) => {
  try {
    const { categoryNo } = req.params;
    const resources = await judicialService.getResourcesByCategory(categoryNo);
    res.json({
      success: true,
      categoryNo: categoryNo,
      resources: resources
    });
  } catch (error) {
    console.error('取得資料源失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得資料源時發生錯誤',
      error: error.message
    });
  }
});

// 批量搜尋多家公司的判決書
router.post('/batch-search', authenticateToken, async (req, res) => {
  try {
    const { companyNames, options = {} } = req.body;

    if (!companyNames || !Array.isArray(companyNames) || companyNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請提供公司名稱陣列'
      });
    }

    if (companyNames.length > 10) {
      return res.status(400).json({
        success: false,
        message: '一次最多只能查詢 10 家公司'
      });
    }

    const results = [];
    
    for (const companyName of companyNames) {
      try {
        const searchResult = await judicialService.searchJudgments(companyName, options);
        const riskAnalysis = judicialService.analyzeJudgmentRisk(searchResult.data);
        
        results.push({
          companyName: companyName,
          success: searchResult.success,
          judgments: searchResult.data,
          total: searchResult.total,
          riskAnalysis: riskAnalysis,
          error: searchResult.error || null
        });
        
        // 避免 API 請求過於頻繁，每次查詢間隔 1 秒
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          companyName: companyName,
          success: false,
          judgments: [],
          total: 0,
          riskAnalysis: null,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: results,
      totalCompanies: companyNames.length,
      searchOptions: options
    });
  } catch (error) {
    console.error('批量搜尋判決書失敗:', error);
    res.status(500).json({
      success: false,
      message: '批量搜尋判決書時發生錯誤',
      error: error.message
    });
  }
});

module.exports = router;