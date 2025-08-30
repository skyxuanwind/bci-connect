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
  const [importStatus, setImportStatus] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMode, setImportMode] = useState('batch');
  const [companyName, setCompanyName] = useState('');
  const [importConfig, setImportConfig] = useState({
    batchSize: 50,
    maxBatches: 10,
    maxRecords: 100,
    forceImport: false
  });

  // 載入同步狀態
  const loadSyncStatus = async () => {
    try {
      const response = await api.get('/api/judgment-sync/status');
      setSyncStatus(response.data.data);
    } catch (error) {
      console.error('載入同步狀態失敗:', error);
      toast.error('載入同步狀態失敗');
    }
  };

  // 載入統計資訊
  const loadStatistics = async () => {
    try {
      const response = await api.get('/api/judgment-sync/statistics');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('載入統計資訊失敗:', error);
      toast.error('載入統計資訊失敗');
    }
  };

  // 載入歷史導入狀態
  const loadImportStatus = async () => {
    try {
      const response = await api.get('/api/judgment-sync/import-status');
      setImportStatus(response.data.data);
    } catch (error) {
      console.error('載入歷史導入狀態失敗:', error);
    }
  };

  // 啟動歷史資料導入
  const handleHistoricalImport = async () => {
    if (importStatus?.isRunning) {
      toast.warning('歷史資料導入作業已在進行中');
      return;
    }

    if (!importStatus?.isApiAvailable && !importConfig.forceImport) {
      toast.warning('司法院 API 僅在凌晨 0-6 點提供服務，或啟用強制導入模式');
      return;
    }

    if (importMode === 'company' && !companyName.trim()) {
      toast.error('請輸入公司名稱');
      return;
    }

    setImportLoading(true);
    try {
      const payload = {
        mode: importMode,
        ...importConfig
      };
      
      if (importMode === 'company') {
        payload.companyName = companyName.trim();
      }

      const response = await api.post('/api/judgment-sync/import-historical', payload);
      toast.success(response.data.message);
      
      // 延遲重新載入狀態
      setTimeout(() => {
        loadImportStatus();
        loadStatistics();
      }, 2000);
    } catch (error) {
      console.error('啟動歷史資料導入失敗:', error);
      toast.error(error.response?.data?.message || '啟動歷史資料導入失敗');
    } finally {
      setImportLoading(false);
    }
  };

  // 手動觸發同步
  const handleManualSync = async (forceSync = false) => {
    if (syncStatus?.isRunning) {
      toast.warning('同步作業已在進行中');
      return;
    }

    if (!syncStatus?.isApiAvailable && !forceSync) {
      toast.warning('司法院 API 僅在凌晨 0-6 點提供服務');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/judgment-sync/manual-sync', { forceSync });
      toast.success(forceSync ? '強制同步作業已開始' : '同步作業已開始，請稍後查看狀態');
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

  // 切換開發模式
  const handleToggleDevMode = async (enable) => {
    try {
      await api.post('/api/judgment-sync/toggle-dev-mode', { enable });
      toast.success(`開發模式已${enable ? '啟用' : '停用'}`);
      // 重新載入狀態
      setTimeout(() => {
        loadSyncStatus();
      }, 1000);
    } catch (error) {
      console.error('切換開發模式失敗:', error);
      toast.error(error.response?.data?.message || '切換開發模式失敗');
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

      const response = await api.get('/api/judgment-sync/search', { params });
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
    loadImportStatus();
    
    // 每 30 秒自動重新載入狀態
    const interval = setInterval(() => {
      loadSyncStatus();
      loadImportStatus();
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">同步狀態</h3>
          {syncStatus ? (
            <div className="space-y-3">
              {/* 當前時間顯示 */}
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600 mb-1">當前時間</div>
                <div className="font-medium text-gray-900">
                  {new Date().toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              
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
              
              {/* API 限制說明 */}
              {!syncStatus.isApiAvailable && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        司法院 API 服務時間限制
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>• 服務時間：每日凌晨 00:00 - 06:00</p>
                        <p>• 當前時間：{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}</p>
                        <p>• 如需測試，請聯繫管理員啟用開發模式</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
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
              
              {/* 同步進度顯示 */}
              {syncStatus.isRunning && syncStatus.currentSyncId && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="text-sm text-blue-800">
                    <p>同步作業進行中...</p>
                    <p>同步 ID: {syncStatus.currentSyncId}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <button
                  onClick={() => handleManualSync(false)}
                  disabled={loading || syncStatus.isRunning || !syncStatus.isApiAvailable}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '啟動中...' : syncStatus.isRunning ? '同步進行中' : !syncStatus.isApiAvailable ? 'API 不可用' : '手動同步'}
                </button>
                
                {/* 強制同步按鈕 */}
                {!syncStatus.isApiAvailable && (
                  <button
                    onClick={() => handleManualSync(true)}
                    disabled={loading || syncStatus.isRunning}
                    className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? '啟動中...' : '強制同步 (測試用)'}
                  </button>
                )}
                
                {/* 管理員控制面板 */}
                {syncStatus.debugInfo && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                    <div className="text-sm font-medium text-orange-800 mb-2">管理員控制</div>
                    <div className="space-y-2">
                      {/* 開發模式切換 */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-orange-700">開發模式</span>
                        <button
                          onClick={() => handleToggleDevMode(!syncStatus.debugInfo.devForceEnabled)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            syncStatus.debugInfo.devForceEnabled
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {syncStatus.debugInfo.devForceEnabled ? '已啟用' : '已停用'}
                        </button>
                      </div>
                      
                      {/* 強制同步按鈕 */}
                      {!syncStatus.isApiAvailable && (
                        <button
                          onClick={() => handleManualSync(true)}
                          disabled={loading || syncStatus.isRunning}
                          className="w-full bg-orange-600 text-white px-4 py-1 rounded text-sm hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {loading ? '啟動中...' : '強制同步（忽略時間限制）'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 錯誤提示 */}
              {!syncStatus.isApiAvailable && !syncStatus.debugInfo?.devForceEnabled && (
                <div className="text-xs text-gray-500 text-center">
                  手動同步僅在 API 服務時間內可用，或聯繫管理員啟用開發模式
                </div>
              )}
              
              {/* 調試信息顯示 */}
              {syncStatus.debugInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mt-3">
                  <div className="text-sm font-medium text-gray-800 mb-2">系統狀態詳情</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>環境: {syncStatus.debugInfo.environment}</div>
                      <div>開發模式: {syncStatus.debugInfo.devForceEnabled ? '已啟用' : '未啟用'}</div>
                      <div>當前小時: {syncStatus.debugInfo.currentHour}</div>
                      <div>服務窗口: {syncStatus.debugInfo.isInServiceWindow ? '是' : '否'}</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div>台北時間: {syncStatus.debugInfo.taiwanTime}</div>
                      <div>服務時間: {syncStatus.debugInfo.apiServiceWindow}</div>
                    </div>
                  </div>
                </div>
              )}
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
              {/* 調試信息顯示 */}
              {statistics.debugInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                  <div className="text-sm font-medium text-blue-800 mb-2">調試信息</div>
                  <div className="text-xs text-blue-700 space-y-1">
                    {Object.entries(statistics.debugInfo).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium">{key}:</span>
                        <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 ? (
            <div className="space-y-3">
              {syncStatus.recentLogs.slice(0, 5).map((log, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(log.sync_date)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'completed' 
                        ? 'text-green-600 bg-green-100'
                        : log.status === 'running'
                        ? 'text-blue-600 bg-blue-100'
                        : 'text-red-600 bg-red-100'
                    }`}>
                      {log.status === 'completed' ? '完成' : log.status === 'running' ? '進行中' : '失敗'}
                    </span>
                  </div>
                  
                  {/* 同步統計 */}
                  {log.status === 'completed' && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>總計: {log.total_fetched || 0}</div>
                      <div>新增: {log.new_records || 0}</div>
                      <div>更新: {log.updated_records || 0}</div>
                      <div>錯誤: {log.errors || 0}</div>
                    </div>
                  )}
                  
                  {/* 錯誤信息 */}
                  {log.status === 'failed' && log.error_message && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <div className="font-medium">錯誤信息:</div>
                      <div className="mt-1">{log.error_message}</div>
                    </div>
                  )}
                  
                  {/* 時間信息 */}
                  <div className="mt-2 text-xs text-gray-500">
                    {log.started_at && (
                      <div>開始: {formatDate(log.started_at)}</div>
                    )}
                    {log.completed_at && (
                      <div>完成: {formatDate(log.completed_at)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">暫無同步記錄</div>
          )}
        </div>
        
        {/* 歷史資料導入 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">歷史資料導入</h3>
          {importStatus ? (
            <div className="space-y-4">
              {/* 導入狀態顯示 */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">導入狀態</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  importStatus.isRunning 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-600 bg-gray-100'
                }`}>
                  {importStatus.isRunning ? '進行中' : '閒置'}
                </span>
              </div>
              
              {/* 導入進度顯示 */}
              {importStatus.isRunning && importStatus.stats && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="text-sm text-blue-800 mb-3">導入進度</div>
                  
                  {/* 整體進度條 */}
                  {importStatus.stats.totalBatches > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>整體進度</span>
                        <span>{importStatus.stats.currentBatch || 0}/{importStatus.stats.totalBatches || 0} 批次</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${Math.min(100, ((importStatus.stats.currentBatch || 0) / (importStatus.stats.totalBatches || 1)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* 當前批次進度條 */}
                  {importStatus.stats.currentBatchSize > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-blue-700 mb-1">
                        <span>當前批次</span>
                        <span>{importStatus.stats.currentBatchProcessed || 0}/{importStatus.stats.currentBatchSize || 0} 記錄</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${Math.min(100, ((importStatus.stats.currentBatchProcessed || 0) / (importStatus.stats.currentBatchSize || 1)) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* 統計信息 */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                    <div>已處理: {importStatus.stats.totalProcessed || 0}</div>
                    <div>新增: {importStatus.stats.newRecords || 0}</div>
                    <div>更新: {importStatus.stats.updatedRecords || 0}</div>
                    <div>跳過: {importStatus.stats.skippedRecords || 0}</div>
                    <div>錯誤: {importStatus.stats.errorRecords || 0}</div>
                    <div>批次: {importStatus.stats.currentBatch || 0}/{importStatus.stats.totalBatches || 0}</div>
                  </div>
                </div>
              )}
              
              {/* 導入模式選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">導入模式</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="batch"
                      checked={importMode === 'batch'}
                      onChange={(e) => setImportMode(e.target.value)}
                      disabled={importStatus.isRunning}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">批量導入</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="company"
                      checked={importMode === 'company'}
                      onChange={(e) => setImportMode(e.target.value)}
                      disabled={importStatus.isRunning}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">公司導入</span>
                  </label>
                </div>
              </div>
              
              {/* 公司名稱輸入 */}
              {importMode === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">公司名稱</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="請輸入公司名稱"
                    disabled={importStatus.isRunning}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
              )}
              
              {/* 導入配置 */}
              <div className="grid grid-cols-2 gap-4">
                {importMode === 'batch' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">批次大小</label>
                      <input
                        type="number"
                        value={importConfig.batchSize}
                        onChange={(e) => setImportConfig({...importConfig, batchSize: parseInt(e.target.value) || 50})}
                        min="10"
                        max="100"
                        disabled={importStatus.isRunning}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">最大批次數</label>
                      <input
                        type="number"
                        value={importConfig.maxBatches}
                        onChange={(e) => setImportConfig({...importConfig, maxBatches: parseInt(e.target.value) || 10})}
                        min="1"
                        max="50"
                        disabled={importStatus.isRunning}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">最大記錄數</label>
                    <input
                      type="number"
                      value={importConfig.maxRecords}
                      onChange={(e) => setImportConfig({...importConfig, maxRecords: parseInt(e.target.value) || 100})}
                      min="10"
                      max="500"
                      disabled={importStatus.isRunning}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                )}
              </div>
              
              {/* 強制導入選項 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="forceImport"
                  checked={importConfig.forceImport}
                  onChange={(e) => setImportConfig({...importConfig, forceImport: e.target.checked})}
                  disabled={importStatus.isRunning}
                  className="mr-2"
                />
                <label htmlFor="forceImport" className="text-sm text-gray-700">
                  強制導入（忽略API服務時間限制）
                </label>
              </div>
              
              {/* API 時間限制提示 */}
              {!importStatus.isApiAvailable && !importConfig.forceImport && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        API 服務時間限制
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>司法院 API 僅在凌晨 00:00-06:00 提供服務</p>
                        <p>當前時間：{importStatus.currentTime ? new Date(importStatus.currentTime).toLocaleString('zh-TW') : '-'}</p>
                        <p>請在服務時間內執行，或勾選強制導入選項</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 導入按鈕 */}
              <button
                onClick={handleHistoricalImport}
                disabled={importLoading || importStatus.isRunning || (!importStatus.isApiAvailable && !importConfig.forceImport)}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {importLoading ? '啟動中...' : importStatus.isRunning ? '導入進行中' : '開始歷史資料導入'}
              </button>
              
              {/* 說明文字 */}
              <div className="text-xs text-gray-500">
                <p>• 批量導入：從司法院API獲取最新的判決書列表進行導入</p>
                <p>• 公司導入：搜尋特定公司相關的判決書進行導入</p>
                <p>• 導入過程會自動跳過已存在的判決書</p>
                <p>• 建議在API服務時間內（凌晨0-6點）執行以獲得最佳效果</p>
              </div>
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