const { pool } = require('../config/database');
const judicialService = require('./judicialService');
const cron = require('node-cron');
const JudicialService = require('./judicialService');

// 創建 JudicialService 實例
const judicialServiceInstance = new JudicialService();

class JudgmentSyncService {
  constructor() {
    this.isRunning = false;
    this.currentSyncId = null;
  }

  /**
   * 檢查司法院 API 是否可用（凌晨 0-6 點）
   */
  isApiAvailable() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 0 && hour < 6;
  }

  /**
   * 開始同步作業
   */
  async startSync() {
    if (this.isRunning) {
      console.log('⚠️ 同步作業已在進行中，跳過此次執行');
      return;
    }

    if (!this.isApiAvailable()) {
      console.log('⚠️ 司法院 API 服務時間為凌晨 0-6 點，當前時間不可用');
      return;
    }

    this.isRunning = true;
    const syncDate = new Date().toISOString().split('T')[0];
    
    try {
      // 創建同步日誌記錄
      const logResult = await pool.query(
        `INSERT INTO judgment_sync_logs (sync_date, status, started_at) 
         VALUES ($1, 'running', CURRENT_TIMESTAMP) 
         ON CONFLICT (sync_date) DO UPDATE SET 
         status = 'running', started_at = CURRENT_TIMESTAMP, error_message = NULL
         RETURNING id`,
        [syncDate]
      );
      
      this.currentSyncId = logResult.rows[0].id;
      console.log(`🚀 開始裁判書同步作業 (ID: ${this.currentSyncId})`);

      // 獲取最新的裁判書清單
      const jidListResult = await judicialServiceInstance.getRecentJudgmentsList();
      
      if (!jidListResult.success) {
        throw new Error(`獲取裁判書清單失敗: ${jidListResult.message}`);
      }

      const jidList = jidListResult.data || [];
      console.log(`📋 獲取到 ${jidList.length} 筆裁判書 JID`);

      let totalFetched = 0;
      let newRecords = 0;
      let updatedRecords = 0;
      let errors = 0;

      // 批次處理裁判書內容
      const batchSize = 10; // 每批處理 10 筆
      for (let i = 0; i < jidList.length; i += batchSize) {
        const batch = jidList.slice(i, i + batchSize);
        console.log(`📦 處理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(jidList.length/batchSize)} (${batch.length} 筆)`);
        
        const batchResults = await Promise.allSettled(
          batch.map(jid => this.processJudgment(jid))
        );

        // 統計批次結果
        batchResults.forEach((result, index) => {
          totalFetched++;
          if (result.status === 'fulfilled') {
            if (result.value === 'new') newRecords++;
            else if (result.value === 'updated') updatedRecords++;
          } else {
            errors++;
            console.error(`❌ 處理 JID ${batch[index]} 失敗:`, result.reason?.message || result.reason);
          }
        });

        // 更新進度
        await this.updateSyncProgress(totalFetched, newRecords, updatedRecords, errors);
        
        // 避免 API 請求過於頻繁，每批次間隔 2 秒
        if (i + batchSize < jidList.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 完成同步
      await pool.query(
        `UPDATE judgment_sync_logs SET 
         status = 'completed', 
         total_fetched = $1, 
         new_records = $2, 
         updated_records = $3, 
         errors = $4, 
         completed_at = CURRENT_TIMESTAMP 
         WHERE id = $5`,
        [totalFetched, newRecords, updatedRecords, errors, this.currentSyncId]
      );

      console.log(`✅ 裁判書同步完成！`);
      console.log(`📊 統計: 總計 ${totalFetched} 筆，新增 ${newRecords} 筆，更新 ${updatedRecords} 筆，錯誤 ${errors} 筆`);

    } catch (error) {
      console.error('❌ 同步作業失敗:', error);
      
      if (this.currentSyncId) {
        await pool.query(
          `UPDATE judgment_sync_logs SET 
           status = 'failed', 
           error_message = $1, 
           completed_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [error.message, this.currentSyncId]
        );
      }
    } finally {
      this.isRunning = false;
      this.currentSyncId = null;
    }
  }

  /**
   * 處理單筆裁判書
   */
  async processJudgment(jid) {
    try {
      // 檢查是否已存在
      const existingResult = await pool.query(
        'SELECT id, updated_at FROM judgments WHERE jid = $1',
        [jid]
      );

      // 獲取裁判書內容
      const judgmentContent = await judicialServiceInstance.getJudgmentByJid(jid);
      
      if (!judgmentContent) {
        throw new Error('無法獲取裁判書內容');
      }

      // 解析裁判書資料
      const parsedData = this.parseJudgmentData(judgmentContent, jid);
      
      if (existingResult.rows.length > 0) {
        // 更新現有記錄
        await pool.query(
          `UPDATE judgments SET 
           case_number = $1, judgment_date = $2, case_type = $3, 
           court_name = $4, judgment_content = $5, parties = $6, 
           summary = $7, risk_level = $8, raw_data = $9, 
           updated_at = CURRENT_TIMESTAMP 
           WHERE jid = $10`,
          [
            parsedData.caseNumber, parsedData.judgmentDate, parsedData.caseType,
            parsedData.courtName, parsedData.judgmentContent, parsedData.parties,
            parsedData.summary, parsedData.riskLevel, JSON.stringify(judgmentContent),
            jid
          ]
        );
        return 'updated';
      } else {
        // 新增記錄
        await pool.query(
          `INSERT INTO judgments 
           (jid, case_number, judgment_date, case_type, court_name, 
            judgment_content, parties, summary, risk_level, raw_data) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            jid, parsedData.caseNumber, parsedData.judgmentDate, parsedData.caseType,
            parsedData.courtName, parsedData.judgmentContent, parsedData.parties,
            parsedData.summary, parsedData.riskLevel, JSON.stringify(judgmentContent)
          ]
        );
        return 'new';
      }
    } catch (error) {
      throw new Error(`處理 JID ${jid} 失敗: ${error.message}`);
    }
  }

  /**
   * 解析裁判書資料
   */
  parseJudgmentData(judgmentContent, jid) {
    const data = {
      caseNumber: null,
      judgmentDate: null,
      caseType: null,
      courtName: null,
      judgmentContent: null,
      parties: null,
      summary: null,
      riskLevel: 'MEDIUM'
    };

    try {
      // 解析案號
      if (judgmentContent.JCASE) {
        data.caseNumber = judgmentContent.JCASE;
      }

      // 解析判決日期
      if (judgmentContent.JDATE) {
        const dateStr = judgmentContent.JDATE.toString();
        if (dateStr.length === 7) {
          // 民國年格式 1130101 -> 2024-01-01
          const year = parseInt(dateStr.substring(0, 3)) + 1911;
          const month = dateStr.substring(3, 5);
          const day = dateStr.substring(5, 7);
          data.judgmentDate = `${year}-${month}-${day}`;
        }
      }

      // 解析案件類型
      if (judgmentContent.JCASE) {
        const caseStr = judgmentContent.JCASE;
        if (caseStr.includes('民事')) data.caseType = '民事';
        else if (caseStr.includes('刑事')) data.caseType = '刑事';
        else if (caseStr.includes('行政')) data.caseType = '行政';
        else data.caseType = '其他';
      }

      // 解析法院名稱
      if (judgmentContent.JCOURT) {
        data.courtName = judgmentContent.JCOURT;
      }

      // 解析判決內容
      if (judgmentContent.JFULL) {
        data.judgmentContent = judgmentContent.JFULL.substring(0, 5000); // 限制長度
        
        // 生成摘要
        data.summary = this.generateSummary(judgmentContent.JFULL);
        
        // 評估風險等級
        data.riskLevel = this.assessRiskLevel(judgmentContent.JFULL);
      }

      // 解析當事人
      if (judgmentContent.JFULL) {
        data.parties = this.extractParties(judgmentContent.JFULL);
      }

    } catch (error) {
      console.error(`解析裁判書 ${jid} 資料時發生錯誤:`, error);
    }

    return data;
  }

  /**
   * 生成判決書摘要
   */
  generateSummary(fullText) {
    if (!fullText) return null;
    
    // 簡單的摘要生成：取前 200 字
    const summary = fullText.substring(0, 200).replace(/\s+/g, ' ').trim();
    return summary + (fullText.length > 200 ? '...' : '');
  }

  /**
   * 評估風險等級
   */
  assessRiskLevel(fullText) {
    if (!fullText) return 'MEDIUM';
    
    const content = fullText.toLowerCase();
    const highRiskKeywords = ['詐欺', '背信', '侵占', '洗錢', '重大違法', '刑事責任'];
    const mediumRiskKeywords = ['違約', '債務', '糾紛', '賠償', '損害'];
    
    const highRiskCount = highRiskKeywords.filter(keyword => content.includes(keyword)).length;
    const mediumRiskCount = mediumRiskKeywords.filter(keyword => content.includes(keyword)).length;
    
    if (highRiskCount >= 2) return 'HIGH';
    if (highRiskCount >= 1 || mediumRiskCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 提取當事人資訊
   */
  extractParties(fullText) {
    if (!fullText) return null;
    
    // 簡單的當事人提取邏輯
    const parties = [];
    const lines = fullText.split('\n');
    
    for (const line of lines.slice(0, 20)) { // 只檢查前 20 行
      if (line.includes('原告') || line.includes('被告') || line.includes('上訴人') || line.includes('被上訴人')) {
        parties.push(line.trim());
      }
    }
    
    return parties.length > 0 ? parties.join('; ') : null;
  }

  /**
   * 更新同步進度
   */
  async updateSyncProgress(totalFetched, newRecords, updatedRecords, errors) {
    if (this.currentSyncId) {
      await pool.query(
        `UPDATE judgment_sync_logs SET 
         total_fetched = $1, new_records = $2, updated_records = $3, errors = $4 
         WHERE id = $5`,
        [totalFetched, newRecords, updatedRecords, errors, this.currentSyncId]
      );
    }
  }

  /**
   * 啟動定時任務
   */
  startScheduler() {
    // 每天凌晨 1:00 執行同步
    cron.schedule('0 1 * * *', () => {
      console.log('⏰ 定時任務觸發：開始裁判書同步');
      this.startSync();
    }, {
      timezone: 'Asia/Taipei'
    });

    // 每天凌晨 3:00 執行同步（備用）
    cron.schedule('0 3 * * *', () => {
      if (!this.isRunning) {
        console.log('⏰ 備用定時任務觸發：開始裁判書同步');
        this.startSync();
      }
    }, {
      timezone: 'Asia/Taipei'
    });

    console.log('📅 裁判書同步排程已啟動：');
    console.log('   - 主要同步時間：每天凌晨 1:00');
    console.log('   - 備用同步時間：每天凌晨 3:00');
  }

  /**
   * 手動觸發同步（用於測試）
   */
  async manualSync() {
    console.log('🔧 手動觸發同步作業');
    await this.startSync();
  }

  /**
   * 獲取同步狀態
   */
  async getSyncStatus() {
    const result = await pool.query(
      `SELECT * FROM judgment_sync_logs 
       ORDER BY sync_date DESC LIMIT 10`
    );
    return result.rows;
  }

  /**
   * 搜尋裁判書（從本地資料庫）
   */
  async searchJudgments(query, options = {}) {
    const { limit = 20, offset = 0, riskLevel, caseType, dateFrom, dateTo } = options;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // 全文搜尋
    if (query) {
      whereConditions.push(`(
        judgment_content ILIKE $${paramIndex} OR 
        case_number ILIKE $${paramIndex} OR 
        parties ILIKE $${paramIndex} OR 
        summary ILIKE $${paramIndex}
      )`);
      params.push(`%${query}%`);
      paramIndex++;
    }

    // 風險等級篩選
    if (riskLevel) {
      whereConditions.push(`risk_level = $${paramIndex}`);
      params.push(riskLevel);
      paramIndex++;
    }

    // 案件類型篩選
    if (caseType) {
      whereConditions.push(`case_type = $${paramIndex}`);
      params.push(caseType);
      paramIndex++;
    }

    // 日期範圍篩選
    if (dateFrom) {
      whereConditions.push(`judgment_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`judgment_date <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 查詢總數
    const countQuery = `SELECT COUNT(*) FROM judgments ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // 查詢資料
    const dataQuery = `
      SELECT id, jid, case_number, judgment_date, case_type, court_name, 
             parties, summary, risk_level, created_at, updated_at
      FROM judgments 
      ${whereClause}
      ORDER BY judgment_date DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);

    return {
      success: true,
      data: dataResult.rows,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }
}

module.exports = new JudgmentSyncService();