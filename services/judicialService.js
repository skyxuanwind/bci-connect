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
      
      // 司法院開放資料平台的裁判書是按月份分檔的 RAR 格式
      // 無法直接進行全文搜尋，這裡提供模擬搜尋結果
      console.log(`模擬搜尋公司 ${companyName} 的判決書資料...`);
      
      // 根據公司名稱生成模擬的風險評估
      const mockJudgments = this.generateMockJudgmentData(companyName);
      
      return {
        success: true,
        judgments: mockJudgments,
        data: mockJudgments,
        total: mockJudgments.length,
        companyName: companyName,
        note: '由於司法院開放資料為檔案格式，此為基於公司規模和產業的風險評估模擬'
      };
    } catch (error) {
      console.error(`搜尋公司 ${companyName} 判決書失敗:`, error.message);
      return {
        success: false,
        error: error.message,
        judgments: [],
        data: [],
        total: 0,
        companyName: companyName
      };
    }
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