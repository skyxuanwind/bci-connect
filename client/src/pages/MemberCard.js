import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  PhotoIcon
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
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isInWallet, setIsInWallet] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [downloadingVCard, setDownloadingVCard] = useState(false);
  const [currentToken, setCurrentToken] = useState(Cookies.get('token'));
  const navigate = useNavigate();

  // 輔助：是否為掃描名片 ID
  const isScannedId = (id) => String(id || '').split(':')[0].startsWith('scanned_');
  const baseId = String(memberId || '').split(':')[0];

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
            url: row.url || row.content_data?.url || ''
          };
          break;
        case 'image':
          data = {
            url: row.image_url || row.url || row.content_data?.url || '',
            alt: row.title || row.content_data?.alt || '',
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

      // 掃描名片：改為本地生成 vCard
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

      // 一般名片：沿用後端下載
      const response = await axios.get(`/api/nfc-cards/vcard/${memberId}`, {
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
              {block.content_data.type === 'youtube' && block.content_data.url ? (
                <iframe
                  src={getYouTubeEmbedUrl(block.content_data.url)}
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
                  className="rounded-lg w-full object-cover"
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
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
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
              <a key={index} href={item.href} className="block">
                {content}
              </a>
            ) : (
              <div key={index}>
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
        </div>

        {/* 聯絡資訊 */}
        {renderContactInfo()}

        {/* 動態內容區塊 */}
        {cardData.content_blocks && cardData.content_blocks
          .sort((a, b) => a.display_order - b.display_order)
          .map(block => renderContentBlock(block))
        }
      </div>

      {/* 固定按鈕 */}
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
  );
};

export default MemberCard;