/**
 * 同步優化器
 * 提供差異同步、批次處理和效能優化功能
 */

class SyncOptimizer {
  constructor() {
    this.pendingUpdates = new Map();
    this.batchTimeout = null;
    this.batchDelay = 300; // 300ms 批次延遲
    this.maxBatchSize = 10; // 最大批次大小
    this.compressionThreshold = 1024; // 1KB 壓縮閾值
  }

  /**
   * 計算物件差異
   * @param {Object} oldData - 舊資料
   * @param {Object} newData - 新資料
   * @returns {Object} 差異物件
   */
  calculateDiff(oldData, newData) {
    if (!oldData || !newData) {
      return { type: 'replace', data: newData };
    }

    const diff = {};
    const changes = [];

    // 深度比較物件
    const compareObjects = (old, current, path = '') => {
      const oldKeys = Object.keys(old || {});
      const currentKeys = Object.keys(current || {});
      const allKeys = new Set([...oldKeys, ...currentKeys]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        const oldValue = old?.[key];
        const currentValue = current?.[key];

        if (oldValue === currentValue) {
          continue; // 無變化
        }

        if (oldValue === undefined) {
          // 新增
          changes.push({
            type: 'add',
            path: currentPath,
            value: currentValue
          });
        } else if (currentValue === undefined) {
          // 刪除
          changes.push({
            type: 'remove',
            path: currentPath
          });
        } else if (typeof oldValue === 'object' && typeof currentValue === 'object') {
          // 遞迴比較物件
          if (Array.isArray(oldValue) && Array.isArray(currentValue)) {
            // 陣列比較
            if (JSON.stringify(oldValue) !== JSON.stringify(currentValue)) {
              changes.push({
                type: 'update',
                path: currentPath,
                value: currentValue,
                oldValue: oldValue
              });
            }
          } else {
            // 物件比較
            compareObjects(oldValue, currentValue, currentPath);
          }
        } else {
          // 值變更
          changes.push({
            type: 'update',
            path: currentPath,
            value: currentValue,
            oldValue: oldValue
          });
        }
      }
    };

    compareObjects(oldData, newData);

    return {
      type: 'diff',
      changes,
      hasChanges: changes.length > 0,
      changeCount: changes.length
    };
  }

  /**
   * 應用差異到物件
   * @param {Object} baseData - 基礎資料
   * @param {Object} diff - 差異物件
   * @returns {Object} 應用差異後的資料
   */
  applyDiff(baseData, diff) {
    if (diff.type === 'replace') {
      return diff.data;
    }

    if (diff.type !== 'diff' || !diff.changes) {
      return baseData;
    }

    const result = JSON.parse(JSON.stringify(baseData || {}));

    for (const change of diff.changes) {
      const pathParts = change.path.split('.');
      let current = result;

      // 導航到目標位置
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }

      const lastPart = pathParts[pathParts.length - 1];

      switch (change.type) {
        case 'add':
        case 'update':
          current[lastPart] = change.value;
          break;
        case 'remove':
          delete current[lastPart];
          break;
      }
    }

    return result;
  }

  /**
   * 壓縮資料
   * @param {Object} data - 要壓縮的資料
   * @returns {Object} 壓縮後的資料
   */
  compressData(data) {
    const jsonString = JSON.stringify(data);
    
    if (jsonString.length < this.compressionThreshold) {
      return { compressed: false, data };
    }

    try {
      // 簡單的壓縮：移除不必要的空白和重複
      const compressed = jsonString
        .replace(/\s+/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      return {
        compressed: true,
        data: compressed,
        originalSize: jsonString.length,
        compressedSize: compressed.length,
        ratio: (compressed.length / jsonString.length * 100).toFixed(2)
      };
    } catch (error) {
      console.warn('Compression failed:', error);
      return { compressed: false, data };
    }
  }

  /**
   * 解壓縮資料
   * @param {Object} compressedData - 壓縮的資料
   * @returns {Object} 解壓縮後的資料
   */
  decompressData(compressedData) {
    if (!compressedData.compressed) {
      return compressedData.data;
    }

    try {
      return JSON.parse(compressedData.data);
    } catch (error) {
      console.error('Decompression failed:', error);
      return null;
    }
  }

  /**
   * 批次處理更新
   * @param {string} path - 資料路徑
   * @param {Object} data - 資料
   * @param {Function} syncFunction - 同步函數
   */
  batchUpdate(path, data, syncFunction) {
    // 添加到待處理更新
    this.pendingUpdates.set(path, {
      data,
      timestamp: Date.now(),
      syncFunction
    });

    // 清除現有的批次計時器
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // 如果達到最大批次大小，立即處理
    if (this.pendingUpdates.size >= this.maxBatchSize) {
      this.processBatch();
      return;
    }

    // 設定批次處理計時器
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }

  /**
   * 處理批次更新
   */
  async processBatch() {
    if (this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    console.log(`Processing batch of ${updates.length} updates`);

    // 並行處理所有更新
    const promises = updates.map(async ([path, update]) => {
      try {
        await update.syncFunction(path, update.data);
      } catch (error) {
        console.error(`Batch update failed for path ${path}:`, error);
        // 重新加入待處理列表以便重試
        this.pendingUpdates.set(path, update);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * 智能合併策略
   * @param {Object} localData - 本地資料
   * @param {Object} remoteData - 遠端資料
   * @returns {Object} 合併後的資料
   */
  smartMerge(localData, remoteData) {
    if (!localData) return remoteData;
    if (!remoteData) return localData;

    const localTimestamp = localData._lastModified || 0;
    const remoteTimestamp = remoteData._lastModified || 0;

    // 如果時間戳相同，進行智能合併
    if (Math.abs(localTimestamp - remoteTimestamp) < 1000) {
      return this.mergeObjects(localData, remoteData);
    }

    // 否則使用較新的版本
    return localTimestamp > remoteTimestamp ? localData : remoteData;
  }

  /**
   * 深度合併物件
   * @param {Object} target - 目標物件
   * @param {Object} source - 來源物件
   * @returns {Object} 合併後的物件
   */
  mergeObjects(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (key === '_lastModified') {
          // 使用較新的時間戳
          result[key] = Math.max(target[key] || 0, source[key] || 0);
        } else if (
          typeof target[key] === 'object' && 
          typeof source[key] === 'object' && 
          !Array.isArray(target[key]) && 
          !Array.isArray(source[key])
        ) {
          // 遞迴合併物件
          result[key] = this.mergeObjects(target[key] || {}, source[key]);
        } else {
          // 使用來源值（假設來源較新）
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 清理資源
   */
  cleanup() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.pendingUpdates.clear();
  }

  /**
   * 獲取效能統計
   * @returns {Object} 效能統計資料
   */
  getStats() {
    return {
      pendingUpdates: this.pendingUpdates.size,
      batchDelay: this.batchDelay,
      maxBatchSize: this.maxBatchSize,
      compressionThreshold: this.compressionThreshold
    };
  }
}

// 創建全域實例
export const syncOptimizer = new SyncOptimizer();

// 導出類別以供測試使用
export { SyncOptimizer };