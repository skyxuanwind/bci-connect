const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Taiwan government business registration API endpoint
const GOV_API_BASE_URL = 'https://data.gcis.nat.gov.tw/od/data/api';
const GOV_API_KEY = process.env.GOV_API_KEY; // 需要在環境變數中設定

// @route   GET /api/company-lookup/by-number/:number
// @desc    Lookup company by unified business number
// @access  Private
router.get('/by-number/:number', async (req, res) => {
  try {
    const { number } = req.params;
    
    // 驗證統編格式 (8位數字)
    if (!/^\d{8}$/.test(number)) {
      return res.status(400).json({ 
        success: false, 
        message: '統一編號格式錯誤，請輸入8位數字' 
      });
    }

    try {
      // 調用政府開放資料API（根據官方文件，此 API 無需金鑰）
      const response = await axios.get(`${GOV_API_BASE_URL}/5F64D864-61CB-4D0D-8AD9-492047CC1EA6`, {
        params: {
          $format: 'json',
          $filter: `Business_Accounting_NO eq '${number}'`,
          $skip: 0,
          $top: 50
        },
        timeout: 10000
      });

      console.log('政府 API 回應:', response.data);
      
      // 檢查回應資料格式
      let companies = [];
      if (Array.isArray(response.data)) {
        companies = response.data;
      } else if (response.data && response.data.value && Array.isArray(response.data.value)) {
        companies = response.data.value;
      } else if (response.data && typeof response.data === 'object') {
        companies = [response.data];
      }
      
      if (companies.length > 0) {
        const companyData = companies[0];
        
        res.json({
          success: true,
          data: {
            unifiedBusinessNumber: companyData.Business_Accounting_NO,
            companyName: companyData.Company_Name,
            status: companyData.Company_Status_Desc || companyData.Company_Status,
            setupDate: companyData.Company_Setup_Date,
            capital: companyData.Paid_In_Capital_Stock_Amount || companyData.Capital_Stock_Amount,
            location: companyData.Company_Location,
            address: companyData.Business_Address || companyData.Company_Location,
            responsiblePerson: companyData.Responsible_Name
          }
        });
      } else {
        res.json({
          success: false,
          message: '查無此統一編號的公司資料'
        });
      }
    } catch (apiError) {
      console.warn('政府 API 調用失敗，使用備用資料:', apiError.message);
      
      // API 調用失敗時的備用模擬資料
      const mockCompanyData = {
        '12345678': {
          unifiedBusinessNumber: '12345678',
          companyName: '台灣科技股份有限公司',
          status: '核准設立',
          setupDate: '2020-01-15',
          capital: '10000000',
          location: '台北市信義區',
          address: '台北市信義區信義路五段7號',
          responsiblePerson: '王大明'
        },
        '87654321': {
          unifiedBusinessNumber: '87654321',
          companyName: '創新貿易有限公司',
          status: '核准設立',
          setupDate: '2019-03-20',
          capital: '5000000',
          location: '高雄市前鎮區',
          address: '高雄市前鎮區中山二路123號',
          responsiblePerson: '李小華'
        }
      };
      
      const companyData = mockCompanyData[number];
      
      if (companyData) {
        res.json({
          success: true,
          data: companyData,
          note: '使用備用資料（政府 API 暫時無法使用）'
        });
      } else {
        res.status(404).json({
          success: false,
          message: '查無此統一編號的公司資料（政府 API 暫時無法使用）'
        });
      }
    }
  } catch (error) {
    console.error('Company lookup by number error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: '政府資料查詢逾時，請稍後再試'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '查詢公司資料時發生錯誤'
    });
  }
});

// @route   GET /api/company-lookup/by-name/:name
// @desc    Lookup company by name
// @access  Private
router.get('/by-name/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: '公司名稱至少需要2個字元' 
      });
    }

    try {
      // 調用政府開放資料API
      const response = await axios.get(`${GOV_API_BASE_URL}/5F64D864-61CB-4D0D-8AD9-492047CC1EA6`, {
        params: {
          $format: 'json',
          $filter: `contains(Company_Name,'${name.trim()}')`,
          $select: 'Business_Accounting_NO,Company_Name,Company_Status,Company_Setup_Date,Paid_In_Capital_Stock_Amount,Company_Location,Business_Address,Responsible_Name,Company_Status_Desc',
          $top: 10 // 限制回傳筆數
        },
        timeout: 10000
      });

      console.log('政府 API 回應 (by-name):', response.data);
      
      // 檢查回應資料格式
      let companies = [];
      if (Array.isArray(response.data)) {
        companies = response.data;
      } else if (response.data && response.data.value && Array.isArray(response.data.value)) {
        companies = response.data.value;
      } else if (response.data && typeof response.data === 'object') {
        companies = [response.data];
      }
      
      if (companies.length > 0) {
        const formattedCompanies = companies.map(company => ({
          unifiedBusinessNumber: company.Business_Accounting_NO,
          companyName: company.Company_Name,
          status: company.Company_Status_Desc || company.Company_Status,
          setupDate: company.Company_Setup_Date,
          capital: company.Paid_In_Capital_Stock_Amount || company.Capital_Stock_Amount,
          location: company.Company_Location,
          address: company.Business_Address || company.Company_Location,
          responsiblePerson: company.Responsible_Name
        }));
        
        res.json({
          success: true,
          data: formattedCompanies,
          count: formattedCompanies.length
        });
      } else {
        res.json({
          success: false,
          message: '查無相關公司資料'
        });
      }
    } catch (apiError) {
      console.warn('政府 API 調用失敗，使用備用資料:', apiError.message);
      
      // API 調用失敗時的備用模擬資料
      const mockSearchResults = [
        {
          unifiedBusinessNumber: '12345678',
          companyName: '台灣科技股份有限公司',
          status: '核准設立',
          setupDate: '2020-01-15',
          capital: '10000000',
          location: '台北市信義區',
          address: '台北市信義區信義路五段7號',
          responsiblePerson: '王大明'
        },
        {
          unifiedBusinessNumber: '11223344',
          companyName: '台灣科技開發有限公司',
          status: '核准設立',
          setupDate: '2018-06-10',
          capital: '8000000',
          location: '台中市西屯區',
          address: '台中市西屯區台灣大道三段99號',
          responsiblePerson: '張三豐'
        }
      ];
      
      // 模擬搜尋邏輯
      const searchTerm = name.toLowerCase();
      const results = mockSearchResults.filter(company => 
        company.companyName.toLowerCase().includes(searchTerm)
      );
      
      res.json({
        success: true,
        data: results,
        count: results.length,
        note: '使用備用資料（政府 API 暫時無法使用）'
      });
    }
  } catch (error) {
    console.error('Company lookup by name error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        success: false,
        message: '政府資料查詢逾時，請稍後再試'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '查詢公司資料時發生錯誤'
    });
  }
});

module.exports = router;