import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import {
  UserIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  ArrowLeftIcon,
  LightBulbIcon,
  FlagIcon,
  UsersIcon,
  MegaphoneIcon,
  UserGroupIcon,
  HeartIcon,
  StarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

const MemberInterview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [interviewData, setInterviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMemberInterview();
  }, [id]);

  const loadMemberInterview = async () => {
    try {
      setLoading(true);
      setError(null);

      // 獲取會員基本資料
      const memberResponse = await axios.get(`/api/users/member/${id}`);
      setMember(memberResponse.data.member);

      // 獲取會員面談表資料
      const interviewResponse = await axios.get(`/api/users/member/${id}/interview`);
      setInterviewData(interviewResponse.data.interviewForm);

    } catch (error) {
      console.error('載入會員面談表錯誤:', error);
      if (error.response?.status === 404) {
        setError('會員不存在或面談表未填寫');
      } else if (error.response?.status === 403) {
        setError('您沒有權限查看此會員的面談表');
      } else {
        setError('載入面談表時發生錯誤，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: { text: '核心', class: 'bg-primary-700 text-gold-200 border border-gold-600' },
      2: { text: '幹部', class: 'bg-primary-700 text-gold-200 border border-gold-600' },
      3: { text: '會員', class: 'bg-primary-700 text-gold-200 border border-gold-600' }
    };
    
    const badge = badges[level] || { text: '未設定', class: 'bg-primary-700 text-gold-200 border border-gold-600' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 text-center">
          <div className="text-gold-400 mb-4">
            <UserIcon className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold text-gold-100 mb-2">載入失敗</h2>
          <p className="text-gold-300 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => navigate('/members')}
              className="btn-secondary"
            >
              返回會員列表
            </button>
            <button
              onClick={loadMemberInterview}
              className="btn-primary"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!member || !interviewData) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 text-center">
          <div className="text-gold-400 mb-4">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold text-gold-100 mb-2">面談表未填寫</h2>
          <p className="text-gold-300 mb-4">此會員尚未填寫一對一面談表</p>
          <button
            onClick={() => navigate('/members')}
            className="btn-secondary"
          >
            返回會員列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/members')}
            className="mr-4 p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex items-center flex-1">
            <Avatar 
              src={member.profilePictureUrl} 
              alt={member.name}
              size="large"
              className="bg-white bg-opacity-20"
              fallbackIcon={UserIcon}
              fallbackIconClass="text-white"
            />
            <div className="ml-4 flex-1">
              <h1 className="text-2xl font-bold">{member.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center text-gold-300">
                  <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">{member.company}</span>
                </div>
                <div className="flex items-center text-gold-300">
                  <BriefcaseIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">{member.title}</span>
                </div>
                {getMembershipLevelBadge(member.membershipLevel)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第一部分：業務核心與價值主張 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <StarIcon className="h-6 w-6 text-primary-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gold-100">第一部分：業務核心與價值主張</h2>
              <p className="text-sm text-gold-300">了解 {member.name} 的業務核心與價值主張</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* 公司/品牌名稱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 inline mr-2" />
              公司/品牌名稱
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200">{interviewData.companyName || '未提供'}</p>
            </div>
          </div>

          {/* 代表行業/職業 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BriefcaseIcon className="h-4 w-4 inline mr-2" />
              代表行業/職業
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200">{interviewData.industry || '未提供'}</p>
            </div>
          </div>

          {/* 核心產品/服務詳述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LightBulbIcon className="h-4 w-4 inline mr-2" />
              核心產品/服務詳述
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.coreServices || '未提供'}</p>
            </div>
          </div>

          {/* 與競爭者的最大差異 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FlagIcon className="h-4 w-4 inline mr-2" />
              與競爭者的最大差異
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.competitiveAdvantage || '未提供'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 第二部分：理想客戶與市場 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <UsersIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gold-100">第二部分：理想客戶與市場</h2>
              <p className="text-sm text-gold-300">{member.name} 的目標客群與市場定位</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* 主力目標客群/市場 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FlagIcon className="h-4 w-4 inline mr-2" />
              主力目標客群/市場
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.targetMarket || '未提供'}</p>
            </div>
          </div>

          {/* 理想的客戶樣貌 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UsersIcon className="h-4 w-4 inline mr-2" />
              理想的客戶樣貌
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.idealCustomer || '未提供'}</p>
            </div>
          </div>

          {/* 客戶實際案例 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <StarIcon className="h-4 w-4 inline mr-2" />
              客戶實際案例
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.customerExamples || '未提供'}</p>
            </div>
          </div>

          {/* 客戶特質 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-2" />
              客戶特質
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.customerTraits || '未提供'}</p>
            </div>
          </div>

          {/* 客戶痛點 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <HeartIcon className="h-4 w-4 inline mr-2" />
              客戶痛點
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.customerPainPoints || '未提供'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 第三部分：推薦與合作 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MegaphoneIcon className="h-6 w-6 text-primary-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gold-100">第三部分：推薦與合作</h2>
              <p className="text-sm text-gold-300">如何與 {member.name} 建立合作關係</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* 推薦觸發點 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <LightBulbIcon className="h-4 w-4 inline mr-2" />
              推薦觸發點
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.referralTrigger || '未提供'}</p>
            </div>
          </div>

          {/* 推薦開場白 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-2" />
              推薦開場白
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.referralOpening || '未提供'}</p>
            </div>
          </div>

          {/* 優質推薦 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <StarIcon className="h-4 w-4 inline mr-2" />
              優質推薦
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.qualityReferral || '未提供'}</p>
            </div>
          </div>

          {/* 不適合推薦 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-2" />
              不適合推薦
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.unsuitableReferral || '未提供'}</p>
            </div>
          </div>

          {/* 合作夥伴類型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserGroupIcon className="h-4 w-4 inline mr-2" />
              合作夥伴類型
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.partnerTypes || '未提供'}</p>
            </div>
          </div>

          {/* 商業目標 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FlagIcon className="h-4 w-4 inline mr-2" />
              商業目標
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.businessGoals || '未提供'}</p>
            </div>
          </div>

          {/* 個人興趣 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <HeartIcon className="h-4 w-4 inline mr-2" />
              個人興趣
            </label>
            <div className="bg-primary-700 border border-gold-600 rounded-lg p-3">
              <p className="text-gold-200 whitespace-pre-wrap">{interviewData.personalInterests || '未提供'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-center space-x-4 pb-6">
        <button
          onClick={() => navigate('/members')}
          className="btn-secondary"
        >
          返回會員列表
        </button>
        
        <Link
          to={`/members/${member.id}`}
          className="btn-primary"
        >
          查看會員詳情
        </Link>
      </div>
    </div>
  );
};

export default MemberInterview;