#!/usr/bin/env node

/**
 * Render 部署 NFC 功能測試腳本
 * 測試 Render 上部署的 GBC Connect 系統的 NFC 相關功能
 */

const axios = require('axios');

const RENDER_API_BASE = 'https://bci-connect.onrender.com';

// 測試配置
const testConfig = {
  testCardUid: 'RENDER_TEST_001',
  testUser: {
    email: 'render.test@gbc.com',
    password: 'test123456',
    name: 'Render測試用戶',
    phone: '0987654321',
    company: 'Render測試公司',
    position: '測試職位',
    membershipLevel: 'Core',
    nfcCardId: 'RENDER_TEST_001'
  }
};

async function testRenderHealth() {
  console.log('🔍 測試 Render 服務健康狀態...');
  try {
    const response = await axios.get(`${RENDER_API_BASE}/health`);
    console.log('✅ Render 服務正常運行');
    console.log(`   - 狀態: ${response.data.status}`);
    console.log(`   - 環境: ${response.data.environment}`);
    console.log(`   - 端口: ${response.data.port}`);
    console.log(`   - 運行時間: ${Math.floor(response.data.uptime)}秒`);
    return true;
  } catch (error) {
    console.log('❌ Render 服務健康檢查失敗:', error.message);
    return false;
  }
}

async function testRenderFrontend() {
  console.log('🔍 測試 Render 前端頁面...');
  try {
    const response = await axios.get(`${RENDER_API_BASE}/connection-ceremony`);
    if (response.status === 200 && response.data.includes('GBC')) {
      console.log('✅ 連結之橋儀式頁面正常訪問');
      return true;
    } else {
      console.log('❌ 前端頁面響應異常');
      return false;
    }
  } catch (error) {
    console.log('❌ 前端頁面測試失敗:', error.message);
    return false;
  }
}

async function testRenderNFCAPI() {
  console.log('🔍 測試 Render NFC API 端點...');
  try {
    // 測試連結之橋儀式 API（無認證）
    const response = await axios.post(`${RENDER_API_BASE}/api/ceremony/activate-member`, {
      cardUid: testConfig.testCardUid
    });
    
    // 預期會返回認證錯誤，這表示 API 端點正常工作
    console.log('❌ 預期的認證錯誤 - API 端點正常工作');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ NFC API 端點正常工作（需要認證）');
      return true;
    } else {
      console.log('❌ NFC API 測試失敗:', error.message);
      return false;
    }
  }
}

async function testRenderEnvironment() {
  console.log('🔍 測試 Render 環境配置...');
  try {
    // 測試一個需要環境變量的端點
    const response = await axios.get(`${RENDER_API_BASE}/api/health`);
    console.log('✅ 環境配置正常');
    return true;
  } catch (error) {
    console.log('❌ 環境配置測試失敗:', error.message);
    return false;
  }
}

async function runRenderTests() {
  console.log('🚀 開始 Render 部署 NFC 功能測試');
  console.log('=====================================');
  
  const results = {
    health: await testRenderHealth(),
    frontend: await testRenderFrontend(),
    nfcAPI: await testRenderNFCAPI(),
    environment: await testRenderEnvironment()
  };
  
  console.log('\n📊 測試結果總結');
  console.log('=====================================');
  console.log(`健康檢查: ${results.health ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`前端頁面: ${results.frontend ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`NFC API: ${results.nfcAPI ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`環境配置: ${results.environment ? '✅ 通過' : '❌ 失敗'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 測試通過率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有測試通過！Render 部署成功！');
    console.log('🔗 Render 服務 URL: https://bci-connect.onrender.com');
    console.log('🔗 連結之橋儀式: https://bci-connect.onrender.com/connection-ceremony');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查 Render 部署配置');
  }
  
  return passedTests === totalTests;
}

// 執行測試
if (require.main === module) {
  runRenderTests().catch(console.error);
}

module.exports = { runRenderTests, testConfig };