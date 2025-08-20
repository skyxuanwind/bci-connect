import axios from 'axios';

// 根據環境設置 API 基礎 URL
const getBaseURL = () => {
  // 在生產環境中，使用環境變數或當前域名
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || '';
  }
  // 開發環境使用 proxy
  return process.env.REACT_APP_API_URL || '';
};

// 創建 axios 實例
const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Base URL:', getBaseURL());

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 從 cookie 中獲取 token
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
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 處理未授權錯誤
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;// Force deploy trigger 2025年 8月19日 星期二 00时19分57秒 CST
