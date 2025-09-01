import React, { useState, useEffect } from 'react';
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
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const DigitalWallet = () => {
  const [savedCards, setSavedCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('date_added');
  const [editingNote, setEditingNote] = useState(null);
  const [tempNote, setTempNote] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadSavedCards();
  }, []);

  const loadSavedCards = () => {
    try {
      const saved = localStorage.getItem('digitalWallet');
      if (saved) {
        const cards = JSON.parse(saved);
        setSavedCards(cards);
      }
    } catch (error) {
      console.error('載入名片夾失敗:', error);
    }
  };

  const saveToLocalStorage = (cards) => {
    try {
      localStorage.setItem('digitalWallet', JSON.stringify(cards));
    } catch (error) {
      console.error('保存名片夾失敗:', error);
    }
  };

  const removeCard = (cardId) => {
    const updatedCards = savedCards.filter(card => card.id !== cardId);
    setSavedCards(updatedCards);
    saveToLocalStorage(updatedCards);
  };

  const updateCardNote = (cardId, note) => {
    const updatedCards = savedCards.map(card => 
      card.id === cardId ? { ...card, personal_note: note } : card
    );
    setSavedCards(updatedCards);
    saveToLocalStorage(updatedCards);
  };

  const addTag = (cardId, tag) => {
    if (!tag.trim()) return;
    
    const updatedCards = savedCards.map(card => {
      if (card.id === cardId) {
        const currentTags = card.tags || [];
        if (!currentTags.includes(tag.trim())) {
          return { ...card, tags: [...currentTags, tag.trim()] };
        }
      }
      return card;
    });
    setSavedCards(updatedCards);
    saveToLocalStorage(updatedCards);
  };

  const removeTag = (cardId, tagToRemove) => {
    const updatedCards = savedCards.map(card => {
      if (card.id === cardId) {
        return { 
          ...card, 
          tags: (card.tags || []).filter(tag => tag !== tagToRemove) 
        };
      }
      return card;
    });
    setSavedCards(updatedCards);
    saveToLocalStorage(updatedCards);
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

  // 過濾和排序邏輯
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
    updateCardNote(cardId, tempNote);
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
    </div>
  );
};

export default DigitalWallet;