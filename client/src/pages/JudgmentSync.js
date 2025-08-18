import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const JudgmentSync = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    riskLevel: '',
    caseType: '',
    dateFrom: '',
    dateTo: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // 載入同步狀態
  const loadSyncStatus = async () => {
    try {
      const response = await api.get('/judgment-sync/status');
      setSyncStatus(response.data.data);
    } catch (error) {
      console.error('載入同步狀態失敗:', error);
      toast.error('載入同步狀態失敗');
    }
  };

  // 載入統計資訊
  const loadStatistics = async () => {
    try {
      const response = await api.get('/judgment-sync/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('載入統計資訊失敗:', error);
      toast.error('載入統計資訊失敗');
    }
  };

  // 手動觸發同步
  const handleManualSync = async () => {
    if (syncStatus?.isRunning) {
      toast.warning('同步作業已在進行中');
      return;
    }

    if (!syncStatus?.isApiAvailable) {
      toast.warning('司法院 API 僅在凌晨 0-6 點提供服務');
      return;
    }

    setLoading(true);
    try {
      await api.post('/judgment-sync/manual-sync');
      toast.success('同步作業已開始，請稍後查看狀態');
      // 延遲重新載入狀態
      setTimeout(() => {
        loadSyncStatus();
      }, 2000);
    } catch (error) {
      console.error('觸發同步失敗:', error);
      toast.error(error.response?.data?.message || '觸發同步失敗');
    } finally {
      setLoading(false);
    }
  };

  // 搜尋裁判書
  const handleSearch = async (page = 0) => {
    setSearchLoading(true);
    try {
      const params = {
        q: searchQuery,
        limit: 20,
        offset: page * 20,
        ...searchFilters
      };
      
      // 移除空值
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await api.get('/judgment-sync/search', { params });
      setSearchResults(response.data);
    } catch (error) {
      console.error('搜尋失敗:', error);
      toast.error('搜尋失敗');
    } finally {
      setSearchLoading(false);
    }
  };

  // 重置搜尋
  const handleResetSearch = () => {
    setSearchQuery('');
    setSearchFilters({
      riskLevel: '',
      caseType: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchResults(null);
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  // 格式化風險等級
  const formatRiskLevel = (level) => {
    const levels = {
      'HIGH': { text: '高風險', color: 'text-red-600 bg-red-100' },
      'MEDIUM': { text: '中風險', color: 'text-yellow-600 bg-yellow-100' },
      'LOW': { text: '低風險', color: 'text-green-600 bg-green-100' }
    };
    const levelInfo = levels[level] || { text: level, color: 'text-gray-600 bg-gray-100' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelInfo.color}`}>
        {levelInfo.text}
      </span>
    );
  };

  useEffect(() => {
    loadSyncStatus();
    loadStatistics();
    
    // 每 30 秒自動重新載入狀態
    const interval = setInterval(() => {
      loadSyncStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">裁判書同步管理</h1>
        <p className="mt-2 text-gray-600">管理司法院裁判書資料的自動同步與查詢</p>
      </div>

      {/* 同步狀態卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">同步狀態</h3>
          {syncStatus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API 可用性</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  syncStatus.isApiAvailable 
                    ? 'text-green-600 bg-green-100' 
                    : 'text-red-600 bg-red-100'
                }`}>
                  {syncStatus.isApiAvailable ? '可用' : '不可用'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">同步狀態</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  syncStatus.isRunning 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-600 bg-gray-100'
                }`}>
                  {syncStatus.isRunning ? '進行中' : '閒置'}
                </span>
              </div>
              <button
                onClick={handleManualSync}
                disabled={loading || syncStatus.isRunning || !syncStatus.isApiAvailable}
                className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? '啟動中...' : '手動同步'}
              </button>
            </div>
          ) : (
            <div className="text-gray-500">載入中...</div>
          )}
        </div>

        {/* 統計資訊 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">資料統計</h3>
          {statistics ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">總裁判書數</span>
                <span className="font-medium text-gray-900">{statistics.total.toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-500">
                最後更新: {formatDate(statistics.lastUpdate)}
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">風險等級分布</div>
                {statistics.riskLevelStats.map(stat => (
                  <div key={stat.risk_level} className="flex items-center justify-between text-sm">
                    <span>{stat.risk_level === 'HIGH' ? '高風險' : stat.risk_level === 'MEDIUM' ? '中風險' : '低風險'}</span>
                    <span>{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">載入中...</div>
          )}
        </div>

        {/* 最近同步記錄 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近同步</h3>
          {syncStatus?.recentLogs ? (
            <div className="space-y-3">
              {syncStatus.recentLogs.slice(0, 5).map(log => (
                <div key={log.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{formatDate(log.sync_date)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'completed' 
                        ? 'text-green-600 bg-green-100'
                        : log.status === 'failed'
                        ? 'text-red-600 bg-red-100'
                        : 'text-blue-600 bg-blue-100'
                    }`}>
                      {log.status === 'completed' ? '完成' : log.status === 'failed' ? '失敗' : '進行中'}
                    </span>
                  </div>
                  {log.status === 'completed' && (
                    <div className="text-xs text-gray-500 mt-1">
                      新增 {log.new_records} 筆，更新 {log.updated_records} 筆
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">載入中...</div>
          )}
        </div>
      </div>

      {/* 搜尋區域 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">搜尋裁判書</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">關鍵字</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋案號、內容、當事人..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">風險等級</label>
            <select
              value={searchFilters.riskLevel}
              onChange={(e) => setSearchFilters({...searchFilters, riskLevel: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="HIGH">高風險</option>
              <option value="MEDIUM">中風險</option>
              <option value="LOW">低風險</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">案件類型</label>
            <select
              value={searchFilters.caseType}
              onChange={(e) => setSearchFilters({...searchFilters, caseType: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="民事">民事</option>
              <option value="刑事">刑事</option>
              <option value="行政">行政</option>
              <option value="其他">其他</option>
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={() => handleSearch(0)}
              disabled={searchLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {searchLoading ? '搜尋中...' : '搜尋'}
            </button>
            <button
              onClick={handleResetSearch}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              重置
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
            <input
              type="date"
              value={searchFilters.dateFrom}
              onChange={(e) => setSearchFilters({...searchFilters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
            <input
              type="date"
              value={searchFilters.dateTo}
              onChange={(e) => setSearchFilters({...searchFilters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 搜尋結果 */}
      {searchResults && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              搜尋結果 ({searchResults.total.toLocaleString()} 筆)
            </h3>
          </div>
          
          {searchResults.data.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {searchResults.data.map(judgment => (
                <div key={judgment.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {judgment.case_number || judgment.jid}
                        </h4>
                        {formatRiskLevel(judgment.risk_level)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">判決日期:</span> {formatDate(judgment.judgment_date)}
                        </div>
                        <div>
                          <span className="font-medium">案件類型:</span> {judgment.case_type || '-'}
                        </div>
                        <div>
                          <span className="font-medium">法院:</span> {judgment.court_name || '-'}
                        </div>
                      </div>
                      
                      {judgment.parties && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">當事人:</span> {judgment.parties}
                        </div>
                      )}
                      
                      {judgment.summary && (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">摘要:</span> {judgment.summary}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              沒有找到符合條件的裁判書
            </div>
          )}
          
          {searchResults.hasMore && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={() => handleSearch(Math.floor(searchResults.data.length / 20))}
                disabled={searchLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {searchLoading ? '載入中...' : '載入更多'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JudgmentSync;