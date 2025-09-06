import axios from 'axios';

// 根據環境設置 API 基礎 URL
const getBaseURL = () => {
  // 允許以環境變數覆蓋（例如在部署或特別開發情境）
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // 預設走同源 + CRA 代理，在生產與開發皆回傳空字串
  return '';
}

// 設置axios默認配置
axios.defaults.baseURL = getBaseURL();
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

console.log('API Base URL:', axios.defaults.baseURL);

// 請求攔截器
axios.interceptors.request.use(
  (config) => {
    // Try to get token from cookies
    const getCookieValue = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const token = getCookieValue('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 提供更詳細的錯誤訊息
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    const errorStatus = error.response?.status || 'No status';
    
    console.error('API Error:', {
      status: errorStatus,
      message: errorMessage,
      url: error.config?.url,
      method: error.config?.method
    });
    
    // 不在這裡處理認證錯誤，讓 AuthContext 統一處理
    return Promise.reject(error);
  }
);

export default axios;