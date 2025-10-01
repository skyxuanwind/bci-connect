const axios = require('axios');

// 配置
const PRODUCTION_URL = 'https://www.gbc-connect.com';
const LOCAL_URL = 'http://localhost:8000';

/**
 * 測試環境變數端點
 */
async function testEnvironmentEndpoint(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/api/events/debug/env`);
    return {
      success: true,
      data: response.data,
      isProduction: response.data.NODE_ENV === 'production'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

/**
 * 測試健康檢查端點
 */
async function testHealthEndpoint(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/health`);
    return {
      success: true,
      data: response.data,
      environment: response.data.environment
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

/**
 * 測試會員目錄API（需要認證）
 */
async function testMembersAPI(baseUrl, authToken = null) {
  try {
    const headers = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await axios.get(`${baseUrl}/api/users/members?page=1&limit=5`, {
      headers
    });
    
    return {
      success: true,
      data: response.data,
      memberCount: response.data.members?.length || 0,
      showTestData: response.data.showTestData,
      isProduction: response.data.isProduction
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      needsAuth: error.response?.status === 401
    };
  }
}

/**
 * 測試分會列表API
 */
async function testChaptersAPI(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/api/chapters`);
    return {
      success: true,
      data: response.data,
      chapterCount: response.data.chapters?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

/**
 * 驗證正式環境
 */
async function verifyProductionEnvironment() {
  console.log('=== 驗證正式環境資料過濾 ===\n');
  
  // 1. 測試環境變數端點
  console.log('1. 檢查環境變數...');
  const envResult = await testEnvironmentEndpoint(PRODUCTION_URL);
  if (envResult.success) {
    console.log(`✅ 環境: ${envResult.data.NODE_ENV}`);
    console.log(`✅ 域名: ${envResult.data.CLIENT_URL}`);
    console.log(`✅ 是否為正式環境: ${envResult.isProduction ? '是' : '否'}`);
    
    if (!envResult.isProduction) {
      console.log('⚠️  警告：環境變數顯示這不是正式環境');
    }
  } else {
    console.log(`❌ 環境變數檢查失敗: ${envResult.error}`);
    return false;
  }
  
  // 2. 測試健康檢查
  console.log('\n2. 檢查健康狀態...');
  const healthResult = await testHealthEndpoint(PRODUCTION_URL);
  if (healthResult.success) {
    console.log(`✅ 服務狀態: ${healthResult.data.status}`);
    console.log(`✅ 環境: ${healthResult.environment}`);
  } else {
    console.log(`❌ 健康檢查失敗: ${healthResult.error}`);
  }
  
  // 3. 測試分會列表（公開API）
  console.log('\n3. 檢查分會列表...');
  const chaptersResult = await testChaptersAPI(PRODUCTION_URL);
  if (chaptersResult.success) {
    console.log(`✅ 分會數量: ${chaptersResult.chapterCount}`);
    
    // 檢查是否有測試分會
    const testChapters = chaptersResult.data.chapters.filter(chapter => {
      const name = chapter.name.toLowerCase();
      return name.includes('test') || name.includes('測試') || name.includes('demo');
    });
    
    if (testChapters.length > 0) {
      console.log(`⚠️  發現 ${testChapters.length} 個疑似測試分會:`);
      testChapters.forEach(chapter => {
        console.log(`   - ${chapter.name}`);
      });
    } else {
      console.log('✅ 沒有發現測試分會');
    }
  } else {
    console.log(`❌ 分會列表檢查失敗: ${chaptersResult.error}`);
  }
  
  // 4. 測試會員目錄（需要認證，預期會失敗）
  console.log('\n4. 檢查會員目錄API...');
  const membersResult = await testMembersAPI(PRODUCTION_URL);
  if (membersResult.needsAuth) {
    console.log('✅ 會員目錄API正確要求認證');
  } else if (membersResult.success) {
    console.log(`⚠️  會員目錄API未要求認證，返回了 ${membersResult.memberCount} 個會員`);
    if (membersResult.showTestData !== undefined) {
      console.log(`✅ showTestData: ${membersResult.showTestData}`);
    }
    if (membersResult.isProduction !== undefined) {
      console.log(`✅ isProduction: ${membersResult.isProduction}`);
    }
  } else {
    console.log(`❌ 會員目錄API檢查失敗: ${membersResult.error}`);
  }
  
  console.log('\n=== 驗證完成 ===');
  return true;
}

/**
 * 驗證本地環境
 */
async function verifyLocalEnvironment() {
  console.log('=== 驗證本地環境資料過濾 ===\n');
  
  // 1. 測試健康檢查
  console.log('1. 檢查健康狀態...');
  const healthResult = await testHealthEndpoint(LOCAL_URL);
  if (healthResult.success) {
    console.log(`✅ 服務狀態: ${healthResult.data.status}`);
    console.log(`✅ 環境: ${healthResult.environment}`);
    
    if (healthResult.environment === 'production') {
      console.log('⚠️  警告：本地環境設置為 production');
    }
  } else {
    console.log(`❌ 健康檢查失敗: ${healthResult.error}`);
    console.log('請確保本地伺服器正在運行 (npm start)');
    return false;
  }
  
  // 2. 測試分會列表
  console.log('\n2. 檢查分會列表...');
  const chaptersResult = await testChaptersAPI(LOCAL_URL);
  if (chaptersResult.success) {
    console.log(`✅ 分會數量: ${chaptersResult.chapterCount}`);
  } else {
    console.log(`❌ 分會列表檢查失敗: ${chaptersResult.error}`);
  }
  
  // 3. 測試會員目錄（需要認證）
  console.log('\n3. 檢查會員目錄API...');
  const membersResult = await testMembersAPI(LOCAL_URL);
  if (membersResult.needsAuth) {
    console.log('✅ 會員目錄API正確要求認證');
  } else {
    console.log(`❌ 會員目錄API檢查失敗: ${membersResult.error}`);
  }
  
  console.log('\n=== 本地驗證完成 ===');
  return true;
}

/**
 * 比較環境差異
 */
async function compareEnvironments() {
  console.log('=== 比較環境差異 ===\n');
  
  const [prodHealth, localHealth] = await Promise.all([
    testHealthEndpoint(PRODUCTION_URL),
    testHealthEndpoint(LOCAL_URL)
  ]);
  
  console.log('環境比較:');
  console.log(`正式環境: ${prodHealth.success ? prodHealth.environment : '無法連接'}`);
  console.log(`本地環境: ${localHealth.success ? localHealth.environment : '無法連接'}`);
  
  if (prodHealth.success && localHealth.success) {
    if (prodHealth.environment === 'production' && localHealth.environment === 'development') {
      console.log('✅ 環境配置正確');
    } else {
      console.log('⚠️  環境配置可能有問題');
    }
  }
  
  const [prodChapters, localChapters] = await Promise.all([
    testChaptersAPI(PRODUCTION_URL),
    testChaptersAPI(LOCAL_URL)
  ]);
  
  console.log('\n分會數量比較:');
  console.log(`正式環境: ${prodChapters.success ? prodChapters.chapterCount : '無法獲取'}`);
  console.log(`本地環境: ${localChapters.success ? localChapters.chapterCount : '無法獲取'}`);
  
  if (prodChapters.success && localChapters.success) {
    const diff = localChapters.chapterCount - prodChapters.chapterCount;
    if (diff > 0) {
      console.log(`✅ 本地環境比正式環境多 ${diff} 個分會（可能包含測試資料）`);
    } else if (diff === 0) {
      console.log('⚠️  兩個環境的分會數量相同');
    } else {
      console.log(`⚠️  正式環境比本地環境多 ${Math.abs(diff)} 個分會`);
    }
  }
}

/**
 * 主函數
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'production';
  
  try {
    switch (command) {
      case 'production':
        await verifyProductionEnvironment();
        break;
        
      case 'local':
        await verifyLocalEnvironment();
        break;
        
      case 'compare':
        await compareEnvironments();
        break;
        
      case 'all':
        await verifyProductionEnvironment();
        console.log('\n' + '='.repeat(50) + '\n');
        await verifyLocalEnvironment();
        console.log('\n' + '='.repeat(50) + '\n');
        await compareEnvironments();
        break;
        
      default:
        console.log('使用方法:');
        console.log('  node scripts/verify-production-data.js production  # 驗證正式環境');
        console.log('  node scripts/verify-production-data.js local       # 驗證本地環境');
        console.log('  node scripts/verify-production-data.js compare     # 比較兩個環境');
        console.log('  node scripts/verify-production-data.js all         # 執行所有驗證');
        break;
    }
  } catch (error) {
    console.error('驗證過程中發生錯誤:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  testEnvironmentEndpoint,
  testHealthEndpoint,
  testMembersAPI,
  testChaptersAPI,
  verifyProductionEnvironment,
  verifyLocalEnvironment,
  compareEnvironments
};