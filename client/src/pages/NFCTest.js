import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const NFCTest = () => {
  const { user } = useAuth();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcData, setNfcData] = useState(null);
  const [userNfcId, setUserNfcId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNFCSupport();
    if (user) {
      fetchUserNfcId();
    }
  }, [user]);

  const checkNFCSupport = () => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      console.log('NFC not supported on this device/browser');
    }
  };

  const fetchUserNfcId = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/attendance/nfc-info/${user.id}`);
      setUserNfcId(response.data.nfcCardId);
    } catch (error) {
      console.error('獲取 NFC ID 失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNFCReading = async () => {
    if (!nfcSupported) {
      alert('您的設備或瀏覽器不支援 NFC 功能');
      return;
    }

    try {
      setNfcReading(true);
      setNfcData(null);
      
      const ndef = new NDEFReader();
      await ndef.scan();
      
      console.log('NFC 掃描已啟動，請將 NFC 卡片靠近設備...');
      
      ndef.addEventListener('reading', ({ message, serialNumber }) => {
        console.log('NFC 卡片檢測到:', serialNumber);
        setNfcData({
          serialNumber: serialNumber,
          timestamp: new Date().toLocaleString('zh-TW')
        });
        setNfcReading(false);
      });
      
    } catch (error) {
      console.error('NFC 讀取失敗:', error);
      alert('NFC 讀取失敗: ' + error.message);
      setNfcReading(false);
    }
  };

  const stopNFCReading = () => {
    setNfcReading(false);
    setNfcData(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NFC 功能測試</h1>
          <p className="mt-2 text-gray-600">測試您的設備 NFC 功能並查看 NFC 卡片資訊</p>
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
            
            {!nfcSupported ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-600 font-medium">NFC 不支援</p>
                <p className="text-gray-500 text-sm mt-2">您的設備或瀏覽器不支援 NFC 功能</p>
              </div>
            ) : (
              <div>
                {!nfcReading && !nfcData && (
                  <div className="text-center">
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      <p className="text-gray-500 mb-4">點擊開始測試 NFC 讀取功能</p>
                    </div>
                    <button
                      onClick={startNFCReading}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      開始 NFC 讀取
                    </button>
                  </div>
                )}

                {nfcReading && (
                  <div className="text-center py-8">
                    <div className="animate-pulse mb-4">
                      <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    </div>
                    <p className="text-green-700 font-medium mb-4">請將 NFC 卡片靠近設備...</p>
                    <button
                      onClick={stopNFCReading}
                      className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      停止讀取
                    </button>
                  </div>
                )}

                {nfcData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-lg font-semibold text-green-800">NFC 讀取成功</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">序列號</label>
                        <p className="text-green-900 font-mono text-sm break-all bg-white p-2 rounded border">
                          {nfcData.serialNumber}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-1">讀取時間</label>
                        <p className="text-green-900">{nfcData.timestamp}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setNfcData(null)}
                      className="mt-4 w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
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
          <h3 className="text-lg font-semibold text-blue-900 mb-3">NFC 功能說明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">支援的設備</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Android 設備（Android 7.0 以上）</li>
                <li>• 支援 NFC 的手機或平板</li>
                <li>• Chrome 瀏覽器（89 版本以上）</li>
                <li>• Edge 瀏覽器（89 版本以上）</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">使用注意事項</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• 確保設備已開啟 NFC 功能</li>
                <li>• 將 NFC 卡片貼近設備背面</li>
                <li>• 保持卡片穩定，避免快速移動</li>
                <li>• iOS 設備目前不支援此功能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCTest;