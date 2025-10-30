/**
 * 測試數據同步修正效果
 * 驗證編輯器和顯示頁面的數據一致性修正
 */

const dataSyncManager = require('./client/src/utils/dataSyncManager.js');

async function testDataSyncFix() {
  console.log('🔧 測試數據同步修正...\n');

  // 模擬用戶 ID
  const testMemberId = 'test-user-123';

  // 模擬編輯器數據
  const editorData = {
    info: {
      name: '測試用戶',
      title: '軟體工程師',
      company: 'Tech Company',
      phone: '+886912345678',
      email: 'test@example.com'
    },
    themeId: 'simple',
    blocks: [
      {
        id: 'block1',
        type: 'link',
        title: '個人網站',
        url: 'https://example.com'
      },
      {
        id: 'block2',
        type: 'richtext',
        html: '<p>這是一段介紹文字</p>'
      }
    ],
    avatarUrl: 'https://example.com/avatar.jpg',
    design: {
      buttonStyleId: 'solid-blue',
      bgStyle: 'bg1'
    },
    lastUpdated: new Date().toISOString(),
    version: '2.0'
  };

  try {
    console.log('1. 測試數據同步到統一路徑...');
    const syncResult = await dataSyncManager.syncEditorToDisplay(testMemberId, editorData);
    console.log(`   同步結果: ${syncResult ? '✅ 成功' : '❌ 失敗'}`);

    console.log('\n2. 驗證數據一致性...');
    const validationResult = await dataSyncManager.validateDataConsistency(testMemberId);
    console.log(`   一致性檢查: ${validationResult.isConsistent ? '✅ 一致' : '❌ 不一致'}`);
    
    if (!validationResult.isConsistent) {
      console.log(`   錯誤: ${validationResult.error}`);
    } else {
      console.log(`   最後同步時間: ${validationResult.lastSync}`);
    }

    console.log('\n3. 測試統一數據讀取...');
    const unifiedData = await dataSyncManager.getUnifiedData(testMemberId);
    
    if (unifiedData) {
      console.log('   ✅ 成功讀取統一數據');
      console.log(`   數據版本: ${unifiedData.version}`);
      console.log(`   區塊數量: ${unifiedData.blocks?.length || 0}`);
      console.log(`   用戶姓名: ${unifiedData.info?.name}`);
    } else {
      console.log('   ❌ 無法讀取統一數據');
    }

    console.log('\n4. 測試批量同步...');
    const batchResults = await dataSyncManager.batchSync([testMemberId, 'test-user-456']);
    console.log('   批量同步結果:');
    batchResults.forEach((result, index) => {
      console.log(`   用戶 ${result.memberId}: ${result.isConsistent ? '✅ 一致' : '❌ 不一致'}`);
      if (!result.isConsistent && result.error) {
        console.log(`     錯誤: ${result.error}`);
      }
    });

    console.log('\n🎉 數據同步修正測試完成！');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
    console.error('詳細錯誤:', error);
  }
}

// 執行測試
if (require.main === module) {
  testDataSyncFix().catch(console.error);
}

module.exports = { testDataSyncFix };