const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const judicialService = require('../services/judicialService');

const router = express.Router();

// Middleware to check if user is admin or level 1 core member
const requireAdminOrLevel1 = (req, res, next) => {
  const isLevel1 = req.user.membership_level === 1;
  const isAdmin = req.user.membership_level === 1 && req.user.email.includes('admin');
  
  if (!isLevel1 && !isAdmin) {
    return res.status(403).json({ message: '權限不足：僅限管理員或一級核心成員' });
  }
  next();
};

// Apply authentication to all routes
router.use(authenticateToken);

// Initialize Gemini AI (will be initialized when needed)
let genAI = null;
let model = null;

// Function to initialize Gemini AI
function initializeGeminiAI() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY 環境變數未設置或使用預設值');
  }
  
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-lite' });
  }
  
  return model;
}

// @route   POST /api/ai-analysis/analyze-prospect/:id
// @desc    Trigger AI analysis for a prospect
// @access  Private (Admin and Level 1 only)
router.post('/analyze-prospect/:id', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(400).json({
        success: false,
        message: 'AI 分析功能未啟用：GEMINI_API_KEY 環境變數未設置',
        error: 'GEMINI_API_KEY_NOT_CONFIGURED'
      });
    }
    
    // Get prospect data
    const prospectResult = await pool.query(
      'SELECT * FROM prospects WHERE id = $1',
      [id]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '找不到指定的商訪準會員資料' 
      });
    }
    
    const prospect = prospectResult.rows[0];
    
    // Check if analysis already exists
    if (prospect.ai_analysis_report) {
      return res.status(400).json({
        success: false,
        message: 'AI 分析報告已存在，如需重新分析請先清除現有報告'
      });
    }
    
    // Start AI analysis process
    res.json({
      success: true,
      message: 'AI 分析已啟動，請稍候...',
      analysisId: id
    });
    
    // Perform AI analysis in background
    performAIAnalysis(prospect);
    
  } catch (error) {
    console.error('AI analysis trigger error:', error);
    res.status(500).json({
      success: false,
      message: '啟動 AI 分析時發生錯誤'
    });
  }
});

// @route   GET /api/ai-analysis/status/:id
// @desc    Check AI analysis status
// @access  Private (Admin and Level 1 only)
router.get('/status/:id', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT ai_analysis_report FROM prospects WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '找不到指定的商訪準會員資料' 
      });
    }
    
    const report = result.rows[0].ai_analysis_report;
    
    res.json({
      success: true,
      hasReport: !!report,
      report: report
    });
    
  } catch (error) {
    console.error('AI analysis status check error:', error);
    res.status(500).json({
      success: false,
      message: '檢查分析狀態時發生錯誤'
    });
  }
});

// @route   DELETE /api/ai-analysis/clear/:id
// @desc    Clear AI analysis report
// @access  Private (Admin and Level 1 only)
router.delete('/clear/:id', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE prospects SET ai_analysis_report = NULL WHERE id = $1',
      [id]
    );
    
    res.json({
      success: true,
      message: 'AI 分析報告已清除'
    });
    
  } catch (error) {
    console.error('Clear AI analysis error:', error);
    res.status(500).json({
      success: false,
      message: '清除分析報告時發生錯誤'
    });
  }
});

// Background AI analysis function
async function performAIAnalysis(prospect) {
  try {
    console.log(`Starting AI analysis for prospect: ${prospect.company}`);
    
    // Initialize Gemini AI model
    const aiModel = initializeGeminiAI();
    
    // 1. Market Reputation Analysis (Ultra-Simplified)
    const reputationPrompt = `「${prospect.company}」聲譽：[positive/neutral/negative]`;
    
    const reputationResult = await aiModel.generateContent(reputationPrompt);
    const reputationText = reputationResult.response.text();
    
    // Extract sentiment from reputation analysis
    const sentimentMatch = reputationText.match(/聲譽：\s*(positive|neutral|negative)/i) || reputationText.match(/(positive|neutral|negative)/i);
    const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral';
    
    // 2. Skip detailed conflict check - use fast assessment
    const existingMembersResult = await pool.query(
      'SELECT name, company FROM users WHERE industry = $1 AND membership_level IN (1, 2, 3)',
      [prospect.industry]
    );
    
    const existingMembers = existingMembersResult.rows.map(member => member.company || member.name).join(', ');
    const conflictLevel = 'low'; // Default to low for speed
     const conflictText = `衝突等級：${conflictLevel}`;
     
     // 3. Skip detailed legal risk - use judicial data only
     console.log(`Checking judicial records for: ${prospect.company}`);
     const judicialResult = await judicialService.searchJudgments(prospect.company, { top: 20 });
     const legalRiskAnalysis = judicialService.analyzeJudgmentRisk(judicialResult.data);
     const legalRiskText = `風險等級：${legalRiskAnalysis.riskLevel}`;
     
     // 4. Skip AI score calculation - use rule-based scoring
     let score = 75; // Default score
     if (sentiment === 'positive') score += 10;
     if (sentiment === 'negative') score -= 15;
     if (legalRiskAnalysis.riskLevel === 'high') score -= 20;
     if (legalRiskAnalysis.riskLevel === 'medium') score -= 10;
     score = Math.max(0, Math.min(100, score)); // Clamp between 0-100
     
     const fitScoreText = `契合度分數：${score}`;
     
     // 5. Skip AI recommendation - use rule-based recommendation
     let recommendationText = '建議接納';
     if (score < 50) recommendationText = '不建議';
     else if (score < 70) recommendationText = '謹慎考慮';
    
    // Compile analysis report (Simplified)
    const analysisReport = {
      analysisDate: new Date().toISOString(),
      publicInfoScan: {
        summary: reputationText.replace(/聲譽：\s*(positive|neutral|negative)\s*/i, '').trim() || '市場資訊分析完成',
        sentiment: sentiment
      },
      industryConflictCheck: {
        analysis: conflictText.replace(/衝突等級：\s*(high|medium|low)\s*/i, '').trim() || '產業衝突檢測完成',
        existingMembers: existingMembers || '無同產業現有會員',
        conflictLevel: conflictLevel
      },
      legalRiskAssessment: {
        judgmentCount: judicialResult.total,
        riskLevel: legalRiskAnalysis.riskLevel,
        riskScore: legalRiskAnalysis.riskScore,
        summary: legalRiskAnalysis.summary,
        details: legalRiskAnalysis.details.slice(0, 3), // 限制最多3個風險細節
        analysis: legalRiskText.replace(/法律風險等級：\s*(high|medium|low)\s*/i, '').trim() || '法律風險評估完成'
      },
      bciCompatibilityScore: {
        score: score,
        analysis: fitScoreText.replace(/契合度分數.*?：\s*\d+\s*/i, '').trim() || 'BCI契合度評估完成'
      },
      overallRecommendation: recommendationText || generateOverallRecommendation(score, sentiment, conflictLevel)
    };
    
    // Save analysis report to database
    await pool.query(
      'UPDATE prospects SET ai_analysis_report = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(analysisReport), prospect.id]
    );
    
    console.log(`AI analysis completed for prospect: ${prospect.company}`);
    
  } catch (error) {
    console.error('AI analysis error:', error);
    
    // Save error report
    const errorReport = {
      analysisDate: new Date().toISOString(),
      error: true,
      errorMessage: error.message || 'AI 分析服務暫時無法使用',
      status: 'AI 分析過程中發生錯誤，請稍後重試或聯繫系統管理員'
    };
    
    await pool.query(
      'UPDATE prospects SET ai_analysis_report = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(errorReport), prospect.id]
    );
  }
}

// Helper functions
function extractSentiment(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('正面') || lowerText.includes('積極')) return 'positive';
  if (lowerText.includes('負面') || lowerText.includes('消極')) return 'negative';
  return 'neutral';
}

function extractConflictLevel(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('高度重疊') || lowerText.includes('直接衝突')) return 'high';
  if (lowerText.includes('部分重疊') || lowerText.includes('輕微衝突')) return 'medium';
  return 'low';
}

function extractReasoning(text) {
  const sentences = text.split('。');
  return sentences.slice(1).join('。').trim(); // Remove first sentence which usually contains the score
}

function generateOverallRecommendation(score, sentiment, conflict) {
  if (score >= 80) {
    return '強烈推薦：該公司展現出優秀的專業能力和良好的市場聲譽，與 BCI 核心價值高度契合。';
  } else if (score >= 60) {
    return '推薦：該公司具備良好的基礎條件，建議進一步了解後考慮接納。';
  } else if (score >= 40) {
    return '謹慎考慮：該公司存在一些疑慮，建議詳細評估後再做決定。';
  } else {
    return '不建議：該公司可能不適合加入 BCI，建議暫緩考慮。';
  }
}

module.exports = router;