import React, { useState, useEffect } from 'react';
import axios from '../config/axios';
import Cookies from 'js-cookie';
import {
  HeartIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  TagIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CameraIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import BusinessCardScanner from '../components/BusinessCardScanner';
import DigitalWalletSync from '../components/DigitalWalletSync';
import { useNavigate } from 'react-router-dom';

const DigitalWallet = () => {
  const [savedCards, setSavedCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('date_added');
  const [editingNote, setEditingNote] = useState(null);
  const [tempNote, setTempNote] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedCards();
  }, []);

  const loadSavedCards = async () => {
    try {
      const token = Cookies.get('token');

      let cloudCards = null;
      if (token) {
        try {
          const response = await axios.get('/api/digital-wallet/cards', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            cloudCards = response.data.cards || [];
          }
        } catch (error) {
          console.warn('從雲端載入失敗，嘗試本地載入:', error);
        }
      }

      // 讀取本地備份
      const saved = localStorage.getItem('digitalWallet');
      const localCards = saved ? JSON.parse(saved) : [];

      if (Array.isArray(cloudCards)) {
        if (cloudCards.length > 0) {
          // 雲端有資料 -> 採用雲端，並覆寫本地備份
          setSavedCards(cloudCards);
          try { localStorage.setItem('digitalWallet', JSON.stringify(cloudCards)); } catch {}
          return;
        }
        // 雲端空陣列 -> 若本地有資料，不要覆蓋，改採用本地並嘗試同步上雲
        if (localCards.length > 0) {
          setSavedCards(localCards);
          if (token) { await syncToCloud(localCards); }
          return;
        }
        // 雲端與本地都沒有資料
        setSavedCards([]);
        return;
      }

      // 沒登入或雲端取得失敗，使用本地
      if (localCards.length > 0) {
        setSavedCards(localCards);
        if (token) { await syncToCloud(localCards); }
      } else {
        setSavedCards([]);
      }
    } catch (error) {
      console.error('載入名片夾失敗:', error);
    }
  };

  const saveToLocalStorage = (cards) => {
    try {
      localStorage.setItem('digitalWallet', JSON.stringify(cards));
      // 通知其他元件（如同步面板）本地名片已更新
      window.dispatchEvent(new CustomEvent('digitalWallet:localUpdated'));
    } catch (error) {
      console.error('保存名片夾失敗:', error);
    }
  };

  const syncToCloud = async (cards) => {
    try {
      const token = Cookies.get('token');
      if (!token) return;
      
      const resp = await axios.post('/api/digital-wallet/sync', 
        { cards },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (resp?.data?.success) {
        // 通知同步面板刷新雲端資料
        window.dispatchEvent(new CustomEvent('digitalWallet:syncCompleted'));
      } else {
        console.warn('同步到雲端回應非成功:', resp?.data);
      }
    } catch (error) {
      console.warn('同步到雲端失敗:', error);
    }
  };

  const removeCard = async (cardId) => {
    try {
      const token = Cookies.get('token');
      const cardToRemove = savedCards.find(card => card.id === cardId);
      
      // 如果有登入且有 collection_id，從雲端刪除
      if (token && cardToRemove?.collection_id) {
        try {
          await axios.delete(`/api/digital-wallet/cards/${cardToRemove.collection_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.warn('從雲端刪除失敗:', error);
        }
      }
      
      // 從本地刪除
      const updatedCards = savedCards.filter(card => card.id !== cardId);
      setSavedCards(updatedCards);
      saveToLocalStorage(updatedCards);
    } catch (error) {
      console.error('刪除名片失敗:', error);
    }
  };

  const updateCard = async (cardId, updates) => {
    try {
      const token = Cookies.get('token');
      const cardToUpdate = savedCards.find(card => card.id === cardId);
      
      // 如果有登入且有 collection_id，更新雲端
      if (token && cardToUpdate?.collection_id) {
        try {
          await axios.put(`/api/digital-wallet/cards/${cardToUpdate.collection_id}`, {
            notes: updates.personal_note,
            tags: updates.tags,
            is_favorite: updates.is_favorite,
            folder_name: updates.folder_name
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.warn('更新雲端失敗:', error);
        }
      }
      
      // 更新本地
      const updatedCards = savedCards.map(card => 
        card.id === cardId ? { ...card, ...updates } : card
      );
      setSavedCards(updatedCards);
      saveToLocalStorage(updatedCards);
    } catch (error) {
      console.error('更新名片失敗:', error);
    }
  };

  const addTag = async (cardId, tag) => {
    if (!tag.trim()) return;
    
    const cardToUpdate = savedCards.find(card => card.id === cardId);
    const currentTags = cardToUpdate?.tags || [];
    
    if (currentTags.includes(tag.trim())) return;
    
    const newTags = [...currentTags, tag.trim()];
    
    try {
      const token = Cookies.get('token');
      
      // 如果有登入且有 collection_id，更新雲端
      if (token && cardToUpdate?.collection_id) {
        try {
          await axios.put(`/api/digital-wallet/cards/${cardToUpdate.collection_id}`, {
            notes: cardToUpdate.personal_note,
            tags: newTags,
            is_favorite: cardToUpdate.is_favorite,
            folder_name: cardToUpdate.folder_name
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.warn('更新雲端標籤失敗:', error);
        }
      }
      
      // 更新本地
      const updatedCards = savedCards.map(card => {
        if (card.id === cardId) {
          return { ...card, tags: newTags };
        }
        return card;
      });
      setSavedCards(updatedCards);
      saveToLocalStorage(updatedCards);
    } catch (error) {
      console.error('新增標籤失敗:', error);
    }
  };

  const removeTag = async (cardId, tagToRemove) => {
    const cardToUpdate = savedCards.find(card => card.id === cardId);
    const newTags = (cardToUpdate?.tags || []).filter(tag => tag !== tagToRemove);
    
    try {
      const token = Cookies.get('token');
      
      // 如果有登入且有 collection_id，更新雲端
      if (token && cardToUpdate?.collection_id) {
        try {
          await axios.put(`/api/digital-wallet/cards/${cardToUpdate.collection_id}`, {
            notes: cardToUpdate.personal_note,
            tags: newTags,
            is_favorite: cardToUpdate.is_favorite,
            folder_name: cardToUpdate.folder_name
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.warn('更新雲端標籤失敗:', error);
        }
      }
      
      // 更新本地
      const updatedCards = savedCards.map(card => {
        if (card.id === cardId) {
          return { 
            ...card, 
            tags: newTags
          };
        }
        return card;
      });
      setSavedCards(updatedCards);
      saveToLocalStorage(updatedCards);
    } catch (error) {
      console.error('移除標籤失敗:', error);
    }
  };

  const toggleFavorite = async (cardId) => {
    const cardToUpdate = savedCards.find(card => card.id === cardId);
    const newFavoriteStatus = !cardToUpdate?.is_favorite;
    
    try {
      const token = Cookies.get('token');
      
      // 如果有登入且有 collection_id，更新雲端
      if (token && cardToUpdate?.collection_id) {
        try {
          await axios.put(`/api/digital-wallet/cards/${cardToUpdate.collection_id}`, {
            notes: cardToUpdate.personal_note,
            tags: cardToUpdate.tags,
            is_favorite: newFavoriteStatus,
            folder_name: cardToUpdate.folder_name
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.warn('更新雲端收藏狀態失敗:', error);
        }
      }
      
      // 更新本地
      const updatedCards = savedCards.map(card => {
        if (card.id === cardId) {
          return { 
            ...card, 
            is_favorite: newFavoriteStatus
          };
        }
        return card;
      });
      setSavedCards(updatedCards);
      saveToLocalStorage(updatedCards);
    } catch (error) {
      console.error('切換收藏狀態失敗:', error);
    }
  };

  const downloadVCard = async (card) => {
    try {
      const response = await fetch(`/api/nfc-cards/${card.id}/vcard`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${card.card_title || 'contact'}.vcf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const exportAllCards = () => {
    const dataStr = JSON.stringify(savedCards, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'digital-wallet-backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importCards = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedCards = JSON.parse(e.target.result);
        if (Array.isArray(importedCards)) {
          // 合併現有名片，避免重複
          const existingIds = new Set(savedCards.map(card => card.id));
          const newCards = importedCards.filter(card => !existingIds.has(card.id));
          const mergedCards = [...savedCards, ...newCards];
          setSavedCards(mergedCards);
          saveToLocalStorage(mergedCards);
          alert(`成功匯入 ${newCards.length} 張名片`);
        }
      } catch (error) {
        console.error('匯入失敗:', error);
        alert('匯入失敗，請檢查檔案格式');
      }
    };
    reader.readAsText(file);
  };

  // 處理掃描完成
  const handleScanComplete = async (extractedInfo) => {
    try {
      const nowIso = new Date().toISOString();
      const contactInfo = {
        phone: extractedInfo.phone || extractedInfo.mobile || '',
        email: extractedInfo.email || '',
        company: extractedInfo.company || ''
      };
      const newCard = {
        id: `scanned_${Date.now()}`,
        card_title: extractedInfo.name || '掃描名片',
        card_subtitle: extractedInfo.title || '',
        contact_info: contactInfo,
        // 兼容舊結構（頂層欄位）
        company: extractedInfo.company || '',
        phone: extractedInfo.phone || extractedInfo.mobile || '',
        email: extractedInfo.email || '',
        website: extractedInfo.website || '',
        address: extractedInfo.address || '',
        tags: extractedInfo.tags || [],
        personal_note: '',
        date_added: nowIso,
        last_viewed: nowIso,
        is_scanned: true,
        scanned_data: { ...extractedInfo }
      };
      
      const updatedCards = [newCard, ...savedCards];
      setSavedCards(updatedCards);
      saveToLocalStorage(updatedCards);

      // 若已登入，立即觸發雲端同步
      const token = Cookies.get('token');
      if (token) {
        try {
          await syncToCloud(updatedCards);
        } catch (err) {
          console.warn('掃描後自動同步失敗：', err);
        }
      }

      setShowScanner(false);
      alert('名片已成功添加到數位名片夾！');
    } catch (error) {
      console.error('處理掃描結果失敗:', error);
      throw error; // 重新拋出錯誤，讓 BusinessCardScanner 處理
    }
  };

  // 導航到數據分析頁面
  const goToAnalytics = () => {
    navigate('/nfc-analytics');
  };

  // 過濫和排序邏輯
  const filteredAndSortedCards = savedCards
    .filter(card => {
      const matchesSearch = !searchTerm || 
        card.card_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.card_subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.personal_note?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTag = !filterTag || 
        (card.tags && card.tags.includes(filterTag));
      
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.card_title || '').localeCompare(b.card_title || '');
        case 'date_added':
          return new Date(b.date_added) - new Date(a.date_added);
        case 'last_viewed':
          return new Date(b.last_viewed || 0) - new Date(a.last_viewed || 0);
        default:
          return 0;
      }
    });

  // 獲取所有標籤
  const allTags = [...new Set(savedCards.flatMap(card => card.tags || []))];

  const handleEditNote = (cardId, currentNote) => {
    setEditingNote(cardId);
    setTempNote(currentNote || '');
  };

  const saveNote = (cardId) => {
    updateCard(cardId, { personal_note: tempNote });
    setEditingNote(null);
    setTempNote('');
  };

  const cancelEditNote = () => {
    setEditingNote(null);
    setTempNote('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部標題區 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <HeartSolidIcon className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">數位名片夾</h1>
                <p className="text-sm text-gray-600">已收藏 {savedCards.length} 張名片</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center px-4 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <CameraIcon className="h-4 w-4 mr-2" />
                掃描名片
              </button>
              
              <button
                onClick={goToAnalytics}
                className="flex items-center px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                數據分析
              </button>
              
              <button
                onClick={exportAllCards}
                className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                匯出備份
              </button>
              
              <label className="flex items-center px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2 rotate-180" />
                匯入名片
                <input
                  type="file"
                  accept=".json"
                  onChange={importCards}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜尋和篩選區 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 搜尋框 */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋名片標題、副標題或備註..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* 篩選和排序 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                篩選
              </button>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date_added">新增時間</option>
                <option value="name">名稱</option>
                <option value="last_viewed">最後查看</option>
              </select>
            </div>
          </div>
          
          {/* 展開的篩選選項 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">標籤篩選：</span>
                <button
                  onClick={() => setFilterTag('')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    !filterTag 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filterTag === tag 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 名片列表 */}
        {filteredAndSortedCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <HeartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {savedCards.length === 0 ? '名片夾是空的' : '沒有符合條件的名片'}
            </h3>
            <p className="text-gray-600">
              {savedCards.length === 0 
                ? '開始收藏您喜歡的電子名片吧！' 
                : '試試調整搜尋條件或篩選設定'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCards.map(card => (
              <div key={card.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* 名片頭部 */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {card.card_title || '未命名名片'}
                      </h3>
                      {card.card_subtitle && (
                        <p className="text-gray-600 text-sm">{card.card_subtitle}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => removeCard(card.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="移除名片"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* 聯絡資訊預覽 */}
                  <div className="space-y-2 text-sm text-gray-600">
                    {card.contact_info?.phone && (
                      <div className="flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        <span>{card.contact_info.phone}</span>
                      </div>
                    )}
                    {card.contact_info?.email && (
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        <span>{card.contact_info.email}</span>
                      </div>
                    )}
                    {card.contact_info?.company && (
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                        <span>{card.contact_info.company}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 標籤 */}
                {card.tags && card.tags.length > 0 && (
                  <div className="px-6 pb-4">
                    <div className="flex flex-wrap gap-1">
                      {card.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          <TagIcon className="h-3 w-3 mr-1" />
                          {tag}
                          <button
                            onClick={() => removeTag(card.id, tag)}
                            className="ml-1 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 個人備註 */}
                <div className="px-6 pb-4">
                  {editingNote === card.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        placeholder="添加個人備註..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEditNote}
                          className="px-3 py-1 text-gray-600 bg-gray-100 rounded text-sm hover:bg-gray-200 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => saveNote(card.id)}
                          className="px-3 py-1 text-white bg-blue-600 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {card.personal_note ? (
                          <p className="text-sm text-gray-600 italic">"{card.personal_note}"</p>
                        ) : (
                          <p className="text-sm text-gray-400">點擊添加個人備註</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditNote(card.id, card.personal_note)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 操作按鈕 */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <a
                      href={`/member/${card.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      查看名片
                    </a>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="添加標籤"
                        className="px-2 py-1 border border-gray-300 rounded text-xs w-20 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addTag(card.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      
                      <button
                        onClick={() => toggleFavorite(card.id)}
                        className={`p-1 rounded transition-colors ${
                          card.is_favorite 
                            ? 'text-red-500 hover:bg-red-50' 
                            : 'text-gray-400 hover:bg-gray-50 hover:text-red-500'
                        }`}
                        title={card.is_favorite ? '取消收藏' : '加入收藏'}
                      >
                        {card.is_favorite ? (
                          <HeartSolidIcon className="h-4 w-4" />
                        ) : (
                          <HeartIcon className="h-4 w-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => downloadVCard(card)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="下載 vCard"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    收藏於 {new Date(card.date_added).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 雲端同步狀態 */}
      <DigitalWalletSync />
      
      {/* 名片掃描器 */}
      {showScanner && (
        <BusinessCardScanner
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default DigitalWallet;