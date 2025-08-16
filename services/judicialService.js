const axios = require('axios');

// 司法院開放資料 API 基礎 URL
const JUDICIAL_API_BASE = 'https://opendata.judicial.gov.tw';

class JudicialService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  // 取得 API Token
  async getToken() {
    try {
      // 檢查現有 token 是否仍有效
      if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.token;
      }

      const response = await axios.post(`${JUDICIAL_API_BASE}/api/MemberTokens`, {
        memberAccount: process.env.JUDICIAL_ACCOUNT || 'skyxuanwind',
        pwd: process.env.JUDICIAL_PASSWORD || 'sh520520'
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        // Token 通常有效期為 24 小時，設定為 23 小時後過期
        this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
        return this.token;
      }

      throw new Error('無法取得 API Token');
    } catch (error) {
      console.error('取得司法院 API Token 失敗:', error.message);
      throw error;
    }
  }

  // 取得主題分類清單
  async getCategories() {
    try {
      const token = await this.getToken();
      const response = await axios.get(`${JUDICIAL_API_BASE}/data/api/rest/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('取得分類清單失敗:', error.message);
      throw error;
    }
  }

  // 取得特定分類的資料源
  async getResourcesByCategory(categoryNo) {
    try {
      const token = await this.getToken();
      const response = await axios.get(`${JUDICIAL_API_BASE}/data/api/rest/categories/${categoryNo}/resources`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`取得分類 ${categoryNo} 資料源失敗:`, error.message);
      throw error;
    }
  }

  // 搜尋判決書資料
  async searchJudgments(companyName, options = {}) {
    try {
      const {
        top = 10,
        skip = 0,
        format = 'json'
      } = options;

      // 驗證 API 連接
      const token = await this.getToken();
      console.log(`開始搜尋公司 ${companyName} 的判決書資料...`);
      
      // 嘗試從司法院 API 取得最近的判決書清單
      const recentJudgments = await this.getRecentJudgmentsList();
      
      // 搜尋包含公司名稱的判決書
      const matchingJudgments = await this.searchJudgmentsByCompanyName(companyName, recentJudgments, top);
      
      if (matchingJudgments.length > 0) {
        console.log(`找到 ${matchingJudgments.length} 筆相關判決書`);
        return {
          success: true,
          judgments: matchingJudgments,
          data: matchingJudgments,
          total: matchingJudgments.length,
          companyName: companyName,
          note: '來自司法院開放資料平台的真實判決書資料'
        };
      } else {
        console.log(`未找到包含 ${companyName} 的判決書，提供風險評估分析`);
        // 如果沒有找到真實資料，提供基於公司特徵的風險分析
        const riskAnalysis = this.generateRiskAnalysis(companyName);
        return {
          success: true,
          judgments: riskAnalysis,
          data: riskAnalysis,
          total: riskAnalysis.length,
          companyName: companyName,
          note: '未找到直接相關的判決書，此為基於公司特徵的風險評估分析'
        };
      }
    } catch (error) {
      console.error(`搜尋公司 ${companyName} 判決書失敗:`, error.message);
      // 如果 API 調用失敗，回退到風險分析
      const riskAnalysis = this.generateRiskAnalysis(companyName);
      return {
        success: true,
        judgments: riskAnalysis,
        data: riskAnalysis,
        total: riskAnalysis.length,
        companyName: companyName,
        note: 'API 連接失敗，此為基於公司特徵的風險評估分析'
      };
    }
  }

  // 檢查司法院 API 服務時間（僅在每日凌晨 0-6 時提供服務）
  isJudicialApiAvailable() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 0 && hour < 6;
  }

  // 取得最近的判決書清單
  async getRecentJudgmentsList() {
    try {
      console.log('正在嘗試連接司法院開放資料 API...');
      
      // 檢查服務時間
      if (!this.isJudicialApiAvailable()) {
        const now = new Date();
        console.log(`司法院 API 僅在每日凌晨 0-6 時提供服務，目前時間：${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
        return [];
      }
      
      // 司法院 API 只提供 7 日前的異動清單，使用 POST 方法
       const response = await axios.post('http://data.judicial.gov.tw/jdg/api/JList', {}, {
         timeout: 15000,
         headers: {
           'Content-Type': 'application/json',
           'User-Agent': 'BCI-Connect-Legal-Analysis/1.0'
         }
       });
      
      console.log('司法院 API 回應狀態:', response.status);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('成功取得判決書清單，共', response.data.length, '日的資料');
        // 收集所有 JID
        const allJids = [];
        response.data.forEach(dayData => {
          if (dayData.LIST && Array.isArray(dayData.LIST)) {
            allJids.push(...dayData.LIST);
          }
        });
        console.log('總共找到', allJids.length, '筆判決書 ID');
        return allJids.slice(0, 50); // 限制數量避免過多請求
      }
      
      // 處理錯誤回應
      if (response.data && response.data.error) {
        console.log('司法院 API 錯誤:', response.data.error);
        if (response.data.error.includes('驗證') || response.data.error.includes('未提供')) {
          console.log('API 可能需要在正確的服務時間內調用');
        }
      } else {
        console.log('司法院 API 回應格式異常:', response.data);
      }
      
      return [];
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('司法院 API 連接超時 - 可能服務不可用（僅在每日凌晨 0-6 時提供服務）');
      } else if (error.response) {
        console.error('司法院 API 回應錯誤:', error.response.status, error.response.statusText);
        if (error.response.data) {
          console.error('錯誤詳情:', error.response.data);
        }
      } else {
        console.error('司法院 API 連接失敗:', error.message);
      }
      return [];
    }
  }

  // 根據公司名稱搜尋判決書
  async searchJudgmentsByCompanyName(companyName, jidList, limit = 10) {
    const matchingJudgments = [];
    const maxRequests = Math.min(jidList.length, 20); // 限制請求數量
    
    for (let i = 0; i < maxRequests && matchingJudgments.length < limit; i++) {
      try {
        const jid = jidList[i];
        const judgmentContent = await this.getJudgmentByJid(jid);
        
        if (judgmentContent && this.containsCompanyName(judgmentContent, companyName)) {
          matchingJudgments.push({
            案號: jid,
            判決日期: this.extractDate(judgmentContent),
            案件類型: this.extractCaseType(judgmentContent),
            判決內容: this.extractSummary(judgmentContent, companyName),
            風險等級: this.assessRiskLevel(judgmentContent),
            原始資料: judgmentContent
          });
        }
        
        // 避免過於頻繁的請求
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`處理判決書 ${jidList[i]} 時發生錯誤:`, error.message);
        continue;
      }
    }
    
    return matchingJudgments;
  }

  // 根據 JID 取得判決書內容
  async getJudgmentByJid(jid) {
    try {
      // 檢查服務時間
      if (!this.isJudicialApiAvailable()) {
        console.log(`司法院 API 服務時間外，無法取得判決書 ${jid}`);
        return null;
      }
      
      const response = await axios.get(`http://data.judicial.gov.tw/jdg/api/JDoc/${jid}`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'BCI-Connect-Legal-Analysis/1.0'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`取得判決書 ${jid} 內容失敗:`, error.message);
      if (error.response && error.response.data) {
        console.error('錯誤詳情:', error.response.data);
      }
      return null;
    }
  }

  // 檢查判決書是否包含公司名稱
  containsCompanyName(judgmentContent, companyName) {
    if (!judgmentContent || typeof judgmentContent !== 'object') {
      return false;
    }
    
    const contentStr = JSON.stringify(judgmentContent).toLowerCase();
    const searchName = companyName.toLowerCase();
    
    return contentStr.includes(searchName) || 
           contentStr.includes(searchName.replace(/有限公司|股份有限公司|公司/g, ''));
  }

  // 提取判決日期
  extractDate(judgmentContent) {
    if (judgmentContent.JDATE) {
      return judgmentContent.JDATE;
    }
    return '未知日期';
  }

  // 提取案件類型
  extractCaseType(judgmentContent) {
    if (judgmentContent.JCASE) {
      return judgmentContent.JCASE;
    }
    return '未知類型';
  }

  // 提取判決摘要
  extractSummary(judgmentContent, companyName) {
    if (judgmentContent.JFULL) {
      const fullText = judgmentContent.JFULL;
      const companyIndex = fullText.indexOf(companyName);
      if (companyIndex !== -1) {
        const start = Math.max(0, companyIndex - 100);
        const end = Math.min(fullText.length, companyIndex + 200);
        return fullText.substring(start, end) + '...';
      }
    }
    return `涉及 ${companyName} 的法律案件`;
  }

  // 評估風險等級
  assessRiskLevel(judgmentContent) {
    if (!judgmentContent.JFULL) return 'MEDIUM';
    
    const content = judgmentContent.JFULL.toLowerCase();
    const highRiskKeywords = ['詐欺', '背信', '洗錢', '違法', '刑事', '有罪'];
    const lowRiskKeywords = ['和解', '調解', '民事', '契約糾紛'];
    
    const highRiskCount = highRiskKeywords.filter(keyword => content.includes(keyword)).length;
    const lowRiskCount = lowRiskKeywords.filter(keyword => content.includes(keyword)).length;
    
    if (highRiskCount > lowRiskCount) return 'HIGH';
    if (lowRiskCount > highRiskCount) return 'LOW';
    return 'MEDIUM';
  }

  // 生成風險分析（當無法找到真實資料時使用）
  generateRiskAnalysis(companyName) {
    const riskFactors = [];
    
    // 基於公司名稱的風險評估
    if (companyName.includes('投資') || companyName.includes('金融')) {
      riskFactors.push({
        風險因子: '金融業務風險',
        描述: '金融投資相關業務可能涉及較高的法律風險',
        風險等級: 'MEDIUM'
      });
    }
    
    if (companyName.includes('科技') || companyName.includes('資訊')) {
      riskFactors.push({
        風險因子: '智慧財產權風險',
        描述: '科技公司可能面臨專利或著作權相關爭議',
        風險等級: 'LOW'
      });
    }
    
    if (companyName.includes('建設') || companyName.includes('營造')) {
      riskFactors.push({
        風險因子: '工程履約風險',
        描述: '建設營造業可能面臨工程品質或履約爭議',
        風險等級: 'MEDIUM'
      });
    }
    
    // 如果沒有特定風險因子，提供一般性評估
    if (riskFactors.length === 0) {
      riskFactors.push({
        風險因子: '一般營業風險',
        描述: '基於公司規模和業務性質的一般法律風險評估',
        風險等級: 'LOW'
      });
    }
    
    return riskFactors;
  }

  // 生成模擬判決書資料
  generateMockJudgmentData(companyName, limit = 10) {
    const mockJudgments = [];
    
    // 根據公司名稱特徵生成不同類型的判決書
    if (companyName.includes('台積電') || companyName.includes('科技')) {
      mockJudgments.push({
        案號: '110年度重訴字第123號',
        判決日期: '2021-08-15',
        案件類型: '民事',
        判決內容: `${companyName}與供應商之契約糾紛案，經調解後和解結案`,
        風險等級: 'LOW'
      });
      
      if (limit > 1) {
        mockJudgments.push({
          案號: '109年度勞訴字第456號',
          判決日期: '2020-12-03',
          案件類型: '勞資糾紛',
          判決內容: `${companyName}勞資爭議案，已依勞動基準法處理完畢`,
          風險等級: 'LOW'
        });
      }
    } else if (companyName.includes('詐欺') || companyName.includes('金融犯罪')) {
      mockJudgments.push({
        案號: '111年度金重訴字第789號',
        判決日期: '2022-03-20',
        案件類型: '金融犯罪',
        判決內容: `${companyName}涉嫌詐欺及背信案件，判決有罪`,
        風險等級: 'HIGH'
      });
      
      if (limit > 1) {
        mockJudgments.push({
          案號: '110年度金訴字第234號',
          判決日期: '2021-11-15',
          案件類型: '證券',
          判決內容: `${companyName}違反證券交易法案件`,
          風險等級: 'HIGH'
        });
      }
      
      if (limit > 2) {
        mockJudgments.push({
          案號: '109年度洗錢字第567號',
          判決日期: '2020-09-10',
          案件類型: '洗錢防制',
          判決內容: `${companyName}涉及洗錢防制法違規案件`,
          風險等級: 'HIGH'
        });
      }
    } else if (companyName.includes('銀行') || companyName.includes('金融')) {
      mockJudgments.push({
        案號: '110年度金訴字第345號',
        判決日期: '2021-06-30',
        案件類型: '金融監理',
        判決內容: `${companyName}金融監理違規案件，已改善完成`,
        風險等級: 'MEDIUM'
      });
    } else {
      // 一般公司的模擬資料
      mockJudgments.push({
        案號: '110年度民訴字第678號',
        判決日期: '2021-04-12',
        案件類型: '民事',
        判決內容: `${companyName}一般民事糾紛案件`,
        風險等級: 'LOW'
      });
    }
    
    return mockJudgments.slice(0, limit);
  }

  // 分析判決書風險等級
  analyzeJudgmentRisk(judgments) {
    if (!judgments || judgments.length === 0) {
      return {
        riskLevel: 'LOW',
        riskScore: 0,
        summary: '無相關判決書記錄',
        details: []
      };
    }

    let riskScore = 0;
    const details = [];

    judgments.forEach(judgment => {
      // 根據判決類型評估風險
      const content = judgment.判決內容 || judgment.content || '';
      const caseType = judgment.案件類型 || judgment.caseType || '';
      const riskLevel = judgment.風險等級 || judgment.riskLevel || '';
      
      // 根據預設的風險等級評分
      if (riskLevel === 'HIGH') {
        riskScore += 40;
      } else if (riskLevel === 'MEDIUM') {
        riskScore += 20;
      } else if (riskLevel === 'LOW') {
        riskScore += 5;
      }
      
      // 根據案件類型評估風險
      if (caseType.includes('金融犯罪') || content.includes('詐欺') || content.includes('背信')) {
        riskScore += 30;
        details.push('涉及金融犯罪或詐欺背信案件');
      }
      
      if (content.includes('違反證券交易法') || caseType.includes('證券')) {
        riskScore += 25;
        details.push('違反證券交易法');
      }
      
      if (content.includes('洗錢') || content.includes('洗錢防制法')) {
        riskScore += 35;
        details.push('涉及洗錢相關案件');
      }
      
      if (content.includes('稅捐') || content.includes('逃漏稅')) {
        riskScore += 15;
        details.push('稅務相關爭議');
      }
      
      if (content.includes('勞動基準法') || content.includes('勞資爭議') || caseType.includes('勞資')) {
        riskScore += 10;
        details.push('勞資爭議案件');
      }
      
      if (caseType.includes('智慧財產權')) {
        riskScore += 8;
        details.push('智慧財產權爭議');
      }
      
      if (caseType.includes('民事')) {
        riskScore += 3;
        details.push('一般民事糾紛');
      }
    });

    // 判決數量也影響風險評估
    if (judgments.length > 5) {
      riskScore += 10;
      details.push(`多起判決記錄 (${judgments.length} 件)`);
    }

    let finalRiskLevel = 'LOW';
    if (riskScore >= 50) {
      finalRiskLevel = 'HIGH';
    } else if (riskScore >= 20) {
      finalRiskLevel = 'MEDIUM';
    }

    return {
      riskLevel: finalRiskLevel,
      riskScore: Math.min(riskScore, 100),
      summary: this.getRiskSummary(finalRiskLevel, judgments.length),
      details: [...new Set(details)] // 去重
    };
  }

  getRiskSummary(riskLevel, count) {
    switch (riskLevel) {
      case 'HIGH':
        return `高風險：發現 ${count} 件判決記錄，包含重大法律爭議`;
      case 'MEDIUM':
        return `中等風險：發現 ${count} 件判決記錄，需要進一步評估`;
      case 'LOW':
      default:
        return count > 0 
          ? `低風險：發現 ${count} 件判決記錄，多為一般民事或行政爭議`
          : '低風險：無相關判決書記錄';
    }
  }
}

module.exports = new JudicialService();