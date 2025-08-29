const { GoogleGenerativeAI } = require('@google/generative-ai');
const { pool } = require('../config/database');
const axios = require('axios');
const cheerio = require('cheerio');

class GeminiService {
  constructor() {
    // Use environment variable instead of hardcoded key, and degrade gracefully if missing
    this.apiKey = process.env.GEMINI_API_KEY;
    try {
      if (this.apiKey) {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-lite' });
      } else {
        this.genAI = null;
        this.model = null;
      }
    } catch (err) {
      console.error('Gemini init error:', err.message);
      this.genAI = null;
      this.model = null;
    }
  }

  // Helper: Fetch news via Google News RSS (no API key required)
  async fetchGoogleNewsRSS(companyName, maxResults = 8) {
    try {
      const q = `"${companyName}"`;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
      const { data: xml } = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(xml, { xmlMode: true });
      const items = [];
      $('item').each((i, el) => {
        if (i >= maxResults) return false;
        const title = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();
        const source = $(el).find('source').text().trim() || 'Google News';
        const description = $(el).find('description').text().trim();
        if (title && link) {
          items.push({
            title,
            url: link,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
            source,
            snippet: description
          });
        }
      });
      return items;
    } catch (err) {
      console.warn('Google News RSS 抓取失敗:', err.message);
      return [];
    }
  }

  // Helper: Fallback to DuckDuckGo HTML results (general web pages)
  async fetchDuckDuckGoResults(companyName, maxResults = 5) {
    try {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(companyName)}&kl=tw-zh-tw`;
      const { data: html } = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(html);
      const items = [];
      $('.result').each((i, el) => {
        if (items.length >= maxResults) return false;
        const a = $(el).find('a.result__a');
        const title = a.text().trim();
        const href = a.attr('href');
        const snippet = $(el).find('.result__snippet').text().trim();
        if (title && href) {
          items.push({
            title,
            url: href,
            snippet,
            source: 'DuckDuckGo'
          });
        }
      });
      return items;
    } catch (err) {
      console.warn('DuckDuckGo 抓取失敗:', err.message);
      return [];
    }
  }

  // Compose summary text from sources when LLM is unavailable
  buildSourcesSummary(companyName, sources) {
    if (!sources || sources.length === 0) return '';
    const lines = sources.slice(0, 5).map((s, idx) => `【${idx + 1}】${s.title}${s.source ? `（${s.source}）` : ''}`);
    return `針對「${companyName}」的即時網路搜尋，彙整到以下重點來源：\n- ${lines.join('\n- ')}`;
  }

  // 公開資訊掃描（以真實網路來源為基礎）
  async performPublicInfoScan(companyName) {
    try {
      console.log(`開始公開資訊掃描(真實來源): ${companyName}`);
      // 1) 主要來源：Google News RSS
      const news = await this.fetchGoogleNewsRSS(companyName, 8);
      // 2) 備援來源：DuckDuckGo 一般搜尋
      const ddg = news.length < 3 ? await this.fetchDuckDuckGoResults(companyName, 5) : [];

      // 合併與去重 (依 URL/title)
      const merged = [...news, ...ddg];
      const seen = new Set();
      const sources = merged.filter(item => {
        const key = (item.url || '') + '|' + (item.title || '');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (!sources.length) {
        // 無真實網路資料
        return {
          success: true,
          data: '未於網路上找到與該公司相關的新聞或文章。',
          timestamp: new Date().toISOString(),
          realData: false,
          count: 0,
          sources: []
        };
      }

      // 生成摘要（優先用 Gemini，如無則用規則式摘要）
      let summaryText = this.buildSourcesSummary(companyName, sources);
      if (this.model) {
        try {
          const prompt = `你是一位審慎的商業分析師。以下是針對公司「${companyName}」從網路上實際取得的新聞/文章來源（含標題與連結）。\n請你：\n1) 以繁體中文整理 3-5 個重點摘要；\n2) 僅基於提供的來源內容，不要自行編造；\n3) 若不同來源間出現矛盾，請明確指出。\n\n來源清單：\n${sources.map((s, i) => `${i + 1}. ${s.title} - ${s.url}${s.snippet ? `\n摘要：${s.snippet}` : ''}`).join('\n')}`;
          const result = await this.model.generateContent(prompt);
          const response = await result.response;
          const text = (response && typeof response.text === 'function') ? response.text() : '';
          if (text && text.trim()) {
            summaryText = text.trim();
          }
        } catch (e) {
          console.warn('Gemini 摘要失敗，改用規則式摘要:', e.message);
        }
      }

      return {
        success: true,
        data: summaryText,
        timestamp: new Date().toISOString(),
        realData: true,
        count: sources.length,
        sources
      };
    } catch (error) {
      console.error('公開資訊掃描錯誤:', error);
      console.error('錯誤詳情:', error.stack);
      return {
        success: false,
        error: error.message,
        data: '無法取得公開資訊掃描結果',
        realData: false,
        sources: []
      };
    }
  }

  // 市場聲譽分析
  async performSentimentAnalysis(companyName, publicInfoResult) {
    try {
      console.log(`開始市場聲譽分析: ${companyName}`);
      const prompt = `基於以下搜尋結果，請分析「${companyName}」的整體市場聲譽是偏向正面、中立還是負面？請列出 1-3 個關鍵的正面或負面評價作為佐證。\n\n搜尋結果：\n${publicInfoResult}`;

      console.log('正在調用 Gemini API 進行聲譽分析...');
      let text = '';
      if (this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
      }

      // 簡單的情感分析分類（無模型時）
      if (!text) {
        const content = (publicInfoResult || '').toString();
        const negatives = ['違法', '詐騙', '糾紛', '裁罰', '違規', '倒閉', '訴訟', '爭議', '負面', '停業', '欠稅', '侵權'];
        const positives = ['獲獎', '合作', '成長', '佳評', '創新', '募資', '擴張', '投資', '里程碑', '正面', '上市'];
        const negCount = negatives.reduce((acc, kw) => acc + (content.includes(kw) ? 1 : 0), 0);
        const posCount = positives.reduce((acc, kw) => acc + (content.includes(kw) ? 1 : 0), 0);
        text = `基於關鍵字粗略分析：正向詞 ${posCount}、負向詞 ${negCount}。`;
      }

      // 最終情感標籤
      let sentiment = 'neutral';
      if (text.includes('正面') || text.includes('積極') || text.includes('良好')) {
        sentiment = 'positive';
      } else if (text.includes('負面') || text.includes('消極') || text.includes('不良') || text.includes('風險')) {
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

  // GBC 契合度評分
  async calculateGBCFitScore(companyName, publicInfoResult, sentimentResult, conflictResult) {
    try {
      console.log(`開始 GBC 契合度評分: ${companyName}`);
      const prompt = `我們 GBC 商務菁英會的核心價值是「專業」、「誠信」與「合作」。請根據以下分析資訊，為「${companyName}」評估一個與我們商會的契合度分數（1-100分），並簡述給分的理由。\n\n公開資訊：\n${publicInfoResult}\n\n市場聲譽：\n${sentimentResult}\n\n產業衝突分析：\n${conflictResult}`;
      
      console.log('正在調用 Gemini API 進行 GBC 契合度評分...');
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // 提取分數
      const scoreMatch = text.match(/(\d{1,3})分/);
      let score = 70; // 預設分數
      if (scoreMatch) {
        score = Math.min(100, Math.max(1, parseInt(scoreMatch[1])));
      }
      console.log(`GBC 契合度評分完成，分數: ${score}`);
      
      return {
        success: true,
        score: score,
        analysis: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('GBC 契合度評分錯誤:', error);
      return {
        success: false,
        error: error.message,
        score: 70,
        analysis: '無法完成 GBC 契合度評分'
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
      
      // 4. GBC 契合度評分
    console.log('計算 GBC 契合度評分...');
    const fitScoreResult = await this.calculateGBCFitScore(
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
          gbcFitScore: fitScoreResult
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