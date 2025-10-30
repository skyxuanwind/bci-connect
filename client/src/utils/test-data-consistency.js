// 測試數據一致性檢查工具
const { dataConsistencyChecker } = require('./dataConsistencyChecker.js');

// 測試數據
const testData = {
  info: {
    name: '測試用戶',
    title: '軟體工程師',
    company: '測試公司',
    email: 'test@example.com',
    phone: '+886912345678'
  },
  blocks: [
    {
      id: 'block1',
      type: 'link',
      title: '個人網站',
      url: 'https://example.com'
    },
    {
      id: 'block2',
      type: 'contact',
      title: '聯絡我',
      phone: '+886912345678'
    }
  ],
  themeId: 'simple',
  buttonStyleId: 'solid-blue',
  bgStyle: { id: 'bg0', name: '主題預設', css: '' },
  _lastModified: Date.now()
};

// 測試不完整的數據
const incompleteData = {
  info: {
    name: '測試用戶'
    // 缺少其他必要欄位
  },
  blocks: null, // 無效的 blocks
  themeId: 'simple'
  // 缺少 _lastModified
};

// 測試部分更新數據
const partialUpdateData = {
  info: {
    name: '更新後的用戶名'
  },
  _isPartialUpdate: true,
  _lastModified: Date.now()
};

// 執行測試
console.log('=== 數據一致性檢查工具測試 ===\n');

// 測試 1: 完整數據檢查
console.log('測試 1: 完整數據檢查');
const result1 = dataConsistencyChecker.checkDataIntegrity(testData);
console.log('結果:', result1);
console.log('是否通過:', result1.isValid);
console.log('問題數量:', result1.issues.length);
console.log('');

// 測試 2: 不完整數據檢查
console.log('測試 2: 不完整數據檢查');
const result2 = dataConsistencyChecker.checkDataIntegrity(incompleteData);
console.log('結果:', result2);
console.log('是否通過:', result2.isValid);
console.log('問題:', result2.issues);
console.log('');

// 測試 3: 部分更新數據檢查
console.log('測試 3: 部分更新數據檢查');
const result3 = dataConsistencyChecker.checkDataIntegrity(partialUpdateData);
console.log('結果:', result3);
console.log('是否通過:', result3.isValid);
console.log('問題數量:', result3.issues.length);
console.log('');

// 測試 4: 數據源比較
console.log('測試 4: 數據源比較');
const modifiedData = {
  ...testData,
  info: {
    ...testData.info,
    name: '修改後的用戶名',
    title: '高級軟體工程師'
  },
  blocks: [
    ...testData.blocks,
    {
      id: 'block3',
      type: 'video',
      title: '介紹影片',
      url: 'https://youtube.com/watch?v=example'
    }
  ]
};

const comparison = dataConsistencyChecker.compareDataSources(testData, modifiedData);
console.log('比較結果:', comparison);
console.log('是否一致:', comparison.isConsistent);
console.log('差異數量:', comparison.differences.length);
console.log('差異詳情:', comparison.differences);
console.log('');

// 測試 5: 空數據處理
console.log('測試 5: 空數據處理');
const result5 = dataConsistencyChecker.checkDataIntegrity(null);
console.log('結果:', result5);
console.log('是否通過:', result5.isValid);
console.log('');

const result6 = dataConsistencyChecker.checkDataIntegrity({});
console.log('空對象檢查結果:', result6);
console.log('是否通過:', result6.isValid);
console.log('問題:', result6.issues);

console.log('\n=== 測試完成 ===');