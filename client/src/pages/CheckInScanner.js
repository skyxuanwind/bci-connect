import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import axios from 'axios';
import api from '../services/api';

const CheckInScanner = () => {
  const { user, isAdmin } = useAuth();
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
  
  // Gateway Service 相關狀態
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [gatewayError, setGatewayError] = useState('');
  const [lastNfcCheckin, setLastNfcCheckin] = useState(null);
  const [nfcCheckinRecords, setNfcCheckinRecords] = useState([]);
  
  // 本地 Gateway Service URL
  const GATEWAY_URL = 'http://localhost:3002';
  const html5QrcodeScannerRef = useRef(null);

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
    }, 3000);
    
    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear();
      }
      clearInterval(interval);
    };
  }, [user]);

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

    // 先檢查相機權限
    const hasPermission = await checkCameraPermission();
    if (!hasPermission) {
      return;
    }

    setScannerActive(true);
    setScanResult(null);

    // 延遲初始化以確保DOM元素已渲染
    setTimeout(() => {
      const qrReaderElement = document.getElementById('qr-reader');
      if (!qrReaderElement) {
        console.error('QR reader element not found');
        setScannerActive(false);
        return;
      }

      // 初始化 QR Code 掃描器 - 優化配置以提高識別率
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        // 更寬鬆的掃描設定以提高識別率
        disableFlip: false,
        // 使用後置相機（手機）
        videoConstraints: {
          facingMode: "environment"
        },
        // 只支援相機掃描，直接啟動相機
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ],
        // 添加更多格式支援以提高識別率
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.MAXICODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.RSS_14,
          Html5QrcodeSupportedFormats.RSS_EXPANDED,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION
        ],
        // 提高掃描靈敏度
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      try {
        addDebugInfo('正在啟動 QR 碼掃描器...');
        html5QrcodeScannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          config,
          /* verbose= */ false
        );

        html5QrcodeScannerRef.current.render(
          (decodedText) => {
            // 掃描成功
            handleScanSuccess(decodedText);
          },
          (error) => {
            // 掃描錯誤處理 - 更寬鬆的錯誤處理
            console.warn('QR Code scan error (may be normal):', error);
            
            // 將錯誤轉換為字符串以便檢查
            const errorString = String(error);
            
            // 添加調試訊息
            if (errorString.includes('NotFoundException')) {
              addDebugInfo('掃描中...未檢測到 QR 碼（正常情況）');
            } else if (errorString.includes('NotAllowedError') || errorString.includes('Permission denied') || 
                errorString.includes('NotAllowed') || errorString.includes('permission')) {
              addDebugInfo('相機權限被拒絕');
              alert('相機權限被拒絕。請檢查：\n1. 瀏覽器是否允許此網站使用相機\n2. 系統設定是否允許瀏覽器使用相機\n3. 嘗試重新整理頁面並重新授權');
              setScannerActive(false);
            } else {
              addDebugInfo(`掃描錯誤: ${errorString.substring(0, 100)}`);
            }
            // 其他所有錯誤都忽略，讓 html5-qrcode 庫自己處理
            // 這包括 NotFoundError, NotReadableError 等，這些通常是暫時性的或可以由庫自動恢復
          }
        );
        
        addDebugInfo('QR 碼掃描器啟動成功，請將 QR 碼對準相機');
      } catch (initError) {
        console.error('Failed to initialize QR scanner:', initError);
        addDebugInfo(`掃描器初始化失敗: ${initError.message || initError}`);
        alert('QR碼掃描器初始化失敗。您的瀏覽器可能不支援此功能，請嘗試：\n1. 更新瀏覽器到最新版本\n2. 使用Chrome、Safari或Firefox瀏覽器\n3. 確認瀏覽器支援相機功能');
        setScannerActive(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
      html5QrcodeScannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleScanSuccess = async (qrCodeData) => {
    try {
      addDebugInfo(`檢測到 QR 碼: ${qrCodeData.substring(0, 50)}...`);
      setLoading(true);
      
      // 解析 QR Code 數據
      let userId;
      try {
        // 嘗試解析 JSON 格式的 QR Code 數據
        const qrData = JSON.parse(qrCodeData);
        console.log('Parsed QR Code data:', qrData); // 調試日誌
        addDebugInfo(`解析 JSON 成功: type=${qrData.type || 'unknown'}`);
        
        // 檢查是否為會員 QR Code
        if (qrData.type === 'member' && qrData.id) {
          userId = qrData.id;
        } else if (qrData.userId) {
          userId = qrData.userId;
        } else if (qrData.id) {
          userId = qrData.id;
        } else {
          throw new Error('QR Code 中找不到有效的用戶 ID');
        }
        addDebugInfo(`提取用戶 ID: ${userId}`);
      } catch (e) {
        console.log('QR Code parsing error:', e.message);
        // 如果不是 JSON 格式，假設直接是用戶 ID
        const parsedId = parseInt(qrCodeData);
        if (!isNaN(parsedId)) {
          userId = parsedId;
          addDebugInfo(`使用直接文本作為用戶 ID: ${userId}`);
        } else {
          throw new Error('無效的 QR Code 格式：' + qrCodeData.substring(0, 50));
        }
      }

      if (!userId || isNaN(userId)) {
        throw new Error('無效的用戶 ID：' + userId);
      }
      
      console.log('Extracted user ID:', userId); // 調試日誌

      // 發送報到請求
      const response = await axios.post('/api/attendance/checkin', {
        userId: userId,
        eventId: parseInt(selectedEvent)
      });

      const data = response.data;
      
      if (data.success) {
        setScanResult({
          success: true,
          message: data.message,
          user: data.user,
          event: data.event
        });
        
        // 更新最近報到記錄
        setRecentCheckIns(prev => [{
          id: Date.now(),
          user: data.user,
          checkInTime: new Date().toLocaleString('zh-TW')
        }, ...prev.slice(0, 4)]);
        
        // 3秒後清除結果並重新開始掃描
        setTimeout(() => {
          setScanResult(null);
          if (scannerActive) {
            startScanner();
          }
        }, 3000);
      } else {
        setScanResult({
          success: false,
          message: data.message
        });
        
        // 2秒後清除錯誤訊息並重新開始掃描
        setTimeout(() => {
          setScanResult(null);
          if (scannerActive) {
            startScanner();
          }
        }, 2000);
      }
      
      // 暫停掃描器
      stopScanner();
      
    } catch (error) {
      console.error('Check-in error:', error);
      setScanResult({
        success: false,
        message: error.message || '報到失敗，請重試'
      });
      
      // 2秒後清除錯誤訊息並重新開始掃描
      setTimeout(() => {
        setScanResult(null);
        if (scannerActive) {
          startScanner();
        }
      }, 2000);
      
      stopScanner();
    } finally {
      setLoading(false);
    }
  };

  const startNFCReading = async () => {
    if (!selectedEvent) {
      alert('請先選擇活動');
      return;
    }

    if (!nfcSupported) {
      alert('您的設備或瀏覽器不支援 NFC 功能');
      return;
    }

    try {
      setNfcReading(true);
      setNfcResult(null);
      
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      console.log('NFC 掃描已啟動，請將 NFC 卡片靠近設備...');
      
      ndef.addEventListener('reading', ({ message, serialNumber }) => {
        console.log('NFC 卡片檢測到:', serialNumber);
        handleNFCReading(serialNumber);
      });
      
    } catch (error) {
      console.error('NFC 讀取失敗:', error);
      setNfcResult({
        success: false,
        message: 'NFC 讀取失敗: ' + error.message
      });
      setNfcReading(false);
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

  const fetchLastNfcCheckin = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/api/nfc-checkin/last-checkin`);
      const data = await response.json();
      
      if (data.id) {
        setLastNfcCheckin(data);
      }
    } catch (error) {
      console.error('獲取最後 NFC 報到紀錄失敗:', error);
    }
  };

  const fetchNfcCheckinRecords = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/api/nfc-checkin/records?limit=10');
      if (response.data.success) {
        setNfcCheckinRecords(response.data.data || []);
      }
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
      const response = await api.put('/api/users/profile', {
        name: user.name,
        company: user.company || '',
        industry: user.industry || '',
        title: user.title || '',
        contactNumber: user.contactNumber || '',
        nfcCardId: cardUid
      });
      
      if (response.data) {
        // 更新本地用戶資料
        const updatedUser = { ...user, nfcCardId: cardUid };
        // 這裡可能需要更新 AuthContext 中的用戶資料
        
        alert(`✅ NFC 卡片設定成功！\n\n卡片 UID: ${cardUid}\n現在您可以使用此卡片進行 NFC 報到了。`);
        
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
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 mb-4">點擊開始掃描按鈕啟動相機</p>
                </div>
                <button
                  onClick={startScanner}
                  disabled={!selectedEvent}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  開始掃描
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
              <div className={`text-center p-6 rounded-lg ${
                scanResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  scanResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {scanResult.success ? (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  scanResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {scanResult.success ? '報到成功' : '報到失敗'}
                </h3>
                <p className={`${
                  scanResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {scanResult.message}
                </p>
                {loading && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NFC 名片報到區域 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">NFC 名片報到</h2>
            
            {/* Gateway Service 狀態 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Gateway Service 狀態</h3>
              {gatewayStatus ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>服務狀態:</span>
                    <span className={`font-medium ${
                      gatewayStatus.status === 'running' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {gatewayStatus.status === 'running' ? '運行中' : '已停止'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>NFC 讀卡機:</span>
                    <span className={`font-medium ${
                      gatewayStatus.nfcActive ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {gatewayStatus.nfcActive ? '已啟動' : '未啟動'}
                    </span>
                  </div>
                  {gatewayStatus.readerName && (
                    <div className="flex justify-between text-sm">
                      <span>讀卡機:</span>
                      <span className="text-gray-600 text-xs">{gatewayStatus.readerName}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  {gatewayError || '無法連接到 Gateway Service'}
                </div>
              )}
            </div>

            {/* NFC 控制區域 */}
            {gatewayStatus ? (
              <div className="text-center">
                <div className="mb-4">
                  <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <p className="text-gray-500 mb-4">使用 ACR122U NFC 讀卡機進行報到</p>
                </div>
                <button
                  onClick={startGatewayNFCReader}
                  disabled={!selectedEvent || loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '啟動中...' : '🚀 開始 NFC 報到'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-gray-500 text-sm">請確認本地 NFC Gateway Service 已啟動</p>
                <p className="text-gray-400 text-xs mt-1">服務地址: http://localhost:3002</p>
              </div>
            )}

            {/* NFC 結果顯示 */}
            {nfcResult && (
              <div className={`mt-4 text-center p-4 rounded-lg ${
                nfcResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
                  nfcResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {nfcResult.success ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
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
                      <span className="text-blue-700">卡片 UID:</span>
                      <span className="font-mono text-xs text-blue-600">{lastNfcCheckin.cardUid}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">時間:</span>
                      <span className="text-blue-800">{lastNfcCheckin.checkinTime}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-yellow-700">❓ 未識別會員</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">卡片 UID:</span>
                      <span className="font-mono text-xs text-blue-600">{lastNfcCheckin.cardUid}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">時間:</span>
                      <span className="text-blue-800">{lastNfcCheckin.checkinTime}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <button
                        onClick={() => handleSetNfcCardId(lastNfcCheckin.cardUid)}
                        className="w-full bg-blue-600 text-white text-xs py-1.5 px-3 rounded hover:bg-blue-700 transition-colors"
                      >
                        🔗 設定為我的 NFC 卡片
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* QR Code 報到記錄 */}
            {recentCheckIns.length === 0 && !lastNfcCheckin ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500">尚無報到記錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCheckIns.map((record) => (
                  <div key={record.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
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
          </div>
        </div>

        {/* 調試訊息區域 */}
        {debugInfo.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">掃描狀態</h3>
            <div className="bg-gray-100 p-3 rounded-lg max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-sm text-gray-700 mb-1 font-mono">
                  {info}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用說明</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Code 掃描說明 */}
            <div>
              <h4 className="font-semibold text-blue-800 mb-3">📱 QR Code 掃描報到</h4>
              <ul className="text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">1.</span>
                  <span className="ml-2">首先選擇要進行報到的活動</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">2.</span>
                  <span className="ml-2">點擊「開始掃描」按鈕啟動相機</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">3.</span>
                  <span className="ml-2">允許瀏覽器使用相機權限</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">4.</span>
                  <span className="ml-2">將會員的 QR Code 對準掃描框</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">5.</span>
                  <span className="ml-2">掃描成功後系統會自動記錄出席</span>
                </li>
              </ul>
            </div>
            
            {/* NFC 報到說明 */}
            <div>
              <h4 className="font-semibold text-blue-800 mb-3">🏷️ NFC 名片報到</h4>
              <ul className="text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">1.</span>
                  <span className="ml-2">確保 ACR122U NFC 讀卡機已連接</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">2.</span>
                  <span className="ml-2">啟動本地 Gateway Service (port 3002)</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">3.</span>
                  <span className="ml-2">選擇活動後點擊「開始 NFC 報到」</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">4.</span>
                  <span className="ml-2">將 NFC 卡片靠近讀卡機</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 text-blue-600 mt-0.5">5.</span>
                  <span className="ml-2">系統自動識別會員並記錄報到</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">💡 使用提示</h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• QR Code 掃描：確保光線充足，QR Code 清晰可見</li>
              <li>• 相機權限：Safari 設定 → 相機 → 允許；Chrome 點擊網址列鎖頭圖示 → 相機 → 允許</li>
              <li>• NFC 報到：需要本地安裝 Gateway Service，支援會員識別功能</li>
              <li>• 系統會自動更新最新的報到記錄，包含會員詳細資訊</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInScanner;