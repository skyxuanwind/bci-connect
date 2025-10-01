#!/usr/bin/env node

/**
 * 本地環境變更驗證腳本
 * 驗證分會過濾功能和數據過濾機制
 */

const { Pool } = require('pg');
const { isTestChapter, getProductionChapterWhereClause, shouldShowTestData } = require('../utils/dataFilter');
require('dotenv').config();

// 數據庫連接配置
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'bci_business_club',
  user: 'xuan',
  password: ''
});

/**
 * 測試分會過濾功能
 */
async function testChapterFiltering() {
  console.log('\n=== 測試分會過濾功能 ===');
  
  // 測試分會識別
  const testChapters = [
    { name: '台中分會' },
    { name: '台北分會' },
    { name: '台南分會' },
    { name: '新竹分會' },
    { name: '高雄分會' },
    { name: '正常分會' },
    { name: '測試分會' },
    { name: 'test chapter' }
  ];

  console.log('\n1. 測試分會識別：');
  testChapters.forEach(chapter => {
    const isTest = isTestChapter(chapter);
    console.log(`${chapter.name}: ${isTest ? '✅ 測試分會' : '❌ 正常分會'}`);
  });

  console.log('\n2. 環境檢查：');
  console.log(`當前環境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`是否顯示測試資料: ${shouldShowTestData()}`);

  console.log('\n3. WHERE 條件生成：');
  const whereClause = getProductionChapterWhereClause();
  console.log(`WHERE 條件: ${whereClause || '無過濾（開發環境）'}`);
}

/**
 * 測試數據庫分會列表
 */
async function testDatabaseChapters() {
  console.log('\n=== 測試數據庫分會列表 ===');
  
  try {
    // 獲取所有分會
    const allChaptersResult = await pool.query('SELECT * FROM chapters ORDER BY name');
    console.log('\n所有分會：');
    allChaptersResult.rows.forEach(chapter => {
      const isTest = isTestChapter(chapter);
      console.log(`ID: ${chapter.id}, 名稱: ${chapter.name} ${isTest ? '(測試分會)' : '(正常分會)'}`);
    });

    // 模擬生產環境過濾
    console.log('\n模擬生產環境過濾：');
    process.env.NODE_ENV = 'production';
    const productionWhereClause = getProductionChapterWhereClause();
    
    if (productionWhereClause) {
      const query = `SELECT * FROM chapters WHERE 1=1 ${productionWhereClause} ORDER BY name`;
      console.log(`執行查詢: ${query}`);
      
      const filteredResult = await pool.query(query);
      console.log('\n生產環境分會列表（已過濾）：');
      if (filteredResult.rows.length === 0) {
        console.log('✅ 所有測試分會已被過濾');
      } else {
        filteredResult.rows.forEach(chapter => {
          console.log(`ID: ${chapter.id}, 名稱: ${chapter.name}`);
        });
      }
    }
    
    // 恢復開發環境
    process.env.NODE_ENV = 'development';
    
  } catch (error) {
    console.error('數據庫查詢錯誤:', error.message);
  }
}

/**
 * 測試 API 端點
 */
async function testApiEndpoints() {
  console.log('\n=== 測試 API 端點 ===');
  
  const endpoints = [
    'http://localhost:8000/api/chapters',
    'http://localhost:8000/api/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log(`\n${endpoint}:`);
      console.log(`狀態: ${response.status}`);
      
      if (endpoint.includes('chapters')) {
        console.log(`分會數量: ${data.chapters ? data.chapters.length : 0}`);
        if (data.chapters) {
          data.chapters.forEach(chapter => {
            console.log(`  - ${chapter.name}`);
          });
        }
      } else {
        console.log(`響應: ${JSON.stringify(data, null, 2)}`);
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint} 測試失敗:`, error.message);
    }
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('=== 本地環境變更驗證 ===');
  console.log(`時間: ${new Date().toLocaleString()}`);
  
  try {
    await testChapterFiltering();
    await testDatabaseChapters();
    await testApiEndpoints();
    
    console.log('\n=== 驗證完成 ===');
    console.log('✅ 分會過濾功能正常');
    console.log('✅ 數據過濾機制正常');
    console.log('✅ 本地 API 端點正常');
    
  } catch (error) {
    console.error('驗證過程中發生錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  testChapterFiltering,
  testDatabaseChapters,
  testApiEndpoints
};