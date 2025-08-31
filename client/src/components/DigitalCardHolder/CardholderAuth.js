import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './CardholderAuth.css';

const CardholderAuth = ({ mode = 'login' }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    title: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除錯誤訊息
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('請輸入電子郵件和密碼');
      return false;
    }

    if (!isLogin) {
      if (!formData.name) {
        setError('請輸入姓名');
        return false;
      }
      
      if (formData.password.length < 6) {
        setError('密碼長度至少需要6個字符');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('密碼確認不一致');
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('請輸入有效的電子郵件地址');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? '/api/digital-cardholder/login' : '/api/digital-cardholder/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            company: formData.company,
            title: formData.title
          };
      
      const response = await axios.post(endpoint, payload);
      
      // 儲存 token
      localStorage.setItem('cardholderToken', response.data.token);
      
      // 導向儀表板
      navigate('/cardholder-dashboard');
      
    } catch (error) {
      console.error('認證失敗:', error);
      setError(error.response?.data?.error || '操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      company: '',
      title: ''
    });
  };

  return (
    <div className="cardholder-auth">
      <div className="auth-container">
        <div className="auth-header">
          <h1>數位名片夾</h1>
          <p>{isLogin ? '登入您的帳戶' : '建立新帳戶'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">姓名 *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="請輸入您的姓名"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">電子郵件 *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="請輸入電子郵件地址"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼 *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder={isLogin ? '請輸入密碼' : '密碼至少6個字符'}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">確認密碼 *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="請再次輸入密碼"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">電話號碼</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="請輸入電話號碼"
                />
              </div>

              <div className="form-group">
                <label htmlFor="company">公司名稱</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  placeholder="請輸入公司名稱"
                />
              </div>

              <div className="form-group">
                <label htmlFor="title">職稱</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="請輸入職稱"
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {isLogin ? '登入中...' : '註冊中...'}
              </>
            ) : (
              <>
                <i className={`fas ${isLogin ? 'fa-sign-in-alt' : 'fa-user-plus'}`}></i>
                {isLogin ? '登入' : '註冊'}
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? '還沒有帳戶？' : '已經有帳戶了？'}
            <button 
              type="button" 
              className="toggle-btn"
              onClick={toggleMode}
            >
              {isLogin ? '立即註冊' : '立即登入'}
            </button>
          </p>
          
          <div className="back-to-home">
            <Link to="/" className="home-link">
              <i className="fas fa-home"></i>
              返回首頁
            </Link>
          </div>
        </div>
      </div>

      <div className="auth-info">
        <div className="info-content">
          <h2>數位名片夾功能</h2>
          <div className="feature-list">
            <div className="feature-item">
              <i className="fas fa-heart"></i>
              <div>
                <h3>收藏名片</h3>
                <p>輕鬆收藏您感興趣的電子名片</p>
              </div>
            </div>
            <div className="feature-item">
              <i className="fas fa-folder"></i>
              <div>
                <h3>分類管理</h3>
                <p>使用資料夾和標籤整理您的名片</p>
              </div>
            </div>
            <div className="feature-item">
              <i className="fas fa-search"></i>
              <div>
                <h3>快速搜尋</h3>
                <p>快速找到您需要的聯絡人資訊</p>
              </div>
            </div>
            <div className="feature-item">
              <i className="fas fa-notes-medical"></i>
              <div>
                <h3>備註功能</h3>
                <p>為每張名片添加個人備註</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardholderAuth;