/**
 * 測試腳本：重現名片編輯器與顯示頁面數據不一致問題
 */

import { dbGet, dbSet } from '../services/firebaseClient';
import axios from '../config/axios';

class ConsistencyTester {
  constructor() {
    this.testUserId = 'test-user-123';
    this.testMemberId = 'test-member-456';
  }

  /**
   * 模擬編輯器保存數據
   */
  async simulateEditorSave() {
    const editorData = {
      themeId: 'simple',
      info: {
        name: '測試用戶',
        title: '軟體工程師',
        company: '測試公司',
        phone: '0912345678',
        email: 'test@example.com',
        line: 'test_line_id'
      },
      blocks: [
        {
          id: 'block-1',
          type: 'link',
          title: '公司網站',
          url: 'https://example.com'
        },
        {
          id: 'block-2',
          type: 'richtext',
          title: '關於我',
          html: '<p>這是一段測試文字</p>'
        }
      ],
      avatarUrl: 'https://example.com/avatar.jpg',
      design: {
        buttonStyleId: 'solid-blue',
        bgStyle: 'bg1'
      }
    };

    console.log('🔧 模擬編輯器保存數據...');
    
    // 編輯器使用的路徑
    await dbSet(`cards/${this.testUserId}`, editorData);
    console.log('✅ 編輯器數據已保存到:', `cards/${this.testUserId}`);
    
    return editorData;
  }

  /**
   * 模擬顯示頁面讀取數據
   */
  async simulateDisplayPageLoad() {
    console.log('📖 模擬顯示頁面讀取數據...');
    
    // 顯示頁面嘗試讀取的路徑
    const editorPath = `cards/${this.testMemberId}/editor`;
    const fallbackPath = `cards/${this.testMemberId}`;
    
    console.log('🔍 嘗試讀取路徑:', editorPath);
    let editorData = await dbGet(editorPath).catch(() => null);
    
    if (!editorData) {
      console.log('❌ 編輯器路徑無數據，嘗試回退路徑:', fallbackPath);
      editorData = await dbGet(fallbackPath).catch(() => null);
    }
    
    if (!editorData) {
      console.log('❌ Firebase 無數據，使用 API 回退');
      // 這裡會使用傳統 API，但我們的測試環境可能沒有對應的 API 數據
      return null;
    }
    
    console.log('✅ 顯示頁面讀取到數據:', editorData);
    return editorData;
  }

  /**
   * 比較數據一致性
   */
  compareData(editorData, displayData) {
    console.log('\n📊 數據一致性比較結果:');
    
    if (!displayData) {
      console.log('❌ 顯示頁面無法讀取數據 - 路徑不匹配問題');
      return {
        consistent: false,
        issues: ['顯示頁面無法讀取編輯器保存的數據']
      };
    }
    
    const issues = [];
    
    // 檢查基本信息
    if (editorData.info?.name !== displayData.info?.name) {
      issues.push(`姓名不一致: 編輯器="${editorData.info?.name}" vs 顯示="${displayData.info?.name}"`);
    }
    
    // 檢查區塊數量
    if (editorData.blocks?.length !== displayData.blocks?.length) {
      issues.push(`區塊數量不一致: 編輯器=${editorData.blocks?.length} vs 顯示=${displayData.blocks?.length}`);
    }
    
    // 檢查主題
    if (editorData.themeId !== displayData.themeId) {
      issues.push(`主題不一致: 編輯器="${editorData.themeId}" vs 顯示="${displayData.themeId}"`);
    }
    
    if (issues.length === 0) {
      console.log('✅ 數據一致');
      return { consistent: true, issues: [] };
    } else {
      console.log('❌ 發現不一致問題:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      return { consistent: false, issues };
    }
  }

  /**
   * 執行完整測試
   */
  async runTest() {
    console.log('🚀 開始數據一致性測試\n');
    
    try {
      // 1. 模擬編輯器保存
      const editorData = await this.simulateEditorSave();
      
      // 2. 模擬顯示頁面讀取（使用不同的用戶ID）
      const displayData = await this.simulateDisplayPageLoad();
      
      // 3. 比較數據
      const result = this.compareData(editorData, displayData);
      
      console.log('\n📋 測試總結:');
      console.log(`編輯器保存路徑: cards/${this.testUserId}`);
      console.log(`顯示頁面讀取路徑: cards/${this.testMemberId}/editor`);
      console.log(`數據一致性: ${result.consistent ? '✅ 一致' : '❌ 不一致'}`);
      
      if (!result.consistent) {
        console.log('\n🔧 建議修正方案:');
        console.log('1. 統一使用相同的 Firebase 路徑');
        console.log('2. 確保 userId 和 memberId 的映射關係');
        console.log('3. 實現數據同步機制');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ 測試執行失敗:', error);
      return { consistent: false, issues: [error.message] };
    }
  }
}

// 導出測試類
export default ConsistencyTester;

// 如果直接執行此腳本
if (typeof window !== 'undefined') {
  window.ConsistencyTester = ConsistencyTester;
  console.log('ConsistencyTester 已載入，可在控制台使用：');
  console.log('const tester = new ConsistencyTester(); tester.runTest();');
}