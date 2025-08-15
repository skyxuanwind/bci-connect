import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import LoadingSpinner from '../components/LoadingSpinner';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } else {
        setError('root', {
          type: 'manual',
          message: result.message
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: '登入過程中發生錯誤，請稍後再試'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">BCI</span>
            </div>
            <span className="ml-3 text-2xl font-bold text-primary-900">商務菁英會</span>
          </Link>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            歡迎回來
          </h2>
          <p className="text-gray-600">
            請登入您的帳號以繼續使用服務
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">
                電子郵件
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`form-input ${
                  errors.email ? 'border-red-300 focus:ring-red-500' : ''
                }`}
                placeholder="請輸入您的電子郵件"
                {...register('email', {
                  required: '請輸入電子郵件',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: '請輸入有效的電子郵件格式'
                  }
                })}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">
                密碼
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`form-input pr-10 ${
                    errors.password ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="請輸入您的密碼"
                  {...register('password', {
                    required: '請輸入密碼',
                    minLength: {
                      value: 6,
                      message: '密碼長度至少需要6個字符'
                    }
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Form Error */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{errors.root.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  登入中...
                </>
              ) : (
                '登入'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                忘記密碼？
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                還沒有帳號？立即註冊
              </Link>
            </div>
            
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              返回首頁
            </Link>
          </div>
        </div>

        {/* Registration Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-700 text-center">
            <p>註冊後需等待管理員審核才能登入</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;