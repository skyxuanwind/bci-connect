import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const NFCLocalReader = ({ onCardDetected, onError, onStatusChange }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [readerConnected, setReaderConnected] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [readerName, setReaderName] = useState('');
  const [lastCard, setLastCard] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  // 連接到本地 NFC 伺服器
  const connectToNFCServer = useCallback(() => {
    try {
      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });

      newSocket.on('connect', () => {
        console.log('✅ 已連接到本地 NFC 伺服器');
        setConnected(true);
        setConnectionError(null);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ 與本地 NFC 伺服器斷線');
        setConnected(false);
        setReaderConnected(false);
        setIsReading(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ 連接本地 NFC 伺服器失敗:', error);
        setConnectionError('無法連接到本地 NFC 伺服器，請確認伺服器已啟動');
        setConnected(false);
      });

      // NFC 狀態更新
      newSocket.on('nfc-status', (status) => {
        console.log('📡 NFC 狀態更新:', status);
        setReaderConnected(status.readerConnected);
        setIsReading(status.isReading);
        if (status.readerName) {
          setReaderName(status.readerName);
        }
        
        if (onStatusChange) {
          onStatusChange(status);
        }
      });

      // NFC 卡片檢測
      newSocket.on('nfc-card-detected', (cardData) => {
        console.log('💳 檢測到 NFC 卡片:', cardData);
        setLastCard(cardData);
        
        if (onCardDetected) {
          onCardDetected(cardData);
        }
      });

      // NFC 卡片移除
      newSocket.on('nfc-card-removed', (cardData) => {
        console.log('📤 NFC 卡片已移除:', cardData);
      });

      // NFC 讀取開始
      newSocket.on('nfc-reading-started', (data) => {
        console.log('🚀 NFC 讀取已開始:', data.message);
        setIsReading(true);
      });

      // NFC 讀取停止
      newSocket.on('nfc-reading-stopped', (data) => {
        console.log('⏹️ NFC 讀取已停止:', data.message);
        setIsReading(false);
      });

      // NFC 錯誤
      newSocket.on('nfc-error', (error) => {
        console.error('❌ NFC 錯誤:', error);
        if (onError) {
          onError(error);
        }
      });

      // NFC 資訊
      newSocket.on('nfc-info', (info) => {
        console.log('ℹ️ NFC 資訊:', info);
      });

      setSocket(newSocket);
      
    } catch (error) {
      console.error('❌ 建立 Socket 連接失敗:', error);
      setConnectionError('建立連接失敗: ' + error.message);
    }
  }, [onCardDetected, onError, onStatusChange]);

  // 斷開連接
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      setReaderConnected(false);
      setIsReading(false);
    }
  }, [socket]);

  // 開始 NFC 讀取
  const startReading = useCallback(() => {
    if (socket && connected) {
      console.log('📱 發送開始 NFC 讀取請求');
      socket.emit('start-nfc-reading');
    } else {
      console.warn('⚠️ Socket 未連接，無法開始 NFC 讀取');
    }
  }, [socket, connected]);

  // 停止 NFC 讀取
  const stopReading = useCallback(() => {
    if (socket && connected) {
      console.log('⏹️ 發送停止 NFC 讀取請求');
      socket.emit('stop-nfc-reading');
    } else {
      console.warn('⚠️ Socket 未連接，無法停止 NFC 讀取');
    }
  }, [socket, connected]);

  // 組件掛載時連接
  useEffect(() => {
    connectToNFCServer();
    
    // 清理函數
    return () => {
      disconnect();
    };
  }, [connectToNFCServer, disconnect]);

  return {
    // 狀態
    connected,
    readerConnected,
    isReading,
    readerName,
    lastCard,
    connectionError,
    
    // 方法
    startReading,
    stopReading,
    reconnect: connectToNFCServer,
    disconnect
  };
};

export default NFCLocalReader;