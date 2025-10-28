import { SyncManager } from '../syncManager';
import { firebaseClient } from '../firebaseClient';

// Mock navigator 對象
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true
  },
  writable: true
});

// Mock window 對象
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  writable: true
});

// Mock Firebase client
jest.mock('../firebaseClient', () => ({
  firebaseClient: {
    isConfigured: jest.fn(() => true),
    setData: jest.fn(),
    getData: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    onConnectionStateChange: jest.fn(() => jest.fn()),
    init: jest.fn()
  }
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn()
  }
}));

describe('網路環境測試', () => {
  let syncManager;

  beforeEach(() => {
    // 清除之前的 mock
    jest.clearAllMocks();
    
    // 重置 window mock
    global.window.addEventListener = jest.fn();
    global.window.removeEventListener = jest.fn();
    
    // 重置 navigator mock
    global.navigator.onLine = true;

    // 創建 SyncManager 實例（這會調用 addEventListener）
    syncManager = new SyncManager();
  });

  afterEach(() => {
    syncManager.cleanup();
  });

  describe('網路連線狀態檢測', () => {
    test('應該正確檢測線上狀態', () => {
      global.navigator.onLine = true;
      expect(syncManager.isOnline).toBe(true);
    });

    test('應該正確檢測離線狀態', () => {
      global.navigator.onLine = false;
      syncManager.isOnline = false;
      expect(syncManager.isOnline).toBe(false);
    });

    test('應該註冊網路狀態變化監聽器', () => {
      expect(global.window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('離線模式測試', () => {
    test('應該在離線時儲存變更到本地', async () => {
      syncManager.isOnline = false;
      const testData = { name: 'test', value: 123 };

      await syncManager.setData('test/path', testData);

      expect(syncManager.offlineChanges.has('test/path')).toBe(true);
      expect(firebaseClient.setData).not.toHaveBeenCalled();
    });

    test('應該在離線時更新同步狀態', () => {
      const statusCallback = jest.fn();
      syncManager.onStatusChange(statusCallback);

      syncManager.isOnline = false;
      syncManager.updateSyncStatus('offline');

      expect(syncManager.syncStatus).toBe('offline');
      expect(statusCallback).toHaveBeenCalledWith('offline');
    });

    test('應該在離線時累積多個變更', async () => {
      syncManager.isOnline = false;

      await syncManager.setData('path1', { data: 'test1' });
      await syncManager.setData('path2', { data: 'test2' });
      await syncManager.setData('path3', { data: 'test3' });

      expect(syncManager.offlineChanges.size).toBe(3);
      expect(firebaseClient.setData).not.toHaveBeenCalled();
    });
  });

  describe('網路恢復測試', () => {
    test('應該在網路恢復時同步離線變更', async () => {
      firebaseClient.setData.mockResolvedValue();

      // 先離線並添加變更
      syncManager.isOnline = false;
      await syncManager.setData('test/path', { data: 'offline-change' });

      expect(syncManager.offlineChanges.size).toBe(1);

      // 模擬網路恢復
      syncManager.isOnline = true;
      
      // 確保 Firebase 已配置
      firebaseClient.isConfigured.mockReturnValue(true);
      
      await syncManager.syncOfflineChanges();

      expect(firebaseClient.setData).toHaveBeenCalledWith(
        'test/path',
        expect.objectContaining({ data: 'offline-change' })
      );
      expect(syncManager.offlineChanges.size).toBe(0);
    });

    test('應該處理同步失敗的離線變更', async () => {
      firebaseClient.setData.mockRejectedValue(new Error('Network error'));

      // 添加離線變更
      syncManager.isOnline = false;
      await syncManager.setData('test/path', { data: 'offline-change' });

      // 嘗試同步
      syncManager.isOnline = true;
      
      // 確保 Firebase 已配置
      firebaseClient.isConfigured.mockReturnValue(true);
      
      await syncManager.syncOfflineChanges();

      // 失敗的變更應該保留在離線變更中
      expect(syncManager.offlineChanges.size).toBe(1);
    });
  });

  describe('Firebase 連線狀態測試', () => {
    test('應該處理 Firebase 未配置的情況', () => {
      firebaseClient.isConfigured.mockReturnValue(false);

      const callback = jest.fn();
      const unsubscribe = syncManager.subscribe('test/path', callback);

      expect(firebaseClient.subscribe).not.toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('清理測試', () => {
    test('應該正確清理所有資源', () => {
      const callback = jest.fn();
      syncManager.onStatusChange(callback);
      
      expect(syncManager.statusSubscribers.size).toBe(1);
      
      syncManager.cleanup();
      
      expect(syncManager.statusSubscribers.size).toBe(0);
      expect(syncManager.subscribers.size).toBe(0);
      expect(syncManager.offlineChanges.size).toBe(0);
    });
  });
});