import React, { useState, useEffect } from 'react';
import axios from '../config/axios';
import Cookies from 'js-cookie';

const DigitalWalletSync = () => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [localCards, setLocalCards] = useState([]);
  const [cloudCards, setCloudCards] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    loadLocalCards();
  }, []);

  const checkLoginStatus = () => {
    const token = Cookies.get('token');
    setIsLoggedIn(!!token);
  };

  const loadLocalCards = () => {
    try {
      const saved = localStorage.getItem('digitalWallet');
      if (saved) {
        const cards = JSON.parse(saved);
        setLocalCards(cards);
      }
    } catch (error) {
      console.error('載入本地名片失敗:', error);
    }
  };

  const loadCloudCards = async () => {
    if (!isLoggedIn) return;
    
    try {
      setSyncStatus('loading');
      const token = Cookies.get('token');
      const response = await axios.get('/api/digital-wallet/cards', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setCloudCards(response.data.cards);
        setSyncStatus('success');
      }
    } catch (error) {
      console.error('載入雲端名片失敗:', error);
      setSyncStatus('error');
    }
  };

  const syncToCloud = async () => {
    if (!isLoggedIn || localCards.length === 0) return;
    
    try {
      setSyncStatus('syncing');
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/digital-wallet/sync', 
        { cards: localCards },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSyncStatus('synced');
        await loadCloudCards(); // 重新載入雲端數據
      }
    } catch (error) {
      console.error('同步到雲端失敗:', error);
      setSyncStatus('error');
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'loading': return 'text-blue-600';
      case 'syncing': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'synced': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'loading': return '載入中...';
      case 'syncing': return '同步中...';
      case 'success': return '載入成功';
      case 'synced': return '同步成功';
      case 'error': return '操作失敗';
      default: return '就緒';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              需要登入才能使用雲端同步功能
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              目前使用本地存儲，不同設備間的數據不會同步
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">雲端同步狀態</h3>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{localCards.length}</div>
          <div className="text-sm text-gray-600">本地名片</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{cloudCards.length}</div>
          <div className="text-sm text-blue-600">雲端名片</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {localCards.length === cloudCards.length ? '✓' : '!'}
          </div>
          <div className="text-sm text-green-600">
            {localCards.length === cloudCards.length ? '已同步' : '需同步'}
          </div>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={loadCloudCards}
          disabled={syncStatus === 'loading'}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          載入雲端數據
        </button>
        <button
          onClick={syncToCloud}
          disabled={syncStatus === 'syncing' || localCards.length === 0}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          同步到雲端
        </button>
      </div>
      
      {localCards.length !== cloudCards.length && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            本地和雲端的名片數量不一致，建議進行同步操作
          </p>
        </div>
      )}
    </div>
  );
};

export default DigitalWalletSync;