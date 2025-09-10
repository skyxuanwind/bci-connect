import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ChartBarIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const NFCAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/nfc-analytics/dashboard');
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('獲取分析數據失敗:', error);
      setError('載入分析數據失敗');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Taipei'
    });
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">暫無數據</h3>
        <p className="mt-1 text-sm text-gray-500">您的名片還沒有訪問記錄</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <div className="flex items-center">
          <ChartBarIcon className="h-8 w-8 mr-3" />
          <div>
            <h1 className="text-2xl font-bold">數據洞察儀表板</h1>
            <p className="text-blue-100 mt-1">深入了解您的電子名片表現</p>
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <EyeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">總瀏覽量</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalViews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">今日瀏覽</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.todayViews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">本週瀏覽</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.weekViews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">本月瀏覽</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.monthViews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 圖表區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 時間趨勢圖 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">瀏覽趨勢（過去30天）</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `日期: ${formatDate(value)}`}
                  formatter={(value) => [value, '瀏覽次數']}
                />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 來源分析 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">訪問來源分析</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.sourceAnalytics}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source_type, percent }) => `${source_type} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.sourceAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, '次數']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 內容熱點分析 */}
      {analytics.contentAnalytics.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <CursorArrowRaysIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">內容區塊熱點分析</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.contentAnalytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="content_type" />
                <YAxis />
                <Tooltip formatter={(value) => [value, '點擊次數']} />
                <Bar dataKey="click_count" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 地區和設備分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 地區分析 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <GlobeAltIcon className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">訪客地區分布</h3>
          </div>
          <div className="space-y-3">
            {analytics.locationAnalytics.slice(0, 5).map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {location.city}, {location.country}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {location.count} 次
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 設備分析 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <DevicePhoneMobileIcon className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">設備類型分布</h3>
          </div>
          <div className="space-y-3">
            {analytics.deviceAnalytics.slice(0, 5).map((device, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {device.device_type} - {device.browser}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {device.count} 次
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCAnalytics;