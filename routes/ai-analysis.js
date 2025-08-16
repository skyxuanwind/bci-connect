const express = require('express');
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

// 快速分析系統 - 不需要外部AI服務
// 所有分析邏輯基於規則和本地計算

// @route   POST /api/ai-analysis/analyze-prospect/:id
// @desc    Trigger fast analysis for a prospect (rule-based, no external AI)
// @access  Private (Admin and Level 1 only)
router.post('/analyze-prospect/:id', requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 快速分析不需要外部API，移除API key檢查
    // 新的快速分析系統完全基於規則，不依賴外部AI服務
    
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
        message: '分析報告已存在，如需重新分析請先清除現有報告'
      });
    }
    
    // Start fast analysis process
    res.json({
      success: true,
      message: '快速分析已啟動，預計10秒內完成...',
      analysisId: id,
      analysisType: 'fast_analysis'
    });
    
    // Perform fast analysis in background
    performFastAnalysis(prospect);
    
  } catch (error) {
    console.error('Fast analysis trigger error:', error);
    res.status(500).json({
      success: false,
      message: '啟動快速分析時發生錯誤'
    });
  }
});

// @route   GET /api/ai-analysis/status/:id
// @desc    Check fast analysis status
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
// @desc    Clear analysis report
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

// Background fast analysis function
async function performFastAnalysis(prospect) {
  try {
    console.log(`Starting fast analysis for prospect: ${prospect.company}`);
    
    // 1. 快速聲譽分析 (基於關鍵字和數據)
    const sentiment = analyzeCompanyReputation(prospect);
    const reputationText = `市場聲譽分析：${sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '負面' : '中性'}`;
    
    // 2. 快速產業衝突檢查
    const existingMembersResult = await pool.query(
      'SELECT name, company FROM users WHERE industry = $1 AND membership_level IN (1, 2, 3)',
      [prospect.industry]
    );
    
    const existingMembers = existingMembersResult.rows.map(member => member.company || member.name).join(', ');
    const conflictLevel = analyzeIndustryConflict(prospect, existingMembersResult.rows);
    const conflictText = `產業衝突檢查：${conflictLevel === 'high' ? '高度衝突' : conflictLevel === 'medium' ? '中度衝突' : '低度衝突'}`;
     
    // 3. 快速法律風險評估
    console.log(`Checking judicial records for: ${prospect.company}`);
    let judicialResult = { total: 0, data: [] };
    let legalRiskAnalysis = { riskLevel: 'low', riskScore: 0, summary: '無重大法律風險', details: [] };
    
    try {
      judicialResult = await Promise.race([
        judicialService.searchJudgments(prospect.company, { top: 10 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      legalRiskAnalysis = judicialService.analyzeJudgmentRisk(judicialResult.data);
    } catch (error) {
      console.log('Judicial service timeout, using default values');
    }
    
    const legalRiskText = `法律風險評估：${legalRiskAnalysis.riskLevel === 'high' ? '高風險' : legalRiskAnalysis.riskLevel === 'medium' ? '中風險' : '低風險'}`;
     
    // 4. 快速BCI契合度評分
    const score = calculateBCICompatibilityScore(prospect, sentiment, conflictLevel, legalRiskAnalysis);
    const fitScoreText = `BCI契合度評分：${score}分 (滿分100分)`;
    
    // 5. 快速整體建議
    const recommendationText = generateFastRecommendation(score, sentiment, conflictLevel, legalRiskAnalysis.riskLevel);
    
    // 編譯快速分析報告
    const analysisReport = {
      analysisDate: new Date().toISOString(),
      analysisType: 'fast_analysis', // 標記為快速分析
      processingTime: '< 10秒', // 快速分析的處理時間
      publicInfoScan: {
        summary: `基於公司名稱和產業關鍵字進行快速聲譽評估，結果為${sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '負面' : '中性'}評價。`,
        sentiment: sentiment,
        method: 'keyword_analysis'
      },
      industryConflictCheck: {
        analysis: `檢測到同產業現有會員${existingMembersResult.rows.length}位，衝突等級評估為${conflictLevel === 'high' ? '高度' : conflictLevel === 'medium' ? '中度' : '低度'}衝突。`,
        existingMembers: existingMembers || '無同產業現有會員',
        conflictLevel: conflictLevel,
        memberCount: existingMembersResult.rows.length
      },
      legalRiskAssessment: {
        judgmentCount: judicialResult.total,
        riskLevel: legalRiskAnalysis.riskLevel,
        riskScore: legalRiskAnalysis.riskScore,
        summary: legalRiskAnalysis.summary,
        details: legalRiskAnalysis.details.slice(0, 3),
        analysis: `司法院資料庫查詢結果：共${judicialResult.total}筆相關判決，風險等級為${legalRiskAnalysis.riskLevel === 'high' ? '高風險' : legalRiskAnalysis.riskLevel === 'medium' ? '中風險' : '低風險'}。`,
        searchTimeout: judicialResult.total === 0 ? '查詢超時，使用預設低風險評估' : null
      },
      bciCompatibilityScore: {
        score: score,
        analysis: `綜合評估公司聲譽、產業衝突、法律風險、資本額及營業年數等因素，BCI契合度評分為${score}分。`,
        factors: {
          reputation: sentiment,
          industryConflict: conflictLevel,
          legalRisk: legalRiskAnalysis.riskLevel,
          capitalAmount: prospect.capital_amount || 0,
          businessYears: prospect.business_years || 0
        }
      },
      overallRecommendation: recommendationText,
      analysisMetadata: {
        version: '2.0_fast',
        aiModel: 'rule_based_engine',
        confidence: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low'
      }
    };
    
    // Save analysis report to database
    await pool.query(
      'UPDATE prospects SET ai_analysis_report = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(analysisReport), prospect.id]
    );
    
    console.log(`Fast analysis completed for prospect: ${prospect.company}`);
    
  } catch (error) {
    console.error('Fast analysis error:', error);
    
    // Save error report
    const errorReport = {
      analysisDate: new Date().toISOString(),
      analysisType: 'fast_analysis',
      error: true,
      errorMessage: error.message || '快速分析服務暫時無法使用',
      status: '快速分析過程中發生錯誤，請稍後重試或聯繫系統管理員',
      analysisMetadata: {
        version: '2.0_fast',
        aiModel: 'rule_based_engine',
        errorType: 'system_error'
      }
    };
    
    await pool.query(
      'UPDATE prospects SET ai_analysis_report = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(errorReport), prospect.id]
    );
  }
}

// 快速分析輔助函數
function analyzeCompanyReputation(prospect) {
  // 基於公司資料進行快速聲譽分析
  let score = 0;
  
  // 基於產業類型評分
  const positiveIndustries = ['科技', '醫療', '教育', '金融', '製造', '服務'];
  const negativeIndustries = ['博弈', '菸酒', '軍火'];
  
  if (positiveIndustries.some(industry => prospect.industry?.includes(industry))) score += 2;
  if (negativeIndustries.some(industry => prospect.industry?.includes(industry))) score -= 3;
  
  // 基於公司規模評分
  if (prospect.employee_count) {
    const employees = parseInt(prospect.employee_count);
    if (employees >= 100) score += 2;
    else if (employees >= 50) score += 1;
    else if (employees < 10) score -= 1;
  }
  
  // 基於年營業額評分
  if (prospect.annual_revenue) {
    const revenue = parseFloat(prospect.annual_revenue);
    if (revenue >= 100000000) score += 2; // 1億以上
    else if (revenue >= 50000000) score += 1; // 5千萬以上
    else if (revenue < 10000000) score -= 1; // 1千萬以下
  }
  
  // 基於成立年份評分
  if (prospect.established_year) {
    const years = new Date().getFullYear() - parseInt(prospect.established_year);
    if (years >= 10) score += 1;
    else if (years < 3) score -= 1;
  }
  
  if (score >= 3) return 'positive';
  if (score <= -2) return 'negative';
  return 'neutral';
}

function analyzeIndustryConflict(prospect, existingMembers) {
  if (!existingMembers || existingMembers.length === 0) return 'low';
  
  // 檢查是否有相同公司名稱
  const sameCompany = existingMembers.some(member => 
    member.company && member.company.toLowerCase() === prospect.company?.toLowerCase()
  );
  if (sameCompany) return 'high';
  
  // 檢查相似業務領域
  const similarBusiness = existingMembers.filter(member => {
    if (!member.company) return false;
    const memberCompany = member.company.toLowerCase();
    const prospectCompany = prospect.company?.toLowerCase() || '';
    
    // 簡單的相似度檢查
    const commonWords = ['科技', '資訊', '電子', '軟體', '系統', '網路', '數位', '智慧'];
    const memberHasCommon = commonWords.some(word => memberCompany.includes(word));
    const prospectHasCommon = commonWords.some(word => prospectCompany.includes(word));
    
    return memberHasCommon && prospectHasCommon;
  });
  
  if (similarBusiness.length >= 3) return 'high';
  if (similarBusiness.length >= 1) return 'medium';
  return 'low';
}

function calculateBCICompatibilityScore(prospect, sentiment, conflictLevel, legalRiskAnalysis) {
  let score = 70; // 基礎分數
  
  // 聲譽評分影響
  if (sentiment === 'positive') score += 15;
  else if (sentiment === 'negative') score -= 20;
  
  // 產業衝突影響
  if (conflictLevel === 'high') score -= 25;
  else if (conflictLevel === 'medium') score -= 10;
  else score += 5;
  
  // 法律風險影響
  if (legalRiskAnalysis.riskLevel === 'high') score -= 30;
  else if (legalRiskAnalysis.riskLevel === 'medium') score -= 15;
  else score += 5;
  
  // 公司基本資料完整度
  let completeness = 0;
  if (prospect.company) completeness++;
  if (prospect.industry) completeness++;
  if (prospect.employee_count) completeness++;
  if (prospect.annual_revenue) completeness++;
  if (prospect.established_year) completeness++;
  if (prospect.business_description) completeness++;
  
  score += (completeness / 6) * 10; // 最多加10分
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateFastRecommendation(score, sentiment, conflictLevel, legalRiskLevel) {
  if (score >= 85) {
    return '強烈推薦：該公司各項指標優秀，建議優先考慮接納。';
  } else if (score >= 70) {
    return '推薦：該公司條件良好，建議接納為會員。';
  } else if (score >= 55) {
    return '謹慎考慮：該公司條件尚可，建議進一步評估後決定。';
  } else if (score >= 40) {
    return '不建議：該公司存在較多疑慮，建議暫緩考慮。';
  } else {
    return '強烈不建議：該公司風險過高，不適合加入BCI。';
  }
}

// 快速聲譽分析函數
function analyzeCompanyReputation(prospect) {
  const company = prospect.company.toLowerCase();
  const industry = prospect.industry.toLowerCase();
  
  // 基於公司名稱和產業的簡單聲譽評估
  const positiveKeywords = ['科技', '創新', '國際', '集團', '控股', '投資', '金融', '銀行'];
  const negativeKeywords = ['當舖', '地下', '非法', '詐騙'];
  
  const hasPositive = positiveKeywords.some(keyword => company.includes(keyword) || industry.includes(keyword));
  const hasNegative = negativeKeywords.some(keyword => company.includes(keyword) || industry.includes(keyword));
  
  if (hasNegative) return 'negative';
  if (hasPositive) return 'positive';
  return 'neutral';
}

// 快速產業衝突分析函數
function analyzeIndustryConflict(prospect, existingMembers) {
  if (existingMembers.length === 0) return 'low';
  
  const prospectCompany = prospect.company.toLowerCase();
  const prospectIndustry = prospect.industry.toLowerCase();
  
  // 檢查是否有相同公司名稱
  const sameCompany = existingMembers.some(member => 
    (member.company && member.company.toLowerCase().includes(prospectCompany)) ||
    prospectCompany.includes(member.company?.toLowerCase() || '')
  );
  
  if (sameCompany) return 'high';
  
  // 檢查同產業成員數量
  const sameIndustryCount = existingMembers.length;
  if (sameIndustryCount >= 3) return 'medium';
  if (sameIndustryCount >= 1) return 'low';
  
  return 'low';
}

// 快速BCI契合度評分函數
function calculateBCICompatibilityScore(prospect, sentiment, conflictLevel, legalRiskAnalysis) {
  let score = 70; // 基礎分數
  
  // 聲譽加分/扣分
  if (sentiment === 'positive') score += 15;
  else if (sentiment === 'negative') score -= 20;
  
  // 產業衝突扣分
  if (conflictLevel === 'high') score -= 25;
  else if (conflictLevel === 'medium') score -= 10;
  
  // 法律風險扣分
  if (legalRiskAnalysis.riskLevel === 'high') score -= 30;
  else if (legalRiskAnalysis.riskLevel === 'medium') score -= 15;
  
  // 公司規模加分（基於資本額）
  const capital = prospect.capital_amount || 0;
  if (capital >= 10000000) score += 10; // 1000萬以上
  else if (capital >= 5000000) score += 5; // 500萬以上
  
  // 營業年數加分
  const businessYears = prospect.business_years || 0;
  if (businessYears >= 10) score += 10;
  else if (businessYears >= 5) score += 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

// 快速整體建議函數
function generateFastRecommendation(score, sentiment, conflictLevel, legalRiskLevel) {
  if (legalRiskLevel === 'high') {
    return '不建議：存在重大法律風險，建議暫緩考慮。';
  }
  
  if (conflictLevel === 'high') {
    return '不建議：與現有會員存在高度產業衝突。';
  }
  
  if (score >= 85) {
    return '強烈推薦：該公司各項條件優秀，與BCI核心價值高度契合，建議優先考慮。';
  } else if (score >= 70) {
    return '推薦：該公司具備良好條件，建議進一步面談後考慮接納。';
  } else if (score >= 55) {
    return '謹慎考慮：該公司條件尚可，建議詳細評估後再做決定。';
  } else if (score >= 40) {
    return '暫緩考慮：該公司存在多項疑慮，建議暫時觀望。';
  } else {
    return '不建議：該公司條件不符合BCI標準，建議拒絕申請。';
  }
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