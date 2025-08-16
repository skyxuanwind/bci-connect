const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const judicialService = require('../services/judicialService');
const geminiService = require('../services/geminiService');

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

// @route   POST /api/ai-analysis/analyze
// @desc    General analysis endpoint for legal risk assessment
// @access  Public (for testing)
router.post('/analyze', async (req, res) => {
  try {
    const { companyName, businessType, analysisType } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ 
        success: false, 
        message: '公司名稱為必填項目' 
      });
    }
    
    let analysisResult = {};
    
    if (analysisType === 'legal_risk' || !analysisType) {
      // 執行法律風險評估
      try {
        const judgmentResult = await judicialService.searchJudgments(companyName, { top: 10 });
        const riskAnalysis = judicialService.analyzeJudgmentRisk(judgmentResult.judgments || []);
        
        analysisResult.legalRisk = {
          judgments: judgmentResult.judgments || [],
          riskLevel: riskAnalysis.riskLevel,
          riskScore: riskAnalysis.riskScore,
          summary: riskAnalysis.summary,
          details: riskAnalysis.details,
          note: judgmentResult.note
        };
      } catch (error) {
        console.error('法律風險評估錯誤:', error);
        analysisResult.legalRisk = {
          error: '法律風險評估失敗',
          message: error.message
        };
      }
    }
    
    // 執行 Gemini AI 綜合分析
    if (analysisType === 'comprehensive' || analysisType === 'gemini') {
      try {
        console.log(`開始執行 ${companyName} 的 Gemini AI 綜合分析...`);
        const geminiResult = await geminiService.generateComprehensiveAnalysis(companyName, businessType);
        analysisResult.geminiAnalysis = geminiResult;
      } catch (error) {
        console.error('Gemini AI 分析錯誤:', error);
        analysisResult.geminiAnalysis = {
          success: false,
          error: error.message,
          companyName: companyName,
          industry: businessType
        };
      }
    }
    
    res.json({
      success: true,
      companyName,
      businessType,
      analysisType: analysisType || 'legal_risk',
      result: analysisResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('分析過程發生錯誤:', error);
    res.status(500).json({ 
      success: false, 
      message: '分析過程發生錯誤',
      error: error.message 
    });
  }
});

// 快速分析系統 - 不需要外部AI服務
// 所有分析邏輯基於規則和本地計算

// @route   POST /api/ai-analysis/analyze-prospect/:id
// @desc    Trigger fast analysis for a prospect (rule-based, no external AI)
// @access  Private (Admin and Level 1 only)
router.post('/analyze-prospect/:id', authenticateToken, requireAdminOrLevel1, async (req, res) => {
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
router.get('/status/:id', authenticateToken, requireAdminOrLevel1, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT ai_analysis_report, analysis_progress FROM prospects WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '找不到指定的商訪準會員資料' 
      });
    }
    
    const report = result.rows[0].ai_analysis_report;
    const progress = result.rows[0].analysis_progress;
    
    // 如果有進度信息，表示分析正在進行中
    if (progress) {
      const progressData = JSON.parse(progress);
      return res.json({
        success: true,
        hasReport: false,
        isAnalyzing: true,
        progress: progressData
      });
    }
    
    res.json({
      success: true,
      hasReport: !!report,
      isAnalyzing: false,
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
router.delete('/clear/:id', authenticateToken, requireAdminOrLevel1, async (req, res) => {
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
    
    // 初始化分析狀態
    await updateAnalysisProgress(prospect.id, {
      stage: 'starting',
      progress: 10,
      currentStep: '正在啟動分析引擎...',
      details: '系統正在初始化分析模組，準備開始全面評估。'
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 模擬處理時間
    
    // 1. 快速聲譽分析 (基於關鍵字和數據)
    await updateAnalysisProgress(prospect.id, {
      stage: 'reputation_analysis',
      progress: 25,
      currentStep: '正在分析市場聲譽...',
      details: `正在分析「${prospect.company}」的市場聲譽和公司形象，檢查公司名稱和產業關鍵字...`
    });
    
    const sentiment = analyzeCompanyReputation(prospect);
    const reputationText = `市場聲譽分析：${sentiment === 'positive' ? '正面' : sentiment === 'negative' ? '負面' : '中性'}`;
    
    await updateAnalysisProgress(prospect.id, {
      stage: 'reputation_analysis',
      progress: 35,
      currentStep: '市場聲譽分析完成',
      details: `聲譽評估結果：${sentiment === 'positive' ? '該公司展現正面的市場形象，具備良好的品牌聲譽。' : sentiment === 'negative' ? '該公司存在負面市場評價，需要謹慎評估。' : '該公司市場聲譽中性，無明顯正負面評價。'}`
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 2. 快速產業衝突檢查
    await updateAnalysisProgress(prospect.id, {
      stage: 'conflict_analysis',
      progress: 45,
      currentStep: '正在檢查產業衝突...',
      details: `正在檢查「${prospect.company}」與現有會員的產業重疊情況，分析潛在競爭關係...`
    });
    
    const existingMembersResult = await pool.query(
      'SELECT name, company FROM users WHERE industry = $1 AND membership_level IN (1, 2, 3)',
      [prospect.industry]
    );
    
    const existingMembers = existingMembersResult.rows.map(member => member.company || member.name).join(', ');
    const conflictLevel = analyzeIndustryConflict(prospect, existingMembersResult.rows);
    const conflictText = `產業衝突檢查：${conflictLevel === 'high' ? '高度衝突' : conflictLevel === 'medium' ? '中度衝突' : '低度衝突'}`;
    
    await updateAnalysisProgress(prospect.id, {
      stage: 'conflict_analysis',
      progress: 55,
      currentStep: '產業衝突檢查完成',
      details: `衝突評估結果：${conflictLevel === 'high' ? '發現與現有會員存在高度產業重疊，可能產生競爭衝突。' : conflictLevel === 'medium' ? '與現有會員存在部分產業重疊，需要進一步評估。' : '與現有會員產業重疊度低，衝突風險較小。'}`
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
     
    // 3. 快速法律風險評估
    await updateAnalysisProgress(prospect.id, {
      stage: 'legal_analysis',
      progress: 65,
      currentStep: '正在評估法律風險...',
      details: `正在查詢「${prospect.company}」的司法記錄和法律風險，檢查相關訴訟案件...`
    });
    
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
    
    await updateAnalysisProgress(prospect.id, {
      stage: 'legal_analysis',
      progress: 75,
      currentStep: '法律風險評估完成',
      details: `法律風險結果：${legalRiskAnalysis.riskLevel === 'high' ? '發現多筆司法記錄，存在較高法律風險。' : legalRiskAnalysis.riskLevel === 'medium' ? '發現部分司法記錄，需要進一步關注。' : '未發現重大司法記錄，法律風險較低。'}`
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
     
    // 4. Gemini AI 綜合分析
    await updateAnalysisProgress(prospect.id, {
      stage: 'gemini_analysis',
      progress: 75,
      currentStep: '正在執行 AI 綜合分析...',
      details: `正在使用 Gemini AI 進行「${prospect.company}」的公開資訊掃描、市場聲譽分析、產業衝突檢測和 BCI 契合度評分...`
    });
    
    let geminiResult = null;
    try {
      geminiResult = await geminiService.generateComprehensiveAnalysis(prospect.company, prospect.industry);
    } catch (error) {
      console.error('Gemini AI 分析失敗:', error);
      geminiResult = {
        success: false,
        error: error.message,
        summary: {
          overallScore: 70,
          sentiment: 'neutral',
          conflictLevel: 'unknown',
          recommendation: '無法完成 AI 分析，建議人工評估。'
        }
      };
    }
    
    const score = geminiResult?.summary?.overallScore || calculateBCICompatibilityScore(prospect, sentiment, conflictLevel, legalRiskAnalysis);
    const aiSentiment = geminiResult?.summary?.sentiment || sentiment;
    const aiConflictLevel = geminiResult?.summary?.conflictLevel || conflictLevel;
    
    await updateAnalysisProgress(prospect.id, {
      stage: 'gemini_analysis',
      progress: 90,
      currentStep: 'AI 綜合分析完成',
      details: `AI 分析結果：契合度評分 ${score}/100，${geminiResult?.summary?.recommendation || '建議進一步人工評估。'}`
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 5. 快速整體建議
    await updateAnalysisProgress(prospect.id, {
      stage: 'finalizing',
      progress: 95,
      currentStep: '正在生成分析報告...',
      details: '整合所有分析結果，生成最終建議和詳細報告...'
    });
    
    const recommendationText = geminiResult?.summary?.recommendation || generateFastRecommendation(score, aiSentiment, aiConflictLevel, legalRiskAnalysis.riskLevel);
    
    // 編譯快速分析報告
    const analysisReport = {
      analysisDate: new Date().toISOString(),
      analysisType: 'gemini_enhanced_analysis', // 標記為 Gemini AI 增強分析
      processingTime: '< 15秒', // AI 增強分析的處理時間
      publicInformationScan: {
        summary: geminiResult?.analysis?.publicInfo?.data || `${aiSentiment === 'positive' ? '✅ 正面評價' : aiSentiment === 'negative' ? '⚠️ 負面評價' : '➖ 中性評價'}\n\n基於公司名稱和產業關鍵字分析，該公司展現${aiSentiment === 'positive' ? '良好的市場形象' : aiSentiment === 'negative' ? '需要關注的負面資訊' : '一般的市場表現'}。`,
        sources: geminiResult?.success ? 'Gemini AI 網路搜尋' : '關鍵字分析',
        method: geminiResult?.success ? 'gemini_ai_analysis' : 'keyword_analysis',
        geminiAnalysis: geminiResult?.analysis?.publicInfo || null
      },
      marketSentiment: {
        sentiment: aiSentiment,
        analysis: geminiResult?.analysis?.sentiment?.analysis || `${aiSentiment === 'positive' ? '📈 市場聲譽良好' : aiSentiment === 'negative' ? '📉 市場聲譽待改善' : '📊 市場聲譽中性'}\n\n${aiSentiment === 'positive' ? '該公司在市場上享有良好聲譽，品牌形象正面。' : aiSentiment === 'negative' ? '該公司存在負面市場評價，建議進一步了解。' : '該公司市場聲譽中性，無明顯正負面評價。'}`,
        geminiAnalysis: geminiResult?.analysis?.sentiment || null
      },
      industryConflict: {
        analysis: geminiResult?.analysis?.industryConflict?.analysis || `${aiConflictLevel === 'high' ? '🔴 高度衝突' : aiConflictLevel === 'medium' ? '🟡 中度衝突' : '🟢 低度衝突'}\n\n同產業現有會員：${existingMembersResult.rows.length}位\n${aiConflictLevel === 'high' ? '存在高度產業重疊，需詳細評估業務差異。' : aiConflictLevel === 'medium' ? '存在部分產業重疊，建議進一步了解。' : '產業重疊度低，衝突風險小。'}`,
        existingMembers: existingMembers || '無同產業現有會員',
        conflictLevel: aiConflictLevel,
        memberCount: existingMembersResult.rows.length,
        geminiAnalysis: geminiResult?.analysis?.industryConflict || null
      },
      legalRiskAssessment: {
        judicialRecordsCount: judicialResult.total,
        riskLevel: legalRiskAnalysis.riskLevel,
        riskScore: legalRiskAnalysis.riskScore,
        riskSummary: legalRiskAnalysis.summary,
        riskDetails: legalRiskAnalysis.details.slice(0, 3),
        analysis: `${legalRiskAnalysis.riskLevel === 'high' ? '🔴 高風險' : legalRiskAnalysis.riskLevel === 'medium' ? '🟡 中風險' : '🟢 低風險'}\n\n司法院查詢結果：${judicialResult.total}筆判決記錄\n${legalRiskAnalysis.riskLevel === 'high' ? '發現多筆司法記錄，建議詳細審查。' : legalRiskAnalysis.riskLevel === 'medium' ? '發現部分司法記錄，需進一步關注。' : '未發現重大司法記錄，風險較低。'}`,
        dataSource: '司法院法學資料檢索系統',
        searchSuccess: judicialResult.total > 0 || judicialResult.searchSuccess !== false,
        searchTimeout: judicialResult.total === 0 ? '查詢超時，使用預設低風險評估' : null
      },
      bciFitScore: {
        score: score,
        analysis: geminiResult?.analysis?.bciFitScore?.analysis || `🎯 BCI 契合度：${score}分\n\n📊 評分構成：\n• 市場聲譽：${aiSentiment === 'positive' ? '✅ 正面' : aiSentiment === 'negative' ? '❌ 負面' : '➖ 中性'}\n• 產業衝突：${aiConflictLevel === 'low' ? '✅ 低衝突' : aiConflictLevel === 'medium' ? '⚠️ 中衝突' : '❌ 高衝突'}\n• 法律風險：${legalRiskAnalysis.riskLevel === 'low' ? '✅ 低風險' : legalRiskAnalysis.riskLevel === 'medium' ? '⚠️ 中風險' : '❌ 高風險'}\n\n💡 ${score >= 80 ? '強烈推薦加入' : score >= 60 ? '建議通過申請' : '建議謹慎評估'}`,
        factors: {
          reputation: aiSentiment,
          industryConflict: aiConflictLevel,
          legalRisk: legalRiskAnalysis.riskLevel,
          capitalAmount: prospect.capital_amount || 0,
          businessYears: prospect.business_years || 0
        },
        geminiAnalysis: geminiResult?.analysis?.bciFitScore || null
      },
      overallRecommendation: recommendationText,
      analysisMetadata: {
        version: '3.0_gemini_enhanced',
        aiModel: geminiResult?.success ? 'gemini_pro_with_fallback' : 'rule_based_engine',
        confidence: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
        geminiSuccess: geminiResult?.success || false,
        geminiError: geminiResult?.error || null
      }
    };
    
    // 最終完成
    await updateAnalysisProgress(prospect.id, {
      stage: 'completed',
      progress: 100,
      currentStep: '分析完成',
      details: '所有分析項目已完成，報告已生成並保存。'
    });
    
    // Save analysis report to database
    await pool.query(
      'UPDATE prospects SET ai_analysis_report = $1, analysis_progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [JSON.stringify(analysisReport), null, prospect.id]
    );
    
    console.log(`Fast analysis completed for prospect: ${prospect.company}`);
    
  } catch (error) {
    console.error('Fast analysis error:', error);
    
    // 更新錯誤狀態
    await updateAnalysisProgress(prospect.id, {
      stage: 'error',
      progress: 0,
      currentStep: '分析發生錯誤',
      details: `分析過程中發生錯誤：${error.message}`
    });
    
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
      'UPDATE prospects SET ai_analysis_report = $1, analysis_progress = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [JSON.stringify(errorReport), null, prospect.id]
    );
  }
}

// 更新分析進度的輔助函數
async function updateAnalysisProgress(prospectId, progressData) {
  try {
    await pool.query(
      'UPDATE prospects SET analysis_progress = $1 WHERE id = $2',
      [JSON.stringify(progressData), prospectId]
    );
  } catch (error) {
    console.error('Error updating analysis progress:', error);
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