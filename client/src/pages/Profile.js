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
  PhotoIcon
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
      nfcCardId: user?.nfcCardId || ''
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
      nfcCardId: user.nfcCardId || ''
    });
  }, [user, resetProfile]);

  // 同步面談表單數據
  useEffect(() => {
    if (!user?.interviewForm) return;
    resetInterview({
      companyName: user.interviewForm.companyName || '',
      brandLogo: user.interviewForm.brandLogo || '',
      industry: user.interviewForm.industry || '',
      coreServices: user.interviewForm.coreServices || '',
      competitiveAdvantage: user.interviewForm.competitiveAdvantage || '',
      targetMarket: user.interviewForm.targetMarket || '',
      idealCustomer: user.interviewForm.idealCustomer || '',
      customerExamples: user.interviewForm.customerExamples || '',
      customerTraits: user.interviewForm.customerTraits || '',
      customerPainPoints: user.interviewForm.customerPainPoints || '',
      referralTrigger: user.interviewForm.referralTrigger || '',
      referralOpening: user.interviewForm.referralOpening || '',
      qualityReferral: user.interviewForm.qualityReferral || '',
      unsuitableReferral: user.interviewForm.unsuitableReferral || '',
      partnerTypes: user.interviewForm.partnerTypes || '',
      businessGoals: user.interviewForm.businessGoals || '',
      personalInterests: user.interviewForm.personalInterests || ''
    });
  }, [user?.interviewForm, resetInterview]);

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
      // 更新 AuthContext 中的用戶資料
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
      1: '一級核心',
      2: '二級幹部',
      3: '三級會員'
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Name */}
              <div>
                <label className="label">
                  <UserIcon className="h-4 w-4 mr-2" />
                  姓名
                </label>
                <input
                  type="text"
                  className={`input ${profileErrors.name ? 'input-error' : ''}`}
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
                  className="input bg-gray-50 cursor-not-allowed"
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
                  className={`input ${profileErrors.company ? 'input-error' : ''}`}
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
                  className={`input ${profileErrors.industry ? 'input-error' : ''}`}
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
                  className={`input ${profileErrors.title ? 'input-error' : ''}`}
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
                  className={`input ${profileErrors.contactNumber ? 'input-error' : ''}`}
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

              {/* NFC Card ID */}
              <div>
                <label className="label">
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  NFC 卡片 UID
                </label>
                <input
                  type="text"
                  className={`input ${profileErrors.nfcCardId ? 'input-error' : ''}`}
                  placeholder="請輸入 NFC 卡片 UID（選填）"
                  {...registerProfile('nfcCardId', {
                    pattern: {
                      value: /^[A-Fa-f0-9]{8}$/,
                      message: '請輸入有效的 8 位十六進制 UID（如：A1B2C3D4）'
                    }
                  })}
                />
                {profileErrors.nfcCardId && (
                  <p className="error-message">{profileErrors.nfcCardId.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  用於 NFC 名片報到功能，可透過報到系統自動獲取
                </p>
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
                
                <div className="space-y-2">
                  <label className="label">NFC 卡片 UID</label>
                  <p className="mt-2 text-sm text-gray-900">
                    {user?.nfcCardId ? (
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {user.nfcCardId}
                      </span>
                    ) : (
                      <span className="text-gray-500">未設定</span>
                    )}
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
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">會員一對一面談表</h2>
            <p className="text-sm text-gray-600 mt-1">透過深度交流，建立信任，創造精準引薦機會</p>
          </div>
          
          <form onSubmit={handleSubmitInterview(onSubmitInterview)} className="space-y-8">
            {/* 第一部分：我的業務核心與價值主張 */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">▍第一部分：我的業務核心與價值主張 (我是誰，我做什麼)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 公司／品牌名稱 */}
                <div>
                  <label className="label">
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    公司／品牌名稱
                  </label>
                  <input
                    type="text"
                    className={`input ${interviewErrors.companyName ? 'input-error' : ''}`}
                    {...registerInterview('companyName')}
                  />
                  {interviewErrors.companyName && (
                    <p className="error-message">{interviewErrors.companyName.message}</p>
                  )}
                </div>

                {/* 代表行業／職業 */}
                <div>
                  <label className="label">
                    <BriefcaseIcon className="h-4 w-4 mr-2" />
                    代表行業／職業
                  </label>
                  <input
                    type="text"
                    className={`input ${interviewErrors.industry ? 'input-error' : ''}`}
                    {...registerInterview('industry')}
                  />
                  {interviewErrors.industry && (
                    <p className="error-message">{interviewErrors.industry.message}</p>
                  )}
                </div>
              </div>

              {/* 核心產品／服務詳述 */}
              <div className="mt-6">
                <label className="label">
                  核心產品／服務詳述 (請具體說明)
                </label>
                <textarea
                  rows={4}
                  className={`input ${interviewErrors.coreServices ? 'input-error' : ''}`}
                  placeholder="請詳細描述您的核心產品或服務..."
                  {...registerInterview('coreServices')}
                />
                {interviewErrors.coreServices && (
                  <p className="error-message">{interviewErrors.coreServices.message}</p>
                )}
              </div>

              {/* 我與競爭者的最大差異 */}
              <div className="mt-6">
                <label className="label">
                  我與競爭者的最大差異 (我的優勢是什麼？)
                </label>
                <textarea
                  rows={3}
                  className={`input ${interviewErrors.competitiveAdvantage ? 'input-error' : ''}`}
                  placeholder="請說明您的競爭優勢..."
                  {...registerInterview('competitiveAdvantage')}
                />
                {interviewErrors.competitiveAdvantage && (
                  <p className="error-message">{interviewErrors.competitiveAdvantage.message}</p>
                )}
              </div>
            </div>

            {/* 第二部分：我的理想客戶與市場 */}
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">▍第二部分：我的理想客戶與市場 (我要找誰)</h3>
              
              {/* 主力目標客群／市場 */}
              <div className="mb-6">
                <label className="label">
                  主力目標客群／市場 (例如：哪個產業、地區或族群)
                </label>
                <input
                  type="text"
                  className={`input ${interviewErrors.targetMarket ? 'input-error' : ''}`}
                  {...registerInterview('targetMarket')}
                />
                {interviewErrors.targetMarket && (
                  <p className="error-message">{interviewErrors.targetMarket.message}</p>
                )}
              </div>

              {/* 理想的客戶樣貌 */}
              <div className="mb-6">
                <label className="label">
                  理想的客戶樣貌 (請盡量具體描繪，幫助夥伴為您識別)
                </label>
                <textarea
                  rows={3}
                  className={`input ${interviewErrors.idealCustomer ? 'input-error' : ''}`}
                  placeholder="請描述您理想客戶的特徵..."
                  {...registerInterview('idealCustomer')}
                />
                {interviewErrors.idealCustomer && (
                  <p className="error-message">{interviewErrors.idealCustomer.message}</p>
                )}
              </div>

              {/* 代表性客戶舉例 */}
              <div className="mb-6">
                <label className="label">
                  代表性客戶舉例 (可列舉公司或客戶類型)
                </label>
                <textarea
                  rows={2}
                  className={`input ${interviewErrors.customerExamples ? 'input-error' : ''}`}
                  placeholder="例如：某某公司、某類型企業..."
                  {...registerInterview('customerExamples')}
                />
                {interviewErrors.customerExamples && (
                  <p className="error-message">{interviewErrors.customerExamples.message}</p>
                )}
              </div>

              {/* 他們通常具備的「共同特質」 */}
              <div className="mb-6">
                <label className="label">
                  他們通常具備的「共同特質」
                </label>
                <textarea
                  rows={2}
                  className={`input ${interviewErrors.customerTraits ? 'input-error' : ''}`}
                  placeholder="例如：公司規模、決策者思維、重視品質、預算充足等"
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
                  className={`input ${interviewErrors.customerPainPoints ? 'input-error' : ''}`}
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
            <div className="border-b border-gray-200 pb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">▍第三部分：如何為我引薦 (怎麼幫我)</h3>
              
              {/* 黃金引薦開場白 */}
              <div className="mb-6">
                <label className="label">
                  黃金引薦開場白
                </label>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">請教我一句最棒的話，讓您的目標客戶立刻想認識您：</p>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">「我認識一位</span>
                    <input
                      type="text"
                      className={`input flex-1 ${interviewErrors.referralOpening ? 'input-error' : ''}`}
                      placeholder="您的職業"
                      {...registerInterview('referralOpening')}
                    />
                    <span className="text-gray-600">專家，他/她可以協助您處理 __________________ 的問題。」</span>
                  </div>
                </div>
                {interviewErrors.referralOpening && (
                  <p className="error-message">{interviewErrors.referralOpening.message}</p>
                )}
              </div>

              {/* 一個「優質引薦」的樣貌 */}
              <div className="mb-6">
                <label className="label">
                  一個「優質引薦」的樣貌 (越具體越好)
                </label>
                <textarea
                  rows={3}
                  className={`input ${interviewErrors.qualityReferral ? 'input-error' : ''}`}
                  placeholder="請描述什麼樣的引薦對您最有價值..."
                  {...registerInterview('qualityReferral')}
                />
                {interviewErrors.qualityReferral && (
                  <p className="error-message">{interviewErrors.qualityReferral.message}</p>
                )}
              </div>

              {/* 一個「不適合引薦」的樣貌 */}
              <div className="mb-6">
                <label className="label">
                  一個「不適合引薦」的樣貌 (幫助初步篩選)
                </label>
                <textarea
                  rows={3}
                  className={`input ${interviewErrors.unsuitableReferral ? 'input-error' : ''}`}
                  placeholder="請說明什麼樣的引薦不適合您..."
                  {...registerInterview('unsuitableReferral')}
                />
                {interviewErrors.unsuitableReferral && (
                  <p className="error-message">{interviewErrors.unsuitableReferral.message}</p>
                )}
              </div>

              {/* 我正在尋找的「合作」夥伴 */}
              <div className="mb-6">
                <label className="label">
                  我正在尋找的「合作」夥伴 (能與我互補、共同服務客人的行業)
                </label>
                <textarea
                  rows={2}
                  className={`input ${interviewErrors.partnerTypes ? 'input-error' : ''}`}
                  placeholder="請說明您希望合作的夥伴類型..."
                  {...registerInterview('partnerTypes')}
                />
                {interviewErrors.partnerTypes && (
                  <p className="error-message">{interviewErrors.partnerTypes.message}</p>
                )}
              </div>
            </div>

            {/* 第四部分：建立更多連結 */}
            <div className="pb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">▍第四部分：建立更多連結 (不只是生意)</h3>
              
              {/* 近期的事業／個人目標 */}
              <div className="mb-6">
                <label className="label">
                  近期的事業／個人目標 (或許夥伴能提供經驗建議或幫助)
                </label>
                <textarea
                  rows={3}
                  className={`input ${interviewErrors.businessGoals ? 'input-error' : ''}`}
                  placeholder="請分享您近期的目標或挑戰..."
                  {...registerInterview('businessGoals')}
                />
                {interviewErrors.businessGoals && (
                  <p className="error-message">{interviewErrors.businessGoals.message}</p>
                )}
              </div>

              {/* 工作之餘的興趣與愛好 */}
              <div className="mb-6">
                <label className="label">
                  工作之餘的興趣與愛好 (尋找共同話題，加深關係)
                </label>
                <textarea
                  rows={3}
                  className={`input ${interviewErrors.personalInterests ? 'input-error' : ''}`}
                  placeholder="請分享您的興趣愛好..."
                  {...registerInterview('personalInterests')}
                />
                {interviewErrors.personalInterests && (
                  <p className="error-message">{interviewErrors.personalInterests.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingInterview}
                className="btn-primary"
              >
                {isSavingInterview ? (
                  <>
                    <LoadingSpinner size="small" />
                    <span className="ml-2">儲存中...</span>
                  </>
                ) : (
                  '儲存面談表單'
                )}
              </button>
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
                  className={`input pr-10 ${passwordErrors.currentPassword ? 'input-error' : ''}`}
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
                  className={`input pr-10 ${passwordErrors.newPassword ? 'input-error' : ''}`}
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
                  className={`input pr-10 ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
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