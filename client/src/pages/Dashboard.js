import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import InfoButton from '../components/InfoButton';
import {
  UserGroupIcon,
  UserIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  StarIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  CalendarIcon,
  QrCodeIcon,
  UserPlusIcon,
  SparklesIcon
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
      <span className={`badge ${badges[level] || 'bg-gray-500'} text-xs px-2 py-1 rounded-full font-medium text-white whitespace-nowrap`}>
        {getMembershipLevelText(level)}
      </span>
    );
  };

  // 檢查是否為 Core 或 Admin 用戶
  const isCoreOrAdmin = () => {
    if (!user || !user.membershipLevel) return false;
    
    // Level 1 = Core 用戶，或者使用 AuthContext 的 isAdmin 函數
    const isCore = Number(user.membershipLevel) === 1;
    const isAdminUser = isAdmin();
    
    // 僅在開發環境輸出調試信息，避免生產環境噪音
    if (process.env.NODE_ENV !== 'production') {
      console.debug('用戶權限檢查:', {
        user,
        membershipLevel: user.membershipLevel,
        membershipLevelNumber: Number(user.membershipLevel),
        isCore,
        isAdminUser,
        result: isCore || isAdminUser
      });
    }
    
    return isCore || isAdminUser;
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
    },
    {
      title: 'NFC 名片',
      description: '管理您的電子名片',
      href: '/nfc-card',
      icon: CreditCardIcon,
      color: 'bg-purple-500'
    },
    {
      title: '交流安排',
      description: '查看和安排交流',
      href: '/meetings',
      icon: CalendarIcon,
      color: 'bg-indigo-500'
    },
    {
      title: '活動報到',
      description: 'NFC 和 QR Code 報到',
      href: '/nfc-checkin',
      icon: QrCodeIcon,
      color: 'bg-orange-500'
    },
    {
      title: '推薦系統',
      description: '推薦新會員加入',
      href: '/referrals',
      icon: UserPlusIcon,
      color: 'bg-teal-500'
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
      title: '管理員面板',
      description: '儀式設置與誓詞編輯',
      href: '/admin-panel',
      icon: CreditCardIcon,
      color: 'bg-green-500'
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

  // 核心專用功能
  const coreActions = [
    {
      title: 'GBC 連結之橋儀式',
      description: '主持新會員入會儀式',
      href: '/connection-ceremony',
      icon: SparklesIcon,
      color: 'bg-gradient-to-r from-yellow-400 to-orange-500'
    },
    {
      title: '活動報到管理',
      description: '管理活動報到與出席',
      href: '/attendance',
      icon: QrCodeIcon,
      color: 'bg-gradient-to-r from-blue-400 to-purple-500'
    }
  ];

  // 幹部專用功能（管理員面板）
  const executiveActions = [
    {
      title: '管理員面板',
      description: '系統管理與設定',
      href: '/admin',
      icon: ChartBarIcon,
      color: 'bg-gradient-to-r from-red-500 to-pink-500'
    }
  ];

  // Admin 和 Core 共用功能（已移至各自專屬區域）
  const coreAdminActions = [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Top Black-Gold App Bar */}
          <div className="bg-gradient-to-r from-black via-primary-900 to-black border border-gold-600 text-white rounded-xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <img src="/images/gbc-logo.svg" alt="GBC Logo" className="h-8 w-auto sm:h-10 select-none" />
                <span className="text-lg sm:text-2xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
                  Golden Bridge Conference
                </span>
              </div>
              <div className="hidden md:flex items-center gap-4 text-gold-200">
                {user?.membershipLevel ? getMembershipLevelBadge(user.membershipLevel) : null}
                {user?.chapterName && (
                  <span className="text-sm sm:text-base text-gold-300">
                    {user.chapterName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {/* 總引薦金額 - 所有用戶都能看到 */}
              <div className="bg-primary-800 border border-gold-600 shadow-xl rounded-xl p-4 sm:p-6 col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CurrencyDollarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-900" />
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gold-300">總引薦金額</p>
                    <p className="text-lg sm:text-2xl font-bold text-gold-100 whitespace-nowrap">
                      NT$ {stats.totalReferralAmount ? stats.totalReferralAmount.toLocaleString() : '0'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 管理員統計 */}
              {isAdmin() && (
                <>
                  <div className="bg-primary-800 border border-gold-600 shadow-xl rounded-xl p-4 sm:p-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-900" />
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gold-300">總會員數</p>
                        <p className="text-lg sm:text-2xl font-bold text-gold-100">{stats.totalUsers}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-primary-800 border border-gold-600 shadow-xl rounded-xl p-4 sm:p-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-900" />
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gold-300">活躍會員</p>
                        <p className="text-lg sm:text-2xl font-bold text-gold-100">{stats.activeUsers}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-primary-800 border border-gold-600 shadow-xl rounded-xl p-4 sm:p-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gold-100" />
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gold-300">待審核</p>
                        <p className="text-lg sm:text-2xl font-bold text-gold-100">{stats.pendingUsers}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-primary-800 border border-gold-600 shadow-lg rounded-lg p-4 sm:p-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gold-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BuildingOfficeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-900" />
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gold-300">分會數量</p>
                        <p className="text-lg sm:text-2xl font-bold text-gold-100">{stats.totalChapters}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Actions */}
            <div className="bg-primary-800 border border-gold-600 shadow-lg rounded-xl p-5 sm:p-6">
              <div className="border-b border-gold-600 pb-4 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gold-100 tracking-wide">快速操作</h2>
                  <InfoButton tooltip="這裡提供常用的功能快速入口，包括查看會員列表和編輯個人資料等基本操作。" />
                </div>
              </div>
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        to={action.href}
                        key={action.title}
                        className="flex items-center gap-4 p-4 sm:p-5 bg-primary-700 hover:bg-primary-600 border border-gold-700 hover:border-gold-500 rounded-xl transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/60 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]"
                      >
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-black border border-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner transition-transform duration-300 hover:scale-[1.03]`}>
                          <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gold-100 truncate antialiased">
                            {action.title}
                          </h3>
                          <p className="text-sm sm:text-base text-gold-300 truncate leading-relaxed">
                            {action.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Core Actions - 僅限核心會員 */}
            {user?.membershipLevel === 1 && !isAdmin() && (
              <div className="bg-gradient-to-br from-primary-800 to-primary-900 border border-gold-500 shadow-xl rounded-lg p-4 sm:p-6">
                <div className="border-b border-gold-500 pb-4 mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gold-100">核心功能</h2>
                    <InfoButton tooltip="核心會員專用功能，包括主持入會儀式和活動報到管理等核心職責。" />
                  </div>
                </div>
                <div className="space-y-4">
                  {coreActions.map((action, index) => {
                    return (
                      <Link
                        key={index}
                        to={action.href}
                        className="group flex items-center p-4 bg-primary-700 hover:bg-primary-600 border border-gold-600 hover:border-gold-400 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <div className={`flex-shrink-0 w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-medium text-gold-100 group-hover:text-white">
                            {action.title}
                          </h3>
                          <p className="text-xs text-gold-300 group-hover:text-gold-200">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRightIcon className="w-5 h-5 text-gold-400 group-hover:text-gold-200 group-hover:translate-x-1 transition-all duration-200" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Executive Actions - 僅限幹部（管理員） */}
            {isAdmin() && (
              <div className="bg-gradient-to-br from-primary-800 to-primary-900 border border-gold-500 shadow-xl rounded-lg p-4 sm:p-6">
                <div className="border-b border-gold-500 pb-4 mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gold-100">幹部功能</h2>
                    <InfoButton tooltip="幹部專用功能，包括管理員面板等高級管理工具。" />
                  </div>
                </div>
                <div className="space-y-4">
                  {executiveActions.map((action, index) => {
                    return (
                      <Link
                        key={index}
                        to={action.href}
                        className="group flex items-center p-4 bg-primary-700 hover:bg-primary-600 border border-gold-600 hover:border-gold-400 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <div className={`flex-shrink-0 w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                          <action.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-sm font-medium text-gold-100 group-hover:text-white">
                            {action.title}
                          </h3>
                          <p className="text-xs text-gold-300 group-hover:text-gold-200">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRightIcon className="w-5 h-5 text-gold-400 group-hover:text-gold-200 group-hover:translate-x-1 transition-all duration-200" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Admin Actions - 原有的管理功能 */}
            {isAdmin() && (
              <div className="bg-gradient-to-br from-primary-800 to-primary-900 border border-gold-500 shadow-xl rounded-lg p-4 sm:p-6">
                <div className="border-b border-gold-500 pb-4 mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gold-100">管理功能</h2>
                    <InfoButton tooltip="管理員專用功能區域，包括會員審核、用戶管理、分會設定和統計報告等高級管理工具。" />
                  </div>
                </div>
                <div className="space-y-4">
                  {adminActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Link
                          to={action.href}
                          key={action.title}
                          className="flex items-center p-3 sm:p-4 bg-primary-700 hover:bg-primary-600 border border-gold-700 hover:border-gold-500 rounded-lg transition-all duration-200"
                        >
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0 relative`}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            {action.badge > 0 && (
                              <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gold-100 truncate">{action.title}</h3>
                            <p className="text-xs text-gray-400 truncate">{action.description}</p>
                          </div>
                        </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Core/Admin Ceremony Actions */}
            {isCoreOrAdmin() && (
              <div className="bg-gradient-to-br from-primary-800 to-primary-900 border border-gold-500 shadow-xl rounded-lg p-4 sm:p-6">
                <div className="border-b border-gold-500 pb-4 mb-4 sm:mb-6">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-gold-100">儀式功能</h2>
                    <InfoButton tooltip="Core 和 Admin 專用的儀式功能，包括主持新會員入會的 GBC 連結之橋儀式。" />
                  </div>
                </div>
                <div className="space-y-4">
                  {coreAdminActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        to={action.href}
                        key={action.title}
                        className="flex items-center p-3 sm:p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 border border-gold-500 hover:border-gold-400 rounded-lg transition-all duration-200 shadow-lg"
                      >
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gold-100 truncate">{action.title}</h3>
                          <p className="text-xs text-gold-300 truncate">{action.description}</p>
                        </div>
                        <ArrowRightIcon className="h-4 w-4 text-gold-400 flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recent Members */}
          {recentMembers.length > 0 && (
            <div className="bg-primary-800 border border-gold-600 shadow-lg rounded-lg p-4 sm:p-6">
              <div className="border-b border-gold-600 pb-4 mb-4 sm:mb-6 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold text-gold-100">最近加入的會員</h2>
                <Link
                  to="/members"
                  className="text-sm text-gold-400 hover:text-gold-300 font-medium"
                >
                  查看全部
                </Link>
              </div>
              <div className="space-y-4">
                {recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 sm:p-4 bg-primary-700 border border-gold-700 rounded-lg">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gold-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-900" />
                      </div>
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gold-100 truncate">{member.name}</h3>
                        <p className="text-xs text-gold-300 truncate">
                          {member.company} • {member.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      {getMembershipLevelBadge(member.membershipLevel)}
                      <Link
                        to={`/members/${member.id}`}
                        className="text-gold-400 hover:text-gold-300"
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
      </div>
    </div>
  );
};

export default Dashboard;