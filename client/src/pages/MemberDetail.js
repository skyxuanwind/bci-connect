import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import {
  UserIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ArrowLeftIcon,
  MapPinIcon,
  TagIcon
} from '@heroicons/react/24/outline';


const MemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    loadMemberDetail();
  }, [id]);

  useEffect(() => {
    if (member?.id) {
      fetchBadges();
    }
  }, [member?.id]);



  const fetchBadges = async () => {
    try {
      const resp = await axios.get(`/api/users/member/${id}/badges`);
      setBadges(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error('Failed to load honor badges:', err);
    }
  };

  const canCreateCoachItems = user?.isCoach || user?.isAdmin;
  const isSelf = user?.id === member?.id;

  const loadMemberDetail = async () => {
    try {
      const response = await axios.get(`/api/users/member/${id}`);
      setMember(response.data.member);
    } catch (error) {
      console.error('Failed to load member detail:', error);
      if (error.response?.status === 403) {
        setError('您沒有權限查看此會員的詳細資料');
      } else if (error.response?.status === 404) {
        setError('找不到此會員');
      } else {
        setError('載入會員資料時發生錯誤');
      }
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Taipei'
    });
  };

  const handleSendMessage = () => {
    if (member?.id) {
      navigate(`/meetings?schedule_with=${member.id}`);
    }
  };

  const getBadgeVariant = (code) => {
    switch (code) {
      case 'FIRST_TASK_COMPLETED':
        return 'badge-success';
      case 'PROFILE_COMPLETED':
        return 'badge-info';
      case 'FIRST_CONFIRMED_REFERRAL':
        return 'badge-warning';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">無法載入會員資料</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/members')}
            className="btn-primary"
          >
            返回會員列表
          </button>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">找不到會員</h3>
        <p className="mt-1 text-sm text-gray-500">此會員可能已被刪除或不存在</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/members')}
            className="btn-primary"
          >
            返回會員列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          返回會員列表
        </button>
      </div>

      {/* Member Header */}
      <div className="bg-gradient-primary text-white rounded-lg p-6">
        <div className="flex items-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full overflow-hidden">
             <Avatar 
               src={member?.profilePictureUrl} 
               alt={member?.name}
               size="2xl"
               className="bg-white bg-opacity-20"
               fallbackIcon={UserIcon}
               fallbackIconClass="text-white"
             />
           </div>
          <div className="ml-6 flex-1">
            <h1 className="text-3xl font-bold">{member?.name}</h1>
            <p className="text-blue-100 mt-1">{member?.email}</p>
            <div className="flex items-center space-x-4 mt-3">
              {member?.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
              {member?.status ? getStatusBadge(member.status) : null}
            </div>
          </div>
        </div>
      </div>



      {/* Member Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">基本資料</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">姓名</p>
                <p className="text-sm text-gray-600">{member.name}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">電子郵件</p>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>
            </div>
            
            {member.contactNumber && (
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">聯絡電話</p>
                  <p className="text-sm text-gray-600">{member.contactNumber}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">加入時間</p>
                <p className="text-sm text-gray-600">{formatDate(member.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">職業資料</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">公司</p>
                <p className="text-sm text-gray-600">{member.company || '未提供'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">職稱</p>
                <p className="text-sm text-gray-600">{member.title || '未提供'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <TagIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">產業別</p>
                <p className="text-sm text-gray-600">{member.industry || '未提供'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">所屬分會</p>
                <p className="text-sm text-gray-600">{member.chapterName || '未設定'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">會員資訊</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">會員等級</p>
            {member.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">帳號狀態</p>
            {member.status ? getStatusBadge(member.status) : null}
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">加入時間</p>
            <p className="text-sm text-gray-600">{formatDate(member.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Honor Badges */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">榮譽徽章</h2>
        </div>
        <div className="p-6">
          {badges && badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div key={b.id} className={`badge ${getBadgeVariant(b.code)}`} title={b.description || ''}>
                  <span className="font-semibold">{b.name}</span>
                  {b.awardedAt && (
                    <span className="ml-2 text-xs opacity-80">{new Date(b.awardedAt).toLocaleDateString('zh-TW')}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-sm">尚未獲得徽章</div>
          )}
        </div>
      </div>



      {/* One-on-One Meeting Schedule */}
      {member.interviewData && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">一對一面談表</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">此會員已完成一對一面談表填寫，可查看其商務合作意向。</p>
            <Link 
              to={`/member-interview/${member.id}`}
              className="btn-primary inline-flex items-center"
            >
              <UserIcon className="h-4 w-4 mr-2" />
              查看面談表
            </Link>
          </div>
        </div>
      )}



      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => navigate('/members')}
          className="btn-secondary"
        >
          返回會員列表
        </button>
        
        {/* Additional actions can be added here based on user permissions */}
        {user?.id === member.id && (
          <Link to="/profile" className="btn-primary">
            編輯個人資料
          </Link>
        )}
        
        {/* Meeting Schedule Button */}
        {user?.id !== member.id && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={handleSendMessage} className="btn-primary w-full flex items-center justify-center">
              傳送訊息
            </button>
            <button onClick={() => navigate(`/meetings?schedule_with=${member.id}`)} className="btn-secondary w-full flex items-center justify-center">
              安排交流
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDetail;