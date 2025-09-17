import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import InfoButton from '../../components/InfoButton';
import {
  UserGroupIcon,
  UserIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  CalendarIcon,
  CreditCardIcon,
  CogIcon,
  ArrowPathIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setError('載入統計數據失敗');
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

  const quickActions = [
    {
      title: '會員審核',
      description: '審核待批准的新會員申請',
      href: '/admin/pending',
      icon: ClockIcon,
      color: 'bg-yellow-500',
      badge: stats?.pendingUsers || 0,
      urgent: stats?.pendingUsers > 0
    },
    {
      title: '會員管理',
      description: '管理所有會員帳號和狀態',
      href: '/admin/users',
      icon: UserGroupIcon,
      color: 'bg-blue-500'
    },
    {
      title: '分會管理',
      description: '管理分會設定和資訊',
      href: '/admin/chapters',
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500'
    },
    {
      title: '活動管理',
      description: '創建和管理活動',
      href: '/admin/events',
      icon: CalendarIcon,
      color: 'bg-green-500'
    },
    {
      title: 'NFC 分析',
      description: '查看 NFC 使用統計',
      href: '/admin/nfc-analytics',
      icon: CreditCardIcon,
      color: 'bg-indigo-500'
    },
    {
      title: '系統設定',
      description: '管理系統配置',
      href: '/admin/settings',
      icon: CogIcon,
      color: 'bg-gray-500'
    },
    {
      title: '數據同步',
      description: '司法院判決書同步',
      href: '/admin/judgment-sync',
      icon: ArrowPathIcon,
      color: 'bg-orange-500'
    },
    {
      title: '黑名單管理',
      description: '管理黑名單用戶',
      href: '/admin/blacklist',
      icon: ShieldExclamationIcon,
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

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">載入失敗</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            onClick={loadDashboardStats}
            className="btn-primary"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-primary text-white rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold">管理員儀表板</h1>
              <InfoButton tooltip="管理員儀表板提供系統整體概況，包括會員統計、待審核用戶提醒、快速管理功能等。您可以在這裡快速了解系統狀態並執行各種管理操作。" />
            </div>
            <p className="text-blue-100">
              系統總覽和管理功能
            </p>
          </div>
          <div className="hidden md:block">
            <ChartBarIcon className="h-16 w-16 text-gold-400" />
          </div>
        </div>
      </div>

      {/* Urgent Alerts */}
      {stats?.pendingUsers > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                有 {stats.pendingUsers} 位會員等待審核
              </h3>
              <div className="mt-2">
                <Link
                  to="/admin/pending"
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  立即處理 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">總會員數</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">活躍會員</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>

        {/* Pending Users */}
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">待審核</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingUsers || 0}</p>
            </div>
          </div>
        </div>

        {/* Total Chapters */}
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">分會數量</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalChapters || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">快速操作</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link
                key={index}
                to={action.href}
                className={`relative p-6 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 ${
                  action.urgent ? 'ring-2 ring-yellow-400 bg-yellow-50 hover:bg-yellow-100' : ''
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center relative`}>
                    <Icon className="h-6 w-6 text-white" />
                    {action.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Statistics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Membership Level Distribution */}
        {stats?.membershipLevelStats && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">會員等級分佈</h2>
            </div>
            <div className="space-y-4">
              {Object.entries(stats.membershipLevelStats).map(([level, count]) => {
                const percentage = stats.totalUsers > 0 ? (count / stats.totalUsers * 100).toFixed(1) : 0;
                const levelColors = {
                  '1': 'bg-red-500',
                  '2': 'bg-yellow-500',
                  '3': 'bg-green-500'
                };
                
                return (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 ${levelColors[level]} rounded mr-3`}></div>
                      <span className="text-sm font-medium text-gray-900">
                        {getMembershipLevelText(parseInt(level))}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count} 人</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Chapter Statistics */}
        {stats?.chapterStats && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">各分會會員統計</h2>
            </div>
            <div className="space-y-4">
              {stats.chapterStats.map((chapter, index) => {
                const percentage = stats.totalUsers > 0 ? (chapter.memberCount / stats.totalUsers * 100).toFixed(1) : 0;
                
                return (
                  <div key={chapter.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {chapter.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{chapter.memberCount} 人</span>
                      <span className="text-xs text-gray-500">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">系統狀態</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">系統運行</p>
              <p className="text-xs text-gray-500">正常</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">資料庫</p>
              <p className="text-xs text-gray-500">連線正常</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">用戶活動</p>
              <p className="text-xs text-gray-500">活躍</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;