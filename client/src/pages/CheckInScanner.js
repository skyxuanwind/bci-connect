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
  const [showGatewayHelp, setShowGatewayHelp] = useState(false);
  const [hideSseHint, setHideSseHint] = useState(false);
  // 新增：Gateway 下載區塊收合與複製反饋
  const [showGatewayDownloads, setShowGatewayDownloads] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  // 新增：活動報名名單相關狀態
  const [eventAttendance, setEventAttendance] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    // 初始化讀取是否關閉過浮層
    try {
      const v = localStorage.getItem('bci_hideSseHint');
      if (v === '1') setHideSseHint(true);
    } catch {}
  }, []);

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
            timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
          });
          setShowSuccessModal(true);
  
          if (modalTimeoutRef.current) clearTimeout(modalTimeoutRef.current);
          modalTimeoutRef.current = setTimeout(() => {
            setShowSuccessModal(false);
            setSuccessModalData(null);
            setScanResult(null);
          }, 3000);
          
          // 刷新報名名單以顯示最新報到狀態
          if (selectedEvent) {
            fetchEventAttendance(selectedEvent);
          }
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
  }, [user, selectedEvent]);

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
          fetchEventAttendance(todayEvent.id.toString());
        }
      }
    } catch (error) {
      console.error('獲取活動列表失敗:', error);
    }
  };

  // 獲取活動報名名單和報到狀態
  const fetchEventAttendance = async (eventId) => {
    if (!eventId) {
      setEventAttendance(null);
      return;
    }

    setLoadingAttendance(true);
    try {
      const response = await api.get(`/api/attendance/event/${eventId}`);
      if (response.data.success) {
        setEventAttendance(response.data);
        addDebugInfo(`已載入活動報名名單：${response.data.statistics.totalRegistered} 人報名，${response.data.statistics.totalAttended} 人已報到`);
      } else {
        setEventAttendance(null);
        addDebugInfo('無法載入活動報名名單');
      }
    } catch (error) {
      console.error('獲取活動報名名單失敗:', error);
      setEventAttendance(null);
      addDebugInfo('載入活動報名名單失敗');
    } finally {
      setLoadingAttendance(false);
    }
  };

  // 處理活動選擇變更
  const handleEventChange = (eventId) => {
    setSelectedEvent(eventId);
    fetchEventAttendance(eventId);
  };

  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const copyToClipboard = async (text, label = '') => {
    try {
      await navigator.clipboard.writeText(text);
      const msg = label ? `已複製：${label}` : '已複製連結';
      setCopyFeedback(msg);
      addDebugInfo(msg);
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (e) {
      setCopyFeedback('複製失敗');
      addDebugInfo('複製失敗');
      setTimeout(() => setCopyFeedback(''), 2000);
    }
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
        timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
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
      
      // 刷新報名名單以顯示最新報到狀態
      if (selectedEvent) {
        fetchEventAttendance(selectedEvent);
      }
      
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
        timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
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
      
      // 刷新報名名單以顯示最新報到狀態
      if (selectedEvent) {
        fetchEventAttendance(selectedEvent);
      }
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
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">報到系統</h1>
          <p className="text-gray-600">使用 QR Code 或 NFC 名片進行快速報到</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：掃描區域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 活動選擇 */}
            <div className="bg-gradient-to-r from-black to-gray-800 rounded-lg shadow-md p-6 border border-yellow-400">
              <h2 className="text-xl font-semibold text-yellow-400 mb-4">選擇活動</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedEvent}
                  onChange={(e) => handleEventChange(e.target.value)}
                  className="p-2 bg-black text-yellow-400 border border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="" className="bg-black text-yellow-400">不限活動</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id} className="bg-black text-yellow-400">
                      {event.title}（{formatDate(event.event_date)}）
                    </option>
                  ))}
                </select>
                <button
                  onClick={fetchEvents}
                  className="px-4 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  重新載入活動
                </button>
              </div>
            </div>

            {/* 活動報名名單 */}
            {selectedEvent && (
              <div className="bg-black rounded-lg shadow-md p-6 border border-yellow-400">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-yellow-400">📋 活動報名名單</h2>
                  {loadingAttendance && (
                    <div className="flex items-center text-sm text-yellow-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                      載入中...
                    </div>
                  )}
                </div>
                
                {eventAttendance ? (
                  <div>
                    {/* 統計資訊 */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-gray-900 border border-yellow-400 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-400">{eventAttendance.statistics.totalRegistered}</div>
                        <div className="text-sm text-yellow-300">總報名</div>
                      </div>
                      <div className="text-center p-3 bg-gray-900 border border-green-400 rounded-lg">
                        <div className="text-2xl font-bold text-green-400">{eventAttendance.statistics.totalAttended}</div>
                        <div className="text-sm text-green-300">已報到</div>
                      </div>
                      <div className="text-center p-3 bg-gray-900 border border-red-400 rounded-lg">
                        <div className="text-2xl font-bold text-red-400">{eventAttendance.statistics.totalAbsent}</div>
                        <div className="text-sm text-red-300">未報到</div>
                      </div>
                      <div className="text-center p-3 bg-gray-900 border border-yellow-400 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-400">{eventAttendance.statistics.attendanceRate}%</div>
                        <div className="text-sm text-yellow-300">報到率</div>
                      </div>
                    </div>

                    {/* 名單列表 */}
                    <div className="space-y-4">
                      {/* 已報到名單 */}
                      {eventAttendance.attendedMembers.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium text-green-400 mb-3 flex items-center">
                            <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                            已報到 ({eventAttendance.attendedMembers.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {eventAttendance.attendedMembers.map((member) => (
                              <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-900 border border-green-400 rounded-lg">
                                <div>
                                  <div className="font-medium text-yellow-400">{member.name}</div>
                                  <div className="text-sm text-yellow-300">{member.company}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-green-400 font-medium">✓ 已報到</div>
                                  <div className="text-xs text-gray-400">
                                    {new Date(member.check_in_time).toLocaleString('zh-TW', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      timeZone: 'Asia/Taipei'
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 未報到名單 */}
                      {eventAttendance.absentMembers.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium text-red-400 mb-3 flex items-center">
                            <span className="inline-block w-3 h-3 bg-red-400 rounded-full mr-2"></span>
                            未報到 ({eventAttendance.absentMembers.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {eventAttendance.absentMembers.map((member) => (
                              <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-900 border border-red-400 rounded-lg">
                                <div>
                                  <div className="font-medium text-yellow-400">{member.name}</div>
                                  <div className="text-sm text-yellow-300">{member.company}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-red-400 font-medium">⏳ 未報到</div>
                                  <div className="text-xs text-gray-400">等待報到</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 無報名資料 */}
                      {eventAttendance.statistics.totalRegistered === 0 && (
                        <div className="text-center py-8 text-yellow-300">
                          <div className="text-4xl mb-2">📝</div>
                          <div>此活動暫無報名資料</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-yellow-300">
                    <div className="text-4xl mb-2">📋</div>
                    <div>請選擇活動以查看報名名單</div>
                  </div>
                )}
              </div>
            )}

            {/* QR Code 掃描 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">📷 QR Code 掃描</h2>
              {!isScanning ? (
                <button
                  onClick={startQRScanner}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  開始 QR 掃描
                </button>
              ) : (
                <div>
                  <div id="qr-reader" className="w-full h-[300px] mb-3 bg-gray-50" />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={stopQRScanner}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      停止掃描
                    </button>
                    {scannerError && (
                      <span className="text-sm text-red-600">{scannerError}</span>
                    )}
                  </div>
                </div>
              )}
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
              <div id="gateway-downloads" className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold text-gray-800">
                    ⬇️ 下載本地 Gateway 啟動器（在讀卡機旁的電腦執行）
                  </div>
                  <div className="flex items-center gap-3">
                    {copyFeedback && (
                      <span className="text-xs text-green-600">{copyFeedback}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowGatewayDownloads(v => !v)}
                      className="text-xs text-blue-600 underline hover:text-blue-700"
                    >
                      {showGatewayDownloads ? '收起' : '展開'}
                    </button>
                  </div>
                </div>

                {showGatewayDownloads && (
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-macOS.zip`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-800 text-white hover:bg-gray-900"
                      >
                        🍎 macOS App（建議）
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-macOS.zip`, 'macOS App 下載連結')}
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      >
                        複製連結
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher.command`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-800"
                      >
                        🍎 macOS Script（.command）
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher.command`, 'macOS Script（.command）下載連結')}
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      >
                        複製連結
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.vbs`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        🪟 Windows 一鍵（VBS，建議）
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.vbs`, 'Windows VBS 下載連結')}
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      >
                        複製連結
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.bat`}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
                      >
                        🪟 Windows .bat（備用）
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${process.env.PUBLIC_URL || ''}/BCI-NFC-Gateway-Launcher-Windows.bat`, 'Windows .bat 下載連結')}
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      >
                        複製連結
                      </button>
                    </div>
                  </div>
                )}
              </div>
                <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                  • 下載後放到桌面，雙擊執行；依指示安裝依賴並啟動本地 Gateway（預設埠 3002）。<br/>
                  • macOS 第一次可能需要允許「來自身份不明的開發者」，或先解壓 .zip 再打開 App。<br/>
                  • 啟動成功後回到此頁面，SSE 狀態保持「已連線」，刷卡即會自動報到。
                </div>

                {/* 教學與常見問題（可展開） */}
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGatewayHelp(v => !v)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showGatewayHelp ? '－ 收合教學與常見問題' : '＋ 展開教學與常見問題'}
                  </button>

                  {showGatewayHelp && (
                    <div className="mt-3 text-sm text-gray-700 space-y-3">
                      <div>
                        <div className="font-semibold text-gray-800 mb-1">一、準備與安裝</div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>插上讀卡機（ACR122U 等），避免延長線造成供電不足。</li>
                          <li>下載上方啟動器到桌面，雙擊執行並允許網路權限。</li>
                          <li>啟動後會開在本機埠 3002，並連線雲端 API。</li>
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800 mb-1">二、macOS 啟動指引</div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>若出現「無法打開，因為來自身份不明的開發者」，請到「系統設定 → 隱私與安全性」點選仍要打開。</li>
                          <li>若 .command 無法執行，打開「終端機」執行：chmod +x ~/Desktop/BCI-NFC-Gateway-Launcher.command 後再雙擊。</li>
                          <li>必要時於「系統設定 → 隱私與安全性 → 完整磁碟存取 / 自動化」允許終端機執行。</li>
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800 mb-1">三、Windows 啟動指引</div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>若被 Defender 阻擋，請選擇「其他資訊 → 仍要執行」，或改用 .bat / .ps1 版。</li>
                          <li>PowerShell 可能需要允許腳本：以系統管理員開啟 PowerShell，執行 Set-ExecutionPolicy RemoteSigned。</li>
                          <li>若未自動安裝 USB 驅動，請於裝置管理員更新 ACR122U 相關驅動。</li>
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800 mb-1">四、如何確認通路正常？</div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>此頁面上方「SSE 即時通道」顯示為「已連線」。</li>
                          <li>啟動器日誌顯示「已連線 Gateway 服務，監聽 3002」之類訊息。</li>
                          <li>刷卡後 1 秒內，右側會跳出成功提示並顯示會員姓名或卡片 UID。</li>
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-800 mb-1">五、常見問題排查</div>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>SSE 顯示未連線：檢查網路是否可連雲端 API，或稍候自動重試。</li>
                          <li>刷卡無反應：確認本機 3002 服務仍在執行，或重新啟動啟動器。</li>
                          <li>卡片不相容：目前以 MIFARE/ISO14443 常見 UID 為主；若特殊卡片，請回報我協助擴充。</li>
                          <li>安全性：本機啟動器只連線到雲端 API，不會對外開放；請勿公開分享 API Key。</li>
                        </ul>
                      </div>
                    </div>
                  )}
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
  );
};
export default CheckInScanner;