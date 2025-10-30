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

    // 檢查是否為部分更新（遠端數據欄位數量明顯少於本地）
    const localKeys = Object.keys(localData).filter(k => !k.startsWith('_'));
    const remoteKeys = Object.keys(remoteData).filter(k => !k.startsWith('_'));
    const isPartialUpdate = remoteKeys.length < localKeys.length * 0.5;

    // 如果是部分更新，總是進行合併以保留本地數據
    if (isPartialUpdate) {
      console.log('[SyncOptimizer] Detected partial update, merging to preserve local data');
      return this.mergeObjects(localData, remoteData);
    }

    // 如果時間戳相同，進行智能合併
    if (Math.abs(localTimestamp - remoteTimestamp) < 1000) {
      return this.mergeObjects(localData, remoteData);
    }

    // 否則使用較新的版本，但仍需檢查是否為部分更新
    const newerData = localTimestamp > remoteTimestamp ? localData : remoteData;
    const olderData = localTimestamp > remoteTimestamp ? remoteData : localData;
    
    // 如果較新的數據欄位明顯較少，可能是部分更新，進行合併
    const newerKeys = Object.keys(newerData).filter(k => !k.startsWith('_'));
    const olderKeys = Object.keys(olderData).filter(k => !k.startsWith('_'));
    
    if (newerKeys.length < olderKeys.length * 0.7) {
      console.log('[SyncOptimizer] Newer data appears to be partial, merging with older complete data');
      return this.mergeObjects(olderData, newerData);
    }

    return newerData;
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
        } else if (Array.isArray(source[key])) {
          // 陣列處理：如果來源陣列為空或只有一個元素，可能是部分更新，保留目標陣列
          if (source[key].length === 0) {
            // 空陣列：保留目標陣列
            result[key] = target[key] || [];
          } else if (Array.isArray(target[key]) && target[key].length > source[key].length) {
            // 來源陣列較短，可能是部分更新，進行智能合併
            console.log(`[SyncOptimizer] Array merge for ${key}: target(${target[key].length}) vs source(${source[key].length})`);
            
            // 對於 blocks 陣列，使用 ID 進行合併
            if (key === 'blocks') {
              result[key] = this.mergeBlocksArray(target[key], source[key]);
            } else {
              // 其他陣列：如果來源明顯較短，保留目標陣列
              result[key] = target[key];
            }
          } else {
            // 來源陣列較長或相等，使用來源陣列
            result[key] = source[key];
          }
        } else if (
          typeof target[key] === 'object' && 
          typeof source[key] === 'object' && 
          target[key] !== null &&
          source[key] !== null
        ) {
          // 遞迴合併物件
          result[key] = this.mergeObjects(target[key] || {}, source[key]);
        } else if (source[key] !== undefined && source[key] !== null) {
          // 只有當來源值不是 undefined 或 null 時才覆寫
          result[key] = source[key];
        }
        // 如果來源值是 undefined 或 null，保留目標值
      }
    }

    return result;
  }

  /**
   * 智能合併 blocks 陣列
   * @param {Array} targetBlocks - 目標區塊陣列
   * @param {Array} sourceBlocks - 來源區塊陣列
   * @returns {Array} 合併後的區塊陣列
   */
  mergeBlocksArray(targetBlocks, sourceBlocks) {
    if (!Array.isArray(targetBlocks)) return sourceBlocks;
    if (!Array.isArray(sourceBlocks)) return targetBlocks;

    const result = [...targetBlocks];
    
    // 根據 ID 更新或新增區塊
    sourceBlocks.forEach(sourceBlock => {
      const existingIndex = result.findIndex(block => block.id === sourceBlock.id);
      if (existingIndex >= 0) {
        // 更新現有區塊
        result[existingIndex] = { ...result[existingIndex], ...sourceBlock };
      } else {
        // 新增區塊
        result.push(sourceBlock);
      }
    });

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