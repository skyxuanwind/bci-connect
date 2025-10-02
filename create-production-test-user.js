const axios = require('axios');

const PRODUCTION_URL = 'https://www.gbc-connect.com';

async function createProductionTestUser() {
  try {
    console.log('🚀 正在生產環境中創建測試用戶...');
    
    // 嘗試註冊新用戶
    const registerData = {
      name: '測試用戶',
      email: 'prodtest@example.com',
      password: 'test123456',
      company: '測試公司',
      industry: '科技業',
      title: '工程師',
      contactNumber: '0912345678',
      chapterId: 1
    };
    
    console.log('📝 註冊用戶:', registerData.email);
    
    try {
      const registerResponse = await axios.post(
        `${PRODUCTION_URL}/api/auth/register`,
        registerData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ 註冊響應:', registerResponse.data);
    } catch (registerError) {
      console.log('⚠️ 註冊錯誤 (可能用戶已存在):', registerError.response?.data?.message || registerError.message);
    }
    
    // 嘗試登入
    console.log('\n🔐 嘗試登入...');
    const loginData = {
      email: 'prodtest@example.com',
      password: 'test123456'
    };
    
    try {
      const loginResponse = await axios.post(
        `${PRODUCTION_URL}/api/auth/login`,
        loginData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ 登入成功!');
      console.log('🎫 Token:', loginResponse.data.token?.substring(0, 50) + '...');
      console.log('👤 用戶信息:', {
        id: loginResponse.data.user?.id,
        name: loginResponse.data.user?.name,
        email: loginResponse.data.user?.email,
        status: loginResponse.data.user?.status
      });
      
      // 測試 my-card API
      console.log('\n🃏 測試 my-card API...');
      const cardResponse = await axios.get(
        `${PRODUCTION_URL}/api/nfc-cards/my-card`,
        {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`
          }
        }
      );
      
      console.log('✅ my-card API 正常工作!');
      console.log('📄 卡片配置:', {
        id: cardResponse.data.cardConfig?.id,
        template_id: cardResponse.data.cardConfig?.template_id,
        template_name: cardResponse.data.cardConfig?.template_name
      });
      
    } catch (loginError) {
      console.log('❌ 登入失敗:', loginError.response?.data?.message || loginError.message);
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  }
}

// 執行腳本
createProductionTestUser();