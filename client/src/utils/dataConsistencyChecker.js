/**
 * 數據一致性檢查工具
 * 用於檢測電子名片編輯器中的數據不一致問題
 */

class DataConsistencyChecker {
  constructor() {
    this.checks = [];
    this.inconsistencies = [];
    // 在開發環境或測試環境中啟用
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV;
  }

  /**
   * 檢查數據完整性
   * @param {Object} data - 要檢查的數據
   * @param {string} source - 數據來源（如 'localStorage', 'firebase', 'state'）
   * @returns {Object} 檢查結果
   */
  checkDataIntegrity(data, source = 'unknown') {
    if (!this.isEnabled) return { isValid: true, issues: [] };

    const issues = [];
    const timestamp = new Date().toISOString();

    // 檢查 1: 基本結構完整性
    if (!data || typeof data !== 'object') {
      issues.push({
        type: 'structure',
        severity: 'critical',
        message: '數據不是有效的物件',
        source,
        timestamp
      });
      return { isValid: false, issues };
    }

    // 檢查 2: 必要欄位存在性
    const requiredFields = ['info', 'blocks', 'themeId'];
    requiredFields.forEach(field => {
      if (!(field in data)) {
        issues.push({
          type: 'missing_field',
          severity: 'high',
          message: `缺少必要欄位: ${field}`,
          field,
          source,
          timestamp
        });
      }
    });

    // 檢查 3: info 物件完整性
    if (data.info && typeof data.info === 'object') {
      const infoFields = ['name', 'title', 'company', 'email', 'phone'];
      const missingInfoFields = infoFields.filter(field => 
        data.info[field] === undefined || data.info[field] === null
      );
      if (missingInfoFields.length > 0) {
        issues.push({
          type: 'incomplete_info',
          severity: 'medium',
          message: `info 物件缺少欄位: ${missingInfoFields.join(', ')}`,
          missingFields: missingInfoFields,
          source,
          timestamp
        });
      }
    }

    // 檢查 4: blocks 陣列完整性
    if (Array.isArray(data.blocks)) {
      data.blocks.forEach((block, index) => {
        if (!block.id) {
          issues.push({
            type: 'invalid_block',
            severity: 'high',
            message: `區塊 ${index} 缺少 ID`,
            blockIndex: index,
            source,
            timestamp
          });
        }
        if (!block.type) {
          issues.push({
            type: 'invalid_block',
            severity: 'high',
            message: `區塊 ${index} 缺少類型`,
            blockIndex: index,
            source,
            timestamp
          });
        }
      });

      // 檢查重複 ID
      const blockIds = data.blocks.map(b => b.id).filter(Boolean);
      const duplicateIds = blockIds.filter((id, index) => blockIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        issues.push({
          type: 'duplicate_block_ids',
          severity: 'critical',
          message: `發現重複的區塊 ID: ${duplicateIds.join(', ')}`,
          duplicateIds,
          source,
          timestamp
        });
      }
    } else if (data.blocks !== undefined) {
      issues.push({
        type: 'invalid_blocks',
        severity: 'critical',
        message: 'blocks 不是有效的陣列',
        source,
        timestamp
      });
    }

    // 檢查 5: 時間戳一致性
    if (data._lastModified && typeof data._lastModified !== 'number') {
      issues.push({
        type: 'invalid_timestamp',
        severity: 'medium',
        message: '_lastModified 不是有效的時間戳',
        source,
        timestamp
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length
      }
    };
  }

  /**
   * 比較兩個數據源的一致性
   * @param {Object} data1 - 第一個數據源
   * @param {Object} data2 - 第二個數據源
   * @param {string} source1 - 第一個數據源名稱
   * @param {string} source2 - 第二個數據源名稱
   * @returns {Object} 比較結果
   */
  compareDataSources(data1, data2, source1 = 'source1', source2 = 'source2') {
    if (!this.isEnabled) return { isConsistent: true, differences: [] };

    const differences = [];
    const timestamp = new Date().toISOString();

    // 深度比較函數
    const deepCompare = (obj1, obj2, path = '') => {
      const keys1 = Object.keys(obj1 || {});
      const keys2 = Object.keys(obj2 || {});
      const allKeys = [...new Set([...keys1, ...keys2])];

      allKeys.forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];

        if (val1 === undefined && val2 !== undefined) {
          differences.push({
            type: 'missing_in_source1',
            path: currentPath,
            source1Value: undefined,
            source2Value: val2,
            message: `${source1} 缺少欄位 ${currentPath}`,
            timestamp
          });
        } else if (val2 === undefined && val1 !== undefined) {
          differences.push({
            type: 'missing_in_source2',
            path: currentPath,
            source1Value: val1,
            source2Value: undefined,
            message: `${source2} 缺少欄位 ${currentPath}`,
            timestamp
          });
        } else if (val1 !== val2) {
          if (typeof val1 === 'object' && typeof val2 === 'object' && 
              val1 !== null && val2 !== null && 
              !Array.isArray(val1) && !Array.isArray(val2)) {
            // 遞迴比較物件
            deepCompare(val1, val2, currentPath);
          } else if (Array.isArray(val1) && Array.isArray(val2)) {
            // 比較陣列
            if (val1.length !== val2.length) {
              differences.push({
                type: 'array_length_mismatch',
                path: currentPath,
                source1Value: val1.length,
                source2Value: val2.length,
                message: `陣列長度不一致 ${currentPath}: ${source1}(${val1.length}) vs ${source2}(${val2.length})`,
                timestamp
              });
            }
            // 比較陣列內容
            const maxLength = Math.max(val1.length, val2.length);
            for (let i = 0; i < maxLength; i++) {
              if (i >= val1.length) {
                differences.push({
                  type: 'array_item_missing',
                  path: `${currentPath}[${i}]`,
                  source1Value: undefined,
                  source2Value: val2[i],
                  message: `${source1} 陣列項目缺失 ${currentPath}[${i}]`,
                  timestamp
                });
              } else if (i >= val2.length) {
                differences.push({
                  type: 'array_item_extra',
                  path: `${currentPath}[${i}]`,
                  source1Value: val1[i],
                  source2Value: undefined,
                  message: `${source2} 陣列項目缺失 ${currentPath}[${i}]`,
                  timestamp
                });
              } else if (JSON.stringify(val1[i]) !== JSON.stringify(val2[i])) {
                differences.push({
                  type: 'array_item_mismatch',
                  path: `${currentPath}[${i}]`,
                  source1Value: val1[i],
                  source2Value: val2[i],
                  message: `陣列項目不一致 ${currentPath}[${i}]`,
                  timestamp
                });
              }
            }
          } else {
            differences.push({
              type: 'value_mismatch',
              path: currentPath,
              source1Value: val1,
              source2Value: val2,
              message: `值不一致 ${currentPath}: ${source1}(${JSON.stringify(val1)}) vs ${source2}(${JSON.stringify(val2)})`,
              timestamp
            });
          }
        }
      });
    };

    deepCompare(data1, data2);

    return {
      isConsistent: differences.length === 0,
      differences,
      summary: {
        total: differences.length,
        missingInSource1: differences.filter(d => d.type === 'missing_in_source1').length,
        missingInSource2: differences.filter(d => d.type === 'missing_in_source2').length,
        valueMismatches: differences.filter(d => d.type === 'value_mismatch').length,
        arrayIssues: differences.filter(d => d.type.startsWith('array_')).length
      }
    };
  }

  /**
   * 記錄不一致問題
   * @param {Object} issue - 問題詳情
   */
  logInconsistency(issue) {
    if (!this.isEnabled) return;

    this.inconsistencies.push({
      ...issue,
      timestamp: new Date().toISOString()
    });

    // 只保留最近 100 條記錄
    if (this.inconsistencies.length > 100) {
      this.inconsistencies = this.inconsistencies.slice(-100);
    }

    console.warn('[DataConsistencyChecker] 發現數據不一致:', issue);
  }

  /**
   * 獲取所有記錄的不一致問題
   * @returns {Array} 不一致問題列表
   */
  getInconsistencies() {
    return this.inconsistencies;
  }

  /**
   * 清除記錄的不一致問題
   */
  clearInconsistencies() {
    this.inconsistencies = [];
  }

  /**
   * 生成數據一致性報告
   * @param {Object} data - 要檢查的數據
   * @param {Object} options - 檢查選項
   * @returns {Object} 完整的一致性報告
   */
  generateReport(data, options = {}) {
    if (!this.isEnabled) return { enabled: false };

    const { sources = [], includeHistory = false } = options;
    const report = {
      timestamp: new Date().toISOString(),
      dataIntegrity: this.checkDataIntegrity(data, 'main'),
      sourcesComparison: [],
      history: includeHistory ? this.getInconsistencies() : [],
      recommendations: []
    };

    // 比較多個數據源
    if (sources.length > 1) {
      for (let i = 0; i < sources.length - 1; i++) {
        for (let j = i + 1; j < sources.length; j++) {
          const comparison = this.compareDataSources(
            sources[i].data,
            sources[j].data,
            sources[i].name,
            sources[j].name
          );
          report.sourcesComparison.push(comparison);
        }
      }
    }

    // 生成建議
    if (!report.dataIntegrity.isValid) {
      report.recommendations.push('修復數據完整性問題');
    }
    if (report.sourcesComparison.some(c => !c.isConsistent)) {
      report.recommendations.push('同步不一致的數據源');
    }
    if (report.history.length > 10) {
      report.recommendations.push('檢查頻繁的數據不一致問題');
    }

    return report;
  }
}

// 創建實例並導出
export const dataConsistencyChecker = new DataConsistencyChecker();

export default DataConsistencyChecker;