import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import axios from 'axios';
import api from '../services/api';

const CheckInScanner = () => {
  const { user, isAdmin, updateProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [debugInfo, setDebugInfo] = useState([]);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcResult, setNfcResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  
  // Gateway Service 相關狀態
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [gatewayError, setGatewayError] = useState('');
  const [lastNfcCheckin, setLastNfcCheckin] = useState(null);
  const [nfcCheckinRecords, setNfcCheckinRecords] = useState([]);
  
  // 本地 Gateway Service URL
  const GATEWAY_URL = 'http://localhost:3002';
  const html5QrcodeScannerRef = useRef(null);
  const processedSseCheckinsRef = useRef(new Set());

  // 添加調試訊息
  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString('zh-TW');
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };



  useEffect(() => {
    fetchEvents();
    checkNFCSupport();
    checkGatewayStatus();
    fetchLastNfcCheckin();
    fetchNfcCheckinRecords();
    
    // 每 3 秒檢查一次 Gateway 狀態和最後 NFC 報到紀錄
    const interval = setInterval(() => {
      checkGatewayStatus();
      fetchLastNfcCheckin();
      if (user) {
        fetchNfcCheckinRecords();
      }
    }, 3000);
    
    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear();
      }
      clearInterval(interval);
    };
  }, [user]);

  // 透過 SSE 即時接收新的 NFC 報到
  useEffect(() => {
    let es;
    try {
      const base = process.env.REACT_APP_API_URL || '';
      es = new EventSource(`${base}/api/nfc-checkin-mongo/events`);

      es.addEventListener('nfc-checkin', async (event) => {
        try {
          const payload = JSON.parse(event.data || '{}');
          const normalized = normalizeCheckinRecord({
            id: payload.id,
            cardUid: payload.cardUid,
            checkinTime: payload.checkinTime,
            readerName: payload.readerName,
            source: payload.source,
            timestamp: payload.timestamp,
            member: payload.member,
          });
          if (normalized) {
            setLastNfcCheckin(normalized);
            setNfcCheckinRecords(prev => [normalized, ...prev].slice(0, 10));
          }

          // 自動同步至出席管理（僅當已選擇活動時）
          if (selectedEvent && payload.member && payload.isRegisteredMember) {
            // 顯示 NFC 報到成功彈窗
            setSuccessModalData({
              user: {
                name: payload.member.name,
                company: payload.member.company || '未設定'
              },
              event: {
                title: events.find(e => e.id.toString() === selectedEvent.toString())?.title || '當前活動'
              },
              method: 'NFC',
              checkinTime: payload.checkinTime
            });
            setShowSuccessModal(true);
            
            // 5秒後自動關閉彈窗
            setTimeout(() => {
              setShowSuccessModal(false);
              setSuccessModalData(null);
            }, 5000);
          }
          
          // 注意：同步邏輯已移至後端 nfc-mongodb.js 的 submit 端點
        } catch (e) {
          console.warn('解析 SSE 資料失敗:', e);
        }
      });

      es.onerror = (e) => {
        console.warn('SSE 連線錯誤，使用輪詢備援', e);
      };
    } catch (e) {
      console.warn('建立 SSE 連線失敗:', e);
    }

    return () => {
      try { es && es.close(); } catch (_) {}
    };
  }, [selectedEvent]);

  const checkNFCSupport = () => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    } else {
      console.log('NFC not supported on this device/browser');
    }
  };

  // 檢查權限 - 僅限一級核心和管理員
  if (!user || (user.membershipLevel !== 1 && !isAdmin())) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h2>
          <p className="text-gray-600">此功能僅限活動工作人員使用</p>
        </div>
      </div>
    );
  }

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      const data = response.data;
      if (data.success) {
        // 只顯示今天和未來的活動
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = data.events.filter(event => {
          const eventDate = new Date(event.event_date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        });
        setEvents(upcomingEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  // 檢查相機權限 - 更寬鬆的檢查方式
  const checkCameraPermission = () => {
    return new Promise((resolve) => {
      // 檢查是否支援 getUserMedia (包含舊版瀏覽器的前綴)
      const getUserMedia = navigator.mediaDevices?.getUserMedia ||
                          navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;

      if (!getUserMedia) {
        // 如果完全不支援，直接跳過檢查，讓 html5-qrcode 自己處理
        console.warn('Browser does not support getUserMedia, skipping permission check');
        resolve(true);
        return;
      }

      // 對於支援的瀏覽器，嘗試簡單的權限檢查
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // 現代瀏覽器 - 使用更寬鬆的檢查
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            // 立即停止串流
            stream.getTracks().forEach(track => track.stop());
            resolve(true);
          })
          .catch(error => {
            console.warn('Camera permission check failed, but continuing:', error);
            
            // 只在明確的權限拒絕時才阻止
            if (error.name === 'NotAllowedError') {
              alert('相機權限被拒絕。請在瀏覽器設定中允許此網站使用相機，然後重新整理頁面。');
              resolve(false);
            } else {
              // 對於其他所有錯誤（包括 NotFoundError），讓 html5-qrcode 自己處理
              console.warn('Skipping permission check, letting html5-qrcode handle camera access');
              resolve(true);
            }
          });
      } else {
        // 舊版瀏覽器，跳過檢查
        console.warn('Using legacy browser, skipping permission check');
        resolve(true);
      }
    });
  };

  const startScanner = async () => {
    if (!selectedEvent) {
      alert('請先選擇活動');
      return;
    }

    try {
      // 標記掃描器啟動（用於 UI 切換）
      setScannerActive(true);
      setScanResult(null);
      
      // 清理之前的掃描器實例
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.clear();
        } catch (clearError) {
          console.warn('清理舊掃描器時發生錯誤:', clearError);
        }
        html5QrcodeScannerRef.current = null;
      }
      
      // 等待一小段時間確保相機資源釋放
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 創建新的 QR Code 掃描器 - 針對手機優化
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: function(viewfinderWidth, viewfinderHeight) {
            // 動態計算 QR 掃描框大小，適應不同螢幕尺寸
            let minEdgePercentage = 0.7; // 70% of the smaller edge
            let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          // 手機優化設定
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: {
            facingMode: "environment" // 使用後置相機
          }
        },
        false
      );
      
      html5QrcodeScannerRef.current = html5QrcodeScanner;
      
      // 開始掃描 - 添加額外的錯誤處理
      try {
        await html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        console.log('QR Code 掃描器已成功啟動');
        addDebugInfo('QR Code 掃描器啟動成功');
      } catch (renderError) {
        console.error('掃描器渲染失敗:', renderError);
        addDebugInfo(`掃描器渲染失敗: ${renderError?.message || renderError}`);
        throw renderError;
      }
      
    } catch (error) {
      console.error('QR Code 掃描器啟動失敗:', error);
      const errorMessage = error?.message || error?.toString() || '未知錯誤';
      setScanResult({
        success: false,
        message: 'QR Code 掃描器啟動失敗: ' + errorMessage
      });
      setScannerActive(false);
    }
  };

  const handleNFCReading = async (nfcCardId) => {
    setLoading(true);
    
    try {
      const response = await api.post('/api/attendance/nfc-checkin', {
         nfcCardId: nfcCardId,
         eventId: selectedEvent
       });
       
       setNfcResult({
         success: true,
         message: `${response.data.user.name} 報到成功！`
       });
       
       // 更新最近報到記錄
       const newRecord = {
         id: Date.now(),
         user: response.data.user,
         checkInTime: new Date().toLocaleString('zh-TW')
       };
       setRecentCheckIns(prev => [newRecord, ...prev.slice(0, 4)]);
      
    } catch (error) {
      console.error('NFC 報到失敗:', error);
      setNfcResult({
        success: false,
        message: error.response?.data?.message || 'NFC 報到失敗，請稍後再試'
      });
    } finally {
      setLoading(false);
      setNfcReading(false);
      
      // 3秒後清除結果
      setTimeout(() => {
        setNfcResult(null);
      }, 3000);
    }
  };

  const stopNFCReading = () => {
    setNfcReading(false);
    setNfcResult(null);
  };

  // QR Code 掃描成功處理
  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('QR Code 掃描成功:', decodedText);
    
    try {
      // 停止掃描器
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear();
        html5QrcodeScannerRef.current = null;
      }
      setScannerActive(false);
      setLoading(true);
      
      // 解析 QR Code 內容
      let userId;
      try {
        // 嘗試解析 JSON 格式的 QR Code
        const qrData = JSON.parse(decodedText);
        userId = qrData.userId || qrData.id;
      } catch (parseError) {
        // 如果不是 JSON，嘗試直接作為用戶 ID
        const numericId = parseInt(decodedText);
        if (!isNaN(numericId) && numericId > 0) {
          userId = numericId;
        } else {
          throw new Error('無效的 QR Code 格式');
        }
      }
      
      if (!userId) {
        throw new Error('QR Code 中未找到有效的用戶 ID');
      }
      
      // 處理 QR Code 報到
      const response = await api.post('/api/attendance/checkin', {
        userId: userId,
        eventId: selectedEvent
      });
      
      setScanResult({
        success: true,
        message: `${response.data.user.name} 報到成功！`
      });
      
      // 更新最近報到記錄
      const newRecord = {
        id: Date.now(),
        user: response.data.user,
        checkInTime: new Date().toLocaleString('zh-TW')
      };
      setRecentCheckIns(prev => [newRecord, ...prev.slice(0, 4)]);
      
    } catch (error) {
      console.error('QR Code 報到失敗:', error);
      setScanResult({
        success: false,
        message: error.response?.data?.message || error.message || 'QR Code 報到失敗，請稍後再試'
      });
    } finally {
      setLoading(false);
      
      // 3秒後清除結果並允許重新掃描
      setTimeout(() => {
        setScanResult(null);
      }, 3000);
    }
  };
  
  // QR Code 掃描失敗處理
  const onScanFailure = (error) => {
    // 這裡不需要處理，因為掃描失敗是正常的（當沒有檢測到 QR Code 時）
    // console.warn('QR Code 掃描失敗:', error);
  };

  // 停止掃描（供按鈕使用）
  const stopScanner = () => {
    try {
      // 若有 QR 掃描器實例，進行清理
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear();
        html5QrcodeScannerRef.current = null;
      }
    } catch (e) {
      console.error('停止掃描器時出錯:', e);
    } finally {
      setScannerActive(false);
      setScanResult(null);
    }
  };

  // Gateway Service 相關函數
  const checkGatewayStatus = async () => {
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/status`);
      const data = await response.json();
      setGatewayStatus(data);
      setGatewayError('');
    } catch (error) {
      console.error('檢查 Gateway 狀態失敗:', error);
      setGatewayStatus(null);
      setGatewayError('無法連接到本地 NFC Gateway Service，請確認服務已啟動');
    }
  };

  const startGatewayNFCReader = async () => {
    if (!selectedEvent) {
      setNfcResult({
        success: false,
        message: '請先選擇活動'
      });
      return;
    }

    setLoading(true);
    setGatewayError('');
    
    try {
      const response = await fetch(`${GATEWAY_URL}/api/nfc-checkin/start-reader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNfcResult({
          success: true,
          message: 'NFC 讀卡機啟動成功！請將 NFC 卡片靠近讀卡機'
        });
        // 重新檢查狀態
        await checkGatewayStatus();
      } else {
        setNfcResult({
          success: false,
          message: data.message || 'NFC 讀卡機啟動失敗'
        });
      }
    } catch (error) {
      console.error('啟動 NFC 讀卡機失敗:', error);
      setNfcResult({
        success: false,
        message: '無法啟動 NFC 讀卡機，請檢查本地 Gateway Service'
      });
    } finally {
      setLoading(false);
      
      // 3秒後清除結果
      setTimeout(() => {
        setNfcResult(null);
      }, 3000);
    }
  };

  // 將舊 SQLite 與新 Mongo 兩種回傳統一成前端可用格式
  const normalizeCheckinRecord = (raw) => {
    if (!raw) return null;
    return {
      id: raw.id || raw._id || raw.lastID || null,
      cardUid: raw.cardUid || raw.card_uid || raw.cardUID || null,
      checkinTime: raw.checkinTime || raw.checkin_time || raw.formattedCheckinTime || raw.createdAt || raw.timestamp || null,
      readerName: raw.readerName || raw.reader_name || null,
      source: raw.source || null,
      timestamp: raw.timestamp || raw.createdAt || null,
      // 新增：若後端有回傳會員/活動資訊，保留以利顯示
      member: raw.member || null,
      event: raw.event || null,
    };
  };

  const fetchLastNfcCheckin = async () => {
    try {
      // 使用共用 api 實例確保 baseURL 與認證頭一致
      const response = await api.get('/api/nfc-checkin-mongo/last-checkin');
      // 兼容處理：同時支援 {success, data} 與直接物件兩種格式
      const payload = response?.data;
      const raw = (payload && Object.prototype.hasOwnProperty.call(payload, 'success')) ? payload.data : payload;
      const normalized = normalizeCheckinRecord(raw);
      if (normalized) {
        setLastNfcCheckin(normalized);
      } else {
        console.warn('last-checkin 回應非預期:', response?.data);
      }
    } catch (error) {
      console.error('獲取最後 NFC 報到紀錄失敗:', error?.response?.data || error.message || error);
    }
  };

  const fetchNfcCheckinRecords = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/nfc-checkin-mongo/records?limit=10');
      const payload = response?.data;
      let list = [];
      if (payload && Object.prototype.hasOwnProperty.call(payload, 'success')) {
        list = payload.data || [];
      } else if (Array.isArray(payload)) {
        list = payload;
      }
      setNfcCheckinRecords((list || []).map(normalizeCheckinRecord).filter(Boolean));
    } catch (error) {
      console.error('獲取 NFC 報到紀錄失敗:', error);
    }
  };

  // 設定 NFC 卡片 UID 到個人資料
  const handleSetNfcCardId = async (cardUid) => {
    if (!user || !cardUid) return;
    
    const confirmed = window.confirm(
      `確定要將卡片 UID "${cardUid}" 設定為您的 NFC 卡片嗎？\n\n設定後您就可以使用此卡片進行 NFC 報到。`
    );
    
    if (!confirmed) return;
    
    try {
      // 使用 AuthContext 的 updateProfile，確保本地使用者狀態即時更新
      const payload = {
        name: user.name,
        company: user.company || '',
        industry: user.industry || '',
        title: user.title || '',
        contactNumber: user.contactNumber || '',
        nfcCardId: cardUid
      };
      const { success } = await updateProfile(payload);
      
      if (success) {
        alert(`✅ NFC 卡片設定成功！\n\n卡片 UID: ${cardUid}\n現在您可以使用此卡片進行 NFC 報到了。`);
        
        // 若已選擇活動，綁定完成後立即為該活動進行一次 NFC 報到
        if (selectedEvent) {
          try {
            const response = await api.post('/api/attendance/nfc-checkin', {
              nfcCardId: cardUid,
              eventId: selectedEvent
            });
            setNfcResult({
              success: true,
              message: `${response.data.user.name} 報到成功！`
            });
            const newRecord = {
              id: Date.now(),
              user: response.data.user,
              checkInTime: new Date().toLocaleString('zh-TW')
            };
            setRecentCheckIns(prev => [newRecord, ...prev.slice(0, 4)]);
          } catch (checkinErr) {
            console.error('綁定後自動報到失敗:', checkinErr);
          }
        }
        
        // 重新獲取最後報到記錄以更新顯示
        await fetchLastNfcCheckin();
      }
    } catch (error) {
      console.error('設定 NFC 卡片失敗:', error);
      alert('❌ 設定失敗：' + (error.response?.data?.message || '請稍後再試'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">報到系統</h1>
          <p className="mt-2 text-gray-600">使用手機鏡頭掃描會員 QR Code 進行報到</p>
        </div>

        {/* 活動選擇 */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">選擇活動</h2>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={scannerActive}
          >
            <option value="">請選擇活動</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.event_date).toLocaleDateString('zh-TW')}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code 掃描區域 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code 掃描</h2>
            
            {!scannerActive && !scanResult && (
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2zM19 19h2v2h-2z"/>
                    <rect x="4" y="4" width="2" height="2" fill="white"/>
                    <rect x="4" y="16" width="2" height="2" fill="white"/>
                    <rect x="16" y="4" width="2" height="2" fill="white"/>
                  </svg>
                  <p className="text-gray-500 mb-4">點擊開始掃描按鈕啟動相機</p>
                </div>
                <button
                  onClick={startScanner}
                  disabled={!selectedEvent || loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '啟動中...' : '開始掃描'}
                </button>
              </div>
            )}

            {scannerActive && !scanResult && (
              <div>
                <div id="qr-reader" className="mb-4"></div>
                <div className="text-center">
                  <button
                    onClick={stopScanner}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    停止掃描
                  </button>
                </div>
              </div>
            )}

            {scanResult && (
              <div className={`p-4 rounded-lg ${scanResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  <svg className={`w-6 h-6 ${scanResult.success ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {scanResult.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                  <p className={`ml-3 text-sm ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>{scanResult.message}</p>
                </div>
                <div className="mt-3 text-center">
                  <button
                    onClick={() => {
                      setScanResult(null);
                      // 可以選擇重新開始掃描
                      // startScanner();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    重新掃描
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* NFC 名片報到區域 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">NFC 名片報到</h2>
            
            {/* Gateway 狀態 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-800 mb-2">Gateway Service 狀態</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">服務狀態：</span>
                  <span className={`font-medium ${gatewayStatus?.nfcActive ? 'text-green-600' : 'text-red-600'}`}>
                    {gatewayStatus?.nfcActive ? '運行中' : '未啟動'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">NFC 讀卡機：</span>
                  <span className={`font-medium ${gatewayStatus?.readerConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {gatewayStatus?.readerConnected ? '已啟動' : '未連接'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">讀卡機名稱：</span>
                  <span className="font-medium">{gatewayStatus?.readerName || '未知'}</span>
                </div>
                <div>
                  <span className="text-gray-600">卡片 UID：</span>
                  <span className="font-mono">{gatewayStatus?.lastCardUid || '-'}</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={startGatewayNFCReader}
                disabled={loading || !selectedEvent}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '啟動中...' : '🚀 開始 NFC 報到'}
              </button>
            </div>

            {/* 報到結果提示 */}
            {nfcResult && (
              <div className={`mt-4 p-3 rounded-lg border ${nfcResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center">
                  <svg className={`w-5 h-5 ${nfcResult.success ? 'text-green-500' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {nfcResult.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                <p className={`text-sm font-medium ${
                  nfcResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {nfcResult.message}
                </p>
              </div>
            )}
          </div>

          {/* 最近報到記錄 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">最近報到記錄</h2>
            
            {/* 最後 NFC 報到記錄 */}
            {lastNfcCheckin && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">📱 最後 NFC 報到</h3>
                {lastNfcCheckin.member ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">會員:</span>
                      <span className="font-medium text-blue-900">{lastNfcCheckin.member.name}</span>
                    </div>
                    {lastNfcCheckin.member.company && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">公司:</span>
                        <span className="text-blue-800">{lastNfcCheckin.member.company}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">卡號:</span>
                      <span className="font-mono text-blue-900">{lastNfcCheckin.cardUid}</span>
                    </div>
                    {lastNfcCheckin.event?.title && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">活動:</span>
                        <span className="text-blue-900">{lastNfcCheckin.event.title}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">時間:</span>
                      <span className="text-blue-900">{lastNfcCheckin.checkinTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">卡號:</span>
                      <span className="font-mono text-blue-900">{lastNfcCheckin.cardUid}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">時間:</span>
                      <span className="text-blue-900">{lastNfcCheckin.checkinTime}</span>
                    </div>
                    {lastNfcCheckin.readerName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">讀卡機:</span>
                        <span className="text-blue-900">{lastNfcCheckin.readerName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 綁定卡片到我的帳號 */}
                {user && lastNfcCheckin.cardUid && (
                  <div className="mt-3 text-right">
                    {user.nfcCardId === lastNfcCheckin.cardUid ? (
                      <span className="text-xs text-green-700">這是您已綁定的卡片</span>
                    ) : (
                      <button
                        onClick={() => handleSetNfcCardId(lastNfcCheckin.cardUid)}
                        className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                      >
                        設為我的卡片
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 來自雲端（MongoDB）的 NFC 報到紀錄 */}
            {nfcCheckinRecords.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-green-800 mb-2">🧾 最近 NFC 報到（雲端）</h3>
                <div className="space-y-2">
                  {nfcCheckinRecords.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-700">
                            {record.cardUid?.slice(-2)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{record.member?.name || record.cardUid}</p>
                        {record.event?.title && (
                          <p className="text-xs text-gray-700">活動：{record.event.title}</p>
                        )}
                        <p className="text-xs text-gray-500">{record.checkinTime}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          NFC 報到
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 本機 QR 報到（本頁面掃描產生） */}
            {recentCheckIns.length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-medium text-gray-800 mb-2">📷 最近 QR 報到（本機）</h3>
                {recentCheckIns.map((record) => (
                  <div key={record.id} className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-green-700">
                          {record.user.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{record.user.name}</p>
                      <p className="text-xs text-gray-500">{record.checkInTime}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        QR 報到
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {nfcCheckinRecords.length === 0 && recentCheckIns.length === 0 && (
              <div className="text-center text-gray-500">
                尚無報到記錄
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* NFC 報到成功彈窗 */}
      {showSuccessModal && successModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform animate-pulse">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">🎉 報到成功！</h3>
              <div className="space-y-2 text-gray-700">
                <p className="text-lg font-semibold text-green-600">{successModalData.user?.name || successModalData.userName}</p>
                <p className="text-sm">{successModalData.event?.title || successModalData.eventTitle}</p>
                <p className="text-xs text-gray-500">{successModalData.checkinTime}</p>
                <p className="text-xs text-blue-600 font-medium">{successModalData.method} 報到</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInScanner;