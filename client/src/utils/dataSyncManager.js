/**
 * 數據同步管理器
 * 確保編輯器和顯示頁面之間的數據一致性
 */

import { dbGet, dbSet } from '../services/firebaseClient';

class DataSyncManager {
  constructor() {
    this.syncQueue = new Map();
    this.isProcessing = false;
  }

  /**
   * 統一數據路徑格式
   * @param {string} memberId - 會員 ID
   * @returns {string} 統一的數據路徑
   */
  getUnifiedPath(memberId) {
    return `cards/${memberId}`;
  }

  /**
   * 同步編輯器數據到顯示格式
   * @param {string} memberId - 會員 ID
   * @param {Object} editorData - 編輯器數據
   */
  async syncEditorToDisplay(memberId, editorData) {
    try {
      const path = this.getUnifiedPath(memberId);
      
      // 確保數據結構完整
      const syncData = {
        ...editorData,
        lastSync: new Date().toISOString(),
        syncVersion: '1.0'
      };

      await dbSet(path, syncData);
      console.log(`數據同步成功: ${path}`);
      
      return true;
    } catch (error) {
      console.error('數據同步失敗:', error);
      return false;
    }
  }

  /**
   * 從統一路徑讀取數據
   * @param {string} memberId - 會員 ID
   * @returns {Object|null} 數據或 null
   */
  async getUnifiedData(memberId) {
    try {
      const path = this.getUnifiedPath(memberId);
      const data = await dbGet(path);
      
      if (data && data.blocks) {
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('讀取統一數據失敗:', error);
      return null;
    }
  }

  /**
   * 驗證數據一致性
   * @param {string} memberId - 會員 ID
   * @returns {Object} 一致性檢查結果
   */
  async validateDataConsistency(memberId) {
    try {
      const unifiedData = await this.getUnifiedData(memberId);
      
      if (!unifiedData) {
        return {
          isConsistent: false,
          error: '無法找到統一數據'
        };
      }

      // 檢查必要欄位
      const requiredFields = ['info', 'blocks'];
      const missingFields = requiredFields.filter(field => !unifiedData[field]);
      
      if (missingFields.length > 0) {
        return {
          isConsistent: false,
          error: `缺少必要欄位: ${missingFields.join(', ')}`
        };
      }

      return {
        isConsistent: true,
        data: unifiedData,
        lastSync: unifiedData.lastSync
      };
    } catch (error) {
      return {
        isConsistent: false,
        error: error.message
      };
    }
  }

  /**
   * 批量同步數據
   * @param {Array} memberIds - 會員 ID 列表
   */
  async batchSync(memberIds) {
    const results = [];
    
    for (const memberId of memberIds) {
      try {
        const result = await this.validateDataConsistency(memberId);
        results.push({
          memberId,
          ...result
        });
      } catch (error) {
        results.push({
          memberId,
          isConsistent: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

// 創建單例實例
const dataSyncManager = new DataSyncManager();

export default dataSyncManager;
export { DataSyncManager };