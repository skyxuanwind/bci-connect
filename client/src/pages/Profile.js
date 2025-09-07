import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import AvatarUpload from '../components/AvatarUpload';
import { toast } from 'react-hot-toast';
import axios from '../config/axios';
import {
  UserIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  CreditCardIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  StarIcon,
  UsersIcon,
  MegaphoneIcon,
  UserGroupIcon,
  HeartIcon,
  LightBulbIcon,
  FlagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSavingInterview, setIsSavingInterview] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      company: user?.company || '',
      industry: user?.industry || '',
      title: user?.title || '',
      contactNumber: user?.contactNumber || '',
      nfcCardUrl: user?.nfcCardUrl || ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch
  } = useForm();

  const {
    register: registerInterview,
    handleSubmit: handleSubmitInterview,
    formState: { errors: interviewErrors },
    reset: resetInterview
  } = useForm({
    defaultValues: {
      companyName: user?.interviewForm?.companyName || '',
      brandLogo: user?.interviewForm?.brandLogo || '',
      industry: user?.interviewForm?.industry || '',
      coreServices: user?.interviewForm?.coreServices || '',
      competitiveAdvantage: user?.interviewForm?.competitiveAdvantage || '',
      targetMarket: user?.interviewForm?.targetMarket || '',
      idealCustomer: user?.interviewForm?.idealCustomer || '',
      customerExamples: user?.interviewForm?.customerExamples || '',
      customerTraits: user?.interviewForm?.customerTraits || '',
      customerPainPoints: user?.interviewForm?.customerPainPoints || '',
      referralTrigger: user?.interviewForm?.referralTrigger || '',
      referralOpening: user?.interviewForm?.referralOpening || '',
      qualityReferral: user?.interviewForm?.qualityReferral || '',
      unsuitableReferral: user?.interviewForm?.unsuitableReferral || '',
      partnerTypes: user?.interviewForm?.partnerTypes || '',
      businessGoals: user?.interviewForm?.businessGoals || '',
      personalInterests: user?.interviewForm?.personalInterests || ''
    }
  });

  // 當 AuthContext 的 user 更新時，同步表單顯示值（react-hook-form 的 defaultValues 只在初始化時生效）
  useEffect(() => {
    if (!user) return;
    resetProfile({
      name: user.name || '',
      company: user.company || '',
      industry: user.industry || '',
      title: user.title || '',
      contactNumber: user.contactNumber || '',
      nfcCardUrl: user.nfcCardUrl || ''
    });
  }, [user, resetProfile]);

  // 同步面談表單數據，並從個人資料自動填入公司和專業別
  // 使用 ref 來追蹤是否已經初始化，避免重複重置表單
  const [isInterviewFormInitialized, setIsInterviewFormInitialized] = useState(false);
  
  useEffect(() => {
    if (!user || isInterviewFormInitialized) return;
    
    resetInterview({
      // 優先使用面談表單已保存的數據，如果沒有則從個人資料自動填入
      companyName: user.interviewForm?.companyName || user.company || '',
      brandLogo: user.interviewForm?.brandLogo || '',
      industry: user.interviewForm?.industry || user.industry || '',
      coreServices: user.interviewForm?.coreServices || '',
      competitiveAdvantage: user.interviewForm?.competitiveAdvantage || '',
      targetMarket: user.interviewForm?.targetMarket || '',
      idealCustomer: user.interviewForm?.idealCustomer || '',
      customerExamples: user.interviewForm?.customerExamples || '',
      customerTraits: user.interviewForm?.customerTraits || '',
      customerPainPoints: user.interviewForm?.customerPainPoints || '',
      referralTrigger: user.interviewForm?.referralTrigger || '',
      referralOpening: user.interviewForm?.referralOpening || '',
      qualityReferral: user.interviewForm?.qualityReferral || '',
      unsuitableReferral: user.interviewForm?.unsuitableReferral || '',
      partnerTypes: user.interviewForm?.partnerTypes || '',
      businessGoals: user.interviewForm?.businessGoals || '',
      personalInterests: user.interviewForm?.personalInterests || ''
    });
    
    setIsInterviewFormInitialized(true);
  }, [user, isInterviewFormInitialized]); // 只在用戶載入且未初始化時執行

  const newPassword = watch('newPassword');

  const onSubmitProfile = async (data) => {
    setIsUpdating(true);
    try {
      // 如果有新的大頭貼，使用 FormData
      if (avatarFile) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
            formData.append(key, data[key]);
          }
        });
        formData.append('avatar', avatarFile);
        
        await axios.put('/api/users/profile', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } else {
        await updateProfile(data);
      }
      
      toast.success('個人資料更新成功！');
      setAvatarFile(null); // 清除已上傳的文件
    } catch (error) {
      toast.error(error.response?.data?.message || '更新失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  const onSubmitPassword = async (data) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success('密碼修改成功！');
      resetPassword();
    } catch (error) {
      toast.error(error.response?.data?.message || '密碼修改失敗，請稍後再試');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onSubmitInterview = async (data) => {
    setIsSavingInterview(true);
    try {
      const response = await axios.put('/api/users/interview-form', data);
      toast.success('面談表單儲存成功！');
      // 直接更新 AuthContext 中的用戶資料
      if (response.data.user) {
        updateProfile(response.data.user);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || '面談表單儲存失敗，請稍後再試');
    } finally {
      setIsSavingInterview(false);
    }
  };

  const getMembershipLevelText = (level) => {
    const levels = {
      1: '核心',
    2: '幹部',
    3: '會員'
    };
    return levels[level] || '未設定';
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: 'level-1',
      2: 'level-2',
      3: 'level-3'
    };
    
    return (
      <span className={`badge ${badges[level] || 'bg-gray-500'} text-sm px-3 py-1 rounded-full font-medium text-white`}>
        {getMembershipLevelText(level)}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { text: '正常', class: 'badge-success' },
      pending_approval: { text: '待審核', class: 'badge-warning' },
      suspended: { text: '暫停', class: 'badge-danger' },
      blacklisted: { text: '黑名單', class: 'badge-danger' }
    };
    
    const config = statusConfig[status] || { text: '未知', class: 'badge-info' };
    
    return (
      <span className={`badge ${config.class} text-sm px-3 py-1 rounded-full font-medium`}>
        {config.text}
      </span>
    );
  };

  const tabs = [
    { id: 'profile', name: '個人資料', icon: UserIcon },
    { id: 'interview', name: '會員一對一面談表', icon: ChatBubbleLeftRightIcon },
    { id: 'password', name: '修改密碼', icon: KeyIcon }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-primary text-white rounded-lg p-6">
        <div className="flex items-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-white" />
          </div>
          <div className="ml-6">
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-blue-100 mt-1">{user?.email}</p>
            <div className="flex items-center space-x-4 mt-3">
              {user?.membershipLevel ? getMembershipLevelBadge(user.membershipLevel) : null}
            {user?.status ? getStatusBadge(user.status) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">個人資料</h2>
            <p className="text-sm text-gray-600 mt-1">更新您的個人資料和聯絡資訊</p>
          </div>
          
          <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-8">
            {/* Avatar Upload Section */}
            <div className="flex justify-center pb-6 border-b border-gray-200">
              <div>
                <label className="form-label text-center block mb-4">
                  大頭貼
                </label>
                <AvatarUpload
                  currentAvatar={user?.profilePictureUrl}
                  onAvatarChange={setAvatarFile}
                  size="large"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="label">
                  <UserIcon className="h-4 w-4 mr-2" />
                  姓名
                </label>
                <input
                  type="text"
                  className={`input w-full ${profileErrors.name ? 'input-error' : ''}`}
                  {...registerProfile('name', {
                    required: '請輸入姓名',
                    minLength: { value: 2, message: '姓名至少需要2個字符' }
                  })}
                />
                {profileErrors.name && (
                  <p className="error-message">{profileErrors.name.message}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="label">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  電子郵件
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="input w-full bg-gray-50 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">電子郵件無法修改</p>
              </div>

              {/* Company */}
              <div>
                <label className="label">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  公司
                </label>
                <input
                  type="text"
                  className={`input w-full ${profileErrors.company ? 'input-error' : ''}`}
                  {...registerProfile('company', {
                    required: '請輸入公司名稱'
                  })}
                />
                {profileErrors.company && (
                  <p className="error-message">{profileErrors.company.message}</p>
                )}
              </div>

              {/* Industry */}
              <div>
                <label className="label">
                  <BriefcaseIcon className="h-4 w-4 mr-2" />
                  產業別
                </label>
                <input
                  type="text"
                  className={`input w-full ${profileErrors.industry ? 'input-error' : ''}`}
                  {...registerProfile('industry', {
                    required: '請輸入產業別'
                  })}
                />
                {profileErrors.industry && (
                  <p className="error-message">{profileErrors.industry.message}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="label">
                  <BriefcaseIcon className="h-4 w-4 mr-2" />
                  職稱
                </label>
                <input
                  type="text"
                  className={`input w-full ${profileErrors.title ? 'input-error' : ''}`}
                  {...registerProfile('title', {
                    required: '請輸入職稱'
                  })}
                />
                {profileErrors.title && (
                  <p className="error-message">{profileErrors.title.message}</p>
                )}
              </div>

              {/* Contact Number */}
              <div>
                <label className="label">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  聯絡電話
                </label>
                <input
                  type="tel"
                  className={`input w-full ${profileErrors.contactNumber ? 'input-error' : ''}`}
                  {...registerProfile('contactNumber', {
                    required: '請輸入聯絡電話',
                    pattern: {
                      value: /^[0-9+\-\s()]+$/,
                      message: '請輸入有效的電話號碼'
                    }
                  })}
                />
                {profileErrors.contactNumber && (
                  <p className="error-message">{profileErrors.contactNumber.message}</p>
                )}
              </div>

              {/* NFC Card URL */}
              <div>
                <label className="label">
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  NFC 卡片網址
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/nfc-card"
                  className={`input w-full ${profileErrors.nfcCardUrl ? 'input-error' : ''}`}
                  {...registerProfile('nfcCardUrl', {
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: '請輸入有效的網址（需以 http:// 或 https:// 開頭）'
                    }
                  })}
                />
                {profileErrors.nfcCardUrl && (
                  <p className="error-message">{profileErrors.nfcCardUrl.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">設定 NFC 卡片中的網址，用於報到識別</p>
              </div>

            </div>

            {/* Additional Info (Read-only) */}
            <div className="border-t pt-8">
              <h3 className="text-md font-medium text-gray-900 mb-6">帳號資訊</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="label">會員等級</label>
                  <div className="mt-2">
                    {user?.membershipLevel ? getMembershipLevelBadge(user.membershipLevel) : null}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="label">所屬分會</label>
                  <p className="mt-2 text-sm text-gray-900">{user?.chapterName || '未設定'}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="label">帳號狀態</label>
                  <div className="mt-2">
                    {user?.status ? getStatusBadge(user.status) : null}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="label">註冊時間</label>
                  <p className="mt-2 text-sm text-gray-900">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-TW') : '未知'}
                  </p>
                </div>
                

              </div>
            </div>

            {/* Personal QR Code Section */}
            <div className="border-t pt-8">
              <h3 className="text-md font-medium text-gray-900 mb-6">個人 QR Code</h3>
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img
                    src={`${axios.defaults.baseURL}/api/qrcode/member/${user?.id}`}
                    alt={`${user?.name} 的 QR Code`}
                    className="w-32 h-32 mx-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="w-32 h-32 mx-auto flex items-center justify-center text-gray-400 text-sm" style={{display: 'none'}}>
                    QR Code 載入失敗
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  掃描此 QR Code 可快速獲取您的聯絡資訊
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUpdating}
                className="btn-primary"
              >
                {isUpdating ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">更新中...</span>
                  </>
                ) : (
                  '更新資料'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interview Form Tab */}
      {activeTab === 'interview' && (
        <div className="card">
          <div className="card-header bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center space-x-3">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">會員一對一面談表</h2>
                <p className="text-sm text-gray-600 mt-1">🎯 透過深度交流，建立信任，創造精準引薦機會</p>
              </div>
            </div>
            
            {/* 進度指示器 */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>填寫進度</span>
                <span>完成後將大幅提升引薦成功率</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{width: '0%'}} id="progress-bar"></div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmitInterview(onSubmitInterview)} className="space-y-10 p-6">
            {/* 第一部分：我的業務核心與價值主張 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <StarIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">第一部分：我的業務核心與價值主張</h3>
                  <p className="text-sm text-gray-600 mt-1">💼 讓大家清楚了解「我是誰，我做什麼」</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {/* 公司／品牌名稱 */}
                <div className="space-y-2">
                  <label className="label font-semibold">
                    <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
                    公司／品牌名稱
                  </label>
                  <input
                    type="text"
                    placeholder="例如：ABC科技有限公司"
                    className={`input w-full ${interviewErrors.companyName ? 'input-error' : ''}`}
                    {...registerInterview('companyName')}
                  />
                  <p className="text-xs text-gray-500">💡 填寫您的公司或個人品牌名稱（已自動從個人資料填入）</p>
                  {interviewErrors.companyName && (
                    <p className="error-message">{interviewErrors.companyName.message}</p>
                  )}
                </div>

                {/* 代表行業／職業 */}
                <div className="space-y-2">
                  <label className="label font-semibold">
                    <BriefcaseIcon className="h-5 w-5 mr-2 text-blue-600" />
                    代表行業／職業
                  </label>
                  <input
                    type="text"
                    placeholder="例如：資訊科技業、財務顧問"
                    className={`input w-full ${interviewErrors.industry ? 'input-error' : ''}`}
                    {...registerInterview('industry')}
                  />
                  <p className="text-xs text-gray-500">💡 讓人一眼就知道您的專業領域（已自動從個人資料填入）</p>
                  {interviewErrors.industry && (
                    <p className="error-message">{interviewErrors.industry.message}</p>
                  )}
                </div>
              </div>

              {/* 核心產品／服務詳述 */}
              <div className="mt-8 space-y-2">
                <label className="label font-semibold">
                  <LightBulbIcon className="h-5 w-5 mr-2 text-blue-600" />
                  核心產品／服務詳述
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">📝 <strong>填寫提示：</strong>請具體說明您提供什麼產品或服務，讓人一看就懂</p>
                  <p className="text-xs text-blue-600 mt-1">範例：「提供企業數位轉型顧問服務，包含系統導入、流程優化、員工培訓」</p>
                </div>
                <textarea
                  rows={4}
                  className={`input w-full ${interviewErrors.coreServices ? 'input-error' : ''}`}
                  placeholder="請詳細描述您的核心產品或服務，包含具體內容和服務範圍..."
                  {...registerInterview('coreServices')}
                />
                {interviewErrors.coreServices && (
                  <p className="error-message">{interviewErrors.coreServices.message}</p>
                )}
              </div>

              {/* 我與競爭者的最大差異 */}
              <div className="mt-8 space-y-2">
                <label className="label font-semibold">
                  <FlagIcon className="h-5 w-5 mr-2 text-blue-600" />
                  我與競爭者的最大差異
                </label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-800">🎯 <strong>填寫提示：</strong>說明您的獨特優勢，為什麼客戶要選擇您？</p>
                  <p className="text-xs text-green-600 mt-1">範例：「15年實戰經驗 + 客製化解決方案 + 24小時技術支援」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.competitiveAdvantage ? 'input-error' : ''}`}
                  placeholder="請說明您的競爭優勢，什麼讓您與眾不同..."
                  {...registerInterview('competitiveAdvantage')}
                />
                {interviewErrors.competitiveAdvantage && (
                  <p className="error-message">{interviewErrors.competitiveAdvantage.message}</p>
                )}
              </div>
            </div>

            {/* 第二部分：我的理想客戶與市場 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <UsersIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">第二部分：我的理想客戶與市場</h3>
                  <p className="text-sm text-gray-600 mt-1">🎯 幫助其他會員快速了解您的目標客群</p>
                </div>
              </div>
              
              {/* 主力目標客群／市場 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <FlagIcon className="h-5 w-5 mr-2 text-purple-600" />
                  主力目標客群／市場
                </label>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-purple-800">🎯 <strong>填寫提示：</strong>描述您最想服務的客戶群體</p>
                  <p className="text-xs text-purple-600 mt-1">範例：「中小企業主、科技業、台北地區製造業」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.targetMarket ? 'input-error' : ''}`}
                  placeholder="請描述您的目標市場，如行業別、地區、企業規模等..."
                  {...registerInterview('targetMarket')}
                />
                {interviewErrors.targetMarket && (
                  <p className="error-message">{interviewErrors.targetMarket.message}</p>
                )}
              </div>

              {/* 理想的客戶樣貌 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <UsersIcon className="h-5 w-5 mr-2 text-purple-600" />
                  理想的客戶樣貌
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">👥 <strong>填寫提示：</strong>具體描述您理想客戶的特徵，幫助夥伴識別</p>
                  <p className="text-xs text-blue-600 mt-1">範例：「年營收1000萬以上的貿易公司，正在尋求數位轉型的企業主」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.idealCustomer ? 'input-error' : ''}`}
                  placeholder="請具體描述理想客戶的特徵，包含公司規模、需求、決策者特質等..."
                  {...registerInterview('idealCustomer')}
                />
                {interviewErrors.idealCustomer && (
                  <p className="error-message">{interviewErrors.idealCustomer.message}</p>
                )}
              </div>

              {/* 代表性客戶舉例 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2 text-purple-600" />
                  代表性客戶舉例
                </label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-800">🏢 <strong>填寫提示：</strong>舉出具體的客戶類型或公司名稱（可匿名）</p>
                  <p className="text-xs text-green-600 mt-1">範例：「某知名連鎖餐廳、傳統製造業龍頭、新創科技公司」</p>
                </div>
                <textarea
                  rows={2}
                  className={`input w-full ${interviewErrors.customerExamples ? 'input-error' : ''}`}
                  placeholder="請舉例說明您曾服務過的代表性客戶類型..."
                  {...registerInterview('customerExamples')}
                />
                {interviewErrors.customerExamples && (
                  <p className="error-message">{interviewErrors.customerExamples.message}</p>
                )}
              </div>

              {/* 他們通常具備的「共同特質」 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <StarIcon className="h-5 w-5 mr-2 text-purple-600" />
                  客戶的共同特質
                </label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-800">⭐ <strong>填寫提示：</strong>您的客戶通常有什麼共同點？</p>
                  <p className="text-xs text-yellow-600 mt-1">範例：「重視品質勝過價格、願意投資長期合作、注重創新」</p>
                </div>
                <textarea
                  rows={2}
                  className={`input w-full ${interviewErrors.customerTraits ? 'input-error' : ''}`}
                  placeholder="請描述您的客戶通常具備的共同特質或價值觀..."
                  {...registerInterview('customerTraits')}
                />
                {interviewErrors.customerTraits && (
                  <p className="error-message">{interviewErrors.customerTraits.message}</p>
                )}
              </div>

              {/* 他們常見的「需求或痛點」 */}
              <div className="mb-6">
                <label className="label">
                  他們常見的「需求或痛點」
                </label>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.customerPainPoints ? 'input-error' : ''}`}
                  placeholder="他們會遇到什麼問題，正好是您可以解決的？"
                  {...registerInterview('customerPainPoints')}
                />
                {interviewErrors.customerPainPoints && (
                  <p className="error-message">{interviewErrors.customerPainPoints.message}</p>
                )}
              </div>

              {/* 引薦觸發句 */}
              <div className="mb-6">
                <label className="label">
                  引薦觸發句：聽到「一句話」就能幫我找到引薦機會
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">當聽到：「</span>
                  <input
                    type="text"
                    className={`input flex-1 ${interviewErrors.referralTrigger ? 'input-error' : ''}`}
                    placeholder="請填入觸發引薦的關鍵句子"
                    {...registerInterview('referralTrigger')}
                  />
                  <span className="text-gray-600">」，就是我能提供服務的絕佳時機。</span>
                </div>
                {interviewErrors.referralTrigger && (
                  <p className="error-message">{interviewErrors.referralTrigger.message}</p>
                )}
              </div>
            </div>

            {/* 第三部分：如何為我引薦 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">第三部分：如何為我引薦</h3>
                  <p className="text-sm text-gray-600 mt-1">🤝 讓夥伴知道如何有效地推薦您</p>
                </div>
              </div>
              
              {/* 黃金引薦開場白 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <MegaphoneIcon className="h-5 w-5 mr-2 text-orange-600" />
                  黃金引薦開場白
                </label>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-orange-800">🎤 <strong>填寫提示：</strong>教會夥伴一句最棒的開場白，讓客戶立刻想認識您</p>
                  <p className="text-xs text-orange-600 mt-1">範例：「我認識一位數位轉型專家，他可以協助您處理系統整合的問題」</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 font-medium">請完成這句引薦開場白：</p>
                  <div className="flex items-center space-x-2 text-sm bg-gray-50 p-3 rounded-lg flex-wrap">
                    <span className="text-gray-700">「我認識一位</span>
                    <input
                      type="text"
                      className={`input flex-1 min-w-[120px] ${interviewErrors.referralOpening ? 'input-error' : ''}`}
                      placeholder="您的專業領域，如：財務顧問、行銷專家"
                      {...registerInterview('referralOpening')}
                    />
                    <span className="text-gray-700">，他/她可以協助您處理</span>
                    <input
                      type="text"
                      className={`input flex-1 min-w-[120px] ${interviewErrors.referralProblem ? 'input-error' : ''}`}
                      placeholder="您能解決的問題類型，如：系統整合、財務規劃"
                      {...registerInterview('referralProblem')}
                    />
                    <span className="text-gray-700">的問題。」</span>
                  </div>
                </div>
                {interviewErrors.referralOpening && (
                  <p className="error-message">{interviewErrors.referralOpening.message}</p>
                )}
                {interviewErrors.referralProblem && (
                  <p className="error-message">{interviewErrors.referralProblem.message}</p>
                )}
              </div>

              {/* 一個「優質引薦」的樣貌 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-orange-600" />
                  一個「優質引薦」的樣貌
                </label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-800">✅ <strong>填寫提示：</strong>越具體越好，幫助夥伴識別高品質的引薦機會</p>
                  <p className="text-xs text-green-600 mt-1">範例：「已經確認有預算、決策權在手、時間急迫性高的企業主」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.qualityReferral ? 'input-error' : ''}`}
                  placeholder="請具體描述什麼樣的引薦對您最有價值，包含客戶狀態、需求急迫性、決策能力等..."
                  {...registerInterview('qualityReferral')}
                />
                {interviewErrors.qualityReferral && (
                  <p className="error-message">{interviewErrors.qualityReferral.message}</p>
                )}
              </div>

              {/* 一個「不適合引薦」的樣貌 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-orange-600" />
                  一個「不適合引薦」的樣貌
                </label>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-red-800">⚠️ <strong>填寫提示：</strong>幫助夥伴初步篩選，避免無效引薦</p>
                  <p className="text-xs text-red-600 mt-1">範例：「只是想免費諮詢、預算不足、決策流程冗長的客戶」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.unsuitableReferral ? 'input-error' : ''}`}
                  placeholder="請說明什麼樣的引薦不適合您，幫助夥伴避免無效推薦..."
                  {...registerInterview('unsuitableReferral')}
                />
                {interviewErrors.unsuitableReferral && (
                  <p className="error-message">{interviewErrors.unsuitableReferral.message}</p>
                )}
              </div>

              {/* 我正在尋找的「合作」夥伴 */}
              <div className="mb-6 space-y-2">
                <label className="label font-semibold">
                  <UserGroupIcon className="h-5 w-5 mr-2 text-orange-600" />
                  我正在尋找的「合作」夥伴
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">🤝 <strong>填寫提示：</strong>能與您互補、共同服務客戶的行業夥伴</p>
                  <p className="text-xs text-blue-600 mt-1">範例：「會計師、律師、室內設計師 - 可以互相引薦客戶」</p>
                </div>
                <textarea
                  rows={2}
                  className={`input w-full ${interviewErrors.partnerTypes ? 'input-error' : ''}`}
                  placeholder="請說明您希望合作的夥伴類型，能與您的服務形成互補的專業領域..."
                  {...registerInterview('partnerTypes')}
                />
                {interviewErrors.partnerTypes && (
                  <p className="error-message">{interviewErrors.partnerTypes.message}</p>
                )}
              </div>
            </div>

            {/* 第四部分：建立更多連結 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                    <HeartIcon className="h-6 w-6 text-pink-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">第四部分：建立更多連結</h3>
                  <p className="text-sm text-gray-600 mt-1">❤️ 不只是生意，展現您的個人魅力，建立更深層的連結</p>
                </div>
              </div>
              
              {/* 近期的事業／個人目標 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <FlagIcon className="h-5 w-5 mr-2 text-pink-600" />
                  近期的事業／個人目標
                </label>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-purple-800">🎯 <strong>填寫提示：</strong>讓夥伴知道如何幫助您達成目標</p>
                  <p className="text-xs text-purple-600 mt-1">範例：「今年希望拓展海外市場、學習新技能、建立更多策略夥伴關係」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.businessGoals ? 'input-error' : ''}`}
                  placeholder="請分享您的近期事業或個人目標，讓夥伴知道如何協助您..."
                  {...registerInterview('businessGoals')}
                />
                {interviewErrors.businessGoals && (
                  <p className="error-message">{interviewErrors.businessGoals.message}</p>
                )}
              </div>

              {/* 工作之餘的興趣與愛好 */}
              <div className="mb-8 space-y-2">
                <label className="label font-semibold">
                  <HeartIcon className="h-5 w-5 mr-2 text-pink-600" />
                  工作之餘的興趣與愛好
                </label>
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-pink-800">❤️ <strong>填寫提示：</strong>分享您的興趣愛好，建立更多話題與連結</p>
                  <p className="text-xs text-pink-600 mt-1">範例：「喜歡登山健行、品酒、閱讀商業書籍、學習新語言」</p>
                </div>
                <textarea
                  rows={3}
                  className={`input w-full ${interviewErrors.personalInterests ? 'input-error' : ''}`}
                  placeholder="請分享您的興趣愛好，讓夥伴更了解您的個人面向..."
                  {...registerInterview('personalInterests')}
                />
                {interviewErrors.personalInterests && (
                  <p className="error-message">{interviewErrors.personalInterests.message}</p>
                )}
              </div>
            </div>

            <div className="mt-10 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="text-center mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="text-lg font-semibold text-gray-900">完成您的會員面談表</h4>
                <p className="text-sm text-gray-600 mt-1">讓其他會員更了解您，開啟更多合作機會！</p>
              </div>
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isSavingInterview}
                  className="btn-primary px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {isSavingInterview ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      儲存中...
                    </>
                  ) : (
                    '🚀 儲存面談表單'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">修改密碼</h2>
            <p className="text-sm text-gray-600 mt-1">為了帳號安全，請定期更新您的密碼</p>
          </div>
          
          <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="label">
                <KeyIcon className="h-4 w-4 mr-2" />
                目前密碼
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className={`input w-full pr-10 ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                  {...registerPassword('currentPassword', {
                    required: '請輸入目前密碼'
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordErrors.currentPassword && (
                <p className="error-message">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="label">
                <KeyIcon className="h-4 w-4 mr-2" />
                新密碼
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className={`input w-full pr-10 ${passwordErrors.newPassword ? 'input-error' : ''}`}
                  {...registerPassword('newPassword', {
                    required: '請輸入新密碼',
                    minLength: { value: 6, message: '密碼至少需要6個字符' }
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordErrors.newPassword && (
                <p className="error-message">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">
                <KeyIcon className="h-4 w-4 mr-2" />
                確認新密碼
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input w-full pr-10 ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                  {...registerPassword('confirmPassword', {
                    required: '請確認新密碼',
                    validate: value => value === newPassword || '密碼不一致'
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="error-message">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">密碼安全提醒</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>密碼長度至少6個字符</li>
                      <li>建議包含大小寫字母、數字和特殊符號</li>
                      <li>不要使用容易猜測的密碼</li>
                      <li>定期更換密碼以確保帳號安全</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn-primary"
              >
                {isChangingPassword ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">修改中...</span>
                  </>
                ) : (
                  '修改密碼'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;