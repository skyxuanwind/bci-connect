import { SyncOptimizer } from '../syncOptimizer';

describe('SyncOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new SyncOptimizer();
  });

  afterEach(() => {
    optimizer.cleanup();
  });

  describe('初始化', () => {
    test('應該正確初始化 SyncOptimizer', () => {
      expect(optimizer.pendingUpdates).toBeDefined();
      expect(optimizer.batchDelay).toBe(300);
      expect(optimizer.maxBatchSize).toBe(10);
      expect(optimizer.compressionThreshold).toBe(1024);
    });
  });

  describe('差異計算', () => {
    test('應該計算物件差異', () => {
      const oldData = {
        name: 'John',
        age: 25,
        city: 'New York',
        hobbies: ['reading', 'swimming']
      };

      const newData = {
        name: 'John',
        age: 26,
        city: 'Boston',
        hobbies: ['reading', 'swimming', 'cycling']
      };

      const diff = optimizer.calculateDiff(oldData, newData);

      expect(diff).toEqual({
        type: 'diff',
        changes: [
          {
            type: 'update',
            path: 'age',
            value: 26,
            oldValue: 25
          },
          {
            type: 'update',
            path: 'city',
            value: 'Boston',
            oldValue: 'New York'
          },
          {
            type: 'update',
            path: 'hobbies',
            value: ['reading', 'swimming', 'cycling'],
            oldValue: ['reading', 'swimming']
          }
        ],
        hasChanges: true,
        changeCount: 3
      });
    });

    test('應該處理新增屬性', () => {
      const oldData = { name: 'John' };
      const newData = { name: 'John', age: 25 };

      const diff = optimizer.calculateDiff(oldData, newData);

      expect(diff).toEqual({
        type: 'diff',
        changes: [
          {
            type: 'add',
            path: 'age',
            value: 25
          }
        ],
        hasChanges: true,
        changeCount: 1
      });
    });

    test('應該處理刪除屬性', () => {
      const oldData = { name: 'John', age: 25 };
      const newData = { name: 'John' };

      const diff = optimizer.calculateDiff(oldData, newData);

      expect(diff).toEqual({
        type: 'diff',
        changes: [
          {
            type: 'remove',
            path: 'age'
          }
        ],
        hasChanges: true,
        changeCount: 1
      });
    });

    test('應該處理巢狀物件', () => {
      const oldData = {
        user: {
          name: 'John',
          profile: { age: 25 }
        }
      };

      const newData = {
        user: {
          name: 'John',
          profile: { age: 26, city: 'Boston' }
        }
      };

      const diff = optimizer.calculateDiff(oldData, newData);

      expect(diff).toEqual({
        type: 'diff',
        changes: [
          {
            type: 'update',
            path: 'user.profile.age',
            value: 26,
            oldValue: 25
          },
          {
            type: 'add',
            path: 'user.profile.city',
            value: 'Boston'
          }
        ],
        hasChanges: true,
        changeCount: 2
      });
    });

    test('應該在沒有差異時返回空物件', () => {
      const data = { name: 'John', age: 25 };
      const diff = optimizer.calculateDiff(data, data);

      expect(diff).toEqual({
        type: 'diff',
        changes: [],
        hasChanges: false,
        changeCount: 0
      });
    });
  });

  describe('批次處理', () => {
    test('應該正確添加批次更新', () => {
      const mockSyncFunction = jest.fn();
      const testData = { name: 'test' };

      optimizer.batchUpdate('test/path', testData, mockSyncFunction);

      expect(optimizer.pendingUpdates.has('test/path')).toBe(true);
      expect(optimizer.pendingUpdates.get('test/path').data).toEqual(testData);
    });

    test('應該在達到最大批次大小時立即處理', async () => {
      const mockSyncFunction = jest.fn().mockResolvedValue();

      // 添加超過最大批次大小的更新
      for (let i = 0; i < optimizer.maxBatchSize + 1; i++) {
        optimizer.batchUpdate(`test/path/${i}`, { id: i }, mockSyncFunction);
      }

      // 等待批次處理完成
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockSyncFunction).toHaveBeenCalled();
    });
  });

  describe('智能合併', () => {
    test('應該正確合併資料', () => {
      const local = { name: 'John', age: 26, _lastModified: Date.now() };
      const remote = { name: 'John', age: 25, city: 'Boston', _lastModified: Date.now() - 1000 };

      const merged = optimizer.smartMerge(local, remote);

      // smartMerge 會選擇較新的版本（local）
      expect(merged.name).toBe('John');
      expect(merged.age).toBe(26);
    });
  });

  describe('統計資訊', () => {
    test('應該返回正確的統計資訊', () => {
      const stats = optimizer.getStats();

      expect(stats).toEqual({
        pendingUpdates: 0,
        batchDelay: 300,
        maxBatchSize: 10,
        compressionThreshold: 1024
      });
    });
  });

  describe('清理', () => {
    test('應該正確清理所有資源', () => {
      // 測試 cleanup 方法是否存在
      expect(typeof optimizer.cleanup).toBe('function');
      optimizer.cleanup();
    });
  });
});