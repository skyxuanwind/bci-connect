/**
 * 統一同步管理器 - 整合 Firebase Realtime Database 和 SSE
 * 實現電腦端和手機端的即時資料同步
 */

import { firebaseClient } from './firebaseClient';
import { SyncOptimizer } from './syncOptimizer';
import { toast } from 'react-toastify';

class SyncManager {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.syncStatus = 'idle'; // idle, syncing, error, offline
    this.subscribers = new Map();
    this.statusSubscribers = new Set(); // 修正屬性名稱
    this.offlineChanges = new Map();
    this.lastSyncData = new Map(); // 儲存最後同步的資料以進行差異比較
    this.lastSyncTime = null;
    this.conflictResolvers = new Map(); // 衝突解決器
    
    // 初始化同步優化器
    this.syncOptimizer = new SyncOptimizer();
    
    this.setupNetworkListeners();
    this.setupFirebaseListeners();
  }

  /**
   * 設定網路監聽器
   */
  setupNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network online');
        this.isOnline = true;
        this.updateSyncStatus('idle');
        this.syncOfflineChanges();
      });

      window.addEventListener('offline', () => {
        console.log('Network offline');
        this.isOnline = false;
        this.updateSyncStatus('offline');
      });
    }
  }

  /**
   * 設定 Firebase 監聽器
   */
  setupFirebaseListeners() {
    // Firebase 連線狀態監聽
    if (firebaseClient.isConfigured()) {
      firebaseClient.onConnectionStateChange((connected) => {
        if (connected) {
          console.log('Firebase connected');
          this.syncOfflineChanges();
        } else {
          console.log('Firebase disconnected');
        }
      });
    }
  }

  /**
   * 更新同步狀態並通知訂閱者
   * @param {string} status - 新的同步狀態
   */
  updateSyncStatus(status) {
    this.syncStatus = status;
    this.statusSubscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Status callback error:', error);
      }
    });
  }

  /**
   * 訂閱同步狀態變化
   * @param {Function} callback - 狀態變化回調
   * @returns {Function} 取消訂閱函數
   */
  onStatusChange(callback) {
    this.statusSubscribers.add(callback);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  /**
   * 兼容舊代碼的別名方法
   * @deprecated 請改用 onStatusChange
   */
  onSyncStatusChange(callback) {
    return this.onStatusChange(callback);
  }

  /**
   * 訂閱資料變化
   * @param {string} path - Firebase 路徑
   * @param {Function} callback - 回調函數
   * @param {Function} conflictResolver - 衝突解決器
   * @returns {Function} 取消訂閱函數
   */
  subscribe(path, callback, conflictResolver = null) {
    try {
      if (!firebaseClient.isConfigured()) {
        console.warn('Firebase not configured, subscription will not work');
        return () => {};
      }

      // 儲存訂閱資訊
      this.subscribers.set(path, { callback, conflictResolver });

      // 訂閱 Firebase 資料變化
      const unsubscribe = firebaseClient.subscribe(path, (data) => {
        if (data) {
          this.lastSyncData.set(path, data);
          callback(data);
        }
      });

      return () => {
        this.subscribers.delete(path);
        unsubscribe();
      };
    } catch (error) {
      console.error('Subscribe error:', error);
      return () => {};
    }
  }

  /**
   * 添加時間戳到資料
   */
  addTimestamp(data) {
    return {
      ...data,
      _lastModified: Date.now()
    };
  }

  /**
   * 設定資料並同步到 Firebase
   * @param {string} path - Firebase 路徑
   * @param {Object} data - 要設定的資料
   * @param {Object} options - 選項
   */
  async setData(path, data, options = {}) {
    const { skipConflictCheck = false, useDiffSync = true } = options;
    
    try {
      this.updateSyncStatus('syncing');
      
      // 添加時間戳
      const timestampedData = this.addTimestamp(data);
      
      if (!this.isOnline) {
        // 離線時儲存到待處理變更
        this.offlineChanges.set(path, timestampedData);
        this.updateSyncStatus('offline');
        return;
      }

      // 使用差異同步優化
      if (useDiffSync && this.lastSyncData.has(path)) {
        const lastData = this.lastSyncData.get(path);
        const diff = this.syncOptimizer.calculateDiff(lastData, timestampedData);
        
        if (Object.keys(diff).length === 0) {
          console.log('No changes detected, skipping sync');
          this.updateSyncStatus('idle');
          return;
        }
        
        console.log(`Syncing changes for path: ${path}`);
      }

      // 衝突檢查
      if (!skipConflictCheck) {
        const currentData = await this.getData(path);
        if (this.hasConflict(timestampedData, currentData)) {
          const resolver = this.subscribers.get(path)?.conflictResolver;
          if (resolver) {
            const resolvedData = await resolver(timestampedData, currentData);
            await this.setDataToFirebase(path, resolvedData);
            this.lastSyncData.set(path, resolvedData);
            this.updateSyncStatus('idle');
            return;
          } else {
            // 使用預設衝突解決
            const resolvedData = this.useDefaultConflictResolution(timestampedData, currentData);
            await this.setDataToFirebase(path, resolvedData);
            this.lastSyncData.set(path, resolvedData);
            this.updateSyncStatus('idle');
            return;
          }
        }
      }

      // 使用批次處理優化
      this.syncOptimizer.batchUpdate(path, timestampedData, async (batchPath, batchData) => {
        await this.setDataToFirebase(batchPath, batchData);
        this.lastSyncData.set(batchPath, batchData);
      });
      
      this.updateSyncStatus('idle');
    } catch (error) {
      console.error('setData error:', error);
      this.updateSyncStatus('error');
      throw error;
    }
  }

  /**
   * 從 Firebase 獲取資料
   * @param {string} path - Firebase 路徑
   * @returns {Promise<Object>} 資料
   */
  async getData(path) {
    try {
      if (!firebaseClient.isConfigured()) {
        console.warn('Firebase not configured, returning null');
        return null;
      }
      
      const data = await firebaseClient.getData(path);
      if (data) {
        this.lastSyncData.set(path, data);
      }
      return data;
    } catch (error) {
      console.error('getData error:', error);
      throw error;
    }
  }

  /**
   * 設定資料到 Firebase
   * @param {string} path - Firebase 路徑
   * @param {Object} data - 資料
   */
  async setDataToFirebase(path, data) {
    if (!firebaseClient.isConfigured()) {
      console.warn('Firebase not configured, skipping sync');
      return;
    }
    
    await firebaseClient.setData(path, data);
  }

  /**
   * 檢查是否有衝突
   */
  hasConflict(currentData, newData, newTimestamp) {
    if (!currentData._lastModified) return false;
    
    // 如果新資料的時間戳記較舊，則有衝突
    return currentData._lastModified > newTimestamp;
  }

  /**
   * 判斷是否需要解決衝突
   */
  shouldResolveConflict(pendingChange, remoteData) {
    if (!remoteData._lastModified || !pendingChange.timestamp) return false;
    
    // 如果遠端資料更新時間在本地變更之後，需要解決衝突
    return remoteData._lastModified > pendingChange.timestamp;
  }

  /**
   * 解決衝突
   */
  async resolveConflict(path, localChange, remoteData, callback = null) {
    const resolver = this.conflictResolvers.get(path);
    
    console.log('Conflict detected:', {
      path,
      localTimestamp: localChange.timestamp,
      remoteTimestamp: remoteData._lastModified,
      localData: localChange.data,
      remoteData
    });
    
    if (resolver) {
      // 使用自定義衝突解決器
      try {
        const resolved = await resolver(localChange.data, remoteData);
        await this.setData(path, resolved, { skipConflictCheck: true });
        if (callback) callback(resolved);
        toast.success('衝突已解決');
      } catch (error) {
        console.error('Custom conflict resolver failed:', error);
        // 回退到預設策略
        this.useDefaultConflictResolution(path, localChange, remoteData, callback);
      }
    } else {
      this.useDefaultConflictResolution(path, localChange, remoteData, callback);
    }
  }

  /**
   * 預設衝突解決策略
   */
  async useDefaultConflictResolution(path, localChange, remoteData, callback) {
    // 使用最後修改時間戳記決定
    const useRemote = remoteData._lastModified > localChange.timestamp;
    
    if (useRemote) {
      if (callback) callback(remoteData);
      toast.info('檢測到衝突，已使用最新版本', {
        duration: 3000,
        icon: '⚠️'
      });
    } else {
      await this.setData(path, localChange.data, { 
        skipConflictCheck: true,
        timestamp: Date.now() // 使用當前時間作為新的時間戳記
      });
      toast.info('檢測到衝突，已保留您的修改', {
        duration: 3000,
        icon: '✅'
      });
    }
  }

  /**
   * 同步離線變更
   */
  async syncOfflineChanges() {
    if (!this.isOnline || this.offlineChanges.size === 0) {
      return;
    }

    console.log(`Syncing ${this.offlineChanges.size} offline changes`);
    this.updateSyncStatus('syncing');

    const changes = Array.from(this.offlineChanges.entries());
    this.offlineChanges.clear();

    try {
      // 並行同步所有離線變更
      const syncPromises = changes.map(async ([path, data]) => {
        try {
          await this.setDataToFirebase(path, data);
          this.lastSyncData.set(path, data);
          console.log(`Synced offline change for path: ${path}`);
        } catch (error) {
          console.error(`Failed to sync offline change for path ${path}:`, error);
          // 重新加入離線變更列表
          this.offlineChanges.set(path, data);
        }
      });

      await Promise.allSettled(syncPromises);
      
      if (this.offlineChanges.size === 0) {
        toast.success('離線變更已同步');
      } else {
        toast.warning('部分離線變更同步失敗');
      }
    } catch (error) {
      console.error('Sync offline changes error:', error);
      toast.error('離線變更同步失敗');
    } finally {
      this.updateSyncStatus('idle');
    }
  }

  /**
   * 取消訂閱
   */
  unsubscribe(path) {
    const unsubscribe = this.subscribers.get(path);
    if (unsubscribe) {
      unsubscribe();
      this.subscribers.delete(path);
      this.conflictResolvers.delete(path);
    }
  }

  /**
   * 清理資源
   */
  cleanup() {
    // 清理所有訂閱
    this.subscribers.forEach((subscriber, path) => {
      if (typeof subscriber === 'function') {
        subscriber();
      } else if (subscriber.unsubscribe) {
        subscriber.unsubscribe();
      }
    });
    this.subscribers.clear();

    // 清理狀態
    this.statusSubscribers.clear();
    this.offlineChanges.clear();
    this.lastSyncData.clear();

    // 清理優化器
    if (this.syncOptimizer) {
      this.syncOptimizer.cleanup();
    }

    console.log('SyncManager cleaned up');
  }

  /**
   * 獲取同步狀態
   */
  getSyncStatus() {
    return {
      status: this.syncStatus,
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      pendingChanges: this.offlineChanges.size
    };
  }
}

// 創建並導出單例實例
export const syncManager = new SyncManager();
export { SyncManager };
export default syncManager;