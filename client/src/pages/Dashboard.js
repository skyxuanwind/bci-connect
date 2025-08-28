import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  UserGroupIcon,
  UserIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  StarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentMembers, setRecentMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const requests = [
        axios.get('/api/users/members?limit=5')
      ];
      
      // 管理員獲取完整統計，普通用戶只獲取引薦統計
      if (isAdmin()) {
        requests.push(axios.get('/api/admin/dashboard'));
      } else {
        requests.push(axios.get('/api/referrals/stats'));
      }
      
      const [membersResponse, statsResponse] = await Promise.all(requests);

      setRecentMembers(membersResponse.data.members || []);
      
      if (statsResponse) {
        setStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
      <span className={`badge ${badges[level] || 'bg-gray-500'} text-xs px-2 py-1 rounded-full font-medium text-white`}>
        {getMembershipLevelText(level)}
      </span>
    );
  };

  const quickActions = [
    {
      title: '查看會員',
      description: '瀏覽會員列表和詳細資料',
      href: '/members',
      icon: UserGroupIcon,
      color: 'bg-blue-500'
    },
    {
      title: '個人資料',
      description: '編輯和更新您的個人資料',
      href: '/profile',
      icon: UserIcon,
      color: 'bg-green-500'
    }
  ];

  const adminActions = [
    {
      title: '會員審核',
      description: '審核待批准的新會員',
      href: '/admin/pending',
      icon: ClockIcon,
      color: 'bg-yellow-500',
      badge: stats?.pendingUsers || 0
    },
    {
      title: '會員管理',
      description: '管理所有會員帳號',
      href: '/admin/users',
      icon: UserGroupIcon,
      color: 'bg-purple-500'
    },
    {
      title: '分會管理',
      description: '管理分會設定',
      href: '/admin/chapters',
      icon: BuildingOfficeIcon,
      color: 'bg-indigo-500'
    },
    {
      title: '統計報告',
      description: '查看詳細的統計數據',
      href: '/admin',
      icon: ChartBarIcon,
      color: 'bg-red-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-primary text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              歡迎回來，{user?.name}！
            </h1>
            <p className="text-blue-100 mb-4">
              {user?.company && `${user.company} • `}
              {user?.title}
            </p>
            <div className="flex items-center space-x-4">
              {user?.membershipLevel ? getMembershipLevelBadge(user.membershipLevel) : null}
              {user?.chapterName && (
                <span className="text-blue-200 text-sm">
                  {user.chapterName}
                </span>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <StarIcon className="h-16 w-16 text-gold-400" />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {/* 總引薦金額 - 所有用戶都能看到 */}
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總引薦金額</p>
                <p className="text-2xl font-bold text-gray-900">
                  NT$ {stats.totalReferralAmount ? stats.totalReferralAmount.toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>
          
          {/* 管理員統計 */}
          {isAdmin() && (
            <>
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">總會員數</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">活躍會員</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">待審核</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingUsers}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">分會數量</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalChapters}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
          </div>
          <div className="space-y-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.href}
                  className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin() && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">管理功能</h2>
            </div>
            <div className="space-y-4">
              {adminActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.href}
                    className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center relative`}>
                      <Icon className="h-5 w-5 text-white" />
                      {action.badge > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                    <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Members */}
      {recentMembers.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近加入的會員</h2>
            <Link
              to="/members"
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              查看全部
            </Link>
          </div>
          <div className="space-y-4">
            {recentMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                    <p className="text-xs text-gray-500">
                      {member.company} • {member.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getMembershipLevelBadge(member.membershipLevel)}
                  <Link
                    to={`/members/${member.id}`}
                    className="text-primary-600 hover:text-primary-500"
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;