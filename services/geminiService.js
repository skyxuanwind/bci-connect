const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../config/database');

class GeminiService {
  constructor() {
    this.apiKey = 'AIzaSyCdPjaNB7_sOB5DNRRV1378d6dTkqxueK8';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-lite' });
  }

  // 公開資訊掃描
  async performPublicInfoScan(companyName) {
    try {
      console.log(`開始公開資訊掃描: ${companyName}`);
      const prompt = `請你擔任商業分析師。請在網路上搜尋關於公司「${companyName}」的最新新聞、商業評論和客戶評價。請總結你的發現。`;
      
      console.log('正在調用 Gemini API...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('公開資訊掃描完成');
      return {
        success: true,
        data: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('公開資訊掃描錯誤:', error);
      console.error('錯誤詳情:', error.stack);
      return {
        success: false,
        error: error.message,
        data: '無法取得公開資訊掃描結果'
      };
    }
  }

  // 市場聲譽分析
  async performSentimentAnalysis(companyName, publicInfoResult) {
    try {
      console.log(`開始市場聲譽分析: ${companyName}`);
      const prompt = `基於以下搜尋結果，請分析「${companyName}」的整體市場聲譽是偏向正面、中立還是負面？請列出 1-3 個關鍵的正面或負面評價作為佐證。\n\n搜尋結果：\n${publicInfoResult}`;
      
      console.log('正在調用 Gemini API 進行聲譽分析...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('市場聲譽分析完成');
      // 簡單的情感分析分類
      let sentiment = 'neutral';
      if (text.includes('正面') || text.includes('積極') || text.includes('良好')) {
        sentiment = 'positive';
      } else if (text.includes('負面') || text.includes('消極') || text.includes('不良')) {
        sentiment = 'negative';
      }
      
      return {
        success: true,
        sentiment: sentiment,
        analysis: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('市場聲譽分析錯誤:', error);
      return {
        success: false,
        error: error.message,
        sentiment: 'neutral',
        analysis: '無法完成市場聲譽分析'
      };
    }
  }

  // 產業衝突檢測
  async performIndustryConflictCheck(companyName, industry) {
    try {
      console.log(`開始產業衝突檢測: ${companyName}, 產業: ${industry}`);
      // 從資料庫查詢同產業的現有會員
      const existingMembersResult = await pool.query(
        'SELECT name, company FROM users WHERE industry = $1 AND membership_level IN (1, 2, 3)',
        [industry]
      );
      
      const existingMembers = existingMembersResult.rows
        .map(member => member.company || member.name)
        .filter(name => name && name.trim() !== '')
        .join(', ');
      
      console.log(`找到同產業會員: ${existingMembers || '無'}`);
      
      if (!existingMembers) {
        console.log('無同產業會員，衝突等級設為 low');
        return {
          success: true,
          conflictLevel: 'low',
          analysis: `目前商會中沒有與「${companyName}」相同產業「${industry}」的現有會員，因此不存在產業衝突。`,
          existingMembers: [],
          timestamp: new Date().toISOString()
        };
      }
      
      const prompt = `在我們的商會中，產業為「${industry}」的現有會員有：${existingMembers}。請評估新成員「${companyName}」的加入，是否可能與現有會員產生業務上的直接衝突或高度重疊？請簡要說明你的看法。`;
      
      console.log('正在調用 Gemini API 進行產業衝突檢測...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('產業衝突檢測完成');
      
      // 分析衝突等級
      let conflictLevel = 'low';
      if (text.includes('高度') || text.includes('直接衝突') || text.includes('嚴重')) {
        conflictLevel = 'high';
      } else if (text.includes('中度') || text.includes('部分重疊') || text.includes('可能')) {
        conflictLevel = 'medium';
      }
      
      return {
        success: true,
        conflictLevel: conflictLevel,
        analysis: text,
        existingMembers: existingMembersResult.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('產業衝突檢測錯誤:', error);
      return {
        success: false,
        error: error.message,
        conflictLevel: 'unknown',
        analysis: '無法完成產業衝突檢測',
        existingMembers: []
      };
    }
  }

  // BCI 契合度評分
  async calculateBCIFitScore(companyName, publicInfoResult, sentimentResult, conflictResult) {
    try {
      console.log(`開始 BCI 契合度評分: ${companyName}`);
      const prompt = `我們 BCI 商務菁英會的核心價值是「專業」、「誠信」與「合作」。請根據以下分析資訊，為「${companyName}」評估一個與我們商會的契合度分數（1-100分），並簡述給分的理由。\n\n公開資訊：\n${publicInfoResult}\n\n市場聲譽：\n${sentimentResult}\n\n產業衝突分析：\n${conflictResult}`;
      
      console.log('正在調用 Gemini API 進行 BCI 契合度評分...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // 提取分數
      const scoreMatch = text.match(/(\d{1,3})分/);
      let score = 70; // 預設分數
      if (scoreMatch) {
        score = Math.min(100, Math.max(1, parseInt(scoreMatch[1])));
      }
      console.log(`BCI 契合度評分完成，分數: ${score}`);
      
      return {
        success: true,
        score: score,
        analysis: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('BCI 契合度評分錯誤:', error);
      return {
        success: false,
        error: error.message,
        score: 70,
        analysis: '無法完成 BCI 契合度評分'
      };
    }
  }

  // 綜合分析報告
  async generateComprehensiveAnalysis(companyName, industry) {
    try {
      console.log(`開始為 ${companyName} 進行綜合 AI 分析...`);
      
      // 1. 公開資訊掃描
      console.log('執行公開資訊掃描...');
      const publicInfoResult = await this.performPublicInfoScan(companyName);
      
      // 2. 市場聲譽分析
      console.log('執行市場聲譽分析...');
      const sentimentResult = await this.performSentimentAnalysis(
        companyName, 
        publicInfoResult.data
      );
      
      // 3. 產業衝突檢測
      console.log('執行產業衝突檢測...');
      const conflictResult = await this.performIndustryConflictCheck(companyName, industry);
      
      // 4. BCI 契合度評分
      console.log('計算 BCI 契合度評分...');
      const fitScoreResult = await this.calculateBCIFitScore(
        companyName,
        publicInfoResult.data,
        sentimentResult.analysis,
        conflictResult.analysis
      );
      
      return {
        success: true,
        companyName: companyName,
        industry: industry,
        analysis: {
          publicInfo: publicInfoResult,
          sentiment: sentimentResult,
          industryConflict: conflictResult,
          bciFitScore: fitScoreResult
        },
        summary: {
          overallScore: fitScoreResult.score,
          sentiment: sentimentResult.sentiment,
          conflictLevel: conflictResult.conflictLevel,
          recommendation: this.generateRecommendation(
            fitScoreResult.score,
            sentimentResult.sentiment,
            conflictResult.conflictLevel
          )
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('綜合分析錯誤:', error);
      return {
        success: false,
        error: error.message,
        companyName: companyName,
        industry: industry
      };
    }
  }

  // 生成建議
  generateRecommendation(score, sentiment, conflictLevel) {
    if (score >= 80 && sentiment === 'positive' && conflictLevel === 'low') {
      return '強烈推薦：該公司具備優秀的市場聲譽，與商會價值高度契合，且無產業衝突風險。';
    } else if (score >= 70 && conflictLevel !== 'high') {
      return '推薦：該公司整體表現良好，建議進一步面談評估。';
    } else if (score >= 60) {
      return '謹慎考慮：該公司存在一些需要關注的問題，建議詳細評估後決定。';
    } else {
      return '不推薦：該公司存在較多風險因素，不建議接受入會申請。';
    }
  }
}

module.exports = new GeminiService();