import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import AvatarUpload from '../components/AvatarUpload';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { isMobile } from '../utils/isMobile';

const Register = () => {
  const { register: registerUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm();

  const password = watch('password');
  const email = watch('email');
  const name = watch('name');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(isMobile() ? '/mobile-app' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Reset verification state if email changes after verification
  useEffect(() => {
    if (emailVerified && email && email !== verifiedEmail) {
      setEmailVerified(false);
      setVerificationSent(false);
      setVerificationCode('');
    }
  }, [email, emailVerified, verifiedEmail]);

  // Handle resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Check for invite parameters
  useEffect(() => {
    const eventId = searchParams.get('event_id');
    const inviterId = searchParams.get('inviter_id');
    
    if (eventId && inviterId) {
      setInviteInfo({ eventId, inviterId });
    }
  }, [searchParams]);

  // Load chapters
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const response = await axios.get('/api/chapters');
        setChapters(response.data.chapters || []);
      } catch (error) {
        console.error('Failed to load chapters:', error);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    loadChapters();
  }, []);

  const handleSendVerification = async () => {
    // Basic email validation before sending
    if (!email) {
      setError('email', { type: 'manual', message: '請先輸入電子郵件' });
      toast.error('請先輸入電子郵件');
      return;
    }
    const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailPattern.test(email)) {
      setError('email', { type: 'manual', message: '請輸入有效的電子郵件格式' });
      toast.error('請輸入有效的電子郵件格式');
      return;
    }
    try {
      setSendingCode(true);
      const payload = { 
        email: (email || '').trim().toLowerCase(), 
        name: (name || '會員').trim() 
      };
      await axios.post('/api/auth/send-verification', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      setVerificationSent(true);
      setResendCountdown(60);
      toast.success('驗證碼已寄出，請至信箱查收');
    } catch (error) {
      const message = error.response?.data?.message || '驗證碼寄送失敗，請稍後再試';
      toast.error(message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = (verificationCode || '').trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error('請輸入6位數驗證碼');
      return;
    }
    try {
      setVerifyingCode(true);
      await axios.post('/api/auth/verify-email', {
        email: (email || '').trim().toLowerCase(),
        verificationCode: code
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
      setEmailVerified(true);
      setVerifiedEmail((email || '').trim().toLowerCase());
      setVerificationCode('');
      setVerificationSent(false);
      toast.success('Email 驗證成功');
    } catch (error) {
      const message = error.response?.data?.message || '驗證失敗，請確認驗證碼是否正確或已逾時';
      toast.error(message);
      console.error('Verify error:', error.response?.data || error.message);
    } finally {
      setVerifyingCode(false);
    }
  };

  const onSubmit = async (data) => {
    if (!emailVerified) {
      setError('email', { type: 'manual', message: '請先完成Email驗證' });
      toast.error('請先完成Email驗證');
      return;
    }
    setIsLoading(true);
    
    try {
      // 創建 FormData 以支持文件上傳
      const formData = new FormData();
      
      // 添加所有表單數據
      formData.append('name', data.name);
      formData.append('email', data.email);
      formData.append('password', data.password);
      if (data.company) formData.append('company', data.company);
      if (data.industry) formData.append('industry', data.industry);
      if (data.title) formData.append('title', data.title);
      if (data.contactNumber) formData.append('contactNumber', data.contactNumber);
      if (data.chapterId) formData.append('chapterId', data.chapterId);
      
      // 添加大頭貼文件
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      
      // 添加邀請信息
      if (inviteInfo) {
        formData.append('inviteInfo', JSON.stringify(inviteInfo));
      }
      
      const result = await registerUser(formData);
      
      if (result.success) {
        // If there's invite info, store it for after login
        if (inviteInfo) {
          localStorage.setItem('pendingEventRegistration', JSON.stringify({
            eventId: inviteInfo.eventId,
            inviterId: inviteInfo.inviterId
          }));
        }
        
        navigate('/login', {
          state: {
            message: inviteInfo 
              ? '註冊成功！請等待管理員審核您的帳號。審核通過後，您將自動報名邀請的活動。'
              : '註冊成功！請等待管理員審核您的帳號。'
          }
        });
      } else {
        setError('root', {
          type: 'manual',
          message: result.message
        });
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: '註冊過程中發生錯誤，請稍後再試'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">GBC</span>
            </div>
            <span className="ml-3 text-2xl font-bold text-primary-900">商務菁英會</span>
          </Link>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            加入GBC商務菁英會
          </h2>
          <p className="text-gray-600">
            填寫以下資訊完成註冊，我們將盡快審核您的申請
          </p>
        </div>

        {/* Registration Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Avatar Upload */}
            <div className="flex justify-center mb-8">
              <div>
                <label className="form-label text-center block mb-4">
                  大頭貼
                </label>
                <AvatarUpload
                  onAvatarChange={setAvatarFile}
                  size="large"
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="form-label">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className={`form-input ${
                    errors.name ? 'border-red-300 focus:ring-red-500' : ''
                  }`}
                  placeholder="請輸入您的姓名"
                  {...register('name', {
                    required: '請輸入姓名',
                    minLength: {
                      value: 2,
                      message: '姓名至少需要2個字符'
                    }
                  })}
                />
                {errors.name && (
                  <p className="form-error">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="form-label">
                  電子郵件 <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
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
                <div className="mt-2 space-y-2">
                  {emailVerified ? (
                    <p className="text-green-600 text-sm">此信箱已完成驗證</p>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleSendVerification}
                          disabled={sendingCode || resendCountdown > 0 || !email}
                          className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingCode ? '寄送中...' : resendCountdown > 0 ? `重新寄送 (${resendCountdown}s)` : '發送驗證碼'}
                        </button>
                        {verificationSent && !emailVerified && (
                          <span className="text-gray-500 text-sm">驗證碼已寄出，請查收郵件</span>
                        )}
                      </div>
                      {verificationSent && !emailVerified && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            className="form-input w-32"
                            placeholder="輸入6位數碼"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={verifyingCode || verificationCode.length !== 6}
                            className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {verifyingCode ? '驗證中...' : '驗證'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Password */}
              <div>
                <label htmlFor="password" className="form-label">
                  密碼 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input pr-10 ${
                      errors.password ? 'border-red-300 focus:ring-red-500' : ''
                    }`}
                    placeholder="請輸入密碼"
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="form-label">
                  確認密碼 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input pr-10 ${
                      errors.confirmPassword ? 'border-red-300 focus:ring-red-500' : ''
                    }`}
                    placeholder="請再次輸入密碼"
                    {...register('confirmPassword', {
                      required: '請確認密碼',
                      validate: value => value === password || '密碼不一致'
                    })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="form-error">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Professional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company */}
              <div>
                <label htmlFor="company" className="form-label">
                  公司名稱
                </label>
                <input
                  id="company"
                  type="text"
                  className="form-input"
                  placeholder="請輸入您的公司名稱"
                  {...register('company')}
                />
              </div>

              {/* Industry */}
              <div>
                <label htmlFor="industry" className="form-label">
                  產業別
                </label>
                <input
                  id="industry"
                  type="text"
                  className="form-input"
                  placeholder="請輸入您的產業別"
                  {...register('industry')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="form-label">
                  職稱
                </label>
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  placeholder="請輸入您的職稱"
                  {...register('title')}
                />
              </div>

              {/* Contact Number */}
              <div>
                <label htmlFor="contactNumber" className="form-label">
                  聯絡電話
                </label>
                <input
                  id="contactNumber"
                  type="tel"
                  className="form-input"
                  placeholder="請輸入您的聯絡電話"
                  {...register('contactNumber')}
                />
              </div>
            </div>

            {/* Chapter Selection */}
            <div>
              <label htmlFor="chapterId" className="form-label">
                所屬分會
              </label>
              {loadingChapters ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="small" />
                  <span className="ml-2 text-gray-500">載入分會列表中...</span>
                </div>
              ) : (
                <select
                  id="chapterId"
                  className="form-input"
                  {...register('chapterId')}
                >
                  <option value="">請選擇分會（可選）</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
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
              disabled={isLoading || !emailVerified}
              className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  註冊中...
                </>
              ) : (
                '註冊'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600">
              已經有帳號？{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                立即登入
              </Link>
            </p>
            
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              返回首頁
            </Link>
          </div>
        </div>

        {/* Notice */}
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gold-100 mb-2">註冊須知</h3>
          <ul className="text-xs text-gold-300 space-y-1">
            <li>• 註冊後需等待管理員審核，審核通過後才能正式使用系統</li>
            <li>• 請確保提供的資訊真實有效，以便審核作業</li>
            <li>• 審核結果將透過電子郵件通知</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Register;