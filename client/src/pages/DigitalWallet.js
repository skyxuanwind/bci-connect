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
  ChartBarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import BusinessCardScanner from '../components/BusinessCardScanner';
// DigitalWalletSync 面板已移除（自動同步運作中）
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
  const [currentToken, setCurrentToken] = useState(Cookies.get('token'));
  // 進階篩選/排序/AI 狀態
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState('any'); // any | all
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // all | scanned | regular
  const [companyFilter, setCompanyFilter] = useState('');
  const [contactPresence, setContactPresence] = useState('any'); // any | email | phone | email_or_phone | both
  const [dateRange, setDateRange] = useState('any'); // any | 7d | 30d | 90d | 1y
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiError, setAiError] = useState('');
  const [aiCurrentCard, setAiCurrentCard] = useState(null);
  // 圖片預覽 Modal 狀態
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedCards();
  }, []);

  // 監聽 token 變化，當用戶切換帳戶時重新載入數據
  useEffect(() => {
    const token = Cookies.get('token');
    if (token !== currentToken) {
      setCurrentToken(token);
      // 切換帳號時，先清空畫面上的名片列表，避免短暫顯示舊帳號資料
      setSavedCards([]);
      loadSavedCards();
    }
  }, [currentToken]);

  // 定期檢查 token 變化（用於處理用戶在其他頁面登入/登出的情況）
  useEffect(() => {
    const interval = setInterval(() => {
      const token = Cookies.get('token');
      if (token !== currentToken) {
        setCurrentToken(token);
      }
    }, 1000); // 每秒檢查一次

    return () => clearInterval(interval);
  }, [currentToken]);

  // 按下 ESC 關閉圖片預覽
  useEffect(() => {
    if (!imagePreviewOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setImagePreviewOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imagePreviewOpen]);

  // 清理因舊版 bug 產生的共享 localStorage key，避免不同用戶看到相同資料
  const cleanupLegacyLocalStorageKeys = () => {
    try {
      const token = Cookies.get('token');
      if (!token) return;
      const properKey = getLocalStorageKey();
      if (!properKey || properKey === 'digitalWallet') return;
      // 僅清理錯誤的 key，不做自動遷移以避免將共享資料誤歸屬到單一用戶
      const legacyKeys = ['digitalWallet', 'digitalWallet_undefined', 'digitalWallet_null', 'digitalWallet_NaN'];
      legacyKeys.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
    } catch {}
  };

  const loadSavedCards = async () => {
    try {
      const token = Cookies.get('token');

      // 若已登入，先清理由舊版造成的共享 key，避免讀取到錯誤資料
      if (token) {
        cleanupLegacyLocalStorageKeys();
      }

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
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      const localCards = saved ? JSON.parse(saved) : [];

      if (Array.isArray(cloudCards)) {
        if (cloudCards.length > 0) {
          // 雲端有資料 -> 採用雲端，並覆寫本地備份
          setSavedCards(cloudCards);
          try { 
            const key = getLocalStorageKey();
            localStorage.setItem(key, JSON.stringify(cloudCards)); 
          } catch {}
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

  const getLocalStorageKey = () => {
    const token = Cookies.get('token');
    if (token) {
      try {
        // 解析 JWT token 獲取用戶 ID（base64url 安全）
        const base64Url = token.split('.')[1] || '';
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        const userId = payload.userId || payload.id;
        if (userId) return `digitalWallet_${userId}`;
      } catch (error) {
        console.warn('無法解析 token，使用預設 key:', error);
      }
    }
    return 'digitalWallet'; // 未登入時使用預設 key
  };

  const saveToLocalStorage = (cards) => {
    try {
      const key = getLocalStorageKey();
      localStorage.setItem(key, JSON.stringify(cards));
      // 通知其他元件本地名片已更新
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

  // 取得可用於 /member/:memberId 的參數：
  // 掃描名片 -> 使用 card.id (scanned_*)；常規名片 -> 使用持有者的 userId
  const getMemberIdForCard = (card) => {
    if (!card) return '';
    const idStr = String(card.id || '');
    if (idStr.startsWith('scanned_') || card.is_scanned) return idStr;
    return String(card.card_owner_id || card.owner_id || card.user_id || '');
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

  const clearAllCards = async () => {
    if (savedCards.length === 0) {
      alert('名片夾已經是空的了！');
      return;
    }

    const confirmed = window.confirm(`確定要清空數位名片夾嗎？這將移除所有 ${savedCards.length} 張名片，此操作無法復原。`);
    if (!confirmed) return;

    try {
      const token = Cookies.get('token');
      
      // 如果有登入，從雲端清空
      if (token) {
        try {
          const response = await axios.delete('/api/digital-wallet/clear', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            alert(response.data.message);
          }
        } catch (error) {
          console.warn('從雲端清空失敗:', error);
          alert('雲端清空失敗，僅清空本地名片夾');
        }
      }
      
      // 清空本地存儲
      setSavedCards([]);
      saveToLocalStorage([]);
      
      if (!token) {
        alert(`已清空數位名片夾，共移除 ${savedCards.length} 張名片`);
      }
    } catch (error) {
      console.error('清空名片夾失敗:', error);
      alert('清空失敗，請稍後再試');
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
      const memberParam = getMemberIdForCard(card);
      if (!memberParam) {
        alert('找不到名片擁有者資訊，無法下載 vCard');
        return;
      }

      // 掃描名片：本地生成 vCard
      if (String(memberParam).startsWith('scanned_')) {
        const scanned = card.scanned_data || {};
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${card.card_title || scanned.name || ''}`,
          `ORG:${scanned.company || ''}`,
          `TITLE:${scanned.title || ''}`,
          `EMAIL:${scanned.email || ''}`,
          `TEL:${scanned.phone || scanned.mobile || ''}`,
          `URL:${scanned.website || ''}`,
          `NOTE:${card.personal_note || ''}`,
          'END:VCARD'
        ];
        const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${card.card_title || scanned.name || 'contact'}.vcf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }

      // 常規名片：以 userId 呼叫 API 端點
      const response = await fetch(`/api/nfc-cards/member/${memberParam}/vcard`);
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
      } else {
        throw new Error('下載失敗');
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
        // 圖片 URL（若有）
        image_url: extractedInfo.image_url || extractedInfo.imageUrl || '',
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

      // 聚合單選與多選標籤
      const aggTags = Array.from(new Set([...
        (selectedTags || []),
        ...(filterTag ? [filterTag] : [])
      ]));
      const cardTags = card.tags || [];
      let matchesTags = true;
      if (aggTags.length > 0) {
        if (tagMatchMode === 'all') {
          matchesTags = aggTags.every(t => cardTags.includes(t));
        } else {
          matchesTags = aggTags.some(t => cardTags.includes(t));
        }
      }

      const matchesFavorites = !onlyFavorites || !!card.is_favorite;
      const matchesNotes = !hasNotes || !!(card.personal_note && card.personal_note.trim());
      const matchesType = typeFilter === 'all' 
        ? true 
        : (typeFilter === 'scanned' ? !!card.is_scanned : !card.is_scanned);

      const companyVal = (card.contact_info?.company || card.company || '').toLowerCase();
      const matchesCompany = !companyFilter || companyVal.includes(companyFilter.toLowerCase());

      const emailVal = (card.contact_info?.email || card.email || '').trim();
      const phoneVal = (card.contact_info?.phone || card.phone || card.mobile || '').trim();
      let matchesPresence = true;
      switch (contactPresence) {
        case 'email': matchesPresence = !!emailVal; break;
        case 'phone': matchesPresence = !!phoneVal; break;
        case 'email_or_phone': matchesPresence = !!emailVal || !!phoneVal; break;
        case 'both': matchesPresence = !!emailVal && !!phoneVal; break;
        default: matchesPresence = true;
      }

      let matchesDate = true;
      if (dateRange !== 'any') {
        const now = Date.now();
        const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        const days = map[dateRange] || 0;
        if (days > 0) {
          const threshold = new Date(now - days * 24 * 60 * 60 * 1000);
          const added = card.date_added ? new Date(card.date_added) : null;
          matchesDate = added ? added >= threshold : false;
        }
      }

      return matchesSearch && matchesTags && matchesFavorites && matchesNotes && matchesType && matchesCompany && matchesPresence && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.card_title || '').localeCompare(b.card_title || '');
        case 'date_added':
          return new Date(b.date_added) - new Date(a.date_added);
        case 'last_viewed':
          return new Date(b.last_viewed || 0) - new Date(a.last_viewed || 0);
        case 'favorite_recent': {
          const favDiff = (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0);
          if (favDiff !== 0) return favDiff;
          return new Date(b.date_added) - new Date(a.date_added);
        }
        case 'company': {
          const ac = (a.contact_info?.company || a.company || '').toLowerCase();
          const bc = (b.contact_info?.company || b.company || '').toLowerCase();
          const cmp = ac.localeCompare(bc);
          return cmp !== 0 ? cmp : new Date(b.date_added) - new Date(a.date_added);
        }
        case 'tag_count': {
          const at = (a.tags || []).length;
          const bt = (b.tags || []).length;
          const diff = bt - at;
          return diff !== 0 ? diff : new Date(b.date_added) - new Date(a.date_added);
        }
        default:
          return 0;
      }
    });

  // 獲取所有標籤
  const allTags = [...new Set(savedCards.flatMap(card => card.tags || []))];

  const toggleSelectTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterTag('');
    setSelectedTags([]);
    setTagMatchMode('any');
    setOnlyFavorites(false);
    setHasNotes(false);
    setTypeFilter('all');
    setCompanyFilter('');
    setContactPresence('any');
    setDateRange('any');
  };

  const openAISuggestion = async (card) => {
    try {
      setAiModalOpen(true);
      setAiLoading(true);
      setAiError('');
      setAiData(null);
      setAiCurrentCard(card);

      const payload = {
        name: card.card_title || '',
        company: card.contact_info?.company || card.company || '',
        title: card.card_subtitle || '',
        email: card.contact_info?.email || card.email || '',
        phone: card.contact_info?.phone || card.phone || card.mobile || '',
        tags: card.tags || [],
        notes: card.personal_note || '',
        last_interaction: card.last_viewed || card.date_added || '',
        goal: '建立關係並安排會談',
        channelPreference: ''
      };

      const token = Cookies.get('token');
      const resp = await axios.post('/api/ai/contacts/followup-suggestion', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (resp?.data?.success) {
        setAiData(resp.data.data);
      } else {
        setAiError(resp?.data?.message || '生成失敗');
      }
    } catch (err) {
      console.error('生成 AI 建議失敗:', err);
      setAiError(err?.response?.data?.message || err.message || '生成失敗');
    } finally {
      setAiLoading(false);
    }
  };

  const closeAISuggestion = () => {
    setAiModalOpen(false);
    setAiLoading(false);
    setAiData(null);
    setAiError('');
    setAiCurrentCard(null);
  };

  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text || ''); alert('已複製到剪貼簿'); } catch {}
  };

  // 將網址/Email/電話轉為可點擊連結的輔助
  const ensureProtocol = (url) => {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  // 確保圖片 URL 為絕對路徑（部署環境相容）
  const normalizeImageUrl = (url) => {
    if (!url) return null;
    
    // 已是絕對 URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // 相對路徑轉絕對路徑
    const baseUrl = process.env.REACT_APP_API_URL || window.location.origin;
    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  const linkifyText = (text) => {
    if (!text) return null;
    const pattern = /(https?:\/\/[^\s]+|www\.[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s\-]{7,}\d)/gi;
    const elements = [];
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        elements.push(text.slice(lastIndex, match.index));
      }
      const m = match[0];
      let href = '#';
      let isExternal = false;
      if (match[1]) {
        href = ensureProtocol(m);
        isExternal = true;
      } else if (match[2]) {
        href = `mailto:${m}`;
      } else if (match[3]) {
        const tel = m.replace(/[^\d+]/g, '');
        href = `tel:${tel}`;
      }
      elements.push(
        <a
          key={`lnk-${elements.length}`}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="text-blue-600 hover:underline"
        >
          {m}
        </a>
      );
      lastIndex = match.index + m.length;
    }
    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }
    return elements;
  };

  // 下載掃描原圖輔助
  const getFileExtFromUrl = (url) => {
    try {
      const u = new URL(url, window.location.href);
      const pathname = u.pathname || '';
      const dot = pathname.lastIndexOf('.');
      let ext = dot !== -1 ? pathname.substring(dot) : '';
      if (!/\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(ext)) {
        // 嘗試從查詢參數推測
        const q = u.searchParams.get('format') || u.searchParams.get('ext');
        if (q && /^(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(q)) ext = `.${q.toLowerCase()}`;
      }
      return ext || '.jpg';
    } catch {
      return '.jpg';
    }
  };
  const downloadImage = async (url, baseName = 'scanned-card') => {
    if (!url) return;
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeBase = (baseName || 'scanned-card').replace(/[^\w\-\u4e00-\u9fa5]+/g, '_');
      a.href = href;
      a.download = `${safeBase}${getFileExtFromUrl(url)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      console.error('下載圖片失敗:', e);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {}
    }
  };

  // 從備註中自動抽取標籤（產業/地區/關鍵字等簡易規則）
  const extractTagsFromText = (text) => {
    if (!text) return [];
    const tags = new Set();
    // 1) Hashtags
    (text.match(/#([\u4e00-\u9fa5\w\-]{2,20})/g) || []).forEach(t => tags.add(t.replace(/^#/, '')));
    // 2) 產業關鍵字
    const industries = ['金融','保險','醫療','生技','科技','軟體','硬體','半導體','製造','教育','房地產','建築','裝修','行銷','廣告','顧問','法律','會計','電商','零售','餐飲','旅遊','物流','人資','設計','媒體'];
    industries.forEach(k => { if (text.includes(k)) tags.add(k); });
    // 3) 地區
    const regions = ['台北','新北','基隆','桃園','新竹','苗栗','台中','彰化','南投','雲林','嘉義','台南','高雄','屏東','宜蘭','花蓮','台東','澎湖','金門','連江'];
    regions.forEach(r => { if (text.includes(r)) tags.add(r); });
    // 4) 其他關鍵詞（英數詞彙）
    (text.match(/[A-Za-z]{3,}/g) || []).slice(0, 5).forEach(w => tags.add(w.toLowerCase()));
    return Array.from(tags).slice(0, 8);
  };

  const handleEditNote = (cardId, currentNote) => {
    setEditingNote(cardId);
    setTempNote(currentNote || '');
  };

  const saveNote = (cardId) => {
    const cardObj = savedCards.find(c => c.id === cardId);
    const autoTags = extractTagsFromText(tempNote);
    const mergedTags = Array.from(new Set([...(cardObj?.tags || []), ...autoTags]));
    updateCard(cardId, { personal_note: tempNote, tags: mergedTags });
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
              
              {savedCards.length > 0 && (
                <button
                  onClick={clearAllCards}
                  className="flex items-center px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  清空名片夾
                </button>
              )}
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
                <option value="favorite_recent">收藏優先 + 最近新增</option>
                <option value="company">公司名稱</option>
                <option value="tag_count">標籤數量</option>
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

              {/* 名片類型過濾 */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">名片類型：</span>
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    typeFilter === 'all' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                <button
                  onClick={() => setTypeFilter('scanned')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    typeFilter === 'scanned' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  掃描
                </button>
                <button
                  onClick={() => setTypeFilter('regular')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    typeFilter === 'regular' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  一般
                </button>
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
                {/* 掃描名片縮圖 */}
                {(() => {
                  const rawUrl = card?.scanned_data?.image_url || card?.image_url;
                  const imgUrl = normalizeImageUrl(rawUrl);
                  if (!imgUrl) return null;
                  return (
                    <div
                      className="relative w-full h-40 bg-gray-100 cursor-zoom-in"
                      onClick={() => { setPreviewImageUrl(imgUrl); setImagePreviewOpen(true); }}
                      title="點擊放大預覽"
                    >
                      <img
                        src={imgUrl}
                        alt="掃描名片"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 圖片載入失敗時顯示降級 UI
                          const container = e.currentTarget.parentElement;
                          if (!container) return;
                          e.currentTarget.style.display = 'none';
                          const fallback = container.querySelector('.img-fallback');
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="img-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                        <ExclamationTriangleIcon className="h-8 w-8 mb-2" />
                        <div className="text-sm mb-2">圖片已失效</div>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); downloadImage(imgUrl, card.card_title); }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> 重新下載
                        </button>
                      </div>
                      <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">掃描名片</span>
                      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">點擊放大</span>
                    </div>
                  );
                })()}
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
                        <a href={`tel:${(card.contact_info.phone || '').replace(/[^\d+]/g,'')}`} className="text-blue-600 hover:underline">
                          {card.contact_info.phone}
                        </a>
                      </div>
                    )}
                    {card.contact_info?.email && (
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        <a href={`mailto:${card.contact_info.email}`} className="text-blue-600 hover:underline">
                          {card.contact_info.email}
                        </a>
                      </div>
                    )}
                    {card.contact_info?.company && (
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                        <span>{card.contact_info.company}</span>
                      </div>
                    )}
                    {(() => {
                      const website = card.website || card.scanned_data?.website;
                      if (!website) return null;
                      return (
                        <div className="flex items-center">
                          <GlobeAltIcon className="h-4 w-4 mr-2" />
                          <a href={ensureProtocol(website)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {website}
                          </a>
                        </div>
                      );
                    })()}
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
                          <div className="text-sm text-gray-600 italic">
                            {linkifyText(card.personal_note)}
                          </div>
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
                      href={`/member/${getMemberIdForCard(card)}`}
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
                        onClick={() => openAISuggestion(card)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="AI 跟進建議"
                      >
                        <SparklesIcon className="h-4 w-4" />
                      </button>
                      
                      {/* 預覽掃描圖（若有） */}
                      {(() => { const raw = card?.scanned_data?.image_url || card?.image_url; const imgUrl = normalizeImageUrl(raw); return imgUrl ? (
                        <button
                          onClick={() => { setPreviewImageUrl(imgUrl); setImagePreviewOpen(true); }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="預覽掃描圖"
                        >
                          <MagnifyingGlassIcon className="h-4 w-4" />
                        </button>
                      ) : null; })()}
                      
                      {/* 下載掃描原圖（若有） */}
                      {(() => { const raw = card?.scanned_data?.image_url || card?.image_url; const imgUrl = normalizeImageUrl(raw); return imgUrl ? (
                        <button
                          onClick={() => downloadImage(imgUrl, card.card_title)}
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="下載掃描原圖"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      ) : null; })()}
                      
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
      
      {/* 雲端同步狀態區塊已移除（新增後自動同步） */}
      
      {/* 名片掃描器 */}
      {showScanner && (
        <BusinessCardScanner
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* 圖片放大預覽 Modal */}
      {imagePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-60" onClick={() => setImagePreviewOpen(false)}></div>
          <div className="relative max-w-5xl w-[92vw] max-h-[92vh] p-2">
            <img src={previewImageUrl} alt="掃描名片預覽" className="w-full h-full object-contain rounded shadow-xl" />
            <button
              onClick={() => setImagePreviewOpen(false)}
              className="absolute top-3 right-3 bg-black/60 text-white rounded-full px-3 py-1 text-sm hover:bg-black/70"
              aria-label="關閉預覽"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* AI 跟進建議 Modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={closeAISuggestion}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">AI 跟進建議</h3>
              <button onClick={closeAISuggestion} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            {aiLoading && (
              <div className="text-gray-600">正在生成建議，請稍候...</div>
            )}

            {!aiLoading && aiError && (
              <div className="text-red-600 text-sm">{aiError}</div>
            )}

            {!aiLoading && aiData && (
              <div className="space-y-4">
                {Array.isArray(aiData.suggestions) && aiData.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">建議：</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {aiData.suggestions.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiData.draft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">建議管道：{aiData.draft.channel || 'message'}</div>
                      <div className="space-x-2">
                        {aiData.draft.subject ? (
                          <>
                            <button onClick={() => copyText(aiData.draft.subject)} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">複製主旨</button>
                            <button onClick={() => copyText(`${aiData.draft.subject}\n\n${aiData.draft.message || ''}`)} className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">複製主旨+內容</button>
                          </>
                        ) : null}
                        <button onClick={() => copyText(aiData.draft.message || '')} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200">一鍵複製</button>
                      </div>
                    </div>
                    {aiData.draft.subject ? (
                      <input value={aiData.draft.subject} readOnly className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    ) : null}
                    <textarea value={aiData.draft.message || ''} readOnly rows={8} className="w-full px-3 py-2 border border-gray-300 rounded text-sm"></textarea>
                  </div>
                )}

                {Array.isArray(aiData.next_steps) && aiData.next_steps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">下一步：</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {aiData.next_steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiData.followup_timeline && (
                  <div className="text-xs text-gray-600">建議節奏：{aiData.followup_timeline}</div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={closeAISuggestion} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalWallet;