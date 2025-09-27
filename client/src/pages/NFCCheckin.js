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
  const [sseConnected, setSseConnected] = useState(false);


  // 更新報到狀態
  // 統一報到資料格式（支援 SQLite 與 Mongo）
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
  const updateCheckinStatus = async () => {
    try {
      // 使用 fetch 而不是 api，因為這個端點不需要認證
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/nfc-checkin-mongo/last-checkin`);
      const data = await response.json();
      
      // 兼容 {success, data} 與直接物件兩種格式
      const raw = (data && Object.prototype.hasOwnProperty.call(data, 'success')) ? data.data : data;
      const normalized = normalizeCheckinRecord(raw);
      
      console.log('🔄 更新報到狀態:', { currentId: lastCheckinId, newId: normalized?.id, data: normalized });
      
      setLastUpdate(new Date().toLocaleTimeString('zh-TW'));
      
      if (normalized?.id && normalized.id !== lastCheckinId) {
        // 有新的報到紀錄
        console.log('✅ 偵測到新報到記錄!', normalized);
        setLastCheckinId(normalized.id);
        setLastCheckin(normalized);
        setShowSuccess(true);
        
        // 3秒後隱藏成功訊息
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else if (normalized?.id) {
        // 顯示最後一筆紀錄但不是新的
        setLastCheckin(normalized);
      }
      
      // 更新總報到次數（沿用原邏輯）
      if (normalized?.id) {
        setTotalCheckins(normalized.id);
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
      const response = await fetch(`${apiUrl}/api/nfc-checkin-mongo/status`);
      const data = await response.json();
      setNfcStatus(data);
    } catch (error) {
      console.error('獲取 NFC 狀態錯誤:', error);
    }
  };

  // 獲取所有報到紀錄 (需要登入) - 包含NFC和QR Code報到
  const fetchAllCheckins = async () => {
    if (!user) return;
    
    try {
      // 獲取NFC報到記錄
      const nfcResponse = await api.get('/api/nfc-checkin-mongo/records');
      const nfcPayload = nfcResponse.data;
      let nfcList = [];
      if (Array.isArray(nfcPayload)) {
        nfcList = nfcPayload;
      } else if (nfcPayload && Object.prototype.hasOwnProperty.call(nfcPayload, 'success')) {
        nfcList = nfcPayload.data || [];
      }
      
      // 獲取出席統計（包含QR Code報到）
      let attendanceList = [];
      try {
        const attendanceResponse = await api.get('/api/attendance/statistics');
        if (attendanceResponse.data.success) {
          // 為每個活動獲取詳細的出席記錄
          const eventPromises = attendanceResponse.data.statistics.map(async (event) => {
            if (event.total_attended > 0) {
              try {
                const eventAttendanceResponse = await api.get(`/api/attendance/event/${event.id}`);
                if (eventAttendanceResponse.data.success) {
                  return eventAttendanceResponse.data.attendedMembers.map(member => ({
                    id: `qr-${member.id}`,
                    cardUid: `QR-${member.user_id}`,
                    checkinTime: new Date(member.check_in_time).toLocaleString('zh-TW'),
                    readerName: 'QR Code掃描',
                    source: 'QR Code',
                    userName: member.name,
                    userCompany: member.company,
                    eventTitle: event.title
                  }));
                }
              } catch (err) {
                console.warn(`無法獲取活動 ${event.id} 的出席記錄:`, err);
              }
            }
            return [];
          });
          
          const eventResults = await Promise.all(eventPromises);
          attendanceList = eventResults.flat();
        }
      } catch (error) {
        console.warn('獲取QR Code報到記錄失敗:', error);
      }
      
      // 合併並QR Code報到記錄
      const normalizedNfcList = (nfcList || []).map(record => ({
        ...normalizeCheckinRecord(record),
        source: 'NFC',
        readerName: record.readerName || record.reader_name || 'NFC讀卡機'
      }));
      
      const allRecords = [...normalizedNfcList, ...attendanceList]
        .filter(Boolean)
        .sort((a, b) => new Date(b.checkinTime) - new Date(a.checkinTime)); // 按時間倒序排列
      
      setAllCheckins(allRecords);
    } catch (error) {
      console.error('獲取所有報到紀錄錯誤:', error);
      // 發生錯誤時設置為空陣列
      setAllCheckins([]);
    }
  };

  // 手動新增報到
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
      const response = await api.post('/api/nfc-checkin-mongo/manual', {
        cardUid,
        userName,
        notes
      });
      
      alert(`手動報到成功！\n卡片 UID: ${cardUid}\n報到時間: ${new Date().toLocaleString('zh-TW')}`);
      
      // 清空表單
      e.target.reset();
      
      // 更新報到狀態
      updateCheckinStatus();
      fetchNFCStatus();
      fetchAllCheckins();
      
    } catch (error) {
      console.error('手動報到錯誤:', error);
      const errorMessage = error.response?.data?.message || '手動報到失敗';
      alert(`手動報到失敗: ${errorMessage}`);
    } finally {
      setLoading(false);
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

  // SSE 即時接收新的 NFC 報到
  useEffect(() => {
    let es;
    try {
      const base = process.env.REACT_APP_API_URL || '';
      es = new EventSource(`${base}/api/nfc-checkin-mongo/events`);

      es.onopen = () => {
        console.log('✅ SSE 連線已建立');
        setSseConnected(true);
      };

      es.addEventListener('nfc-checkin', (event) => {
        try {
          const payload = JSON.parse(event.data || '{}');
          const normalized = normalizeCheckinRecord({
            id: payload.id,
            cardUid: payload.cardUid,
            checkinTime: payload.checkinTime,
            readerName: payload.readerName,
            source: payload.source,
            timestamp: payload.timestamp,
          });
          
          if (normalized && normalized.id !== lastCheckinId) {
            console.log('🔄 SSE 收到新報到:', normalized);
            setLastCheckinId(normalized.id);
            setLastCheckin(normalized);
            setShowSuccess(true);
            setLastUpdate(new Date().toLocaleTimeString('zh-TW'));
            
            // 更新報到列表
            if (user) {
              fetchAllCheckins();
            }
            
            // 3秒後隱藏成功提示
            setTimeout(() => setShowSuccess(false), 3000);
          }
        } catch (e) {
          console.warn('解析 SSE 資料失敗:', e);
        }
      });

      es.onerror = (e) => {
        console.warn('SSE 連線錯誤', e);
        setSseConnected(false);
      };
    } catch (e) {
      console.warn('建立 SSE 連線失敗:', e);
      setSseConnected(false);
    }

    return () => {
      try { 
        if (es) {
          es.close();
          setSseConnected(false);
        }
      } catch (_) {}
    };
  }, [user, lastCheckinId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* 標題 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">📱 NFC 報到系統</h1>
            <p className="text-blue-100">GBC Connect - NFC 卡片報到功能</p>
            
            {/* SSE 連接狀態指示器 */}
            <div className="mt-4 flex justify-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                sseConnected 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                {sseConnected ? '即時通訊已連接' : '即時通訊未連接'}
              </div>
            </div>
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
                      <th className="px-4 py-3 text-left font-medium text-gray-700">報到方式</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">識別碼</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">使用者</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">公司</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">活動</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">報到時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(allCheckins) && allCheckins.length > 0 ? (
                      allCheckins.map((record, index) => (
                        <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.source === 'QR Code' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {record.source === 'QR Code' ? '📱 QR Code' : '🏷️ NFC'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">{record.cardUid || record.card_uid || '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.userName || record.user_name || '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.userCompany || '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.eventTitle || '-'}</td>
                          <td className="px-4 py-3 text-sm">{record.checkinTime || record.checkin_time}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
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