/**
 * useRealtimeSync Hook - 簡化即時同步功能的使用
 * 提供統一的介面來處理資料同步、衝突解決和狀態管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncManager } from '../services/syncManager';
import { toast } from 'react-hot-toast';
import ConflictResolutionModal from '../components/ConflictResolutionModal';

/**
 * 即時同步 Hook
 * 提供統一的介面來處理資料同步、衝突解決和狀態管理
 */
export const useRealtimeSync = (options = {}) => {
  const {
    path,
    initialData = null,
    autoSave = true,
    saveDelay = 800,
    conflictResolver = null,
    onSyncError = null
  } = options;

  // 當未提供 path（例如尚未登入或使用者資料未載入）時，使用本地模式
  // 本地模式只讀寫 localStorage，不依賴 Firebase，以避免載入卡住
  const LOCAL_STORAGE_KEY = 'sync_cards_guest';

  const [syncData, setSyncData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    localData: null,
    remoteData: null,
    conflictPath: ''
  });

  const saveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const localVersionRef = useRef(0);

  // 自定義衝突解決器，顯示模態框讓使用者選擇
  const customConflictResolver = useCallback(async (localData, remoteData) => {
    return new Promise((resolve) => {
      setConflictModal({
        isOpen: true,
        localData,
        remoteData,
        conflictPath: path,
        resolve
      });
    });
  }, [path]);

  // 載入初始資料
  useEffect(() => {
    // 無路徑：啟用本地模式，直接從 localStorage/initialData 載入
    if (!path) {
      try {
        setIsLoading(true);
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSyncData(parsed || {});
          localVersionRef.current = parsed?._lastModified || Date.now();
          setLastSyncTime(parsed?._lastModified || Date.now());
        } else if (initialData) {
          setSyncData(initialData);
          localVersionRef.current = initialData._lastModified || Date.now();
          setLastSyncTime(initialData._lastModified || Date.now());
        } else {
          setSyncData({});
          localVersionRef.current = Date.now();
          setLastSyncTime(Date.now());
        }
      } catch (e) {
        console.warn('[RealtimeSync] Local mode load failed:', e);
        setSyncData({});
        localVersionRef.current = Date.now();
        setLastSyncTime(Date.now());
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
      return; // 本地模式已處理完成
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 添加超時機制，避免Firebase連接問題導致無限載入
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Load timeout')), 10000); // 10秒超時
        });
        
        const dataPromise = syncManager.getData(path);
        
        try {
          const data = await Promise.race([dataPromise, timeoutPromise]);
          if (data) {
            setSyncData(data);
            setLastSyncTime(data._lastModified || Date.now());
            localVersionRef.current = data._lastModified || 0;
          } else if (initialData) {
            setSyncData(initialData);
            localVersionRef.current = initialData._lastModified || 0;
          } else {
            // 如果沒有數據且沒有初始數據，設置空對象避免卡住
            setSyncData({});
            localVersionRef.current = Date.now();
          }
        } catch (timeoutError) {
          console.warn('Data loading timeout, falling back to local storage or initial data');
          if (initialData) {
            setSyncData(initialData);
            localVersionRef.current = initialData._lastModified || 0;
          } else {
            // 回退到空對象，讓用戶可以開始編輯
            setSyncData({});
            localVersionRef.current = Date.now();
          }
          toast.error('連接超時，已切換到離線模式', { duration: 3000 });
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        // 即使發生錯誤，也要設置基本數據避免卡住
        if (initialData) {
          setSyncData(initialData);
          localVersionRef.current = initialData._lastModified || 0;
        } else {
          setSyncData({});
          localVersionRef.current = Date.now();
        }
        if (onSyncError) onSyncError(error);
        toast.error('載入失敗，已切換到離線模式', { duration: 3000 });
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadData();
  }, [path, initialData, onSyncError]);

  // 訂閱遠端資料變化
  useEffect(() => {
    if (!path || isInitialLoadRef.current) return;

    const unsubscribe = syncManager.subscribe(
      path,
      (data) => {
        // 避免遠端較舊版本覆寫本地較新修改（例如使用者剛套用行業模板）
        const remoteTs = data?._lastModified || 0;
        const localTs = localVersionRef.current || 0;
        if (remoteTs < localTs) {
          console.info('[RealtimeSync] Ignore older remote data', { remoteTs, localTs });
          return;
        }
        // 使用智能合併：遠端快照可能僅包含部分鍵（例如僅 avatarUrl），
        // 直接覆寫會造成本地其他欄位清空，這裡改為合併保留未提供的本地鍵。
        setSyncData(prev => syncManager.syncOptimizer.smartMerge(prev || {}, data || {}));
        localVersionRef.current = remoteTs;
        setLastSyncTime(remoteTs || Date.now());
        toast.success('資料已同步', { duration: 2000 });
      },
      conflictResolver || customConflictResolver
    );

    return unsubscribe;
  }, [path, conflictResolver, customConflictResolver]);

  // 監聽同步狀態
  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange((status) => {
      setSyncStatus(status);
      setIsSaving(status === 'syncing');
    });

    return unsubscribe;
  }, []);

  // 自動儲存
  useEffect(() => {
    if (!autoSave || !syncData || isInitialLoadRef.current) return;

    // 無路徑：在本地模式下自動儲存到 localStorage
    if (!path) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        try {
          const now = Date.now();
          const dataToSave = syncData || {};
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            ...dataToSave,
            _lastModified: now
          }));
          // 使用 ref 避免觸發狀態更新循環
          localVersionRef.current = now;
        } catch (e) {
          console.warn('[RealtimeSync] Local mode auto-save failed:', e);
        }
      }, saveDelay);
      return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await syncManager.setData(path, syncData);
        // 使用 ref 避免觸發狀態更新循環
        const now = Date.now();
        localVersionRef.current = now;
        // 不要在這裡調用 setLastSyncTime，避免觸發無限循環
        // setLastSyncTime(now);
      } catch (error) {
        console.error('Auto-save failed:', error);
        if (onSyncError) onSyncError(error);
      }
    }, saveDelay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [syncData, autoSave, path, saveDelay, onSyncError]);

  // 手動儲存
  const saveSyncData = useCallback(async (dataOverride = null) => {
    // 無路徑：在本地模式下直接寫入 localStorage
    if (!path) {
      try {
        setIsSaving(true);
        const dataToSave = dataOverride
          ? syncManager.syncOptimizer.smartMerge(syncData || {}, dataOverride)
          : (syncData || {});
        const now = Date.now();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
          ...dataToSave,
          _lastModified: now
        }));
        localVersionRef.current = now;
        setLastSyncTime(now);
        toast.success('儲存成功（本地模式）');
      } catch (e) {
        console.error('Manual save (local) failed:', e);
        toast.error('儲存失敗');
        if (onSyncError) onSyncError(e);
        throw e;
      } finally {
        setIsSaving(false);
      }
      return;
    }

    try {
      setIsSaving(true);
      // 若提供部分覆寫（例如僅 avatarUrl），與現有資料做智能合併，避免清空其他欄位。
      const dataToSave = dataOverride
        ? syncManager.syncOptimizer.smartMerge(syncData || {}, dataOverride)
        : syncData;
      await syncManager.setData(path, dataToSave);
      const now = Date.now();
      localVersionRef.current = now;
      setLastSyncTime(now);
      toast.success('儲存成功');
    } catch (error) {
      console.error('Manual save failed:', error);
      toast.error('儲存失敗');
      if (onSyncError) onSyncError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [path, syncData, onSyncError]);

  // 更新同步資料
  const updateSyncData = useCallback((updates) => {
    setSyncData(prevData => {
      const now = Date.now();
      localVersionRef.current = now;
      return {
        ...(prevData || {}),
        ...(updates || {}),
        _lastModified: now
      };
    });
  }, []);

  // 重新載入資料
  const reloadSyncData = useCallback(async () => {
    // 無路徑：在本地模式下重新載入 localStorage
    if (!path) {
      try {
        setIsLoading(true);
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setSyncData(parsed || {});
          localVersionRef.current = parsed?._lastModified || Date.now();
          setLastSyncTime(parsed?._lastModified || Date.now());
          toast.success('資料已重新載入（本地模式）');
        } else {
          setSyncData(syncData || {});
        }
      } catch (e) {
        console.error('Reload (local) failed:', e);
        toast.error('重新載入失敗');
        if (onSyncError) onSyncError(e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      setIsLoading(true);
      const data = await syncManager.getData(path);
      if (data) {
        setSyncData(data);
        localVersionRef.current = data._lastModified || 0;
        setLastSyncTime(data._lastModified || Date.now());
        toast.success('資料已重新載入');
      }
    } catch (error) {
      console.error('Reload failed:', error);
      toast.error('重新載入失敗');
      if (onSyncError) onSyncError(error);
    } finally {
      setIsLoading(false);
    }
  }, [path, onSyncError]);

  // 處理衝突解決
  const handleConflictResolve = useCallback(async (resolvedData) => {
    try {
      await syncManager.setData(conflictModal.conflictPath, resolvedData, { 
        skipConflictCheck: true 
      });
      setSyncData(resolvedData);
      setLastSyncTime(Date.now());
      
      if (conflictModal.resolve) {
        conflictModal.resolve(resolvedData);
      }
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      toast.error('衝突解決失敗');
    } finally {
      setConflictModal({
        isOpen: false,
        localData: null,
        remoteData: null,
        conflictPath: '',
        resolve: null
      });
    }
  }, [conflictModal]);

  // 關閉衝突模態框
  const closeConflictModal = useCallback(() => {
    setConflictModal({
      isOpen: false,
      localData: null,
      remoteData: null,
      conflictPath: '',
      resolve: null
    });
  }, []);

  return {
    // 資料狀態
    syncData,
    isLoading,
    isSaving,
    syncStatus,
    lastSyncTime,

    // 操作方法
    updateSyncData,
    saveSyncData,
    reloadSyncData,

    // 衝突處理
    ConflictModal: () => (
      <ConflictResolutionModal
        isOpen={conflictModal.isOpen}
        onClose={closeConflictModal}
        localData={conflictModal.localData}
        remoteData={conflictModal.remoteData}
        conflictPath={conflictModal.conflictPath}
        onResolve={handleConflictResolve}
      />
    )
  };
}

/**
 * 同步狀態 Hook
 * @returns {Object} 全域同步狀態
 */
export function useSyncStatus() {
  const [status, setStatus] = useState(syncManager.getSyncStatus());

  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange(() => {
      setStatus(syncManager.getSyncStatus());
    });
    return unsubscribe;
  }, []);

  return status;
}

export default useRealtimeSync;