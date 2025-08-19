import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const NFCReportSystem = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [checkinRecords, setCheckinRecords] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  
  // 本地 Gateway Service URL
  const GATEWAY_URL = 'http://localhost:3002';
  
  // 檢查本地 Gateway Service 狀態
  const checkGatewayStatus = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/status`);
      const data = await response.json();
      setGatewayStatus(data);
      setError('');
    } catch (error) {
      console.error('檢查 Gateway 狀態失敗:', error);
      setGatewayStatus(null);
      setError('無法連接到本地 NFC Gateway Service，請確認服務已啟動');
    }
  };
  
  // 啟動 NFC 讀卡機
  const startNFCReader = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/start-reader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        // 重新檢查狀態
        await checkGatewayStatus();
      } else {
        setError(data.message || 'NFC 讀卡機啟動失敗');
      }
    } catch (error) {
      console.error('啟動 NFC 讀卡機失敗:', error);
      setError('無法啟動 NFC 讀卡機，請檢查本地 Gateway Service');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 獲取最後一筆報到紀錄
  const fetchLastCheckin = async () => {
    try {
      // 使用雲端 API 獲取最後報到紀錄
      const response = await fetch('/api/nfc-checkin/last-checkin');
      const data = await response.json();
      
      if (data.id) {
        setLastCheckin(data);
      }
      
      setLastUpdate(new Date().toLocaleTimeString('zh-TW'));
    } catch (error) {
      console.error('獲取最後報到紀錄失敗:', error);
    }
  };
  
  // 獲取報到紀錄列表
  const fetchCheckinRecords = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/nfc-checkin/records?limit=20');
      if (response.data.success) {
        setCheckinRecords(response.data.data || []);
      }
    } catch (error) {
      console.error('獲取報到紀錄失敗:', error);
    }
  };
  
  // 手動測試上傳
  const testUpload = async () => {
    const cardUid = prompt('請輸入測試卡片 UID:');
    if (!cardUid) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/test-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cardUid })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('測試上傳成功！');
        await fetchLastCheckin();
        await fetchCheckinRecords();
      } else {
        alert(`測試上傳失敗: ${data.message}`);
      }
    } catch (error) {
      alert(`測試上傳錯誤: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 初始化和定時更新
  useEffect(() => {
    checkGatewayStatus();
    fetchLastCheckin();
    fetchCheckinRecords();
    
    // 每 3 秒檢查一次狀態和最後報到紀錄
    const interval = setInterval(() => {
      checkGatewayStatus();
      fetchLastCheckin();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">🏷️ NFC 報到系統</h1>
          <p className="text-lg text-gray-600">
            使用 ACR122U NFC 讀卡機進行報到，資料自動上傳到雲端
          </p>
        </div>
        
        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* 成功訊息 */}
        {showSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl mb-6">
            <div className="flex items-center">
              <span className="text-xl mr-2">✅</span>
              <span>NFC 讀卡機啟動成功！請將 NFC 卡片靠近讀卡機</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側：控制面板 */}
          <div className="space-y-6">
            {/* Gateway 狀態 */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🔧 Gateway Service 狀態</h2>
              
              {gatewayStatus ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">服務狀態:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      gatewayStatus.status === 'running' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {gatewayStatus.status === 'running' ? '運行中' : '已停止'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">NFC 讀卡機:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      gatewayStatus.nfcActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {gatewayStatus.nfcActive ? '已啟動' : '未啟動'}
                    </span>
                  </div>
                  
                  {gatewayStatus.readerName && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">讀卡機型號:</span>
                      <span className="text-gray-700">{gatewayStatus.readerName}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">雲端 API:</span>
                    <span className="text-gray-700 text-sm">{gatewayStatus.cloudApiUrl}</span>
                  </div>
                  
                  {gatewayStatus.lastCardUid && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-600">最後讀取卡片:</div>
                      <div className="font-mono text-lg">{gatewayStatus.lastCardUid}</div>
                      <div className="text-sm text-gray-500">{gatewayStatus.lastScanTime}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-500">無法連接到 Gateway Service</div>
                  <div className="text-sm text-gray-400 mt-2">
                    請確認本地 Gateway Service 已在 http://localhost:3002 啟動
                  </div>
                </div>
              )}
            </div>
            
            {/* 控制按鈕 */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">🎮 控制面板</h2>
              
              <div className="space-y-4">
                <button
                  onClick={startNFCReader}
                  disabled={isLoading || !gatewayStatus}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 text-lg"
                >
                  {isLoading ? '啟動中...' : '🚀 開始報到'}
                </button>
                
                <button
                  onClick={testUpload}
                  disabled={isLoading || !gatewayStatus}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
                >
                  🧪 測試上傳
                </button>
                
                <button
                  onClick={checkGatewayStatus}
                  disabled={isLoading}
                  className="w-full bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200"
                >
                  🔄 重新檢查狀態
                </button>
              </div>
            </div>
          </div>
          
          {/* 右側：報到資訊 */}
          <div className="space-y-6">
            {/* 最後報到紀錄 */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold mb-4">📱 最後報到紀錄</h2>
              
              {lastCheckin ? (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">卡片 UID:</span>
                      <span className="font-mono text-lg font-bold text-blue-600">
                        {lastCheckin.card_uid}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">報到時間:</span>
                      <span className="text-gray-800">{lastCheckin.checkin_time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">紀錄 ID:</span>
                      <span className="text-gray-600">#{lastCheckin.id}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <div>尚無報到紀錄</div>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-500 text-center">
                最後更新: {lastUpdate}
              </div>
            </div>
            
            {/* 報到紀錄列表 */}
            {user && checkinRecords.length > 0 && (
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <h2 className="text-2xl font-bold mb-4">📋 最近報到紀錄</h2>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {checkinRecords.map((record, index) => (
                    <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-mono font-bold text-blue-600">{record.cardUid}</div>
                        <div className="text-sm text-gray-500">{record.checkinTime}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">#{index + 1}</div>
                        <div className="text-xs text-gray-400">{record.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 使用說明 */}
        <div className="mt-8 bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-bold mb-4">📖 使用說明</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-3">🚀 開始使用</h3>
              <ol className="space-y-2 text-gray-700">
                <li>1. 確保 ACR122U NFC 讀卡機已連接</li>
                <li>2. 啟動本地 Gateway Service (port 3002)</li>
                <li>3. 點擊「開始報到」按鈕</li>
                <li>4. 將 NFC 卡片靠近讀卡機</li>
                <li>5. 系統自動上傳報到資料到雲端</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-3">⚙️ 系統架構</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• 本地端: NFC Gateway Service (讀取卡片)</li>
                <li>• 雲端: Express API (儲存資料)</li>
                <li>• 資料庫: MongoDB (持久化儲存)</li>
                <li>• 前端: React (使用者介面)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCReportSystem;