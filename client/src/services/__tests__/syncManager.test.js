import { SyncManager } from '../syncManager';
import { firebaseClient } from '../firebaseClient';
import { toast } from 'react-toastify';

// Mock dependencies
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

describe('SyncManager', () => {
  let syncManager;

  beforeEach(() => {
    syncManager = new SyncManager();
    jest.clearAllMocks();
  });

  afterEach(() => {
    syncManager.cleanup();
  });

  describe('初始化', () => {
    test('應該正確初始化 SyncManager', () => {
      expect(syncManager.isOnline).toBe(true);
      expect(syncManager.syncStatus).toBe('idle');
      expect(syncManager.subscribers.size).toBe(0);
      expect(syncManager.offlineChanges.size).toBe(0);
    });
  });

  describe('網路狀態管理', () => {
    test('應該正確處理網路離線狀態', () => {
      const statusCallback = jest.fn();
      syncManager.onStatusChange(statusCallback);

      // 模擬網路離線事件
      const offlineEvent = new Event('offline');
      
      // 手動觸發事件處理器
      syncManager.isOnline = false;
      syncManager.updateSyncStatus('offline');

      expect(syncManager.isOnline).toBe(false);
      expect(syncManager.syncStatus).toBe('offline');
      expect(statusCallback).toHaveBeenCalledWith('offline');
    });

    test('應該正確處理網路上線狀態', () => {
      const statusCallback = jest.fn();
      syncManager.onStatusChange(statusCallback);

      // 先設為離線
      syncManager.isOnline = false;
      syncManager.syncStatus = 'offline';

      // 模擬網路上線事件
      const onlineEvent = new Event('online');
      
      // 手動觸發事件處理器
      syncManager.isOnline = true;
      syncManager.updateSyncStatus('idle');

      expect(syncManager.isOnline).toBe(true);
      expect(syncManager.syncStatus).toBe('idle');
      expect(statusCallback).toHaveBeenCalledWith('idle');
    });
  });

  describe('資料設定和獲取', () => {
    test('應該在線上時直接設定資料到 Firebase', async () => {
      firebaseClient.isConfigured.mockReturnValue(true);
      firebaseClient.setData.mockResolvedValue();

      const testData = { name: 'test', value: 123 };
      await syncManager.setData('test/path', testData);

      // 等待批次處理完成
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(firebaseClient.setData).toHaveBeenCalledWith('test/path', {
        ...testData,
        _lastModified: expect.any(Number)
      });
    });

    test('應該在離線時儲存資料到離線變更', async () => {
      syncManager.isOnline = false;
      const testData = { name: 'test', value: 123 };

      await syncManager.setData('test/path', testData);

      expect(syncManager.offlineChanges.has('test/path')).toBe(true);
      expect(syncManager.offlineChanges.get('test/path')).toEqual({
        ...testData,
        _lastModified: expect.any(Number)
      });
    });

    test('應該正確獲取 Firebase 資料', async () => {
      const testData = { name: 'test', value: 123 };
      firebaseClient.isConfigured.mockReturnValue(true);
      firebaseClient.getData.mockResolvedValue(testData);

      const result = await syncManager.getData('test/path');

      expect(firebaseClient.getData).toHaveBeenCalledWith('test/path');
      expect(result).toEqual(testData);
      expect(syncManager.lastSyncData.get('test/path')).toEqual(testData);
    });
  });

  describe('訂閱管理', () => {
    test('應該正確訂閱資料變化', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      
      firebaseClient.isConfigured.mockReturnValue(true);
      firebaseClient.subscribe.mockReturnValue(unsubscribe);

      const unsubscribeFunc = syncManager.subscribe('test/path', callback);

      expect(firebaseClient.subscribe).toHaveBeenCalledWith('test/path', expect.any(Function));
      expect(syncManager.subscribers.has('test/path')).toBe(true);

      // 測試取消訂閱
      unsubscribeFunc();
      expect(syncManager.subscribers.has('test/path')).toBe(false);
      expect(unsubscribe).toHaveBeenCalled();
    });

    test('應該在 Firebase 未配置時返回空函數', () => {
      firebaseClient.isConfigured.mockReturnValue(false);
      
      const callback = jest.fn();
      const unsubscribeFunc = syncManager.subscribe('test/path', callback);

      expect(typeof unsubscribeFunc).toBe('function');
      expect(firebaseClient.subscribe).not.toHaveBeenCalled();
    });
  });

  describe('離線變更同步', () => {
    test('應該在網路恢復時同步離線變更', async () => {
      firebaseClient.isConfigured.mockReturnValue(true);
      firebaseClient.setData.mockResolvedValue();

      // 添加離線變更
      const testData = { name: 'test', value: 123 };
      syncManager.offlineChanges.set('test/path', testData);

      await syncManager.syncOfflineChanges();

      expect(firebaseClient.setData).toHaveBeenCalledWith('test/path', testData);
      expect(syncManager.offlineChanges.size).toBe(0);
      expect(toast.success).toHaveBeenCalledWith('離線變更已同步');
    });

    test('應該處理同步失敗的情況', async () => {
      firebaseClient.isConfigured.mockReturnValue(true);
      firebaseClient.setData.mockRejectedValue(new Error('Sync failed'));

      const testData = { name: 'test', value: 123 };
      syncManager.offlineChanges.set('test/path', testData);

      await syncManager.syncOfflineChanges();

      expect(syncManager.offlineChanges.has('test/path')).toBe(true);
      expect(toast.warning).toHaveBeenCalledWith('部分離線變更同步失敗');
    });
  });

  describe('差異同步', () => {
    test('應該使用差異同步優化效能', async () => {
      firebaseClient.isConfigured.mockReturnValue(true);
      firebaseClient.setData.mockResolvedValue();

      const oldData = { name: 'test', value: 123 };
      const newData = { name: 'test', value: 456 };

      // 設定最後同步的資料
      syncManager.lastSyncData.set('test/path', oldData);

      await syncManager.setData('test/path', newData, { useDiffSync: true });

      // 等待批次處理完成
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(firebaseClient.setData).toHaveBeenCalled();
    });
  });

  describe('清理', () => {
    test('應該正確清理所有資源', () => {
      const unsubscribe = jest.fn();
      const statusCallback = jest.fn();

      // 添加一些資源
      syncManager.subscribers.set('test/path', { unsubscribe });
      syncManager.onStatusChange(statusCallback);
      syncManager.offlineChanges.set('test/path', { data: 'test' });

      syncManager.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
      expect(syncManager.subscribers.size).toBe(0);
      expect(syncManager.offlineChanges.size).toBe(0);
    });
  });
});