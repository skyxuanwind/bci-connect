// 數據一致性調試工具
// 用於測試電子名片編輯器的智能合併邏輯

// 模擬 SyncOptimizer 的修復版本
class FixedSyncOptimizer {
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
      console.log('[FixedSyncOptimizer] Detected partial update, merging to preserve local data');
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
      console.log('[FixedSyncOptimizer] Newer data appears to be partial, merging with older complete data');
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
            console.log(`[FixedSyncOptimizer] Array merge for ${key}: target(${target[key].length}) vs source(${source[key].length})`);
            
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
}

// 測試數據
const completeCardData = {
  _lastModified: Date.now(),
  themeId: 'theme1',
  info: {
    name: '張三',
    title: '軟體工程師',
    company: 'ABC公司',
    email: 'zhang@abc.com',
    phone: '0912345678'
  },
  blocks: [
    { id: 'block1', type: 'text', content: '關於我', order: 1 },
    { id: 'block2', type: 'contact', content: '聯絡資訊', order: 2 },
    { id: 'block3', type: 'social', content: '社群媒體', order: 3 }
  ],
  avatarUrl: 'https://example.com/avatar.jpg',
  buttonStyleId: 'style1',
  bgStyle: { type: 'gradient', colors: ['#ff0000', '#00ff00'] }
};

const partialUpdate = {
  _lastModified: Date.now() + 1000,
  info: {
    name: '張三',
    title: '資深軟體工程師' // 只更新職稱
  }
};

const emptyBlocksUpdate = {
  _lastModified: Date.now() + 2000,
  blocks: [] // 空陣列，可能是錯誤的更新
};

const singleBlockUpdate = {
  _lastModified: Date.now() + 3000,
  blocks: [
    { id: 'block1', type: 'text', content: '更新的關於我', order: 1 }
  ]
};

// 測試修復後的智能合併
function testFixedSmartMerge() {
  const optimizer = new FixedSyncOptimizer();
  
  console.log('=== 測試修復後的智能合併邏輯 ===\n');
  
  // 測試 1: 部分更新
  console.log('測試 1: 部分更新（只更新 info.title）');
  const result1 = optimizer.smartMerge(completeCardData, partialUpdate);
  console.log('原始 blocks 數量:', completeCardData.blocks.length);
  console.log('合併後 blocks 數量:', result1.blocks.length);
  console.log('info.title 更新:', result1.info.title);
  console.log('其他欄位保留:', result1.avatarUrl, result1.buttonStyleId);
  console.log('✅ 部分更新測試:', result1.blocks.length === 3 && result1.info.title === '資深軟體工程師' ? '通過' : '失敗');
  console.log('');
  
  // 測試 2: 空陣列更新
  console.log('測試 2: 空陣列更新');
  const result2 = optimizer.smartMerge(completeCardData, emptyBlocksUpdate);
  console.log('原始 blocks 數量:', completeCardData.blocks.length);
  console.log('合併後 blocks 數量:', result2.blocks.length);
  console.log('✅ 空陣列更新測試:', result2.blocks.length === 3 ? '通過' : '失敗');
  console.log('');
  
  // 測試 3: 單一區塊更新
  console.log('測試 3: 單一區塊更新');
  const result3 = optimizer.smartMerge(completeCardData, singleBlockUpdate);
  console.log('原始 blocks 數量:', completeCardData.blocks.length);
  console.log('合併後 blocks 數量:', result3.blocks.length);
  console.log('block1 內容更新:', result3.blocks.find(b => b.id === 'block1')?.content);
  console.log('其他區塊保留:', result3.blocks.filter(b => b.id !== 'block1').length);
  console.log('✅ 單一區塊更新測試:', result3.blocks.length === 3 && result3.blocks.find(b => b.id === 'block1')?.content === '更新的關於我' ? '通過' : '失敗');
  console.log('');
  
  // 測試 4: null/undefined 值處理
  console.log('測試 4: null/undefined 值處理');
  const nullUpdate = {
    _lastModified: Date.now() + 4000,
    info: {
      name: '張三',
      title: null, // null 值
      company: undefined // undefined 值
    }
  };
  const result4 = optimizer.smartMerge(completeCardData, nullUpdate);
  console.log('原始 company:', completeCardData.info.company);
  console.log('合併後 company:', result4.info.company);
  console.log('原始 title:', completeCardData.info.title);
  console.log('合併後 title:', result4.info.title);
  console.log('✅ null/undefined 處理測試:', result4.info.company === 'ABC公司' ? '通過' : '失敗');
  console.log('');
  
  console.log('=== 修復後測試完成 ===');
}

// 執行測試
testFixedSmartMerge();