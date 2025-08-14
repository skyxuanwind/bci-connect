import axios from 'axios';

// 根據環境設置 API 基礎 URL
const getBaseURL = () => {
  // 在生產環境中，前端和後端在同一個域名下
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // 開發環境使用本地後端服務器
  return process.env.REACT_APP_API_URL || 'http://localhost:5001';
};

// 設置axios默認配置
axios.defaults.baseURL = getBaseURL();
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

console.log('API Base URL:', axios.defaults.baseURL);

// 請求攔截器
axios.interceptors.request.use(
  (config) => {
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
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default axios;