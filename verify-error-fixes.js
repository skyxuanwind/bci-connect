#!/usr/bin/env node

// 錯誤修正驗證腳本
// 驗證 React 初始化錯誤和 Firebase CSP 問題的修正

const https = require('https');
const http = require('http');

const SITE_URL = 'https://gbc-connect.onrender.com';
const CARD_STUDIO_PATH = '/card-studio';
const MEMBER_CARD_PATH = '/member-card/1';

console.log('🔍 開始驗證錯誤修正...');
console.log('================================');

// 檢查網站可訪問性
function checkSiteAccessibility(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          success: res.statusCode === 200
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        success: false
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Request timeout',
        success: false
      });
    });
  });
}

// 檢查 CSP 標頭
function checkCSPHeaders(headers) {
  const csp = headers['content-security-policy'];
  if (!csp) {
    return { hasCSP: false, firebaseAllowed: false };
  }
  
  const firebaseAllowed = csp.includes('*.firebaseio.com') && csp.includes('*.firebasedatabase.app');
  return { hasCSP: true, firebaseAllowed, csp };
}

// 檢查頁面內容
function checkPageContent(body, pageName) {
  const checks = {
    hasReactApp: body.includes('react') || body.includes('React') || body.includes('root'),
    hasFirebaseScript: body.includes('firebase') || body.includes('Firebase'),
    hasCardStudio: body.includes('card-studio') || body.includes('CardStudio'),
    hasErrorMessages: body.includes('Cannot access') || body.includes('ReferenceError'),
    hasCSPViolation: body.includes('Content Security Policy') || body.includes('CSP'),
    pageSize: body.length
  };
  
  return checks;
}

async function main() {
  console.log(`📡 檢查主網站: ${SITE_URL}`);
  const mainSite = await checkSiteAccessibility(SITE_URL);
  
  let cspCheck = { hasCSP: false, firebaseAllowed: false };
  
  if (mainSite.success) {
    console.log('✅ 主網站可訪問');
    console.log(`📊 狀態碼: ${mainSite.status}`);
    
    // 檢查 CSP 標頭
    cspCheck = checkCSPHeaders(mainSite.headers);
    console.log(`🛡️  CSP 設置: ${cspCheck.hasCSP ? '已設置' : '未設置'}`);
    if (cspCheck.hasCSP) {
      console.log(`🔥 Firebase 域名允許: ${cspCheck.firebaseAllowed ? '✅ 是' : '❌ 否'}`);
    }
    
    // 檢查頁面內容
    const contentCheck = checkPageContent(mainSite.body, 'main');
    console.log(`⚛️  React 應用: ${contentCheck.hasReactApp ? '✅ 檢測到' : '❌ 未檢測到'}`);
    console.log(`🔥 Firebase 腳本: ${contentCheck.hasFirebaseScript ? '✅ 檢測到' : '❌ 未檢測到'}`);
    console.log(`📄 頁面大小: ${(contentCheck.pageSize / 1024).toFixed(2)} KB`);
    
    if (contentCheck.hasErrorMessages) {
      console.log('⚠️  發現錯誤訊息在頁面中');
    }
    
    if (contentCheck.hasCSPViolation) {
      console.log('⚠️  發現 CSP 違規訊息');
    }
    
  } else {
    console.log('❌ 主網站無法訪問');
    console.log(`💥 錯誤: ${mainSite.error || '未知錯誤'}`);
    console.log(`📊 狀態碼: ${mainSite.status}`);
  }
  
  console.log('\n🎯 檢查關鍵頁面...');
  
  // 檢查 Card Studio 頁面
  console.log(`📡 檢查 Card Studio: ${SITE_URL}${CARD_STUDIO_PATH}`);
  const cardStudio = await checkSiteAccessibility(SITE_URL + CARD_STUDIO_PATH);
  
  if (cardStudio.success) {
    console.log('✅ Card Studio 頁面可訪問');
    const contentCheck = checkPageContent(cardStudio.body, 'card-studio');
    console.log(`🎨 Card Studio 內容: ${contentCheck.hasCardStudio ? '✅ 檢測到' : '❌ 未檢測到'}`);
    
    if (contentCheck.hasErrorMessages) {
      console.log('⚠️  Card Studio 頁面發現錯誤訊息');
    }
  } else {
    console.log('❌ Card Studio 頁面無法訪問');
    console.log(`💥 錯誤: ${cardStudio.error || '未知錯誤'}`);
  }
  
  // 檢查 Member Card 頁面
  console.log(`📡 檢查 Member Card: ${SITE_URL}${MEMBER_CARD_PATH}`);
  const memberCard = await checkSiteAccessibility(SITE_URL + MEMBER_CARD_PATH);
  
  if (memberCard.success) {
    console.log('✅ Member Card 頁面可訪問');
  } else {
    console.log('❌ Member Card 頁面無法訪問');
    console.log(`💥 錯誤: ${memberCard.error || '未知錯誤'}`);
  }
  
  console.log('\n📋 修正驗證總結');
  console.log('================================');
  
  const fixes = [
    {
      name: 'React 初始化錯誤修正',
      status: !mainSite.body?.includes('Cannot access') && !cardStudio.body?.includes('Cannot access'),
      description: '修正 CardStudioPro.jsx 中的循環依賴問題'
    },
    {
      name: 'Firebase CSP 修正',
      status: cspCheck.firebaseAllowed,
      description: '允許 Firebase 域名在 Content Security Policy 中'
    },
    {
      name: '網站整體功能',
      status: mainSite.success && cardStudio.success,
      description: '主要頁面可正常訪問'
    }
  ];
  
  fixes.forEach(fix => {
    console.log(`${fix.status ? '✅' : '❌'} ${fix.name}: ${fix.description}`);
  });
  
  const allFixed = fixes.every(fix => fix.status);
  
  console.log('\n🎉 修正狀態總覽');
  console.log('================================');
  if (allFixed) {
    console.log('✅ 所有錯誤已成功修正！');
    console.log('🚀 應用程式應該可以正常運行');
  } else {
    console.log('⚠️  部分問題仍需要解決');
    console.log('🔧 請檢查失敗的項目並進行進一步修正');
  }
  
  console.log('\n📊 建議後續步驟:');
  console.log('1. 🧪 在瀏覽器中測試 Card Studio 功能');
  console.log('2. 🔥 驗證 Firebase 連接和數據同步');
  console.log('3. 📱 測試不同設備和瀏覽器的兼容性');
  console.log('4. 📈 監控錯誤日誌以確保穩定性');
  
  console.log(`\n⏰ 驗證完成時間: ${new Date().toLocaleString()}`);
}

main().catch(console.error);