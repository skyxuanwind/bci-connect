import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios';
import Cookies from 'js-cookie';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/templates.css';
import {
  HeartIcon,
  ArrowDownTrayIcon,
  SunIcon,
  MoonIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  UserIcon,
  PlayIcon,
  LinkIcon,
  PhotoIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import {
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaTiktok
} from 'react-icons/fa';

const MemberCard = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isInWallet, setIsInWallet] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [downloadingVCard, setDownloadingVCard] = useState(false);
  const [currentToken, setCurrentToken] = useState(Cookies.get('token'));

  // AI modal states
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiError, setAiError] = useState('');
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  // 商媒體：顯示該講者的精選內容
  const [businessMediaItems, setBusinessMediaItems] = useState([]);
  const [bmLoading, setBmLoading] = useState(false);
  const [bmError, setBmError] = useState('');
  const [bmExpandedId, setBmExpandedId] = useState(null);
  // 輔助：是否為掃描名片 ID
  const isScannedId = (id) => String(id).split(':')[0].startsWith('scanned_');
  const baseId = String(memberId || '').split(':')[0];

  // 分析追蹤
  const trackAnalytics = async (eventType, extra = {}) => {
    try {
      const rawId = cardData?.id || baseId;
      if (!rawId) return;
      const idStr = String(rawId);

      // 僅追蹤數字型卡片ID，跳過測試/掃描等非正式ID以避免後端寫入錯誤
      if (!/^[0-9]+$/.test(idStr)) {
        return;
      }

      const payload = {
        cardId: Number(idStr),
        eventType,
        referrer: document.referrer || '',
        userAgent: navigator.userAgent,
        source:
          (location && location.state && location.state.source) ||
          new URLSearchParams(window.location.search).get('src') ||
          ''
      };

      // 後端期望 contentType/contentId，這裡自動兼容舊鍵名 content_type/content_id
      const contentType = extra.contentType ?? extra.content_type;
      const contentId = extra.contentId ?? extra.content_id;
      if (contentType != null) payload.contentType = contentType;
      if (contentId != null) payload.contentId = contentId;

      await axios.post('/api/nfc-analytics/track', payload).catch(() => {});
    } catch (e) {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchCardData();
    checkIfInWallet();
    // 檢查用戶的深色模式偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, [memberId]);

  // 監聽 token 變化，當用戶切換帳戶時重新檢查收藏狀態
  useEffect(() => {
    const token = Cookies.get('token');
    if (token !== currentToken) {
      setCurrentToken(token);
      checkIfInWallet();
    }
  }, [currentToken]);

  // 定期檢查 token 變化
  useEffect(() => {
    const interval = setInterval(() => {
      const token = Cookies.get('token');
      if (token !== currentToken) {
        setCurrentToken(token);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentToken]);

  // 取得商媒體精選內容
  useEffect(() => {
    let cancelled = false;
    async function fetchBM() {
      if (!memberId || isScannedId(memberId) || memberId === 'test') return;
      try {
        setBmLoading(true);
        setBmError('');
        const resp = await axios.get('/api/business-media', {
          params: { speakerId: memberId, limit: 5, status: 'published' }
        });
        if (!cancelled) setBusinessMediaItems(resp?.data?.items || []);
      } catch (e) {
        if (!cancelled) setBmError('');
      } finally {
        if (!cancelled) setBmLoading(false);
      }
    }
    fetchBM();
    return () => { cancelled = true };
  }, [memberId]);

  // 從資料列轉換為前端需要的內容區塊格式
  const mapRowToBlock = (row) => {
    const type = row.content_type || row.block_type;
    let data = {};
    try {
      switch (type) {
        case 'text':
          data = {
            title: row.title || row.content_data?.title || '',
            content: row.content || row.content_data?.content || ''
          };
          break;
        case 'link':
          data = {
            title: row.title || row.content_data?.title || '',
            url: row.url || row.content_data?.url || ''
          };
          break;
        case 'video':
          data = {
            title: row.title || row.content_data?.title || '',
            type: row.video_type || row.content_data?.type || (row.url ? 'youtube' : (row.file_url || row.file || row.content_data?.file ? 'file' : '')),
            url: row.url || row.content_data?.url || '',
            videoId: row.video_id || row.content_data?.videoId || '',
            file: row.file_url || row.file || row.content_data?.file || ''
          };
          break;
        case 'image':
          data = {
            title: row.title || row.content_data?.title || '',
            url: row.image_url || row.url || row.content_data?.url || '',
            alt: row.content_data?.alt || row.title || '',
            caption: row.content_data?.caption || ''
          };
          break;
        case 'social': {
          const parsed = typeof row.content === 'string' ? (() => { try { return JSON.parse(row.content); } catch { return {}; } })() : (row.content || row.content_data || {});
          data = parsed || {};
          break;
        }
        case 'map':
          data = {
            title: row.title || row.content_data?.title || '',
            address: row.map_address || row.content_data?.address || '',
            map_url: row.url || row.content_data?.map_url || '',
            coordinates: row.map_coordinates || row.content_data?.coordinates || null
          };
          break;
        default:
          data = row.content_data || {};
      }
    } catch (e) {
      data = row.content_data || {};
    }

    return {
      id: row.id,
      content_type: type,
      content_data: data,
      display_order: row.display_order ?? 0,
      is_visible: row.is_visible ?? true,
      custom_styles: row.custom_styles || {}
    };
  };

  const fetchScannedCardData = async () => {
    try {
      setLoading(true);

      // 1) 先找本地錢包
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      const localCards = saved ? JSON.parse(saved) : [];
      let found = localCards.find(c => String(c.id) === baseId);

      // 2) 本地沒有 -> 若登入，嘗試雲端錢包列表
      if (!found) {
        const token = Cookies.get('token');
        if (token) {
          try {
            const resp = await axios.get('/api/digital-wallet/cards', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const cloudCards = resp?.data?.cards || [];
            found = cloudCards.find(c => String(c.id) === baseId);
          } catch (e) {
            console.warn('讀取雲端錢包失敗:', e);
          }
        }
      }

      if (!found) {
        throw new Error('此掃描名片不存在於本機或雲端錢包');
      }

      const scanned = found.scanned_data || {};

      const transformed = {
        id: String(found.id),
        card_title: found.card_title || scanned.name || '掃描名片',
        card_subtitle: found.card_subtitle || scanned.title || '',
        template_name: found.template_name || '簡約質感版',
        contact_info: {
          phone: found.contact_info?.phone || scanned.phone || scanned.mobile || '',
          email: found.contact_info?.email || scanned.email || '',
          website: found.contact_info?.website || scanned.website || '',
          company: found.contact_info?.company || scanned.company || '',
          address: found.contact_info?.address || scanned.address || '',
          line_id: found.contact_info?.line_id || scanned.line_id || ''
        },
        scanned_image_url: scanned.image_url || found.image_url || '',
        content_blocks: []
      };

      // 如果掃描結果包含社群連結，加入社群內容區塊
      const hasSocial = scanned.social && Object.values(scanned.social).some(v => !!v);
      if (hasSocial) {
        transformed.content_blocks.push({
          id: 'social_scanned',
          content_type: 'social',
          content_data: scanned.social,
          display_order: 999,
          is_visible: true,
          custom_styles: {}
        });
      }

      setCardData(transformed);
      updateLastViewed();
    } catch (error) {
      console.error('讀取掃描名片失敗:', error);
      setError('載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchCardData = async () => {
    if (isScannedId(memberId)) {
      return fetchScannedCardData();
    }

    try {
      setLoading(true);

      // 開發/預覽用：支援 /member/test 顯示公開測試名片
      if (memberId === 'test') {
        const response = await axios.get('/api/nfc-cards/public/test-card');
        const data = response.data || {};
        const member = data.member;
        const card = data.cardConfig;

        if (!card) {
          throw new Error('名片不存在');
        }

        const contentRows = Array.isArray(card.content_blocks) ? card.content_blocks : [];
        const transformed = {
          id: card.id,
          card_title: card.card_title || member?.name || '測試名片',
          card_subtitle: card.card_subtitle || '',
          template_name: card.template_name,
          contact_info: {
            phone: member?.contact_number || '',
            email: member?.email || '',
            website: member?.website || '',
            company: member?.company || '',
            address: member?.address || ''
          },
          content_blocks: contentRows.map(mapRowToBlock)
        };

        setCardData(transformed);
        updateLastViewed();
        trackAnalytics('view');
        return;
      }

      const response = await axios.get(`/api/nfc-cards/member/${memberId}`);
      const data = response.data || {};

      const member = data.member;
      const card = data.cardConfig;

      if (!card) {
        throw new Error('名片不存在');
      }

      // 從服務端資料轉換為前端需要的格式
      const contentRows = Array.isArray(card.content_blocks) ? card.content_blocks : [];
      const transformed = {
        id: card.id,
        card_title: card.card_title,
        card_subtitle: card.card_subtitle,
        template_name: card.template_name,
        contact_info: {
          phone: member?.contact_number || card.user_phone || '',
          email: member?.email || card.user_email || '',
          website: member?.website || card.user_website || '',
          company: member?.company || card.user_company || '',
          address: member?.address || card.user_address || ''
        },
        content_blocks: contentRows.map(mapRowToBlock)
      };

      setCardData(transformed);
      // 更新最後查看時間（如果已在名片夾中）
      updateLastViewed();
      // 記錄瀏覽
      trackAnalytics('view');
    } catch (error) {
      console.error('獲取名片數據失敗:', error);
      setError(error.response?.status === 404 ? '名片不存在' : '載入失敗');
    } finally {
      setLoading(false);
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
        return `digitalWallet_${userId}`;
      } catch (error) {
        console.warn('無法解析 token，使用預設 key:', error);
      }
    }
    return 'digitalWallet'; // 未登入時使用預設 key
  };

  const checkIfInWallet = () => {
    try {
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const cards = JSON.parse(saved);
        const exists = cards.some(card => String(card.id) === baseId);
        setIsInWallet(exists);
      }
    } catch (error) {
      console.error('檢查名片夾狀態失敗:', error);
    }
  };

  const updateLastViewed = () => {
    try {
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const cards = JSON.parse(saved);
        const updatedCards = cards.map(card => 
          String(card.id) === baseId
            ? { ...card, last_viewed: new Date().toISOString() }
            : card
        );
        localStorage.setItem(key, JSON.stringify(updatedCards));
      }
    } catch (error) {
      console.error('更新查看時間失敗:', error);
    }
  };

  const addToWallet = async () => {
    try {
      const cardToSave = {
        id: cardData.id,
        card_title: cardData.card_title,
        card_subtitle: cardData.card_subtitle,
        contact_info: cardData.contact_info,
        date_added: new Date().toISOString(),
        last_viewed: new Date().toISOString(),
        personal_note: '',
        tags: []
      };

      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      const existingCards = saved ? JSON.parse(saved) : [];
      
      // 檢查是否已存在
      if (existingCards.some(card => String(card.id) === String(cardData.id))) {
        showSuccess('名片已在數位名片夾中！');
        return;
      }

      // 嘗試添加到雲端
      const token = Cookies.get('token');
      if (token) {
        try {
          const response = await axios.post('/api/digital-wallet/cards', {
            card_id: cardData.id,
            notes: '',
            tags: [],
            folder_name: null
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            // 添加 collection_id 到本地數據
            cardToSave.collection_id = response.data.collection_id;
            showSuccess('已加入數位名片夾！');
          }
        } catch (error) {
          console.warn('添加到雲端失敗，僅保存到本地:', error);
        }
      }
      
      // 添加到本地存儲
      const updatedCards = [...existingCards, cardToSave];
      localStorage.setItem(key, JSON.stringify(updatedCards));
      setIsInWallet(true);
      
      if (!token) {
        showSuccess('已加入數位名片夾！');
      }
    } catch (error) {
      console.error('加入名片夾失敗:', error);
      alert('加入名片夾失敗，請稍後再試');
    }
  };

  const removeFromWallet = () => {
    try {
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const cards = JSON.parse(saved);
        const updatedCards = cards.filter(card => String(card.id) !== String(cardData.id));
        localStorage.setItem(key, JSON.stringify(updatedCards));
        setIsInWallet(false);
        showSuccess('已從數位名片夾移除');
      }
    } catch (error) {
      console.error('移除名片失敗:', error);
      alert('移除失敗，請稍後再試');
    }
  };

  const downloadVCard = async () => {
    try {
      setDownloadingVCard(true);

      // 掃描名片：本地生成 vCard
      if (isScannedId(memberId)) {
        const saved = localStorage.getItem(getLocalStorageKey());
        const cards = saved ? JSON.parse(saved) : [];
        const local = cards.find(c => String(c.id) === baseId);
        const scanned = local?.scanned_data || {};
        const info = cardData?.contact_info || {};

        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${scanned.name || cardData.card_title || ''}`,
          `ORG:${info.company || ''}`,
          `TITLE:${scanned.title || cardData.card_subtitle || ''}`,
          `EMAIL:${info.email || ''}`,
          info.phone ? `TEL;TYPE=CELL:${info.phone}` : '',
          scanned.mobile && scanned.mobile !== info.phone ? `TEL;TYPE=CELL:${scanned.mobile}` : '',
          `URL:${info.website || ''}`,
          info.address ? `ADR;TYPE=WORK:;;${info.address};;;;` : '',
          'END:VCARD'
        ].filter(Boolean);

        const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cardData.card_title || 'contact'}.vcf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('聯絡人已下載！');
        return;
      }

      // 測試名片：本地生成 vCard
      if (memberId === 'test') {
        const info = cardData?.contact_info || {};
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${cardData?.card_title || ''}`,
          `ORG:${info.company || ''}`,
          `TITLE:${cardData?.card_subtitle || ''}`,
          `EMAIL:${info.email || ''}`,
          info.phone ? `TEL;TYPE=CELL:${info.phone}` : '',
          `URL:${info.website || ''}`,
          info.address ? `ADR;TYPE=WORK:;;${info.address};;;;` : '',
          'END:VCARD'
        ].filter(Boolean);

        const blob = new Blob([lines.join('\r\n')], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cardData?.card_title || 'contact'}.vcf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('聯絡人已下載！');
        trackAnalytics('vcard_download');
        return;
      }

      // 一般名片：沿用後端下載（修正端點）
      const response = await axios.get(`/api/nfc-cards/member/${memberId}/vcard`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cardData.card_title || 'contact'}.vcf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showSuccess('聯絡人已下載！');
      // 記錄下載
      trackAnalytics('vcard_download');
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      alert('下載失敗，請稍後再試');
    } finally {
      setDownloadingVCard(false);
    }
  };

  const showSuccess = (message) => {
    setShowSuccessMessage(message);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // AI 跟進建議
  const openAISuggestion = async () => {
    try {
      setAiModalOpen(true);
      setAiLoading(true);
      setAiError('');
      setAiData(null);

      const payload = {
        name: cardData?.card_title || '',
        company: cardData?.contact_info?.company || '',
        title: cardData?.card_subtitle || '',
        email: cardData?.contact_info?.email || '',
        phone: cardData?.contact_info?.phone || '',
        tags: [],
        notes: '',
        last_interaction: '',
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
  };

  const copyText = async (text) => {
    try { 
      await navigator.clipboard.writeText(text || ''); 
      alert('已複製到剪貼簿'); 
    } catch {}
  };

  // 下載圖片小工具
  const getFileExtFromUrl = (url) => {
    try {
      const pathname = new URL(url, window.location.origin).pathname;
      const idx = pathname.lastIndexOf('.');
      const ext = idx >= 0 ? pathname.substring(idx) : '';
      if (ext && ext.length <= 6) return ext;
      return '.jpg';
    } catch {
      return '.jpg';
    }
  };
  const downloadImage = (url, filenameBase = 'scanned-card') => {
    if (!url) return;
    try {
      const a = document.createElement('a');
      a.href = url;
      const safeBase = String(filenameBase || 'scanned-card').replace(/\s+/g, '_');
      a.download = `${safeBase}${getFileExtFromUrl(url)}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('下載圖片失敗', e);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getTemplateClass = () => {
    if (!cardData?.template_name) return 'template-minimal';
    
    switch (cardData.template_name) {
      case '科技專業版':
        return `template-tech ${darkMode ? 'dark-mode' : ''}`;
      case '活力創意版':
        return 'template-creative';
      case '簡約質感版':
        return 'template-minimal';
      case '商務專業版':
        return 'template-business';
      case '現代簡約版':
        return 'template-modern';
      case '環保綠意版':
        return 'template-eco';
      default:
        return 'template-minimal';
    }
  };

  const renderContentBlock = (block) => {
    if (!block.is_visible) return null;

    switch (block.content_type) {
      case 'text':
        return (
          <div key={block.id} className="content-block">
            <h3 className="block-title">{block.content_data.title}</h3>
            <div className="text-content">
              <p>{block.content_data.content}</p>
            </div>
          </div>
        );

      case 'link':
        return (
          <div key={block.id} className="content-block">
            <h3 className="block-title">連結</h3>
            <a 
              href={block.content_data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-item"
              onClick={() => trackAnalytics('content_click', { content_type: 'link', content_id: block.id, url: block.content_data.url || '', title: block.content_data.title || '' })}
            >
              <div className="flex items-center">
                <LinkIcon className="h-5 w-5 mr-3" />
                <span>{block.content_data.title}</span>
              </div>
            </a>
          </div>
        );

      case 'video':
        return (
          <div key={block.id} className="content-block">
            <h3 className="block-title">{block.content_data.title}</h3>
            <div className="video-container">
              {block.content_data.type === 'youtube' && (block.content_data.url || block.content_data.videoId) ? (
                <iframe
                  src={block.content_data.videoId ? `https://www.youtube.com/embed/${block.content_data.videoId}` : getYouTubeEmbedUrl(block.content_data.url)}
                  title={block.content_data.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : block.content_data.file ? (
                <video controls className="w-full rounded-lg">
                  <source src={block.content_data.file} type="video/mp4" />
                  您的瀏覽器不支援影片播放。
                </video>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">尚未設定影片內容</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className="content-block">
            {block.content_data.title && (
              <h3 className="block-title">{block.content_data.title}</h3>
            )}
            <div className="image-container">
              {block.content_data.url ? (
                <img 
                  src={block.content_data.url} 
                  alt={block.content_data.alt || '圖片'}
                  className="rounded-lg w-full object-contain bg-gray-50"
                  style={{ maxHeight: '400px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">尚未上傳圖片</p>
                </div>
              )}
              {block.content_data.alt && (
                <p className="mt-2 text-sm text-gray-600 italic text-center">
                  {block.content_data.alt}
                </p>
              )}
            </div>
          </div>
        );

      case 'social':
        const socialPlatforms = [
          { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: 'bg-blue-600 hover:bg-blue-700' },
          { key: 'facebook', name: 'Facebook', icon: <FaFacebook />, color: 'bg-blue-500 hover:bg-blue-600' },
          { key: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: 'bg-pink-500 hover:bg-pink-600' },
          { key: 'twitter', name: 'Twitter', icon: <FaTwitter />, color: 'bg-blue-400 hover:bg-blue-500' },
          { key: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: 'bg-red-500 hover:bg-red-600' },
          { key: 'tiktok', name: 'TikTok', icon: <FaTiktok />, color: 'bg-black hover:bg-gray-800' }
        ];
        
        const activePlatforms = socialPlatforms.filter(platform => block.content_data[platform.key]);
        
        if (activePlatforms.length === 0) return null;
        
        return (
          <div key={block.id} className="content-block">
            <h3 className="block-title">社群媒體</h3>
            <div className="grid grid-cols-2 gap-3">
              {activePlatforms.map(platform => (
                <a 
                  key={platform.key}
                  href={block.content_data[platform.key]} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg text-white font-medium transition-colors ${platform.color}`}
                >
                  <span className="text-lg">{platform.icon}</span>
                  <span>{platform.name}</span>
                </a>
              ))}
            </div>
          </div>
        );

      case 'map':
        return (
          <div key={block.id} className="content-block">
            <h3 className="block-title">{block.content_data.title || '地圖位置'}</h3>
            <div className="map-container">
              {block.content_data.address ? (
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-TK7VFC&q=${encodeURIComponent(block.content_data.address)}`}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={block.content_data.title || '地圖位置'}
                  className="rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">尚未設定地址</p>
                </div>
              )}
              {block.content_data.address && (
                <p className="mt-2 text-sm text-gray-600 text-center">
                  📍 {block.content_data.address}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    // 支援多種常見格式：
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    // 以及可能附帶的參數
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#\/]+)/,
      /youtube\.com\/embed\/([^&\n?#\/]+)/,
      /youtube\.com\/shorts\/([^&\n?#\/]+)/
    ];
    let videoId = null;
    for (const p of patterns) {
      const m = url.match(p);
      if (m && m[1]) { videoId = m[1]; break; }
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  };

  // 解析商媒體的可內嵌播放 URL（支援 YouTube / Vimeo / TikTok / Instagram）
  const getBusinessMediaEmbedUrl = (item) => {
    if (!item?.external_url) return null;
    const url = item.external_url;
    const lower = url.toLowerCase();
    // YouTube
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      try {
        const vParam = new URL(url).searchParams.get('v');
        let videoId = vParam;
        if (!videoId && lower.includes('youtu.be/')) {
          const m = lower.match(/youtu\.be\/([a-z0-9_-]{6,})/i);
          videoId = m ? m[1] : null;
        }
        if (!videoId && lower.includes('/shorts/')) {
          const m = lower.match(/\/shorts\/([a-z0-9_-]{6,})/i);
          videoId = m ? m[1] : null;
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      } catch {
        return null;
      }
    }
    // Vimeo
    if (lower.includes('vimeo.com')) {
      const m = lower.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    }
    // TikTok
    if (lower.includes('tiktok.com')) {
      let id = null;
      const m1 = lower.match(/\/video\/(\d+)/);
      const m2 = lower.match(/\/embed\/v\d+\/(\d+)/);
      const m3 = lower.match(/\/player\/v1\/(\d+)/);
      if (m1 && m1[1]) id = m1[1];
      else if (m2 && m2[1]) id = m2[1];
      else if (m3 && m3[1]) id = m3[1];
      return id ? `https://www.tiktok.com/player/v1/${id}` : null;
    }
    // Instagram (posts/reels/tv)
    if (lower.includes('instagram.com')) {
      const m = lower.match(/instagram\.com\/(reel|p|tv)\/([a-z0-9_-]+)/i);
      if (m && m[1] && m[2]) {
        return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
      }
      return null;
    }
    return null;
  };

  const renderContactInfo = () => {
    if (!cardData?.contact_info) return null;

    const { contact_info } = cardData;
    const contactItems = [];

    if (contact_info.phone) {
      contactItems.push({
        icon: PhoneIcon,
        label: '電話',
        value: contact_info.phone,
        href: `tel:${contact_info.phone}`
      });
    }

    if (contact_info.email) {
      contactItems.push({
        icon: EnvelopeIcon,
        label: '電子郵件',
        value: contact_info.email,
        href: `mailto:${contact_info.email}`
      });
    }

    if (contact_info.website) {
      contactItems.push({
        icon: GlobeAltIcon,
        label: '網站',
        value: contact_info.website,
        href: contact_info.website
      });
    }

    if (contact_info.line_id) {
      contactItems.push({
        icon: UserIcon,
        label: 'LINE ID',
        value: contact_info.line_id
      });
    }

    if (contact_info.company) {
      contactItems.push({
        icon: BuildingOfficeIcon,
        label: '公司',
        value: contact_info.company
      });
    }

    if (contact_info.address) {
      contactItems.push({
        icon: MapPinIcon,
        label: '地址',
        value: contact_info.address
      });
    }

    if (contactItems.length === 0) return null;

    return (
      <div className="content-block">
        <h3 className="block-title">聯絡資訊</h3>
        <div className="contact-info">
          {contactItems.map((item, index) => {
            const IconComponent = item.icon;
            const key = `${item.label}-${item.value || index}`;
            const content = (
              <div className="contact-item">
                <IconComponent className="contact-icon" />
                <div>
                  <div className="text-sm text-gray-600">{item.label}</div>
                  <div className="font-medium">{item.value}</div>
                </div>
              </div>
            );

            return item.href ? (
              <a key={key} href={item.href} className="block">
                {content}
              </a>
            ) : (
              <div key={key}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">找不到名片</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`nfc-card-container ${getTemplateClass()}`}>
      {/* 成功提示 */}
      {showSuccessMessage && (
        <div className="success-message">
          {showSuccessMessage}
        </div>
      )}

      {/* 深色模式切換按鈕（僅科技專業版顯示） */}
      {cardData?.template_name === '科技專業版' && (
        <button 
          onClick={toggleDarkMode}
          className="dark-mode-toggle"
          title={darkMode ? '切換到淺色模式' : '切換到深色模式'}
        >
          {darkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
        </button>
      )}

      {/* 主要內容 */}
      <div className="card-content">
        {/* 名片標題 */}
        <div className="card-header">
          <h1 className="card-title">{cardData.card_title}</h1>
          {cardData.card_subtitle && (
            <p className="card-subtitle">{cardData.card_subtitle}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <button 
              onClick={openAISuggestion}
              className="inline-flex items-center px-3 py-1 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-sm"
              title="AI 跟進建議"
            >
              <SparklesIcon className="h-4 w-4 mr-1" />
              AI 跟進
            </button>
          </div>
        </div>

        {/* 掃描圖片預覽 */}
        {isScannedId(memberId) && cardData?.scanned_image_url && (
          <div className="content-block">
            <h3 className="block-title">掃描名片</h3>
            <div className="relative">
              <img
                src={cardData.scanned_image_url}
                alt="掃描名片"
                className="rounded-lg w-full object-contain cursor-zoom-in bg-gray-50"
                style={{ maxHeight: '480px' }}
                onClick={() => { setPreviewImageUrl(cardData.scanned_image_url); setImagePreviewOpen(true); }}
              />
              <button
                onClick={() => downloadImage(cardData.scanned_image_url, cardData.card_title)}
                className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-white/90 text-gray-700 rounded shadow hover:bg-white"
                title="下載掃描原圖"
              >
                下載原圖
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">點擊圖片可放大預覽</p>
          </div>
        )}

        {/* 聯絡資訊 */}
        {renderContactInfo()}

        {/* 動態內容區塊 */}
        {cardData.content_blocks && cardData.content_blocks
          .sort((a, b) => a.display_order - b.display_order)
          .map((block, idx) => {
            const key = block?.id ?? `${block?.content_type || 'block'}-${block?.display_order ?? idx}-${idx}`;
            return (
              <React.Fragment key={key}>
                {renderContentBlock(block)}
              </React.Fragment>
            );
          })
        }

        {/* 商媒體精選內容 */}
        {businessMediaItems.length > 0 && (
          <div className="content-block">
            <h3 className="block-title">我的商媒體</h3>
            <div className="space-y-3">
              {businessMediaItems.map((it) => (
                (() => {
                  const embedUrl = getBusinessMediaEmbedUrl(it);
                  const canEmbed = !!embedUrl && (it.content_type === 'video_long' || it.content_type === 'video_short');
                  const lowerUrl = (it.external_url || '').toLowerCase();
                  const isInstagram = lowerUrl.includes('instagram.com') || it.platform === 'instagram';
                  const isExpanded = bmExpandedId === it.id;

                  return (
                    <div key={it.id} className="p-3 border border-gray-200 rounded-lg bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{it.title}</div>
                          <div className="mt-1 text-xs text-gray-500 space-x-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{it.content_type}</span>
                            {it.platform && <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">{it.platform}</span>}
                          </div>
                        </div>
                      </div>

                      {(isInstagram && canEmbed) ? (
                        <div className="mt-2 video-container">
                          <iframe
                            title={it.title || 'Instagram Embed'}
                            src={embedUrl}
                            allow="clipboard-write; encrypted-media; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            style={{ width: '100%', height: '600px', border: 0, overflow: 'hidden' }}
                            scrolling="no"
                          />
                        </div>
                      ) : (
                        isExpanded && canEmbed ? (
                          <div className="mt-2 video-container">
                            <iframe
                              title={it.title}
                              src={embedUrl}
                              width="100%"
                              height="315"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                              allowFullScreen
                            />
                          </div>
                        ) : null
                      )}

                      {it.summary && (
                        <p className="mt-2 text-xs text-gray-600 line-clamp-3">{it.summary}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {!isInstagram && (
                          <button
                            onClick={async () => {
                              if (!canEmbed) {
                                try {
                                  await axios.post(`/api/business-media/${it.id}/track/cta`, {
                                    ctaLabel: 'open_external',
                                    ctaUrl: it.external_url || '',
                                    targetMemberId: null,
                                  }).catch(() => {});
                                } catch {}
                                if (it.external_url) window.open(it.external_url, '_blank', 'noopener,noreferrer');
                                return;
                              }
                              const next = isExpanded ? null : it.id;
                              setBmExpandedId(next);
                              if (next) {
                                try {
                                  await axios.post(`/api/business-media/${it.id}/track/view`, {}).catch(() => {});
                                } catch {}
                              }
                            }}
                            className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            {isExpanded ? '收起影片' : (canEmbed ? '在本站播放' : '前往觀看')}
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            try {
                              await axios.post(`/api/business-media/${it.id}/track/cta`, {
                                ctaLabel: 'open_external',
                                ctaUrl: it.external_url || '',
                                targetMemberId: null,
                              }).catch(() => {});
                            } catch {}
                            if (it.external_url) window.open(it.external_url, '_blank', 'noopener,noreferrer');
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                        >
                          前往原平台
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await axios.post(`/api/business-media/${it.id}/track/card`, {
                                targetMemberId: Number(memberId),
                              }).catch(() => {});
                            } catch {}
                            navigate(`/member/${memberId}`);
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                        >
                          我的名片
                        </button>
                      </div>
                    </div>
                  );
                })()
              ))}
              {businessMediaItems.length >= 5 && (
                <button
                  onClick={() => navigate(`/business-media?speakerId=${memberId}`)}
                  className="px-3 py-1.5 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  查看更多
                </button>
              )}
            </div>
          </div>
        )}


      <button
        onClick={downloadVCard}
        disabled={downloadingVCard}
        className="save-contact-btn"
        title="下載聯絡人"
      >
        {downloadingVCard ? (
          <span className="flex items-center">
            <span className="loading-spinner mr-2"></span>
            下載中...
          </span>
        ) : (
          <span className="flex items-center">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            儲存聯絡人
          </span>
        )}
      </button>

      <button
        onClick={isInWallet ? removeFromWallet : addToWallet}
        className="add-to-wallet-btn"
        title={isInWallet ? '從名片夾移除' : '加入名片夾'}
      >
        {isInWallet ? (
          <HeartSolidIcon className="h-6 w-6" />
        ) : (
          <HeartIcon className="h-6 w-6" />
        )}
      </button>
    </div>

    {imagePreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setImagePreviewOpen(false)}></div>
          <div className="relative bg-transparent w-full max-w-5xl mx-4">
            <img
              src={previewImageUrl}
              alt="掃描名片大圖"
              className="w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => downloadImage(previewImageUrl, cardData?.card_title)}
                className="px-3 py-1 text-xs bg-white/90 text-gray-700 rounded shadow hover:bg-white"
              >
                下載原圖
              </button>
              <button
                onClick={() => setImagePreviewOpen(false)}
                className="px-3 py-1 text-xs bg-white/90 text-gray-700 rounded shadow hover:bg-white"
              >
                關閉
              </button>
            </div>
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
                        <li key={`${String(s).slice(0,30)}-${idx}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiData.draft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800">建議草稿</h4>
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
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-200">
{aiData.draft.message || ''}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberCard;
