const axios = require('axios');
const cheerio = require('cheerio');

class LawsQService {
  constructor() {
    this.baseUrl = 'https://www.lawsq.com';
    this.searchUrl = `${this.baseUrl}/search`;
  }

  /**
   * 搜尋公司判決書資料
   * @param {string} companyName - 公司名稱
   * @returns {Promise<Object>} 搜尋結果
   */
  async searchJudgments(companyName) {
    try {
      console.log(`🔍 LawsQ 搜尋判決書: ${companyName}`);
      
      // 發送搜尋請求
      const response = await axios.get(this.searchUrl, {
        params: {
          q: companyName
        },
        timeout: 10000, // 10秒超時
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 解析 HTML 內容
      const $ = cheerio.load(response.data);
      const results = this.parseSearchResults($);

      if (results.length === 0) {
        console.log(`❌ LawsQ 搜尋無結果: ${companyName}`);
        return {
          success: false,
          companyName,
          results: [],
          summary: '無',
          searchUrl: `${this.searchUrl}?q=${encodeURIComponent(companyName)}`
        };
      }

      console.log(`✅ LawsQ 搜尋成功: ${companyName}, 找到 ${results.length} 筆結果`);
      
      return {
        success: true,
        companyName,
        results: results.slice(0, 5), // 限制最多5筆結果
        summary: this.generateSummary(results),
        searchUrl: `${this.searchUrl}?q=${encodeURIComponent(companyName)}`
      };

    } catch (error) {
      console.error(`❌ LawsQ 搜尋錯誤 (${companyName}):`, error.message);
      
      return {
        success: false,
        companyName,
        results: [],
        summary: '無',
        error: error.message,
        searchUrl: `${this.searchUrl}?q=${encodeURIComponent(companyName)}`
      };
    }
  }

  /**
   * 解析搜尋結果頁面
   * @param {CheerioStatic} $ - Cheerio 實例
   * @returns {Array} 解析後的結果
   */
  parseSearchResults($) {
    const results = [];
    
    try {
      // 嘗試多種可能的選擇器
      const selectors = [
        '.search-result',
        '.result-item',
        '.judgment-item',
        '.case-item',
        'article',
        '.content-item',
        '[data-result]'
      ];

      let foundResults = false;
      
      for (const selector of selectors) {
        const items = $(selector);
        if (items.length > 0) {
          foundResults = true;
          items.each((index, element) => {
            const $item = $(element);
            const result = this.extractResultData($item, $);
            if (result && result.title) {
              results.push(result);
            }
          });
          break;
        }
      }

      // 如果沒有找到結構化結果，嘗試提取頁面文字
      if (!foundResults) {
        const pageText = $('body').text().trim();
        if (pageText.includes('判決') || pageText.includes('裁定') || pageText.includes('案件')) {
          results.push({
            title: '搜尋結果',
            content: pageText.substring(0, 500) + '...',
            type: 'general'
          });
        }
      }

    } catch (error) {
      console.error('解析搜尋結果錯誤:', error.message);
    }

    return results;
  }

  /**
   * 從單個結果元素提取資料
   * @param {Cheerio} $item - 結果元素
   * @param {CheerioStatic} $ - Cheerio 實例
   * @returns {Object} 提取的資料
   */
  extractResultData($item, $) {
    try {
      // 嘗試提取標題
      const titleSelectors = ['h1', 'h2', 'h3', '.title', '.case-title', 'a', 'strong'];
      let title = '';
      
      for (const selector of titleSelectors) {
        const titleElement = $item.find(selector).first();
        if (titleElement.length > 0) {
          title = titleElement.text().trim();
          if (title) break;
        }
      }

      // 嘗試提取內容
      const contentSelectors = ['.content', '.summary', '.description', 'p', '.text'];
      let content = '';
      
      for (const selector of contentSelectors) {
        const contentElement = $item.find(selector).first();
        if (contentElement.length > 0) {
          content = contentElement.text().trim();
          if (content) break;
        }
      }

      // 如果沒有找到內容，使用整個元素的文字
      if (!content) {
        content = $item.text().trim();
      }

      // 嘗試提取連結
      const link = $item.find('a').first().attr('href') || '';
      const fullLink = link.startsWith('http') ? link : (link ? `${this.baseUrl}${link}` : '');

      return {
        title: title || '判決書',
        content: content.substring(0, 300) + (content.length > 300 ? '...' : ''),
        link: fullLink,
        type: 'judgment'
      };

    } catch (error) {
      console.error('提取結果資料錯誤:', error.message);
      return null;
    }
  }

  /**
   * 生成搜尋結果摘要
   * @param {Array} results - 搜尋結果
   * @returns {string} 摘要文字
   */
  generateSummary(results) {
    if (results.length === 0) {
      return '無';
    }

    const summaryParts = [];
    
    // 統計結果數量
    summaryParts.push(`找到 ${results.length} 筆相關判決書`);
    
    // 提取關鍵資訊
    const keywords = ['民事', '刑事', '行政', '勞動', '商事', '智慧財產', '稅務'];
    const foundKeywords = [];
    
    results.forEach(result => {
      const text = (result.title + ' ' + result.content).toLowerCase();
      keywords.forEach(keyword => {
        if (text.includes(keyword) && !foundKeywords.includes(keyword)) {
          foundKeywords.push(keyword);
        }
      });
    });
    
    if (foundKeywords.length > 0) {
      summaryParts.push(`涉及: ${foundKeywords.join('、')}`);
    }
    
    // 提取第一筆結果的簡要內容
    if (results[0] && results[0].content) {
      const firstContent = results[0].content.substring(0, 100);
      summaryParts.push(`主要內容: ${firstContent}...`);
    }
    
    return summaryParts.join(' | ');
  }
}

module.exports = new LawsQService();