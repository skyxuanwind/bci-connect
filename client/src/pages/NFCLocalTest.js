import React, { useState, useEffect } from 'react';
import NFCLocalReader from '../components/NFCLocalReader';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const NFCLocalTest = () => {
  const { user } = useAuth();
  const [userNfcId, setUserNfcId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  // 使用 NFCLocalReader Hook
  const nfcReader = NFCLocalReader({
    onCardDetected: (cardData) => {
      console.log('檢測到 NFC 卡片:', cardData);
      handleCardDetected(cardData);
    },
    onError: (error) => {
      console.error('NFC 錯誤:', error);
      setTestResult({
        success: false,
        message: error.message || 'NFC 讀取發生錯誤',
        timestamp: new Date().toLocaleString('zh-TW')
      });
    },
    onStatusChange: (status) => {
      console.log('NFC 狀態變更:', status);
    }
  });

  // 獲取用戶 NFC ID
  const fetchUserNfcId = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/attendance/nfc-info/${user.id}`);
      setUserNfcId(response.data.user.nfc_card_id);
    } catch (error) {
      console.error('獲取 NFC ID 失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 檢查本地 NFC 伺服器狀態
  const checkServerStatus = async () => {
    try {
      const response = await fetch('process.env.REACT_APP_API_URL || window.location.origin/api/nfc/status');
      const data = await response.json();
      setServerStatus(data);
    } catch (error) {
      console.error('檢查伺服器狀態失敗:', error);
      setServerStatus({
        success: false,
        error: '無法連接到本地 NFC 伺服器'
      });
    }
  };

  // 處理卡片檢測
  const handleCardDetected = (cardData) => {
    setTestResult({
      success: true,
      message: `成功讀取 NFC 卡片！`,
      cardData: cardData,
      timestamp: new Date().toLocaleString('zh-TW')
    });

    // 3秒後清除結果
    setTimeout(() => {
      setTestResult(null);
    }, 5000);
  };

  // 開始 NFC 讀取
  const startNFCTest = () => {
    setTestResult(null);
    nfcReader.startReading();
  };

  // 停止 NFC 讀取
  const stopNFCTest = () => {
    nfcReader.stopReading();
    setTestResult(null);
  };

  useEffect(() => {
    fetchUserNfcId();
    checkServerStatus();
    
    // 每10秒檢查一次伺服器狀態
    const interval = setInterval(checkServerStatus, 10000);
    
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">本地 NFC 讀卡機測試</h1>
          <p className="mt-2 text-gray-600">使用 ACR122U 等 PC/SC 相容讀卡機進行 NFC 測試</p>
        </div>

        {/* 伺服器狀態 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">本地 NFC 伺服器狀態</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* WebSocket 連接狀態 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  nfcReader.connected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">WebSocket</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {nfcReader.connected ? '已連接' : '未連接'}
              </p>
            </div>

            {/* NFC 讀卡機狀態 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  nfcReader.readerConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">NFC 讀卡機</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {nfcReader.readerConnected ? nfcReader.readerName || '已連接' : '未連接'}
              </p>
            </div>

            {/* 讀取狀態 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  nfcReader.isReading ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">讀取狀態</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {nfcReader.isReading ? '讀取中' : '待機'}
              </p>
            </div>

            {/* 伺服器狀態 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  serverStatus?.success ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">伺服器</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {serverStatus?.success ? '運行中' : '離線'}
              </p>
            </div>
          </div>

          {/* 連接錯誤訊息 */}
          {nfcReader.connectionError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                <strong>連接錯誤:</strong> {nfcReader.connectionError}
              </p>
            </div>
          )}

          {/* 重新連接按鈕 */}
          {!nfcReader.connected && (
            <div className="mt-4">
              <button
                onClick={nfcReader.reconnect}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                重新連接伺服器
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 用戶 NFC 資訊 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">您的 NFC 卡片資訊</h2>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">載入中...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">用戶名稱</label>
                  <p className="text-gray-900">{user?.name || '未登入'}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">NFC 卡片 ID</label>
                  <p className="text-gray-900 font-mono text-sm break-all">
                    {userNfcId || '無 NFC 卡片 ID'}
                  </p>
                </div>
                
                <button
                  onClick={fetchUserNfcId}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  重新載入
                </button>
              </div>
            )}
          </div>

          {/* NFC 讀取測試 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">NFC 讀取測試</h2>
            
            {!nfcReader.connected ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-600 font-medium">伺服器未連接</p>
                <p className="text-gray-500 text-sm mt-2">請確認本地 NFC 伺服器已啟動</p>
              </div>
            ) : !nfcReader.readerConnected ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-yellow-600 font-medium">NFC 讀卡機未連接</p>
                <p className="text-gray-500 text-sm mt-2">請確認 ACR122U 讀卡機已正確連接</p>
              </div>
            ) : (
              <div>
                {!nfcReader.isReading && !testResult && (
                  <div className="text-center">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      <p className="text-gray-500 mb-4">點擊開始測試本地 NFC 讀取功能</p>
                    </div>
                    <button
                      onClick={startNFCTest}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      開始 NFC 讀取
                    </button>
                  </div>
                )}

                {nfcReader.isReading && !testResult && (
                  <div className="text-center py-8">
                    <div className="animate-pulse mb-4">
                      <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    </div>
                    <p className="text-green-700 font-medium mb-4">請將 NFC 卡片靠近讀卡機...</p>
                    <button
                      onClick={stopNFCTest}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      停止讀取
                    </button>
                  </div>
                )}

                {testResult && (
                  <div className={`text-center p-6 rounded-lg ${
                    testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center justify-center mb-4">
                      <svg className={`w-8 h-8 ${
                        testResult.success ? 'text-green-500' : 'text-red-500'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {testResult.success ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                    </div>
                    
                    <h3 className={`text-lg font-semibold mb-2 ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.success ? '讀取成功' : '讀取失敗'}
                    </h3>
                    
                    <p className={`mb-4 ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResult.message}
                    </p>

                    {testResult.cardData && (
                      <div className="bg-white p-4 rounded-lg mb-4 text-left">
                        <h4 className="font-medium text-gray-900 mb-2">卡片資訊:</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">UID:</span>
                            <span className="ml-2 font-mono text-gray-900">{testResult.cardData.uid}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">ATR:</span>
                            <span className="ml-2 font-mono text-gray-900">{testResult.cardData.atr}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">類型:</span>
                            <span className="ml-2 text-gray-900">{testResult.cardData.type}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">時間:</span>
                            <span className="ml-2 text-gray-900">{testResult.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setTestResult(null)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      重新測試
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 使用說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">本地 NFC 讀卡機使用說明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">支援的讀卡機</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• ACR122U USB NFC 讀卡機</li>
                <li>• SCL3711 NFC 讀卡機</li>
                <li>• 其他 PC/SC 相容的 NFC 讀卡機</li>
                <li>• 支援 ISO 14443 Type A/B 卡片</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">使用步驟</h4>
              <ol className="text-blue-700 text-sm space-y-1">
                <li>1. 確認讀卡機已連接並安裝驅動</li>
                <li>2. 啟動本地 NFC 伺服器 (npm run nfc-server)</li>
                <li>3. 確認伺服器狀態顯示為綠色</li>
                <li>4. 點擊「開始 NFC 讀取」</li>
                <li>5. 將 NFC 卡片靠近讀卡機</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>注意:</strong> 此功能需要啟動本地 NFC 伺服器。請在終端機中執行 <code className="bg-yellow-100 px-1 rounded">npm run nfc-server</code> 來啟動伺服器。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCLocalTest;