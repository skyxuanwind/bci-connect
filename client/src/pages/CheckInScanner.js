import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import axios from 'axios';
import api from '../services/api';

const CheckInScanner = () => {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [debugInfo, setDebugInfo] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  // 新增：NFC URL 相關狀態
  const [nfcUrl, setNfcUrl] = useState('');
  const [nfcLoading, setNfcLoading] = useState(false);
  const nfcInputRef = useRef(null);
  
  const html5QrcodeScannerRef = useRef(null);
  const processedSseCheckinsRef = useRef(new Set());
  const modalTimeoutRef = useRef(null);
  // 新增：SSE 連線狀態與最後一次 NFC 事件
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef(null);
  const [lastNfcEvent, setLastNfcEvent] = useState(null);

  useEffect(() => {
    fetchEvents();
    
    // 啟動 SSE 連線：接收來自後端（本地 Gateway → 雲端 API）推播的 NFC 報到事件
    try {
      const es = new EventSource('/api/nfc-checkin-mongo/events');
      sseRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
        addDebugInfo('SSE 連線已建立（NFC 報到事件）');
      };

      es.onerror = (e) => {
        setSseConnected(false);
        addDebugInfo('SSE 連線中斷，將自動重試');
      };

      es.addEventListener('nfc-checkin', (event) => {
        try {
          const data = JSON.parse(event.data || '{}');
          if (!data || !data.id) return;
          if (processedSseCheckinsRef.current.has(data.id)) return; // 去重
          processedSseCheckinsRef.current.add(data.id);

          setLastNfcEvent(data);
          addDebugInfo(`收到 NFC 報到事件：${data.member?.name || data.cardUid}`);

          // 將事件呈現在右側結果與成功彈窗
          const successPayload = {
            success: true,
            message: data.member?.name ? `${data.member.name} 已完成 NFC 報到` : `NFC 卡片 ${data.cardUid} 已完成報到`,
            user: data.member || null,
            event: null // 後端已同步至出席管理（若有近期活動），此處僅呈現即時資訊
          };
          setScanResult(successPayload);

          setSuccessModalData({
            user: successPayload.user,
            event: successPayload.event,
            method: 'NFC（Gateway）',
            timestamp: new Date().toLocaleString('zh-TW')
          });
          setShowSuccessModal(true);

          if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
          modalTimeoutRef.current = setTimeout(() => {
            setShowSuccessModal(false);
            setSuccessModalData(null);
            setScanResult(null);
          }, 3000);
        } catch (e) {
          addDebugInfo('解析 NFC SSE 事件失敗');
        }
      });
    } catch (e) {
      addDebugInfo('建立 SSE 連線失敗');
    }

    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear();
      }
      if (sseRef.current) {
        try { sseRef.current.close(); } catch {}
        sseRef.current = null;
      }
    };
  }, [user]);

  // 檢查權限 - 僅限核心和管理員
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
        
        // 自動選擇今天的活動
        const todayEvent = upcomingEvents.find(event => {
          const eventDate = new Date(event.event_date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
        
        if (todayEvent) {
          setSelectedEvent(todayEvent.id.toString());
        }
      }
    } catch (error) {
      console.error('獲取活動列表失敗:', error);
    }
  };

  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const handleQRCodeScan = async (decodedText) => {
    if (loading) return;
    
    setLoading(true);
    setScanResult(null);
    addDebugInfo(`掃描到 QR Code: ${decodedText}`);
    
    try {
      const response = await api.post('/api/attendance/qr-checkin', {
        qrData: decodedText,
        eventId: selectedEvent || null
      });
      
      setScanResult({
        success: true,
        message: response.data.message,
        user: response.data.user,
        event: response.data.event
      });
      
      // 顯示成功彈窗
      setSuccessModalData({
        user: response.data.user,
        event: response.data.event,
        method: 'QR Code',
        timestamp: new Date().toLocaleString('zh-TW')
      });
      setShowSuccessModal(true);
      
      // 3秒後自動關閉彈窗
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
      modalTimeoutRef.current = setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessModalData(null);
      }, 3000);
      
      addDebugInfo(`✅ 報到成功: ${response.data.user?.name}`);
      
    } catch (error) {
      console.error('QR Code 報到失敗:', error);
      setScanResult({
        success: false,
        message: error.response?.data?.message || 'QR Code 報到失敗，請稍後再試'
      });
      addDebugInfo(`❌ 報到失敗: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      // 清除結果顯示
      setTimeout(() => {
        setScanResult(null);
      }, 3000);
    }
  };

  // 新增：NFC 名片網址報到
  const handleNfcUrlCheckin = async () => {
    if (!nfcUrl || nfcLoading) return;
    setNfcLoading(true);
    setScanResult(null);
    addDebugInfo(`嘗試以 NFC 名片網址報到: ${nfcUrl}`);

    try {
      const response = await api.post('/api/attendance/nfc-url-checkin', {
        url: nfcUrl,
        eventId: selectedEvent || null
      });

      setScanResult({
        success: true,
        message: response.data.message,
        user: response.data.user,
        event: response.data.event
      });

      setSuccessModalData({
        user: response.data.user,
        event: response.data.event,
        method: 'NFC 名片',
        timestamp: new Date().toLocaleString('zh-TW')
      });
      setShowSuccessModal(true);

      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
      modalTimeoutRef.current = setTimeout(() => {
        setShowSuccessModal(false);
        setSuccessModalData(null);
      }, 3000);

      addDebugInfo(`✅ NFC 報到成功: ${response.data.user?.name}`);
      setNfcUrl('');
      if (nfcInputRef.current) nfcInputRef.current.focus();
    } catch (error) {
      console.error('NFC URL 報到失敗:', error);
      setScanResult({
        success: false,
        message: error.response?.data?.message || 'NFC URL 報到失敗，請稍後再試'
      });
      addDebugInfo(`❌ NFC 報到失敗: ${error.response?.data?.message || error.message}`);
    } finally {
      setNfcLoading(false);
      setTimeout(() => {
        setScanResult(null);
      }, 3000);
    }
  };

  const startQRScanner = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
    }
    
    setScannerError('');
    setIsScanning(true);
    
    try {
      // 延後初始化，確保 #qr-reader 已經渲染在 DOM
      setTimeout(() => {
        try {
          const el = document.getElementById('qr-reader');
          if (!el) {
            setScannerError('找不到掃描區域，請重試');
            setIsScanning(false);
            return;
          }

          const scanner = new Html5QrcodeScanner(
            'qr-reader',
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
            },
            false
          );
          
          scanner.render(
            (decodedText) => {
              handleQRCodeScan(decodedText);
              scanner.clear();
              setIsScanning(false);
            },
            (error) => {
              // 忽略持續的掃描錯誤
            }
          );
          
          html5QrcodeScannerRef.current = scanner;
          addDebugInfo('QR Code 掃描器已啟動');
        } catch (err) {
          console.error('啟動 QR 掃描器失敗:', err);
          setScannerError('無法啟動相機，請檢查權限設定');
          setIsScanning(false);
        }
      }, 50);
    } catch (error) {
      console.error('啟動 QR 掃描器失敗:', error);
      setScannerError('無法啟動相機，請檢查權限設定');
      setIsScanning(false);
    }
  };

  const stopQRScanner = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear();
      html5QrcodeScannerRef.current = null;
    }
    setIsScanning(false);
    addDebugInfo('QR Code 掃描器已停止');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 標題區域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">📱 活動報到系統</h1>
          <p className="text-lg text-gray-600">
            使用 QR Code 掃描進行活動報到
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側：掃描控制 */}
          <div className="space-y-6">
            {/* 活動選擇 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">選擇活動</h2>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇活動（或留空進行一般報到）</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {formatDate(event.event_date)}
                  </option>
                ))}
              </select>
            </div>

            {/* QR Code 掃描區域 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">📱 QR Code 掃描</h2>
              
              <div className="text-center">
                {/* 永遠渲染掃描器容器，但非掃描時隱藏以避免初始化找不到元素 */}
                <div id="qr-reader" className="mb-4" style={{ display: isScanning ? 'block' : 'none' }}></div>

                {!isScanning ? (
                  <div>
                    <div className="mb-4">
                      <svg className="w-16 h-16 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m-2 0h-2m3-4h2m-6 0h2v-4m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2m-6 4V9a2 2 0 012-2h2a2 2 0 012 2v2m-6 4h2m6-4h2" />
                      </svg>
                      <p className="text-gray-600 mb-4">點擊開始掃描 QR Code</p>
                    </div>
                    <button
                      onClick={startQRScanner}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      🚀 開始 QR 掃描
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={stopQRScanner}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ⏹️ 停止掃描
                    </button>
                  </div>
                )}
                
                {scannerError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{scannerError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 新增：NFC 名片感應（外接讀卡機輸入網址） */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">💳 NFC 名片感應</h2>
              <p className="text-gray-600 text-sm mb-3">將外接 NFC 感應器連至電腦，由後端服務（Node.js / Python）透過 ACR122U 讀取卡片 UID，寫入資料庫並以 SSE 推播到前端。此頁面會自動接收並顯示報到結果；若名片內含電子名片網址，也可使用下方輸入框進行報到。</p>

              {/* SSE 連線狀態 */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <span className={`inline-block w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                <span className="text-gray-700">NFC 即時通道（SSE）：{sseConnected ? '已連線' : '未連線 / 重試中'}</span>
                {lastNfcEvent && (
                  <span className="ml-auto text-gray-500">最近一次：{lastNfcEvent.member?.name || lastNfcEvent.cardUid}</span>
                )}
              </div>

              <p className="text-gray-600 text-sm mb-3">外接裝置若會模擬鍵盤輸出網址，也可在下方輸入框直接貼上/自動輸入後按 Enter 送出：</p>
              <div className="flex items-center gap-2">
                <input
                  ref={nfcInputRef}
                  type="text"
                  value={nfcUrl}
                  onChange={(e) => setNfcUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNfcUrlCheckin();
                    }
                  }}
                  placeholder="請感應 NFC 名片或貼上電子名片網址 (例如：https://your.domain/nfc-cards/member/123)"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <button
                  onClick={handleNfcUrlCheckin}
                  disabled={!nfcUrl || nfcLoading}
                  className={`px-5 py-3 rounded-lg text-white font-medium ${nfcLoading ? 'bg-green-300' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                >
                  {nfcLoading ? '送出中…' : '送出報到'}
                </button>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (nfcInputRef.current) nfcInputRef.current.focus();
                    addDebugInfo('已將焦點移至 NFC 輸入框');
                  }}
                  className="text-xs text-gray-500 underline"
                >
                  將焦點移至輸入框
                </button>
              </div>

              {/* 下載本地 Gateway 啟動器 */}
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm font-semibold text-gray-800 mb-2">⬇️ 下載本地 Gateway 啟動器（在讀卡機旁的電腦執行）</div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-macOS.zip`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-800 text-white hover:bg-gray-900"
                  >
                    🍎 macOS App（建議）
                  </a>
                  <a
                    href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher.command`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800"
                  >
                    🍎 macOS Script（.command）
                  </a>
                  <a
                    href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.vbs`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    🪟 Windows 一鍵（VBS，建議）
                  </a>
                  <a
                    href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.bat`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
                  >
                    🪟 Windows Batch（.bat）
                  </a>
                  <a
                    href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.ps1`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-indigo-500 text-white hover:bg-indigo-600"
                  >
                    🪟 Windows PowerShell（.ps1）
                  </a>
                </div>
                <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                  • 下載後放到桌面，雙擊執行；依指示安裝依賴並啟動本地 Gateway（預設埠 3002）。<br/>
                  • macOS 第一次可能需要允許「來自身份不明的開發者」，或先解壓 .zip 再打開 App。<br/>
                  • 啟動成功後回到此頁面，SSE 狀態保持「已連線」，刷卡即會自動報到。
                </div>
              </div>
            </div>

            {/* 掃描結果 */}
            {scanResult && (
              <div className={`p-4 rounded-lg border ${
                scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <svg className={`w-5 h-5 mr-2 ${
                    scanResult.success ? 'text-green-500' : 'text-red-500'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {scanResult.success ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                  <p className={`font-medium ${
                    scanResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {scanResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 右側：系統資訊 */}
          <div className="space-y-6">
            {/* 使用說明 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 使用說明</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="font-medium text-blue-800 mb-2">QR Code 掃描步驟：</div>
                <ul className="space-y-1 ml-4">
                  <li>• 選擇對應的活動（可選）</li>
                  <li>• 點擊「開始 QR 掃描」</li>
                  <li>• 允許瀏覽器使用相機權限</li>
                  <li>• 將會員的 QR Code 對準鏡頭</li>
                  <li>• 系統自動識別並完成報到</li>
                </ul>
                <div className="font-medium text-green-800 mb-2 mt-4">NFC 名片報到步驟：</div>
                <ul className="space-y-1 ml-4">
                  <li>• 將外接 NFC 感應器連接電腦</li>
                  <li>• 選擇對應的活動（可選）</li>
                  <li>• 點選「將焦點移至輸入框」，或直接點擊輸入框</li>
                  <li>• 感應會員的 NFC 名片（名片內容為會員電子名片網址）</li>
                  <li>• 按 Enter 或點擊「送出報到」完成報到</li>
                </ul>
              </div>
            </div>

            {/* 除錯資訊 */}
            {debugInfo.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🔍 系統日誌</h3>
                <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="text-xs text-gray-600 font-mono mb-1">
                      {info}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 報到成功彈窗 */}
      {showSuccessModal && successModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">報到成功！</h3>
              <p className="text-lg text-gray-700 mb-1">{successModalData.user?.name}</p>
              {successModalData.user?.company && (
                <p className="text-sm text-gray-500 mb-2">{successModalData.user.company}</p>
              )}
              {successModalData.event && (
                <p className="text-sm text-blue-600 mb-2">活動：{successModalData.event.title}</p>
              )}
              <p className="text-xs text-gray-400">
                {successModalData.method} • {successModalData.timestamp}
              </p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessModalData(null);
                if (modalTimeoutRef.current) {
                  clearTimeout(modalTimeoutRef.current);
                }
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              確定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckInScanner;