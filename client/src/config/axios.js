import axios from 'axios';

// 根據環境設置 API 基礎 URL
const getBaseURL = () => {
  // 在生產環境中，前端和後端在同一個域名下
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // 開發環境不設置 baseURL，讓請求通過 setupProxy.js 代理
  return '';
};

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
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - clear authentication data
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      localStorage.removeItem('user');
      sessionStorage.clear();
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    console.error('API Error:', {
      status: errorStatus,
      message: errorMessage,
      url: error.config?.url,
      method: error.config?.method
    });
    
    return Promise.reject(error);
  }
);

export default axios;