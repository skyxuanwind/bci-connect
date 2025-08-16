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

      const token = await this.getToken();
      
      // 先取得判決書相關的資料源 ID
      const categories = await this.getCategories();
      const judgmentCategory = categories.find(cat => 
        cat.categoryName && cat.categoryName.includes('判決')
      );

      if (!judgmentCategory) {
        throw new Error('找不到判決書相關分類');
      }

      const resources = await this.getResourcesByCategory(judgmentCategory.categoryNo);
      const judgmentResource = resources.find(res => 
        res.resourceName && res.resourceName.includes('判決')
      );

      if (!judgmentResource) {
        throw new Error('找不到判決書資料源');
      }

      // 搜尋包含公司名稱的判決書
      const searchUrl = `${JUDICIAL_API_BASE}/api/FilesetLists/${judgmentResource.fileSetId}/file`;
      const response = await axios.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          $top: top,
          $skip: skip,
          $format: format,
          $filter: `contains(判決內容,'${companyName}')`
        }
      });

      return {
        success: true,
        data: response.data,
        total: response.data.length || 0,
        companyName: companyName
      };
    } catch (error) {
      console.error(`搜尋公司 ${companyName} 判決書失敗:`, error.message);
      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        companyName: companyName
      };
    }
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
      
      if (content.includes('詐欺') || content.includes('背信')) {
        riskScore += 30;
        details.push('涉及詐欺或背信案件');
      }
      
      if (content.includes('違反證券交易法')) {
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
      
      if (content.includes('勞動基準法') || content.includes('勞資爭議')) {
        riskScore += 10;
        details.push('勞資爭議案件');
      }
    });

    // 判決數量也影響風險評估
    if (judgments.length > 5) {
      riskScore += 10;
      details.push(`多起判決記錄 (${judgments.length} 件)`);
    }

    let riskLevel = 'LOW';
    if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 20) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskLevel,
      riskScore: Math.min(riskScore, 100),
      summary: this.getRiskSummary(riskLevel, judgments.length),
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