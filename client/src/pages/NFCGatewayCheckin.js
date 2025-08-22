import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const NFCGatewayCheckin = () => {
  const { user } = useAuth();
  const [isReading, setIsReading] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [checkinRecords, setCheckinRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);
  const [connecting, setConnecting] = useState(false);
  
  // NFC Gateway Service URL
  const GATEWAY_URL = process.env.REACT_APP_NFC_GATEWAY_URL || 'http://localhost:3002';
  
  // 檢查 NFC Gateway Service 狀態
  const checkGatewayStatus = async () => {
    try {
      setConnecting(true);
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/status`);
      const data = await response.json();
      console.log('Gateway 狀態:', data); // 調試日誌
      setGatewayStatus({
        ...data,
        success: data.status === 'running',
        nfcAvailable: data.readerConnected !== undefined,
        isActive: data.nfcActive
      });
      setIsReading(data.nfcActive);
      setConnecting(false);
      return true;
    } catch (error) {
      console.error('檢查 Gateway 狀態失敗:', error);
      setGatewayStatus({
        success: false,
        message: '無法連接到本地 NFC Gateway Service'
      });
      setConnecting(false);
      return false;
    }
  };
  
  // 啟動 NFC 讀卡機
  const startNFCReading = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/start-reader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsReading(true);
        setSuccess('NFC 讀卡機啟動成功！請將 NFC 卡片靠近讀卡機');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'NFC 讀卡機啟動失敗');
      }
    } catch (error) {
      console.error('啟動 NFC 讀卡機失敗:', error);
      setError('無法連接到本地 NFC Gateway Service');
    } finally {
      setLoading(false);
    }
  };
  
  // 停止 NFC 讀卡機
  const stopNFCReading = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/stop-reader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsReading(false);
        setSuccess('NFC 讀卡機已停止');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'NFC 讀卡機停止失敗');
      }
    } catch (error) {
      console.error('停止 NFC 讀卡機失敗:', error);
      setError('無法連接到本地 NFC Gateway Service');
    } finally {
      setLoading(false);
    }
  };
  
  // 獲取最後一筆報到記錄
  const fetchLastCheckin = async () => {
    try {
      const response = await api.get('/api/nfc-checkin-mongo/last-checkin');
      const payload = response?.data;
      const raw = (payload && Object.prototype.hasOwnProperty.call(payload, 'success')) ? payload.data : payload;
      const normalized = normalizeCheckinRecord(raw);
      if (normalized) {
        setLastCheckin(normalized);
      }
    } catch (error) {
      console.error('獲取最後報到記錄失敗:', error);
    }
  };
  
  // 獲取報到記錄（需要登入）
  const fetchCheckinRecords = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/nfc-checkin-mongo/records?limit=20');
      const payload = response?.data;
      let list = [];
      if (payload && Object.prototype.hasOwnProperty.call(payload, 'success')) {
        list = payload.data || [];
      } else if (Array.isArray(payload)) {
        list = payload;
      }
      setCheckinRecords((list || []).map(normalizeCheckinRecord).filter(Boolean));
    } catch (error) {
      console.error('獲取報到記錄失敗:', error);
    }
  };
  
  // 獲取報到統計
  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/nfc-checkin-mongo/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('獲取報到統計失敗:', error);
    }
  };
  
  // 測試雲端連線
  const testCloudConnection = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/test-cloud-connection`);
      const data = await response.json();
      
      if (data.success) {
        setSuccess('雲端 API 連線正常');
      } else {
        setError('雲端 API 連線失敗: ' + data.message);
      }
    } catch (error) {
      setError('測試雲端連線失敗: ' + error.message);
    }
  };

  // 手動連接 Gateway Service
  const connectGatewayService = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const connected = await checkGatewayStatus();
      if (connected) {
        setSuccess('成功連接到 NFC Gateway Service');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('無法連接到本地 NFC Gateway Service，請確保服務已啟動');
      }
    } catch (error) {
      console.error('連接 Gateway Service 失敗:', error);
      setError('連接 Gateway Service 失敗: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };
  
  // 自動連接 Gateway Service
  useEffect(() => {
    // 頁面加載時立即連接
    connectGatewayService();
    fetchLastCheckin();
    fetchCheckinRecords();
    fetchStats();
    
    const interval = setInterval(() => {
      checkGatewayStatus();
      fetchLastCheckin();
      if (user) {
        fetchCheckinRecords();
        fetchStats();
      }
    }, 3000); // 每3秒更新一次
    
    return () => clearInterval(interval);
  }, [user]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">🏷️ NFC 報到系統</h1>
          <p className="text-lg text-gray-600">使用本地 NFC Gateway Service 進行報到</p>
        </div>
        
        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>錯誤：</strong> {error}
          </div>
        )}
        
        {/* 成功訊息 */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <strong>成功：</strong> {success}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* NFC 控制面板 */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">🎛️ NFC 控制面板</h2>
            
            {/* Gateway 狀態 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">Gateway Service 狀態</h3>
              {gatewayStatus ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>服務狀態:</span>
                    <span className={gatewayStatus.success ? 'text-green-600' : 'text-red-600'}>
                      {gatewayStatus.success ? '✅ 運行中' : '❌ 離線'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>NFC 可用:</span>
                    <span className={gatewayStatus.nfcAvailable ? 'text-green-600' : 'text-red-600'}>
                      {gatewayStatus.nfcAvailable ? '✅ 是' : '❌ 否'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>讀卡機狀態:</span>
                    <span className={gatewayStatus.isActive ? 'text-green-600' : 'text-gray-600'}>
                      {gatewayStatus.isActive ? '🟢 運行中' : '⚪ 待機'}
                    </span>
                  </div>
                  {gatewayStatus.readerName && (
                    <div className="flex justify-between">
                      <span>讀卡機:</span>
                      <span className="text-blue-600">{gatewayStatus.readerName}</span>
                    </div>
                  )}
                  {gatewayStatus.lastCardUid && (
                    <div className="flex justify-between">
                      <span>最後卡號:</span>
                      <span className="text-purple-600 font-mono">{gatewayStatus.lastCardUid}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">正在檢查狀態...</div>
              )}
            </div>
            
            {/* 控制按鈕 */}
            <div className="space-y-4">
              {/* 連接 Gateway Service 按鈕 */}
              <button
                onClick={connectGatewayService}
                disabled={connecting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                {connecting ? '連接中...' : '🔌 連接 Gateway Service'}
              </button>

              {!isReading ? (
                <button
                  onClick={startNFCReading}
                  disabled={loading || !gatewayStatus?.nfcAvailable}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
                >
                  {loading ? '啟動中...' : '🚀 開始報到'}
                </button>
              ) : (
                <button
                  onClick={stopNFCReading}
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors"
                >
                  {loading ? '停止中...' : '🛑 停止報到'}
                </button>
              )}
              
              <button
                onClick={testCloudConnection}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                🔗 測試雲端連線
              </button>
            </div>
            
            {/* 使用說明 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-bold text-blue-800 mb-2">📋 使用說明</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 頁面載入時會自動連接本地 Gateway Service</li>
                <li>• 如果連接失敗，可點擊「連接 Gateway Service」按鈕重試</li>
                <li>• 確保本地 NFC Gateway Service 正在運行</li>
                <li>• 點擊「開始報到」啟動 NFC 讀卡機</li>
                <li>• 將 NFC 卡片靠近 ACR122U 讀卡機</li>
                <li>• 系統自動讀取卡號並上傳到雲端</li>
                <li>• 報到記錄會即時更新顯示</li>
              </ul>
            </div>
          </div>
          
          {/* 報到狀態 */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">📊 報到狀態</h2>
            
            {/* 統計資訊 */}
            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalCheckins}</div>
                  <div className="text-sm text-blue-800">總報到次數</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.todayCheckins}</div>
                  <div className="text-sm text-green-800">今日報到</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.uniqueCardsToday}</div>
                  <div className="text-sm text-purple-800">今日不重複卡片</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-xs text-orange-800">
                    {new Date(stats.lastUpdate).toLocaleTimeString('zh-TW')}
                  </div>
                  <div className="text-sm text-orange-800">最後更新</div>
                </div>
              </div>
            )}
            
            {/* 最後報到記錄 */}
            {lastCheckin && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <h3 className="font-bold text-green-800 mb-2">✅ 最後報到記錄</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>卡號:</strong> <span className="font-mono">{lastCheckin.cardUid}</span></div>
                  <div><strong>時間:</strong> {lastCheckin.checkinTime}</div>
                  <div><strong>來源:</strong> {lastCheckin.source}</div>
                  {lastCheckin.readerName && (
                    <div><strong>讀卡機:</strong> {lastCheckin.readerName}</div>
                  )}
                </div>
              </div>
            )}
            
            {/* 即時狀態 */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">🔄 即時狀態</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isReading ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm">
                  {isReading ? '正在等待 NFC 卡片...' : 'NFC 讀卡機未啟動'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 報到記錄列表（需要登入） */}
        {user && checkinRecords.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">📋 最近報到記錄</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-700">卡片 UID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">報到時間</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">來源</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">讀卡機</th>
                  </tr>
                </thead>
                <tbody>
                  {checkinRecords.map((record, index) => (
                    <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-mono text-sm">{record.cardUid}</td>
                      <td className="px-4 py-3 text-sm">{record.checkinTime}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.source === 'nfc-gateway' ? 'bg-green-100 text-green-800' :
                          record.source === 'manual' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {record.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{record.readerName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* 系統架構說明 */}
        <div className="mt-8 bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">🏗️ 系統架構</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🏷️</div>
              <div className="font-bold">NFC 讀卡機</div>
              <div className="text-sm text-gray-600">ACR122U</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl mb-2">🖥️</div>
              <div className="font-bold">本地 Gateway</div>
              <div className="text-sm text-gray-600">localhost:3002</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">☁️</div>
              <div className="font-bold">雲端 API</div>
              <div className="text-sm text-gray-600">Express + MongoDB</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl mb-2">⚛️</div>
              <div className="font-bold">React 前端</div>
              <div className="text-sm text-gray-600">用戶界面</div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            資料流向：NFC 讀卡機 → 本地 Gateway → 雲端 API → MongoDB → React 前端
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCGatewayCheckin;

// 將 SQLite 與 Mongo 兩種格式統一
const normalizeCheckinRecord = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id || raw._id || raw.lastID || null,
    cardUid: raw.cardUid || raw.card_uid || raw.cardUID || null,
    checkinTime: raw.checkinTime || raw.checkin_time || raw.formattedCheckinTime || raw.createdAt || raw.timestamp || null,
    readerName: raw.readerName || raw.reader_name || null,
    source: raw.source || null,
    timestamp: raw.timestamp || raw.createdAt || null,
  };
};