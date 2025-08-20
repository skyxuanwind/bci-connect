import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const NFCCheckin = () => {
  const { user } = useAuth();
  const [lastCheckin, setLastCheckin] = useState(null);
  const [allCheckins, setAllCheckins] = useState([]);
  const [nfcStatus, setNfcStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCheckinId, setLastCheckinId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [lastUpdate, setLastUpdate] = useState('');
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState('');

  // 更新報到狀態
  const updateCheckinStatus = async () => {
    try {
      // 使用 fetch 而不是 api，因為這個端點不需要認證
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/nfc-checkin/last-checkin`);
      const data = await response.json();
      
      setLastUpdate(new Date().toLocaleTimeString('zh-TW'));
      
      if (data.id && data.id !== lastCheckinId) {
        // 有新的報到紀錄
        setLastCheckinId(data.id);
        setLastCheckin(data);
        setShowSuccess(true);
        
        // 3秒後隱藏成功訊息
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else if (data.id) {
        // 顯示最後一筆紀錄但不是新的
        setLastCheckin(data);
      }
      
      // 更新總報到次數
      if (data.id) {
        setTotalCheckins(data.id);
      }
      
    } catch (error) {
      console.error('更新報到狀態錯誤:', error);
    }
  };

  // 獲取 NFC 系統狀態
  const fetchNFCStatus = async () => {
    try {
      // 使用 fetch 而不是 api，因為這個端點不需要認證
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/nfc-checkin/status`);
      const data = await response.json();
      setNfcStatus(data);
    } catch (error) {
      console.error('獲取 NFC 狀態錯誤:', error);
    }
  };

  // 獲取所有報到紀錄 (需要登入)
  const fetchAllCheckins = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/nfc-checkin/all-checkins');
      // 確保回應資料是陣列
      const data = response.data;
      if (Array.isArray(data)) {
        setAllCheckins(data);
      } else {
        console.warn('API 回應不是陣列格式:', data);
        setAllCheckins([]);
      }
    } catch (error) {
      console.error('獲取所有報到紀錄錯誤:', error);
      // 發生錯誤時設置為空陣列
      setAllCheckins([]);
    }
  };

  // 手動新增報到紀錄
  const handleManualCheckin = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.target);
    const cardUid = formData.get('cardUid');
    const userName = formData.get('userName');
    const notes = formData.get('notes');
    
    if (!cardUid) {
      alert('請輸入卡片 UID');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/api/nfc-checkin/manual-checkin', {
        cardUid,
        userName,
        notes
      });
      
      if (response.data.success) {
        alert('手動新增報到成功！');
        e.target.reset();
        fetchAllCheckins();
        updateCheckinStatus();
      } else {
        alert(response.data.message || '新增報到失敗');
      }
    } catch (error) {
      console.error('手動新增報到錯誤:', error);
      alert('新增報到失敗');
    } finally {
      setLoading(false);
    }
  };

  // 啟動 NFC 讀卡機
  const startNFCReader = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const response = await api.post('/api/nfc-checkin/start-reader');
      alert(response.data.message);
      fetchNFCStatus();
    } catch (error) {
      console.error('啟動 NFC 讀卡機錯誤:', error);
      alert('啟動 NFC 讀卡機失敗');
    } finally {
      setLoading(false);
    }
  };

  // 模擬 NFC 卡片掃描
  const simulateNFCScan = async () => {
    if (!user) return;
    
    const cardUid = prompt('請輸入要模擬的卡片 UID (例：04:A1:B2:C3):');
    if (!cardUid) return;
    
    setLoading(true);
    
    try {
      const response = await api.post('/api/nfc-checkin/simulate-scan', { cardUid });
      alert(`模擬掃描成功！\n卡片 UID: ${response.data.cardUid}\n報到時間: ${response.data.checkinTime}`);
      updateCheckinStatus();
      fetchNFCStatus();
    } catch (error) {
      console.error('模擬 NFC 掃描錯誤:', error);
      const errorMessage = error.response?.data?.message || '模擬掃描失敗';
      alert(`模擬掃描失敗: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 啟動 NFC 系統
  const startNFCSystem = async () => {
    setSystemLoading(true);
    setSystemMessage('');
    try {
      const response = await api.post('/api/nfc-checkin/start-system');
      if (response.data.success) {
        setSystemMessage('✅ NFC 系統啟動成功！');
        console.log('系統啟動輸出:', response.data.output);
        // 3秒後清除訊息
        setTimeout(() => setSystemMessage(''), 5000);
      }
    } catch (error) {
      console.error('系統啟動錯誤:', error);
      setSystemMessage('❌ 系統啟動失敗: ' + (error.response?.data?.error || error.message));
      setTimeout(() => setSystemMessage(''), 5000);
    } finally {
      setSystemLoading(false);
    }
  };

  // 停止 NFC 系統
  const stopNFCSystem = async () => {
    setSystemLoading(true);
    setSystemMessage('');
    try {
      const response = await api.post('/api/nfc-checkin/stop-system');
      if (response.data.success) {
        setSystemMessage('✅ NFC 系統停止成功！');
        console.log('系統停止輸出:', response.data.output);
        // 3秒後清除訊息
        setTimeout(() => setSystemMessage(''), 5000);
      }
    } catch (error) {
      console.error('系統停止錯誤:', error);
      setSystemMessage('❌ 系統停止失敗: ' + (error.response?.data?.error || error.message));
      setTimeout(() => setSystemMessage(''), 5000);
    } finally {
      setSystemLoading(false);
    }
  };

  useEffect(() => {
    // 初始載入
    updateCheckinStatus();
    fetchNFCStatus();
    if (user) {
      fetchAllCheckins();
    }
    
    // 每2秒自動更新
    const interval = setInterval(updateCheckinStatus, 2000);
    
    // 每10秒更新 NFC 狀態
    const statusInterval = setInterval(fetchNFCStatus, 10000);
    
    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, [user, lastCheckinId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* 標題 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">📱 NFC 報到系統</h1>
            <p className="text-blue-100">BCI Connect - NFC 卡片報到功能</p>
          </div>

          {/* 主要報到區域 */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-pulse">📡</div>
              
              {showSuccess ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl mb-4">
                  <div className="text-2xl font-bold mb-2">✅ 報到成功！</div>
                  {lastCheckin && (
                    <div>
                      <div className="text-lg">卡號：{lastCheckin.card_uid}</div>
                      <div className="text-sm text-gray-600">時間：{lastCheckin.checkin_time}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 text-gray-600 px-6 py-4 rounded-xl mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                    等待報到中...
                  </div>
                  <div className="text-sm">請將 NFC 卡片靠近讀卡機</div>
                </div>
              )}
            </div>

            {/* 統計資訊 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">{totalCheckins}</div>
                <div className="text-sm text-gray-600">總報到次數</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-lg font-bold text-green-600">{lastUpdate}</div>
                <div className="text-sm text-gray-600">最後更新</div>
              </div>
            </div>

            {/* NFC 狀態 */}
            {nfcStatus && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-bold mb-2">NFC 系統狀態</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">系統狀態：</span>
                    <span className={nfcStatus.status === 'running' ? 'text-green-600' : 'text-red-600'}>
                      {nfcStatus.status === 'running' ? '運行中' : '停止'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">讀卡機：</span>
                    <span className={nfcStatus.readerConnected ? 'text-green-600' : 'text-red-600'}>
                      {nfcStatus.readerConnected ? '已連接' : '未連接'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">NFC 功能：</span>
                    <span className={nfcStatus.nfcActive ? 'text-green-600' : 'text-orange-600'}>
                      {nfcStatus.nfcActive ? '啟用' : '停用'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">更新時間：</span>
                    <span className="text-gray-600">{nfcStatus.timestamp}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 管理功能 (需要登入) */}
            {user && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">管理功能</h3>
                
                {/* 系統管理按鈕 */}
                <div className="mb-6">
                  <h4 className="font-bold mb-3 text-gray-700">🖥️ 系統管理</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={startNFCSystem}
                      disabled={systemLoading}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center"
                    >
                      {systemLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          處理中...
                        </>
                      ) : (
                        <>🚀 啟動 NFC 系統</>
                      )}
                    </button>
                    
                    <button
                      onClick={stopNFCSystem}
                      disabled={systemLoading}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center"
                    >
                      {systemLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          處理中...
                        </>
                      ) : (
                        <>🛑 停止 NFC 系統</>
                      )}
                    </button>
                  </div>
                  
                  {/* 系統管理狀態訊息 */}
                  {systemMessage && (
                    <div className={`px-3 py-2 rounded-lg text-sm ${
                      systemMessage.includes('✅') 
                        ? 'bg-green-100 border border-green-300 text-green-700'
                        : 'bg-red-100 border border-red-300 text-red-700'
                    }`}>
                      {systemMessage}
                    </div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 mt-3">
                    <span className="font-medium">💡 提示：</span> 這些按鈕會執行系統腳本來啟動或停止完整的 NFC 系統（包括前端、後端和 NFC Gateway 服務）。
                  </div>
                </div>
                
                {/* NFC 控制按鈕 */}
                <div className="mb-4 space-y-2">
                  <h4 className="font-bold mb-3 text-gray-700">🏷️ NFC 讀卡機控制</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={startNFCReader}
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {loading ? '處理中...' : '啟動 NFC 讀卡機'}
                    </button>
                    
                    {/* 模擬 NFC 掃描按鈕 (僅在模擬模式下顯示) */}
                    {nfcStatus?.simulated && (
                      <button
                        onClick={simulateNFCScan}
                        disabled={loading}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {loading ? '處理中...' : '🔮 模擬 NFC 掃描'}
                      </button>
                    )}
                  </div>
                  
                  {/* 模擬模式提示 */}
                  {nfcStatus?.simulated && (
                    <div className="bg-purple-100 border border-purple-300 text-purple-700 px-3 py-2 rounded-lg text-sm">
                      <span className="font-medium">🔮 模擬模式：</span> 由於生產環境無法使用實體 NFC 硬體，系統已啟用模擬模式供測試使用。
                    </div>
                  )}
                </div>

                {/* 手動新增報到 */}
                <form onSubmit={handleManualCheckin} className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold mb-3">手動新增報到紀錄</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">卡片 UID *</label>
                      <input
                        type="text"
                        name="cardUid"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例：04:A1:B2:C3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">使用者姓名</label>
                      <input
                        type="text"
                        name="userName"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="選填"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">備註</label>
                      <input
                        type="text"
                        name="notes"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="選填"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {loading ? '新增中...' : '新增報到紀錄'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 報到紀錄列表 (需要登入) */}
          {user && allCheckins.length > 0 && (
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h2 className="text-2xl font-bold mb-6">📋 報到紀錄</h2>
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">卡片 UID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">使用者</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">報到時間</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(allCheckins) && allCheckins.length > 0 ? (
                      allCheckins.map((record, index) => (
                        <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm">{record.id}</td>
                          <td className="px-4 py-3 text-sm font-mono">{record.card_uid}</td>
                          <td className="px-4 py-3 text-sm">{record.user_name || '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.checkin_time}</td>
                          <td className="px-4 py-3 text-sm">{record.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          {user ? '暫無報到紀錄' : '請登入以查看報到紀錄'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 使用說明 */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mt-8">
            <h2 className="text-2xl font-bold mb-6">📖 使用說明</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-lg mb-3">🎯 報到方式</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• 將 NFC 卡片靠近讀卡機</li>
                  <li>• 系統自動偵測並記錄報到</li>
                  <li>• 頁面每 2 秒自動更新狀態</li>
                  <li>• 報到成功會顯示確認訊息</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-3">⚙️ 系統需求</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• ACR122U NFC 讀卡機</li>
                  <li>• 支援 PC/SC 的作業系統</li>
                  <li>• 現代瀏覽器 (Chrome, Firefox, Safari)</li>
                  <li>• 穩定的網路連線</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCCheckin;