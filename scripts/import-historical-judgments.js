const { pool } = require('../config/database');
const judicialService = require('../services/judicialService');
const judgmentSyncService = require('../services/judgmentSyncService');

/**
 * 歷史判決書批量導入腳本
 * 用於從司法院API導入網路上舊的判決書資料
 */
class HistoricalJudgmentImporter {
  constructor() {
    this.isRunning = false;
    this.importStats = {
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      errors: 0,
      currentBatch: 0,
      totalBatches: 0,
      currentBatchSize: 0,
      currentBatchProcessed: 0
    };
    
    // 配置參數
    this.CONFIG = {
      BATCH_SIZE: 50,           // 每批次處理的判決書數量
      MAX_BATCHES: 10,          // 最大批次數
      DELAY_BETWEEN_REQUESTS: 100, // 請求間延遲 (毫秒)
      DELAY_BETWEEN_BATCHES: 2000,  // 批次間延遲 (毫秒)
      MAX_RETRIES: 3,           // 最大重試次數
      RETRY_DELAY: 1000         // 重試延遲 (毫秒)
    };
  }

  // 單例模式
  static getInstance() {
    if (!HistoricalJudgmentImporter.instance) {
      HistoricalJudgmentImporter.instance = new HistoricalJudgmentImporter();
    }
    return HistoricalJudgmentImporter.instance;
  }

  /**
   * 開始歷史資料導入
   * @param {Object} options 導入選項
   * @param {number} options.batchSize 每批處理數量
   * @param {number} options.maxBatches 最大批次數
   * @param {number} options.delayMs 批次間延遲時間(毫秒)
   * @param {boolean} options.force 是否強制忽略 API 服務時間限制
   */
  async startImport(options = {}) {
    const {
      batchSize = 50,
      maxBatches = 20,
      delayMs = 3000,
      force = false,
    } = options;

    // 記錄強制模式狀態，供後續請求使用
    this.forceFlag = !!force;

    if (this.isRunning) {
      console.log('⚠️ 歷史資料導入已在進行中');
      return;
    }

    // 檢查API服務時間（可被 force 覆寫）
    if (!this.isApiAvailable() && !force) {
      console.log('⚠️ 司法院 API 服務時間為凌晨 0-6 點，當前時間不可用');
      console.log('💡 如需強制執行，請設置環境變量 JUDICIAL_DEV_FORCE=true 或在啟動時傳入 { force: true }');
      return;
    }

    if (force && !this.isApiAvailable()) {
      console.warn('⚠️ 已啟用強制導入：忽略 API 服務時間限制');
    }

    this.isRunning = true;
    console.log('🚀 開始歷史判決書批量導入');
    console.log(`📋 導入參數: 批次大小=${batchSize}, 最大批次=${maxBatches}, 延遲=${delayMs}ms, 強制=${force}`);

    try {
      // 重置統計
      this.resetStats();
      this.importStats.totalBatches = maxBatches;

      // 多批次獲取判決書清單
      for (let batchIndex = 0; batchIndex < maxBatches; batchIndex++) {
        this.importStats.currentBatch = batchIndex + 1;
        console.log(`\n📦 處理批次 ${batchIndex + 1}/${maxBatches}`);
        
        // 重置當前批次進度
        this.importStats.currentBatchProcessed = 0;
        
        try {
          // 獲取判決書清單（傳遞強制模式）
          const jidListResult = await judicialService.getRecentJudgmentsList({ force: this.forceFlag });
          
          if (!jidListResult.success) {
            console.warn(`⚠️ 批次 ${batchIndex + 1} 獲取清單失敗: ${jidListResult.message}`);
            continue;
          }

          const jidList = jidListResult.data || [];
          console.log(`📋 批次 ${batchIndex + 1} 獲取到 ${jidList.length} 筆 JID`);

          if (jidList.length === 0) {
            console.log('📭 本批次無新資料，結束導入');
            break;
          }

          // 處理本批次的判決書
          const currentBatchJids = jidList.slice(0, batchSize);
          this.importStats.currentBatchSize = currentBatchJids.length;
          await this.processBatch(currentBatchJids, batchIndex + 1, maxBatches);

          // 批次間延遲
          if (batchIndex < maxBatches - 1) {
            console.log(`⏳ 等待 ${delayMs}ms 後處理下一批次...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

        } catch (batchError) {
          console.error(`❌ 批次 ${batchIndex + 1} 處理失敗:`, batchError.message);
          this.importStats.errors++;
          continue;
        }
      }

      // 顯示最終統計
      this.showFinalStats();

    } catch (error) {
      console.error('❌ 歷史資料導入失敗:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 處理單個批次的判決書
   */
  async processBatch(jidList, batchNumber = 1, totalBatches = 1) {
    console.log(`\n🔄 開始處理第 ${batchNumber}/${totalBatches} 批次 (${jidList.length} 筆)`);
    
    const batchStats = {
      processed: 0,
      new: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    for (let i = 0; i < jidList.length; i++) {
      const jid = jidList[i];
      console.log(`[${i + 1}/${jidList.length}] 處理 ${jid}`);
      
      const result = await this.processJudgment(jid);
      
      switch (result) {
        case 'new':
          batchStats.new++;
          break;
        case 'updated':
          batchStats.updated++;
          break;
        case 'skipped':
        case 'no_content':
          batchStats.skipped++;
          break;
        case 'error':
          batchStats.errors++;
          break;
      }
      
      batchStats.processed++;
      
      // 更新當前批次進度
      this.importStats.currentBatchProcessed = i + 1;
      
      // 請求間延遲
      if (i < jidList.length - 1) {
        await this.delay(this.CONFIG.DELAY_BETWEEN_REQUESTS);
      }
    }

    console.log(`✅ 第 ${batchNumber} 批次完成:`, batchStats);
    return batchStats;
  }

  /**
   * 處理單筆判決書
   */
  async processJudgment(jid) {
    try {
      // 檢查是否已存在
      const existingRecord = await this.checkJudgmentExists(jid);
      
      if (existingRecord && existingRecord.judgment_content) {
        console.log(`⏭️  判決書 ${jid} 已存在且有內容，跳過`);
        return 'skipped';
      }

      // 從 API 獲取判決書內容（傳遞強制模式）
      console.log(`📥 正在獲取判決書 ${jid}...`);
      const judgmentData = await this.withRetry(() => judicialService.getJudgmentByJid(jid, { force: this.forceFlag }));
      
      if (!judgmentData || !judgmentData.judgment_content) {
        console.log(`⚠️  判決書 ${jid} 無內容或已被移除`);
        return 'no_content';
      }

      // 使用現有的解析邏輯
      const parsedData = judgmentSyncService.parseJudgmentData(judgmentData, jid);
      
      if (existingRecord) {
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
            parsedData.summary, parsedData.riskLevel, JSON.stringify(judgmentData),
            jid
          ]
        );
        console.log(`✅ 更新判決書 ${jid}`);
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
            parsedData.summary, parsedData.riskLevel, JSON.stringify(judgmentData)
          ]
        );
        console.log(`✅ 新增判決書 ${jid}`);
        return 'new';
      }
      
    } catch (error) {
      console.error(`❌ 處理判決書 ${jid} 時發生錯誤:`, error.message);
      return 'error';
    }
  }

  /**
   * 延遲函數
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 重試機制
   */
  async withRetry(fn, maxRetries = this.CONFIG.MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        console.log(`❌ 嘗試 ${i + 1}/${maxRetries} 失敗:`, error.message);
        if (i === maxRetries - 1) throw error;
        await this.delay(this.CONFIG.RETRY_DELAY * (i + 1)); // 指數退避
      }
    }
  }

  /**
   * 檢查判決書是否已存在
   */
  async checkJudgmentExists(jid) {
    try {
      const result = await pool.query(
        'SELECT jid, judgment_content, updated_at FROM judgments WHERE jid = $1',
        [jid]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error(`檢查判決書 ${jid} 是否存在時發生錯誤:`, error);
      return null;
    }
  }

  /**
   * 檢查API是否可用
   */
  isApiAvailable() {
    if (process.env.JUDICIAL_DEV_FORCE === 'true') {
      console.warn('⚠️ 開發模式覆寫：強制啟用司法院 API');
      return true;
    }
    
    const now = new Date();
    const taipeiTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
    const hour = taipeiTime.getHours();
    return hour >= 0 && hour < 6;
  }

  /**
   * 重置統計
   */
  resetStats() {
    this.importStats = {
      totalProcessed: 0,
      newRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      errors: 0,
      currentBatch: 0,
      totalBatches: 0,
      currentBatchSize: 0,
      currentBatchProcessed: 0
    };
  }

  /**
   * 顯示最終統計
   */
  showFinalStats() {
    console.log('\n📊 歷史判決書導入完成統計:');
    console.log(`   總處理數: ${this.importStats.totalProcessed}`);
    console.log(`   新增記錄: ${this.importStats.newRecords}`);
    console.log(`   更新記錄: ${this.importStats.updatedRecords}`);
    console.log(`   跳過記錄: ${this.importStats.skippedRecords}`);
    console.log(`   錯誤數量: ${this.importStats.errors}`);
    
    const successRate = this.importStats.totalProcessed > 0 
      ? ((this.importStats.newRecords + this.importStats.updatedRecords) / this.importStats.totalProcessed * 100).toFixed(1)
      : 0;
    console.log(`   成功率: ${successRate}%`);
  }

  /**
   * 導入指定公司相關的歷史判決書
   */
  async importByCompany(companyName, options = {}) {
    if (this.isRunning) {
      console.log('⚠️ 歷史資料導入已在進行中');
      return;
    }

    console.log(`🏢 開始導入公司 "${companyName}" 相關的歷史判決書`);
    
    const {
      maxRecords = 100,
      delayMs = 2000,
      force = false,
    } = options;

    // 記錄強制模式狀態，供後續請求使用
    this.forceFlag = !!force;

    // 檢查API服務時間（可被 force 覆寫）
    if (!this.isApiAvailable() && !force) {
      console.log('⚠️ 司法院 API 服務時間為凌晨 0-6 點，當前時間不可用');
      console.log('💡 如需強制執行，請設置環境變量 JUDICIAL_DEV_FORCE=true 或在啟動時傳入 { force: true }');
      return;
    }

    if (force && !this.isApiAvailable()) {
      console.warn('⚠️ 已啟用強制導入：忽略 API 服務時間限制');
    }

    this.isRunning = true;

    try {
      // 重置統計
      this.resetStats();
      this.importStats.totalBatches = 1;
      this.importStats.currentBatch = 1;

      // 先從API搜尋相關判決書（傳遞強制模式）
      const searchResult = await judicialService.searchJudgments(companyName, { top: maxRecords, force: this.forceFlag });
      
      if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
        console.log(`📭 未找到公司 "${companyName}" 相關的判決書`);
        return;
      }

      console.log(`📋 找到 ${searchResult.data.length} 筆相關判決書，開始導入...`);
      
      // 提取JID並導入
      const jids = searchResult.data
        .map(judgment => judgment.JID || judgment.案號)
        .filter(jid => jid);

      if (jids.length === 0) {
        console.log('⚠️ 無有效的判決書ID');
        return;
      }

      // 設置批次信息
      this.importStats.currentBatchSize = jids.length;
      this.importStats.currentBatchProcessed = 0;
      
      await this.processBatch(jids, 1, 1);
      this.showFinalStats();

    } catch (error) {
      console.error(`❌ 導入公司 "${companyName}" 判決書失敗:`, error);
    } finally {
      this.isRunning = false;
    }
  }
}

// 命令行執行邏輯
if (require.main === module) {
  const importer = new HistoricalJudgmentImporter();
  
  // 解析命令行參數
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'batch':
      // 批量導入: node import-historical-judgments.js batch [batchSize] [maxBatches]
      const batchSize = parseInt(args[1]) || 50;
      const maxBatches = parseInt(args[2]) || 20;
      importer.startImport({ batchSize, maxBatches });
      break;
      
    case 'company':
      // 公司導入: node import-historical-judgments.js company "公司名稱" [maxRecords]
      const companyName = args[1];
      const maxRecords = parseInt(args[2]) || 100;
      if (!companyName) {
        console.error('❌ 請提供公司名稱');
        process.exit(1);
      }
      importer.importByCompany(companyName, { maxRecords });
      break;
      
    default:
      console.log('📖 歷史判決書導入工具使用說明:');
      console.log('');
      console.log('批量導入模式:');
      console.log('  node import-historical-judgments.js batch [批次大小] [最大批次數]');
      console.log('  範例: node import-historical-judgments.js batch 50 20');
      console.log('');
      console.log('公司導入模式:');
      console.log('  node import-historical-judgments.js company "公司名稱" [最大記錄數]');
      console.log('  範例: node import-historical-judgments.js company "台積電" 100');
      console.log('');
      console.log('⚠️ 注意: 司法院API僅在凌晨0-6點提供服務');
      console.log('💡 開發模式: 設置 JUDICIAL_DEV_FORCE=true 可強制執行');
      break;
  }
}

module.exports = HistoricalJudgmentImporter;