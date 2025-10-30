const https = require('https');
const fs = require('fs');

const PRODUCTION_URL = 'https://www.gbc-connect.com';

// 測試端點列表
const testEndpoints = [
  '/',
  '/card-studio',
  '/member-card/1'
];

// 檢查新功能的關鍵字
const newFeatureKeywords = [
  'AvatarEditor',
  'SparklesIcon',
  'displayMode',
  'removeBackground',
  'backgroundRemovalPrecision',
  'cropPosition',
  'displayModeOptions',
  '智能去背',
  '顯示模式',
  '圓形裁剪',
  '原始尺寸'
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function verifyDeployment() {
  console.log('🚀 開始驗證名片編輯器增強功能部署...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    deploymentStatus: 'unknown',
    endpoints: {},
    newFeatures: {
      detected: [],
      missing: []
    },
    summary: {
      totalEndpoints: testEndpoints.length,
      successfulEndpoints: 0,
      failedEndpoints: 0,
      newFeaturesDetected: 0
    }
  };

  // 測試各個端點
  for (const endpoint of testEndpoints) {
    const url = `${PRODUCTION_URL}${endpoint}`;
    console.log(`📍 測試端點: ${endpoint}`);
    
    try {
      const response = await makeRequest(url);
      
      results.endpoints[endpoint] = {
        status: 'success',
        statusCode: response.statusCode,
        responseTime: Date.now(),
        contentLength: response.body.length,
        hasNewFeatures: false,
        detectedFeatures: []
      };
      
      if (response.statusCode === 200) {
        results.summary.successfulEndpoints++;
        console.log(`   ✅ 狀態碼: ${response.statusCode}`);
        
        // 檢查新功能關鍵字
        const detectedFeatures = [];
        for (const keyword of newFeatureKeywords) {
          if (response.body.includes(keyword)) {
            detectedFeatures.push(keyword);
            if (!results.newFeatures.detected.includes(keyword)) {
              results.newFeatures.detected.push(keyword);
            }
          }
        }
        
        if (detectedFeatures.length > 0) {
          results.endpoints[endpoint].hasNewFeatures = true;
          results.endpoints[endpoint].detectedFeatures = detectedFeatures;
          console.log(`   🎯 檢測到新功能: ${detectedFeatures.slice(0, 3).join(', ')}${detectedFeatures.length > 3 ? '...' : ''}`);
        }
        
      } else {
        console.log(`   ⚠️  非預期狀態碼: ${response.statusCode}`);
      }
      
    } catch (error) {
      results.endpoints[endpoint] = {
        status: 'failed',
        error: error.message
      };
      results.summary.failedEndpoints++;
      console.log(`   ❌ 錯誤: ${error.message}`);
    }
    
    console.log('');
  }

  // 檢查缺失的功能
  for (const keyword of newFeatureKeywords) {
    if (!results.newFeatures.detected.includes(keyword)) {
      results.newFeatures.missing.push(keyword);
    }
  }
  
  results.summary.newFeaturesDetected = results.newFeatures.detected.length;

  // 判斷部署狀態
  if (results.summary.successfulEndpoints === results.summary.totalEndpoints) {
    if (results.summary.newFeaturesDetected >= 5) {
      results.deploymentStatus = 'success';
    } else {
      results.deploymentStatus = 'partial';
    }
  } else {
    results.deploymentStatus = 'failed';
  }

  // 生成報告
  console.log('📊 部署驗證報告');
  console.log('='.repeat(50));
  console.log(`🕐 驗證時間: ${results.timestamp}`);
  console.log(`📈 部署狀態: ${results.deploymentStatus.toUpperCase()}`);
  console.log(`🌐 成功端點: ${results.summary.successfulEndpoints}/${results.summary.totalEndpoints}`);
  console.log(`🎯 新功能檢測: ${results.summary.newFeaturesDetected}/${newFeatureKeywords.length}`);
  
  if (results.newFeatures.detected.length > 0) {
    console.log(`\n✅ 已檢測到的新功能:`);
    results.newFeatures.detected.forEach(feature => {
      console.log(`   - ${feature}`);
    });
  }
  
  if (results.newFeatures.missing.length > 0 && results.newFeatures.missing.length < newFeatureKeywords.length) {
    console.log(`\n⚠️  未檢測到的功能:`);
    results.newFeatures.missing.slice(0, 5).forEach(feature => {
      console.log(`   - ${feature}`);
    });
    if (results.newFeatures.missing.length > 5) {
      console.log(`   ... 還有 ${results.newFeatures.missing.length - 5} 個`);
    }
  }

  console.log(`\n🔗 生產環境: ${PRODUCTION_URL}`);
  console.log(`📝 詳細報告已保存到: avatar-editor-deployment-report.json`);

  // 保存詳細報告
  fs.writeFileSync('avatar-editor-deployment-report.json', JSON.stringify(results, null, 2));

  // 後續驗證步驟
  console.log('\n🔍 建議的後續驗證步驟:');
  console.log('1. 訪問 /card-studio 測試頭像上傳功能');
  console.log('2. 測試智能去背功能是否正常工作');
  console.log('3. 驗證圓形裁剪和原始尺寸模式切換');
  console.log('4. 檢查實時預覽功能');
  console.log('5. 測試不同背景樣式選項');
  console.log('6. 驗證移動端響應式效果');

  return results;
}

// 執行驗證
verifyDeployment().catch(console.error);