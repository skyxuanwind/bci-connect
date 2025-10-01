// 資料過濾工具 - 用於在正式環境中過濾測試資料

/**
 * 檢查是否為測試用戶
 * @param {Object} user - 用戶物件
 * @returns {boolean} - 是否為測試用戶
 */
function isTestUser(user) {
  if (!user) return false;
  
  const testPatterns = {
    email: [
      /test.*@/i,
      /@example\.com$/i,
      /.*test.*/i,
      /demo.*@/i,
      /sample.*@/i
    ],
    name: [
      /測試/,
      /test/i,
      /demo/i,
      /sample/i
    ],
    company: [
      /測試/,
      /test/i,
      /demo/i,
      /sample/i,
      /明志科技/,
      /Chen Tech/i
    ]
  };
  
  // 檢查 email 模式
  if (user.email) {
    for (const pattern of testPatterns.email) {
      if (pattern.test(user.email)) {
        return true;
      }
    }
  }
  
  // 檢查姓名模式
  if (user.name) {
    for (const pattern of testPatterns.name) {
      if (pattern.test(user.name)) {
        return true;
      }
    }
  }
  
  // 檢查公司模式
  if (user.company) {
    for (const pattern of testPatterns.company) {
      if (pattern.test(user.company)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 檢查是否為測試分會
 * @param {Object} chapter - 分會物件
 * @returns {boolean} - 是否為測試分會
 */
function isTestChapter(chapter) {
  if (!chapter) return false;
  
  const testPatterns = [
    /測試/,
    /test/i,
    /demo/i,
    /sample/i
  ];
  
  if (chapter.name) {
    for (const pattern of testPatterns) {
      if (pattern.test(chapter.name)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 過濾用戶列表，移除測試用戶
 * @param {Array} users - 用戶列表
 * @param {boolean} includeTest - 是否包含測試用戶（開發環境為true，正式環境為false）
 * @returns {Array} - 過濾後的用戶列表
 */
function filterUsers(users, includeTest = false) {
  if (!Array.isArray(users)) return users;
  
  // 如果是開發環境或明確要求包含測試資料，則不過濾
  if (includeTest || process.env.NODE_ENV !== 'production') {
    return users;
  }
  
  // 正式環境過濾測試用戶
  return users.filter(user => !isTestUser(user));
}

/**
 * 過濾分會列表，移除測試分會
 * @param {Array} chapters - 分會列表
 * @param {boolean} includeTest - 是否包含測試分會
 * @returns {Array} - 過濾後的分會列表
 */
function filterChapters(chapters, includeTest = false) {
  if (!Array.isArray(chapters)) return chapters;
  
  // 如果是開發環境或明確要求包含測試資料，則不過濾
  if (includeTest || process.env.NODE_ENV !== 'production') {
    return chapters;
  }
  
  // 正式環境過濾測試分會
  return chapters.filter(chapter => !isTestChapter(chapter));
}

/**
 * 獲取資料庫查詢的WHERE條件，用於排除測試資料
 * @param {string} tableAlias - 表格別名（可選）
 * @returns {string} - WHERE條件字串
 */
function getProductionWhereClause(tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  if (process.env.NODE_ENV !== 'production') {
    return ''; // 開發環境不過濾
  }
  
  return `
    AND ${prefix}email NOT LIKE '%test%' 
    AND ${prefix}email NOT LIKE '%@example.com'
    AND ${prefix}name NOT LIKE '%測試%'
    AND ${prefix}name NOT LIKE '%test%'
    AND ${prefix}company NOT LIKE '%測試%'
    AND ${prefix}company NOT LIKE '%test%'
    AND ${prefix}company NOT LIKE '%明志科技%'
    AND ${prefix}company NOT LIKE '%Chen Tech%'
  `;
}

/**
 * 檢查當前環境是否應該顯示測試資料
 * @returns {boolean} - 是否應該顯示測試資料
 */
function shouldShowTestData() {
  // 開發環境顯示測試資料
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  
  // 正式環境檢查是否有特殊標記
  return process.env.SHOW_TEST_DATA === 'true';
}

/**
 * 記錄測試資料過濾日誌
 * @param {string} action - 動作描述
 * @param {number} originalCount - 原始數量
 * @param {number} filteredCount - 過濾後數量
 */
function logDataFilter(action, originalCount, filteredCount) {
  if (process.env.NODE_ENV === 'production' && originalCount !== filteredCount) {
    console.log(`🔒 [生產環境] ${action}: 過濾前 ${originalCount} 筆，過濾後 ${filteredCount} 筆`);
  }
}

module.exports = {
  isTestUser,
  isTestChapter,
  filterUsers,
  filterChapters,
  getProductionWhereClause,
  shouldShowTestData,
  logDataFilter
};