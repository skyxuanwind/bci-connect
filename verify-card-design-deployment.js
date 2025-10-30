#!/usr/bin/env node

/**
 * 名片設計部署驗證腳本
 * 驗證新的名片設計功能是否正確部署
 */

const https = require('https');
const fs = require('fs');

const PRODUCTION_URL = 'https://www.gbc-connect.com';
const TEST_ENDPOINTS = [
    '/',
    '/card-studio',
    '/member-card/1'
];

console.log('🚀 開始驗證名片設計部署...');
console.log('================================');

async function checkEndpoint(url) {
    return new Promise((resolve) => {
        const request = https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve({
                    url,
                    status: response.statusCode,
                    headers: response.headers,
                    body: data,
                    success: response.statusCode === 200
                });
            });
        });
        
        request.on('error', (error) => {
            resolve({
                url,
                status: 'ERROR',
                error: error.message,
                success: false
            });
        });
        
        request.setTimeout(10000, () => {
            request.destroy();
            resolve({
                url,
                status: 'TIMEOUT',
                error: 'Request timeout',
                success: false
            });
        });
    });
}

async function verifyDeployment() {
    const results = [];
    
    for (const endpoint of TEST_ENDPOINTS) {
        const url = PRODUCTION_URL + endpoint;
        console.log(`📡 測試: ${url}`);
        
        const result = await checkEndpoint(url);
        results.push(result);
        
        if (result.success) {
            console.log(`✅ ${endpoint}: 正常 (${result.status})`);
            
            // 檢查是否包含新功能的關鍵字
            if (result.body) {
                const hasAvatarEditor = result.body.includes('AvatarEditor') || 
                                      result.body.includes('avatar-editor');
                const hasIconButtons = result.body.includes('PhoneIcon') || 
                                     result.body.includes('EnvelopeIcon');
                
                if (hasAvatarEditor) {
                    console.log(`  📸 頭像編輯器: 已部署`);
                }
                if (hasIconButtons) {
                    console.log(`  🔗 ICON 按鈕: 已部署`);
                }
            }
        } else {
            console.log(`❌ ${endpoint}: 失敗 (${result.status || result.error})`);
        }
    }
    
    // 生成報告
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log('\\n================================');
    console.log('📊 部署驗證結果');
    console.log('================================');
    console.log(`✅ 成功: ${successCount}/${totalCount}`);
    console.log(`❌ 失敗: ${totalCount - successCount}/${totalCount}`);
    
    if (successCount === totalCount) {
        console.log('\\n🎉 部署驗證成功！');
        console.log('\\n📋 後續步驟:');
        console.log('1. 清除瀏覽器緩存');
        console.log('2. 測試名片編輯功能');
        console.log('3. 驗證頭像上傳和編輯');
        console.log('4. 檢查響應式設計');
    } else {
        console.log('\\n⚠️  部分功能可能尚未完全部署');
        console.log('請等待幾分鐘後重新測試');
    }
    
    // 保存詳細結果
    const reportData = {
        timestamp: new Date().toISOString(),
        results,
        summary: {
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount
        }
    };
    
    fs.writeFileSync('deployment-verification-report.json', JSON.stringify(reportData, null, 2));
    console.log('\\n📄 詳細報告已保存到: deployment-verification-report.json');
}

// 執行驗證
verifyDeployment().catch(console.error);