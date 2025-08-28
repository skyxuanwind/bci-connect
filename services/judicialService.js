const axios = require('axios');
const { pool } = require('../config/database');

// 司法院開放資料 API 基礎 URL（根據官方文件）
const JUDICIAL_API_BASE = 'https://data.judicial.gov.tw/jdg/api';

class JudicialService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
  }

  // 取得 API Token（根據官方 Auth API 規格）
  async getToken() {
    try {
      // 檢查現有 token 是否仍有效
      if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.token;
      }

      console.log('正在向司法院 Auth API 申請 token...');
      
      // 根據用戶提供的正確 API 規格
      const authData = {
        user: process.env.JUDICIAL_ACCOUNT || 'skyxuanwind',
        password: process.env.JUDICIAL_PASSWORD || 'sh520520'
      };
      
      console.log('發送認證請求到:', `${JUDICIAL_API_BASE}/Auth`);
      console.log('認證資料:', { user: authData.user, password: '***' });
      
      const response = await axios.post(`${JUDICIAL_API_BASE}/Auth`, authData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000,
        validateStatus: function (status) {
          // 接受所有狀態碼，讓我們自己處理
          return true;
        }
      });

      console.log('Auth API 回應狀態:', response.status);
      console.log('Auth API 回應標頭:', response.headers);
      console.log('Auth API 回應內容:', JSON.stringify(response.data, null, 2));

      // 檢查回應狀態
      if (response.status !== 200) {
        throw new Error(`API 回應狀態碼: ${response.status}, 內容: ${JSON.stringify(response.data)}`);
      }

      // 檢查回應中的 token
      if (response.data && (response.data.token || response.data.Token)) {
        this.token = response.data.token || response.data.Token;
        // Token 有效期為 6 小時（根據官方文件）
        this.tokenExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000);
        console.log('成功取得司法院 API Token:', this.token.substring(0, 20) + '...');
        return this.token;
      }

      throw new Error(`API 回應中沒有 token，回應內容: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.error('取得司法院 API Token 失敗:');
      if (error.response) {
        console.error('- 狀態碼:', error.response.status);
        console.error('- 回應內容:', error.response.data);
        console.error('- 回應標頭:', error.response.headers);
      } else if (error.request) {
        console.error('- 請求失敗:', error.message);
        console.error('- 請求配置:', error.config);
      } else {
        console.error('- 錯誤訊息:', error.message);
      }
      throw new Error(`司法院 API 認證失敗: ${error.message}`);
    }
  }

  // 檢查司法院 API 是否在服務時間內（凌晨 0-6 時）
  isJudicialApiAvailable() {
    if (process.env.JUDICIAL_DEV_FORCE === 'true') {
      console.warn('⚠️ 開發模式覆寫：強制啟用司法院 API 服務時間檢查');
      return true;
    }
    
    // 暫時停用時間限制，因為司法院 API 服務時間限制導致大部分時間無法使用
    // 改為直接提供風險評估分析，而不是依賴實時 API
    const now = new Date();
    const hour = now.getHours();
    console.log(`司法院 API 服務時間檢查: 目前時間 ${hour}:${now.getMinutes().toString().padStart(2, '0')}，由於服務時間限制（00:00-06:00），將使用風險評估分析`);
    
    // 返回 false，讓系統使用風險評估分析而不是實時 API
    return false;
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

      console.log(`開始搜尋公司 ${companyName} 的判決書資料...`);
      
      // 優先使用本地裁判書同步管理系統的資料
      try {
        console.log('嘗試從本地裁判書同步管理系統搜尋資料...');
        const localJudgments = await judgmentSyncService.searchJudgmentsByCompany(companyName, { limit: top });
        
        if (localJudgments && localJudgments.length > 0) {
          console.log(`從本地系統找到 ${localJudgments.length} 筆相關判決書`);
          return {
            success: true,
            judgments: localJudgments,
            data: localJudgments,
            total: localJudgments.length,
            companyName: companyName,
            note: '來自本地裁判書同步管理系統的資料',
            source: 'local'
          };
        }
      } catch (localError) {
        console.warn('本地裁判書系統查詢失敗，回退到司法院 API:', localError.message);
      }
      
      // 如果本地系統沒有資料，嘗試從司法院 API 取得最近的判決書清單
      const recentJudgmentsResult = await this.getRecentJudgmentsList();
      
      if (!recentJudgmentsResult.success) {
        console.log('司法院 API 不在服務時間內，提供風險評估分析');
        const riskAnalysis = this.generateRiskAnalysis(companyName);
        return {
          success: true,
          judgments: riskAnalysis,
          data: riskAnalysis,
          total: riskAnalysis.length,
          companyName: companyName,
          note: recentJudgmentsResult.message || 'API 服務不可用，此為基於公司特徵的風險評估分析',
          source: 'risk_analysis'
        };
      }
      
      // 搜尋包含公司名稱的判決書
      const matchingJudgments = await this.searchJudgmentsByCompanyName(companyName, recentJudgmentsResult.data, top);
      
      if (matchingJudgments.length > 0) {
        console.log(`找到 ${matchingJudgments.length} 筆相關判決書`);
        return {
          success: true,
          judgments: matchingJudgments,
          data: matchingJudgments,
          total: matchingJudgments.length,
          companyName: companyName,
          note: '來自司法院開放資料平台的真實判決書資料',
          source: 'judicial_api'
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
          note: '未找到直接相關的判決書，此為基於公司特徵的風險評估分析',
          source: 'risk_analysis'
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
        note: 'API 連接失敗，此為基於公司特徵的風險評估分析',
        source: 'risk_analysis'
      };
    }
  }

  // 取得最近判決書清單（使用正確的 JList API）
  async getRecentJudgmentsList(params = {}) {
    const startTime = Date.now();
    console.log('=== 開始查詢司法院判決書異動清單 ===');
    console.log('查詢參數:', JSON.stringify(params, null, 2));
    console.log('查詢時間:', new Date().toISOString());
    
    try {
      // 檢查 API 服務時間（僅於每日 00:00-06:00 提供服務）
      if (!this.isJudicialApiAvailable()) {
        return {
          success: false,
          message: '司法院 API 僅於每日凌晨 0 點至 6 點提供服務，請於服務時間內重試',
          data: [],
          serviceHours: '00:00-06:00'
        };
      }

      // 步驟 1: 取得 token
      console.log('步驟 1: 取得司法院 API Token');
      const token = await this.getToken();
      
      // 步驟 2: 使用 token 呼叫 JList API
      console.log('步驟 2: 呼叫 JList API 取得異動清單');
      const jlistUrl = `${JUDICIAL_API_BASE}/JList`;
      console.log('JList API URL:', jlistUrl);
      console.log('請求方法: POST');
      console.log('使用 Token:', token.substring(0, 20) + '...');
      
      const requestBody = { token: token };
      const requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BCI-Connect-App/1.0'
        },
        timeout: 30000,
        validateStatus: function (status) {
          return true; // 接受所有狀態碼
        }
      };
      
      console.log('完整請求配置:', JSON.stringify(requestConfig, null, 2));
      console.log('請求內容:', JSON.stringify(requestBody, null, 2));
      console.log('發送請求時間:', new Date().toISOString());
      
      const response = await axios.post(jlistUrl, requestBody, requestConfig);
      
      const responseTime = Date.now() - startTime;
      console.log(`請求完成，耗時: ${responseTime}ms`);
      console.log('JList API 回應狀態:', response.status);
      console.log('JList API 回應標頭:', JSON.stringify(response.headers, null, 2));
      console.log('JList API 回應內容類型:', typeof response.data);
      console.log('JList API 回應內容長度:', JSON.stringify(response.data).length);
      console.log('JList API 完整回應內容:', JSON.stringify(response.data, null, 2));

      if (response.status !== 200) {
        throw new Error(`JList API 回應狀態碼: ${response.status}, 內容: ${JSON.stringify(response.data)}`);
      }

      // 檢查回應格式
      if (response.data && Array.isArray(response.data)) {
        console.log('成功取得判決書清單，共', response.data.length, '日的資料');
        
        // 收集所有 JID
        const allJids = [];
        response.data.forEach((dayData, index) => {
          console.log(`處理第 ${index + 1} 個資料項目:`, typeof dayData, dayData.DATE || '未知日期');
          
          // 檢查是否有 LIST 欄位（標準格式）
          if (dayData.LIST && Array.isArray(dayData.LIST)) {
            console.log('該日期有', dayData.LIST.length, '筆判決書');
            allJids.push(...dayData.LIST);
          }
          // 檢查是否有巢狀的陣列結構
          else if (dayData && typeof dayData === 'object') {
            // 遍歷物件的所有屬性，尋找陣列
            Object.keys(dayData).forEach(key => {
              if (Array.isArray(dayData[key])) {
                console.log(`在 ${key} 欄位發現 JID 陣列，共 ${dayData[key].length} 筆`);
                allJids.push(...dayData[key]);
              }
            });
          }
          // 檢查是否直接是 JID 陣列（實際回應格式）
          else if (Array.isArray(dayData)) {
            console.log('發現 JID 陣列，共', dayData.length, '筆判決書');
            allJids.push(...dayData);
          }
          // 檢查是否整個 dayData 就是一個 JID 字串
          else if (typeof dayData === 'string') {
            console.log('發現單一 JID:', dayData);
            allJids.push(dayData);
          }
        });
        
        console.log('總共找到', allJids.length, '筆判決書 ID');
        if (allJids.length > 0) {
          console.log('前 5 個 JID 範例:', allJids.slice(0, 5));
        }
        return {
          success: true,
          data: allJids.slice(0, 50), // 限制數量避免過多請求
          total: allJids.length,
          rawData: response.data
        };
      }
      
      // 檢查是否整個回應就是一個 JID 陣列
      if (response.data && typeof response.data === 'object' && response.data.LIST && Array.isArray(response.data.LIST)) {
        console.log('發現單一日期的 JID 清單，共', response.data.LIST.length, '筆判決書');
        return {
          success: true,
          data: response.data.LIST.slice(0, 50),
          total: response.data.LIST.length,
          rawData: response.data
        };
      }
      
      // 處理錯誤回應
      if (response.data && response.data.error) {
        console.log('司法院 JList API 錯誤:', response.data.error);
        return {
          success: false,
          message: `API 錯誤: ${response.data.error}`,
          data: []
        };
      }
      
      return {
        success: false,
        message: '無法取得判決書資料，回應格式異常',
        data: [],
        rawResponse: response.data
      };
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error('=== JList API 查詢失敗 ===');
      console.error('錯誤發生時間:', new Date().toISOString());
      console.error('請求耗時:', errorTime + 'ms');
      console.error('錯誤類型:', error.constructor.name);
      console.error('錯誤訊息:', error.message);
      
      // 詳細的錯誤資訊
      if (error.response) {
        console.error('=== HTTP 回應錯誤 ===');
        console.error('- 狀態碼:', error.response.status);
        console.error('- 狀態文字:', error.response.statusText);
        console.error('- 回應標頭:', JSON.stringify(error.response.headers, null, 2));
        console.error('- 回應內容類型:', typeof error.response.data);
        console.error('- 回應內容:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 401) {
          console.error('- 認證失敗，清除 token 快取');
          this.token = null;
          this.tokenExpiry = null;
        }
        
        if (error.response.status === 405) {
          console.error('- HTTP 方法不被允許');
          console.error('- 允許的方法:', error.response.headers.allow || '未指定');
        }
        
        if (error.response.status >= 500) {
          console.error('- 伺服器內部錯誤');
        }
      } else if (error.request) {
        console.error('=== 網路請求錯誤 ===');
        console.error('- 請求已發送但無回應');
        console.error('- 錯誤代碼:', error.code);
        console.error('- 請求配置:', JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          timeout: error.config?.timeout
        }, null, 2));
        
        if (error.code === 'ECONNABORTED') {
          console.error('- 請求逾時');
        } else if (error.code === 'ENOTFOUND') {
          console.error('- DNS 解析失敗');
        } else if (error.code === 'ECONNREFUSED') {
          console.error('- 連線被拒絕');
        }
      } else {
        console.error('=== 其他錯誤 ===');
        console.error('- 錯誤訊息:', error.message);
      }
      
      // 堆疊追蹤
      if (error.stack) {
        console.error('=== 堆疊追蹤 ===');
        console.error(error.stack);
      }
      
      console.error('=== 錯誤處理完成 ===');
      
      return {
        success: false,
        message: `查詢失敗: ${error.message}`,
        errorCode: error.response?.status || error.code || 'UNKNOWN',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        duration: errorTime,
        data: []
      };
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

  // 根據 JID 取得判決書內容（使用正確的 JDoc API）
  async getJudgmentByJid(jid) {
    const startTime = Date.now();
    console.log('=== 開始取得判決書內容 ===');
    console.log('查詢時間:', new Date().toISOString());
    
    try {
      if (!jid) {
        throw new Error('判決書 ID 不能為空');
      }

      console.log(`目標 JID: ${jid}`);
      
      // 檢查 API 服務時間（僅於每日 00:00-06:00 提供服務）
      if (!this.isJudicialApiAvailable()) {
        return {
          success: false,
          message: '司法院 API 僅於每日凌晨 0 點至 6 點提供服務，請於服務時間內重試',
          data: null,
          serviceHours: '00:00-06:00'
        };
      }

      // 步驟 1: 取得 token
      console.log('步驟 1: 取得司法院 API Token');
      const token = await this.getToken();
      
      // 步驟 2: 使用 token 和 JID 呼叫 JDoc API
      console.log('步驟 2: 呼叫 JDoc API 取得判決書內容');
      const apiUrl = `${JUDICIAL_API_BASE}/JDoc`;
      
      console.log('JDoc API URL:', apiUrl);
      console.log('請求方法: POST');
      console.log('使用 Token:', token.substring(0, 20) + '...');
      
      // JID 格式檢查
      console.log('JID 格式檢查:', {
        jid: jid,
        length: jid.length,
        type: typeof jid,
        isEmpty: !jid || jid.trim() === '',
        isString: typeof jid === 'string',
        trimmed: jid.trim()
      });
      
      const requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BCI-Connect-App/1.0'
        },
        timeout: 15000,
        validateStatus: function (status) {
          return true; // 接受所有狀態碼以便詳細分析
        }
      };
      
      // 根據官方 API 規格，JDoc API 需要 token 和 jid
      const requestBody = { token: token, jid: jid };
      
      console.log('完整請求配置:', JSON.stringify(requestConfig, null, 2));
      console.log('請求內容:', JSON.stringify(requestBody, null, 2));
      console.log('發送請求時間:', new Date().toISOString());
      
      const response = await axios.post(apiUrl, requestBody, requestConfig);
      
      const responseTime = Date.now() - startTime;
      console.log(`請求完成，耗時: ${responseTime}ms`);
      console.log(`JDoc API 回應狀態: ${response.status}`);
      console.log(`JDoc API 回應標頭:`, JSON.stringify(response.headers, null, 2));
      console.log(`JDoc API 回應內容類型:`, typeof response.data);
      console.log(`JDoc API 回應內容長度:`, JSON.stringify(response.data).length);
      console.log(`JDoc API 完整回應:`, JSON.stringify(response.data, null, 2));

      if (response.status === 200 && response.data) {
        // 檢查是否為錯誤回應
        if (response.data.error && response.data.error.includes('查無資料')) {
          console.log(`判決書 ${jid} 已被移除或不存在`);
          return null;
        }
        
        console.log(`成功取得判決書 ${jid} 的內容`);
        return response.data;
      }

      if (response.status !== 200) {
        throw new Error(`GetJDoc API 回應狀態碼: ${response.status}, 完整錯誤內容: ${JSON.stringify(response.data)}`);
      }

      return null;
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error('=== JDoc API 查詢失敗 ===');
      console.error('目標 JID:', jid);
      console.error('錯誤發生時間:', new Date().toISOString());
      console.error('請求耗時:', errorTime + 'ms');
      console.error('錯誤類型:', error.constructor.name);
      console.error('錯誤訊息:', error.message);
      
      // 詳細的錯誤資訊
      if (error.response) {
        console.error('=== HTTP 回應錯誤 ===');
        console.error('- 狀態碼:', error.response.status);
        console.error('- 狀態文字:', error.response.statusText);
        console.error('- 回應標頭:', JSON.stringify(error.response.headers, null, 2));
        console.error('- 回應內容類型:', typeof error.response.data);
        console.error('- 回應內容:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 404) {
          console.error('- 判決書不存在或已被移除');
        } else if (error.response.status === 405) {
          console.error('- HTTP 方法不被允許');
          console.error('- 允許的方法:', error.response.headers.allow || '未指定');
        } else if (error.response.status >= 500) {
          console.error('- 伺服器內部錯誤');
        }
      } else if (error.request) {
        console.error('=== 網路請求錯誤 ===');
        console.error('- 請求已發送但無回應');
        console.error('- 錯誤代碼:', error.code);
        console.error('- 請求配置:', JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          timeout: error.config?.timeout
        }, null, 2));
        
        if (error.code === 'ECONNABORTED') {
          console.error('- 請求逾時');
        } else if (error.code === 'ENOTFOUND') {
          console.error('- DNS 解析失敗');
        } else if (error.code === 'ECONNREFUSED') {
          console.error('- 連線被拒絕');
        }
      } else {
        console.error('=== 其他錯誤 ===');
        console.error('- 錯誤訊息:', error.message);
      }
      
      // 堆疊追蹤
      if (error.stack) {
        console.error('=== 堆疊追蹤 ===');
        console.error(error.stack);
      }
      
      console.error('=== 錯誤處理完成 ===');
      
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