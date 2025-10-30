import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import { dbGet } from '../services/firebaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import {
  ShareIcon,
  PhotoIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  LinkIcon,
  GlobeAltIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaLine
} from 'react-icons/fa';
import '../styles/templates.css';
import '../styles/premium-card.css';
import '../styles/premium-effects.css';
import { mapTemplateNameToClass } from '../utils/templateClass';
import { QRCodeSVG } from 'qrcode.react';

// 將十六進位色碼轉換為 RGB 字串
const hexToRgb = (hex) => {
  try {
    const clean = (hex || '').replace('#', '');
    if (!clean) return '11, 15, 20';
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  } catch {
    return '11, 15, 20';
  }
};

// 解析 YouTube 影片網址取得 videoId
const getYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return '';
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#\/]+)/,
    /youtube\.com\/embed\/([^&\n?#\/]+)/,
    /youtube\.com\/shorts\/([^&\n?#\/]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return m[1];
  }
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    if (v) return v;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
};

// LINE 深連結（支援一般 ID 與官方帳號）
const buildLineDeepLink = (raw) => {
  const id = String(raw || '').trim();
  if (!id) return '';
  const hasAt = id.startsWith('@') || id.includes('@');
  const clean = id.replace(/^@/, '');
  return hasAt
    ? `https://line.me/R/ti/p/@${clean}`
    : `https://line.me/R/ti/p/~${clean}`;
};

const MemberCard = () => {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cardData, setCardData] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  // 自定義板塊入口改為導向 Pro 編輯器
  const [customizedBlocks, setCustomizedBlocks] = useState([]);
  const [shareShortUrl, setShareShortUrl] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [businessMediaItems, setBusinessMediaItems] = useState([]);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [blockCarouselIndexMap, setBlockCarouselIndexMap] = useState({});
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (cardData?.content_blocks?.length) {
        setCurrentMediaIndex((currentMediaIndex + 1) % cardData.content_blocks.length);
      }
    },
    onSwipedRight: () => {
      if (cardData?.content_blocks?.length) {
        setCurrentMediaIndex((currentMediaIndex - 1 + cardData.content_blocks.length) % cardData.content_blocks.length);
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackTouch: true
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const viewTrackedRef = useRef(false);

  // 處理板塊自定義
  const handleBlocksChange = (updatedBlocks) => {
    setCustomizedBlocks(updatedBlocks);
    // 可以在這裡保存到本地存儲或發送到服務器
    localStorage.setItem(`customized_blocks_${memberId}`, JSON.stringify(updatedBlocks));
  };

  // 獲取要顯示的板塊（考慮自定義設置）
  const getDisplayBlocks = () => {
    const originalBlocks = cardData?.content_blocks || [];
    
    // 如果有自定義設置，使用自定義設置
    if (customizedBlocks.length > 0) {
      return customizedBlocks
        .filter(block => block.visible !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    
    return originalBlocks;
  };

  // 載入自定義設置
  useEffect(() => {
    if (memberId) {
      const saved = localStorage.getItem(`customized_blocks_${memberId}`);
      if (saved) {
        try {
          setCustomizedBlocks(JSON.parse(saved));
        } catch (error) {
          console.warn('載入自定義板塊設置失敗:', error);
        }
      }
    }
  }, [memberId]);

  // 當原始數據變化時，更新自定義設置
  useEffect(() => {
    if (cardData?.content_blocks && customizedBlocks.length === 0) {
      setCustomizedBlocks(cardData.content_blocks.map((block, index) => ({
        ...block,
        id: block.id || `block-${index}`,
        visible: true,
        order: index
      })));
    }
  }, [cardData?.content_blocks]);

  // 分析追蹤（保持輕量，錯誤忽略）
  const trackEvent = async (eventType, extra = {}) => {
    try {
      const payload = {
        eventType,
        cardId: Number(String(cardData?.id || memberId).replace(/\D/g, '')) || undefined,
        referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ...extra
      };
      await axios.post('/api/nfc-analytics/track', payload).catch(() => {});
    } catch {}
  };

  // 供 SSE 觸發的伺服器端刷新（簡化版，使用既有 API）
  const refreshFromServer = async () => {
    try {
      const vParam = (() => { try { return new URLSearchParams(window.location.search).get('v'); } catch { return null; } })();
      const resp = await axios.get(`/api/nfc-cards/member/${memberId}${vParam ? `?v=${vParam}` : ''}`);
      const data = resp.data || {};
      const member = data.member || {};
      const card = data.cardConfig || {};
      const rows = Array.isArray(card.content_blocks) ? card.content_blocks : [];
      const transformed = {
        id: card.id,
        user_name: member?.name || card.card_title || '',
        user_title: card.card_subtitle || '',
        user_company: member?.company || card.user_company || '',
        template_name: card.template_name,
        ui_show_name: true,
        ui_show_company: true,
        ui_show_avatar: !!card.avatar_url,
        avatar_style: 'circle',
        avatar_url: card.avatar_url || '',
        contact_info: {
          phone: member?.contact_number || card.user_phone || '',
          email: member?.email || card.user_email || '',
          website: member?.website || card.user_website || '',
          company: member?.company || card.user_company || '',
          address: member?.address || card.user_address || '',
          line_id: member?.line_id || card.line_id || ''
        },
        layout_type: card.layout_type || 'standard',
        ui_divider_style: card.ui_divider_style || 'solid-thin',
        ui_divider_opacity: typeof card.ui_divider_opacity === 'number' ? card.ui_divider_opacity : 0.6,
        content_blocks: rows.map(mapRowToBlock)
      };
      setCardData(transformed);
      setTemplate({ name: transformed.template_name });
    } catch (e) {
      console.warn('SSE 觸發刷新失敗:', e);
    }
  };

  // 從資料列轉換為內容區塊
  const mapRowToBlock = (row) => {
    const type = row.content_type || row.block_type;
    let data = {};
    try {
      switch (type) {
        case 'text':
          data = { title: row.title || row.content_data?.title || '', content: row.content || row.content_data?.content || '' };
          break;
        case 'link':
          data = { title: row.title || row.content_data?.title || '', url: row.url || row.content_data?.url || '' };
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
        case 'carousel': {
          const images = Array.isArray(row.content_data?.images) ? row.content_data.images : [];
          data = { title: row.title || row.content_data?.title || '', images };
          break;
        }
        default:
          data = row.content_data || {};
      }
    } catch {
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

  // 顯示成功提示
  const showSuccess = (message) => {
    try {
      setSuccessMessage(String(message || '操作成功'));
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    } catch {}
  };

  // 分享與 QR Code 操作
  const handleShare = async () => {
    try {
      setShowShareModal(true);
      const params = new URLSearchParams(window.location.search);
      const currentV = params.get('v') || `${Date.now()}`;
      const fullUrl = `${window.location.origin}/member-card/${memberId}?v=${currentV}`;
      if (!shareShortUrl) {
        const resp = await axios.post('/api/nfc-links/shorten', { url: fullUrl }).catch(() => null);
        const short = resp?.data?.shortUrl || resp?.data?.url || '';
        if (short) setShareShortUrl(short);
      }
      trackEvent('share_open', { source: 'action_btn' });
    } catch {}
  };

  const openQrModal = () => {
    try {
      setShowQrModal(true);
      trackEvent('qr_open', { source: 'action_btn' });
    } catch {}
  };

  // 載入名片資料（優先使用 CardStudioPro 編輯器資料；無則回退現有 API）
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const vParam = (() => { try { return new URLSearchParams(window.location.search).get('v'); } catch { return null; } })();

        // 1) 嘗試讀取編輯器保存的最新版本（Firebase）
        // 修正：統一使用相同的路徑格式，不再使用 /editor 子路徑
        const editorData = await dbGet(`cards/${memberId}`).catch(() => null);
        if (editorData && Array.isArray(editorData.blocks)) {
          const info = editorData.info || {};
          const blocks = Array.isArray(editorData.blocks) ? editorData.blocks : [];

          const normalizeBlocks = blocks.map(b => {
            const id = b.id || `${b.type || 'block'}-${Math.random().toString(36).slice(2,8)}`;
            switch (b.type) {
              case 'richtext':
                return { id, content_type: 'richtext', content_data: { title: b.title || '', html: b.html || '' } };
              case 'link':
                return { id, content_type: 'link', content_data: { title: b.title || '連結', url: b.url || '' } };
              case 'carousel':
                return {
                  id,
                  content_type: 'carousel',
                  content_data: {
                    title: b.title || '圖片輪播',
                    images: (Array.isArray(b.images) ? b.images : []).map(img => (
                      typeof img === 'string' ? { url: img } : (img?.url ? img : null)
                    )).filter(Boolean)
                  }
                };
              case 'video': {
                const url = b.url || '';
                let typ = 'file';
                try {
                  const u = new URL(url);
                  if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) typ = 'youtube';
                  else if (u.hostname.includes('vimeo')) typ = 'vimeo';
                } catch {}
                return { id, content_type: 'video', content_data: { title: b.title || '影片', url, type: typ } };
              }
              case 'contact':
                return { id, content_type: 'contact', content_data: { title: b.title || '聯絡方式' } };
              default:
                return { id, content_type: b.type || 'text', content_data: b };
            }
          });

          const transformed = {
            id: editorData.id || memberId,
            user_name: info.name || '',
            user_title: info.title || '',
            user_company: info.company || '',
            template_name: editorData.themeId || 'simple',
            ui_show_name: true,
            ui_show_company: true,
            ui_show_avatar: !!editorData.avatarUrl,
            avatar_style: 'circle',
            avatar_url: editorData.avatarUrl || '',
            ui_show_contacts: true,
            contact_info: {
              phone: info.phone || '',
              email: info.email || '',
              website: info.website || '',
              company: info.company || '',
              address: info.address || '',
              line_id: info.line || ''
            },
            layout_type: 'standard',
            ui_divider_style: 'solid-thin',
            ui_divider_opacity: 0.6,
            design: { buttonStyleId: editorData.design?.buttonStyleId || 'solid-blue', bgStyle: editorData.design?.bgStyle || '' },
            content_blocks: normalizeBlocks
          };

          if (!alive) return;
          setCardData(transformed);
          setTemplate({ name: transformed.template_name });
          setLoading(false);
          setError('');
          return; // 已使用最新編輯器資料
        }

        // 2) 回退：使用既有 API 取得舊版資料
        let transformed;
        if (memberId === 'test') {
          const resp = await axios.get('/api/nfc-cards/public/test-card' + (vParam ? `?v=${vParam}` : ''));
          const data = resp.data || {};
          const member = data.member || {};
          const card = data.cardConfig || {};
          const rows = Array.isArray(card.content_blocks) ? card.content_blocks : [];
          transformed = {
            id: card.id,
            user_name: member?.name || card.card_title || '測試名片',
            user_title: card.card_subtitle || '',
            user_company: member?.company || '',
            template_name: card.template_name,
            ui_show_name: true,
            ui_show_company: true,
            ui_show_avatar: !!card.avatar_url,
            avatar_style: 'circle',
            avatar_url: card.avatar_url || '',
            contact_info: {
              phone: member?.contact_number || '',
              email: member?.email || '',
              website: member?.website || '',
              company: member?.company || '',
              address: member?.address || '',
              line_id: member?.line_id || ''
            },
            layout_type: card.layout_type || 'standard',
            ui_divider_style: card.ui_divider_style || 'solid-thin',
            ui_divider_opacity: typeof card.ui_divider_opacity === 'number' ? card.ui_divider_opacity : 0.6,
            content_blocks: rows.map(mapRowToBlock)
          };
        } else {
          const resp = await axios.get(`/api/nfc-cards/member/${memberId}${vParam ? `?v=${vParam}` : ''}`);
          const data = resp.data || {};
          const member = data.member || {};
          const card = data.cardConfig || {};
          const rows = Array.isArray(card.content_blocks) ? card.content_blocks : [];
          transformed = {
            id: card.id,
            user_name: member?.name || card.card_title || '',
            user_title: card.card_subtitle || '',
            user_company: member?.company || card.user_company || '',
            template_name: card.template_name,
            ui_show_name: true,
            ui_show_company: true,
            ui_show_avatar: !!card.avatar_url,
            avatar_style: 'circle',
            avatar_url: card.avatar_url || '',
            contact_info: {
              phone: member?.contact_number || card.user_phone || '',
              email: member?.email || card.user_email || '',
              website: member?.website || card.user_website || '',
              company: member?.company || card.user_company || '',
              address: member?.address || card.user_address || '',
              line_id: member?.line_id || card.line_id || ''
            },
            layout_type: card.layout_type || 'standard',
            ui_divider_style: card.ui_divider_style || 'solid-thin',
            ui_divider_opacity: typeof card.ui_divider_opacity === 'number' ? card.ui_divider_opacity : 0.6,
            content_blocks: rows.map(mapRowToBlock)
          };
        }

        if (!alive) return;
        setCardData(transformed);
        setTemplate({ name: transformed.template_name });
        setLoading(false);
        setError('');
      } catch (e) {
        console.error('載入名片失敗:', e);
        if (!alive) return;
        setError(e?.response?.status === 404 ? '名片不存在' : '載入失敗');
        setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [memberId]);

  // SSE 訂閱：當後端廣播 card:update 時自動刷新
  useEffect(() => {
    let es;
    const url = `/api/nfc-cards/events?memberId=${memberId}`;
    try {
      es = new EventSource(url);
      const onUpdate = (e) => {
        try {
          const payload = JSON.parse(e.data || '{}');
          if (!payload.memberId || String(payload.memberId) === String(memberId)) {
            refreshFromServer();
          }
        } catch {
          // 忽略解析錯誤
        }
      };
      es.addEventListener('card:update', onUpdate);
      es.onerror = () => {
        console.warn('MemberCard SSE 連線錯誤，將自動重試');
      };
    } catch (e) {
      console.warn('建立 MemberCard SSE 失敗:', e);
    }
    return () => {
      try { es && es.close(); } catch {}
    };
  }, [memberId]);

  // 啟用各內容區塊的輪播自動播放（僅針對 carousel 型別）
  useEffect(() => {
    const blocks = cardData?.content_blocks || [];
    const timers = [];
    blocks.forEach((b, idx) => {
      if (b?.content_type !== 'carousel') return;
      const imgs = b?.content_data?.images || [];
      const enabled = !!b?.content_data?.autoplay && imgs.length > 1;
      const interval = Number(b?.content_data?.autoplay_interval || 3000);
      if (!enabled) return;
      const t = setInterval(() => {
        setBlockCarouselIndexMap(prev => {
          const cur = prev[idx] || 0;
          const next = (cur + 1) % imgs.length;
          return { ...prev, [idx]: next };
        });
      }, Math.max(1000, interval));
      timers.push(t);
    });
    return () => timers.forEach(clearInterval);
  }, [cardData?.content_blocks]);

  // vCard 下載功能已移除

  // 下載圖片
  const downloadImage = async (imageUrl, filename) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename || 'image'}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('圖片已下載！');
    } catch (error) {
      console.error('下載圖片失敗:', error);
      showSuccess('下載失敗，請稍後再試');
    }
  };

  // vCard 下載功能已移除

  // 渲染聯絡資訊（基於預覽邏輯）
  const renderContactInfo = () => {
    if (!cardData?.ui_show_contacts || !cardData?.contact_info) return null;

    const info = cardData.contact_info;
    const contacts = [];

    if (info.phone) {
      contacts.push({
        icon: <PhoneIcon className="h-5 w-5" />,
        label: '電話',
        value: info.phone,
        href: `tel:${info.phone}`
      });
    }

    if (info.email) {
      contacts.push({
        icon: <EnvelopeIcon className="h-5 w-5" />,
        label: '電子郵件',
        value: info.email,
        href: `mailto:${info.email}`
      });
    }

    if (info.website) {
      contacts.push({
        icon: <GlobeAltIcon className="h-5 w-5" />,
        label: '網站',
        value: info.website,
        href: info.website.startsWith('http') ? info.website : `https://${info.website}`
      });
    }

    if (info.line_id) {
      contacts.push({
        icon: <FaLine className="h-5 w-5" />,
        label: 'LINE ID',
        value: info.line_id,
        href: `https://line.me/ti/p/~${info.line_id}`
      });
    }

    if (info.company) {
      contacts.push({
        icon: <BuildingOfficeIcon className="h-5 w-5" />,
        label: '公司',
        value: info.company,
        href: null
      });
    }

    if (info.address) {
      contacts.push({
        icon: <MapPinIcon className="h-5 w-5" />,
        label: '地址',
        value: info.address,
        href: `https://maps.google.com/?q=${encodeURIComponent(info.address)}`
      });
    }

    if (contacts.length === 0) return null;

    return (
      <div className="content-block">
        <h3 className="block-title">聯絡資訊</h3>
        <div className="grid grid-cols-1 gap-3">
          {contacts.map((contact, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="text-gold-400 flex-shrink-0">
                {contact.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gold-300 mb-1">{contact.label}</div>
                {contact.href ? (
                  <a
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-100 hover:text-gold-200 transition-colors break-all"
                    onClick={() => trackEvent('contact_click', { contentType: contact.label, contentId: contact.value })}
                  >
                    {contact.value}
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 inline ml-1" />
                  </a>
                ) : (
                  <span className="text-gold-100 break-all">{contact.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染內容區塊（加入 LINE ID 隱藏與 carousel 支援）
  const renderContentBlock = (block, index) => {
    if (!block || !block.content_data) return null;

    const { content_data } = block;
    const titleText = (content_data?.title || '').trim();

    switch (block.content_type) {
      case 'text':
        // 專用樣式：LINE ID（以標題辨識，完整版本不重複顯示）
        if (titleText === 'LINE ID') {
          return null;
        }
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '文字區塊'}</h3>
            <div className="description-text">{content_data.content || ''}</div>
          </div>
        );

      case 'richtext':
        return (
          <div className="content-block">
            {content_data.title && (<h3 className="block-title">{content_data.title}</h3>)}
            <div
              className="prose prose-invert max-w-none text-gold-200"
              dangerouslySetInnerHTML={{ __html: content_data.html || '' }}
            />
          </div>
        );

      case 'link':
      case 'website':
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '連結'}</h3>
            {content_data.url && (
              <a
                href={content_data.url.startsWith('http') ? content_data.url : `https://${content_data.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-200 hover:text-gold-100 transition-colors flex items-center gap-2"
                onClick={() => trackEvent('contact_click', { contentType: 'link', contentId: content_data.url })}
              >
                <LinkIcon className="h-4 w-4" />
                {content_data.url}
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            )}
          </div>
        );

      case 'news':
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '新聞'}</h3>
            {content_data.url && (
              <a
                href={content_data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-200 hover:text-gold-100 transition-colors flex items-center gap-2"
                onClick={() => trackEvent('contact_click', { contentType: 'news', contentId: content_data.url })}
              >
                <LinkIcon className="h-4 w-4" />
                查看新聞
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '檔案'}</h3>
            {content_data.url && (
              <a
                href={content_data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-200 hover:text-gold-100 transition-colors flex items-center gap-2"
                onClick={() => trackEvent('contact_click', { contentType: 'file', contentId: content_data.id })}
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                下載檔案
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            )}
          </div>
        );

      case 'video':
        if (content_data.type === 'youtube' && content_data.url) {
          const videoId = getYouTubeVideoId(content_data.url);
          if (videoId) {
            return (
              <div className="content-block">
                <h3 className="block-title">{content_data.title || '影片'}</h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={content_data.title || 'YouTube video'}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </div>
            );
          }
        }
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '影片'}</h3>
            <div className="text-gold-300">影片內容</div>
          </div>
        );

      case 'image':
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '圖片'}</h3>
            {content_data.url && (
              <div className="relative">
                <img
                  src={content_data.url}
                  alt={content_data.alt || content_data.title}
                  className="w-full rounded-lg cursor-zoom-in"
                  onClick={() => {
                    setPreviewImageUrl(content_data.url);
                    setImagePreviewOpen(true);
                  }}
                />
                {content_data.alt && (
                  <p className="text-xs text-gold-400 mt-2 italic">{content_data.alt}</p>
                )}
              </div>
            )}
          </div>
        );

      case 'carousel': {
        const imgs = content_data?.images || [];
        const curIdx = blockCarouselIndexMap[index] || 0;
        const goto = (n) => {
          if (!imgs.length) return;
          const next = (n + imgs.length) % imgs.length;
          setBlockCarouselIndexMap(prev => ({ ...prev, [index]: next }));
        };
        const prevSlide = () => goto(curIdx - 1);
        const nextSlide = () => goto(curIdx + 1);

        return (
          <div className="content-block">
            <h3 className="block-title">{content_data?.title || '圖片輪播'}</h3>
            {imgs.length > 0 ? (
              <div className="relative">
                <div className="w-full bg-black/20 rounded flex items-center justify-center overflow-hidden" style={{ minHeight: '180px' }}>
                  <img
                    src={imgs[curIdx]?.url}
                    alt={imgs[curIdx]?.alt || ''}
                    className="max-h-72 w-auto object-contain rounded"
                  />
                </div>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-amber-200 rounded hover:bg-black/60"
                  aria-label="上一張"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-amber-200 rounded hover:bg-black/60"
                  aria-label="下一張"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {imgs.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goto(i)}
                      className={`h-2 w-2 rounded-full ${i === curIdx ? 'bg-amber-400' : 'bg-amber-700 opacity-60'}`}
                      aria-label={`第 ${i + 1} 張`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-amber-100 text-xs">未添加圖片</div>
            )}
          </div>
        );
      }

      case 'social':
        const socialPlatforms = [
          { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: '#0077B5' },
          { key: 'facebook', name: 'Facebook', icon: <FaFacebook />, color: '#1877F2' },
          { key: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: '#E4405F' },
          { key: 'twitter', name: 'Twitter', icon: <FaTwitter />, color: '#1DA1F2' },
          { key: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: '#FF0000' },
          { key: 'tiktok', name: 'TikTok', icon: <FaTiktok />, color: '#000000' }
        ];

        const activePlatforms = socialPlatforms.filter(platform => content_data[platform.key]);

        if (activePlatforms.length === 0) return null;

        return (
          <div className="content-block">
            <h3 className="block-title">社群媒體</h3>
            <div className="flex flex-wrap gap-3">
              {activePlatforms.map(platform => (
                <a
                  key={platform.key}
                  href={content_data[platform.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-800 hover:bg-primary-700 transition-colors"
                  style={{ borderLeft: `3px solid ${platform.color}` }}
                  onClick={() => trackEvent('contact_click', { contentType: 'social', contentId: platform.key })}
                >
                  <span style={{ color: platform.color }}>{platform.icon}</span>
                  <span className="text-gold-200">{platform.name}</span>
                  <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gold-400" />
                </a>
              ))}
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '地點'}</h3>
            {content_data.address && (
              <div>
                <div className="flex items-center gap-2 text-gold-200 mb-3">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{content_data.address}</span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(content_data.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 hover:bg-primary-700 rounded-lg transition-colors text-gold-200"
                  onClick={() => trackEvent('contact_click', { contentType: 'map', contentId: content_data.address })}
                >
                  <MapPinIcon className="h-4 w-4" />
                  在 Google Maps 中查看
                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        );

      case 'icon':
        const iconMap = {
          star: '⭐',
          heart: '❤️',
          diamond: '💎',
          crown: '👑',
          trophy: '🏆',
          fire: '🔥',
          lightning: '⚡',
          rocket: '🚀',
          target: '🎯',
          medal: '🏅',
          gem: '💍',
          sparkles: '✨'
        };

        const sizeMap = {
          small: 'text-base',
          medium: 'text-lg',
          large: 'text-xl',
          xlarge: 'text-2xl'
        };

        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '圖標'}</h3>
            <div className="flex items-center gap-3">
              {content_data.icon_url ? (
                <img
                  src={content_data.icon_url}
                  alt={content_data.description}
                  className={`${sizeMap[content_data.size] || 'text-lg'}`}
                  style={{
                    height: content_data.size === 'small' ? '16px' :
                           content_data.size === 'medium' ? '20px' :
                           content_data.size === 'large' ? '24px' : '28px'
                  }}
                />
              ) : (
                <span className={`${sizeMap[content_data.size] || 'text-lg'}`}>
                  {iconMap[content_data.icon_type] || '⭐'}
                </span>
              )}
              <span className="text-gold-200">{content_data.description || '裝飾圖標'}</span>
            </div>
          </div>
        );

      case 'contact': {
        if ((cardData?.layout_type || 'standard') === 'standard') return null;
        const info = cardData?.contact_info || {};
        const buttons = [];
        if (info.phone) buttons.push({ label: '電話', href: `tel:${info.phone}` });
        if (info.email) buttons.push({ label: '電子郵件', href: `mailto:${info.email}` });
        if (info.website) buttons.push({ label: '網站', href: info.website?.startsWith('http') ? info.website : `https://${info.website}` });
        if (buttons.length === 0) return null;
        return (
          <div className="content-block">
            <h3 className="block-title">{content_data.title || '聯絡方式'}</h3>
            <div className="flex flex-wrap gap-2">
              {buttons.map((b, idx) => (
                <a
                  key={idx}
                  href={b.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
                  style={{ backgroundColor: accentColor }}
                  onClick={() => trackEvent('contact_click', { contentType: 'contact', contentId: b.label })}
                >
                  {b.label}
                </a>
              ))}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // 獲取模板樣式類名
  const getTemplateClassName = () => {
    return mapTemplateNameToClass(template?.name);
  };

  // 獲取分隔線樣式
  const getDividerBorder = (style, colorHex, opacity) => {
    const hexToRgb = (hex) => {
      try {
        const clean = hex?.replace('#', '') || 'cccccc';
        const bigint = parseInt(clean, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
      } catch { return '204, 204, 204'; }
    };

    const rgb = hexToRgb(colorHex || '#cccccc');
    const rgba = `rgba(${rgb}, ${typeof opacity === 'number' ? opacity : 0.6})`;
    
    switch (style) {
      case 'solid-thin': return `1px solid ${rgba}`;
      case 'solid-medium': return `2px solid ${rgba}`;
      case 'dashed': return `1px dashed ${rgba}`;
      case 'dotted': return `1px dotted ${rgba}`;
      case 'double': return `3px double ${rgba}`;
      default: return `1px solid ${rgba}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-400">載入名片中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">載入失敗</div>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-4">找不到名片</div>
          <p className="text-gray-500 mb-6">請檢查連結是否正確</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const templateClass = getTemplateClassName();
  
  // 主題顏色映射：與編輯器保持一致
  const getThemeAccentColor = (themeId) => {
    const themeMap = {
      'simple': '#3B82F6',
      'youth': '#F59E0B', 
      'coolblack': '#22D3EE',
      'classic': '#2563EB',
      'forest': '#10b981',
      'sunset': '#fb7185',
      'ocean': '#60a5fa',
      'mint': '#34d399',
      'lavender': '#a78bfa',
      'warm': '#f59e0b',
      'neon': '#22c55e'
    };
    return themeMap[themeId] || '#3B82F6';
  };
  
  const accentColor = (() => {
    if (cardData?.design) {
      // 如果有編輯器設計資料，優先使用對應主題的 accent 顏色
      const themeId = cardData.template_name;
      return getThemeAccentColor(themeId);
    }
    return template?.css_config?.accentColor || template?.css_config?.secondaryColor || '#cccccc';
  })();
  const dividerStyle = cardData?.ui_divider_style || template?.css_config?.dividerOptions?.[0] || 'solid-thin';
  const dividerOpacity = typeof cardData?.ui_divider_opacity === 'number' ? cardData.ui_divider_opacity : (template?.css_config?.dividerOpacity ?? 0.6);
  const borderTopCss = getDividerBorder(dividerStyle, accentColor, dividerOpacity);
  const layoutType = cardData?.layout_type || 'standard';

  // 背景樣式：優先使用編輯器設計的 bgStyle，其次使用模板配色
  const backgroundStyle = (() => {
    const css = template?.css_config || {};
    if (cardData?.design?.bgStyle) {
      return { backgroundImage: cardData.design.bgStyle };
    }
    if (css.backgroundGradient) {
      return { backgroundImage: css.backgroundGradient };
    }
    if (css.backgroundColor) {
      return { background: css.backgroundColor };
    }
    const rgb = hexToRgb(css.accentColor || css.secondaryColor || '#0b0f14');
    return { background: `linear-gradient(to bottom, rgba(${rgb}, 0.12), #0b0f14)` };
  })();

  const chineseFontStack = "-apple-system, BlinkMacSystemFont, 'PingFang SC','PingFang TC','Noto Sans CJK','Microsoft YaHei','Segoe UI','Helvetica Neue', Arial, sans-serif";

  return (
    <motion.div
      className="min-h-screen"
      style={{ ...backgroundStyle, fontFamily: chineseFontStack }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >

      {/* 名片內容：統一容器寬度與內距，與 PublicNFCCard 保持一致 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className={`nfc-card-preview nfc-card-base premium-card ${templateClass}`}>
          <div className="card-content">
            {/* 頂部：頭像 + 基本資訊（新版樣式） */}
            <div className="personal-info-section">
              <div className="avatar-container">
                {cardData?.ui_show_avatar && cardData?.avatar_url ? (
                  <img
                    src={cardData?.avatar_url || '/nfc-templates/avatar-placeholder.png'}
                    alt="頭像"
                    className="user-avatar"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {(cardData?.user_name || 'N').slice(0,1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-info">
                {(cardData?.ui_show_name || cardData?.user_title || (cardData?.ui_show_company && cardData?.user_company)) && (
                  <div className="name-title-row">
                    {cardData?.ui_show_name && (
                      <span className="user-name">{cardData?.user_name || '—'}</span>
                    )}
                    {cardData?.user_title && (
                      <span className="user-position">{cardData?.user_title}</span>
                    )}
                    {(cardData?.ui_show_company && cardData?.user_company) && (
                      <span className="user-company">@ {cardData?.user_company}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 操作按鈕列 */}
            <div className="px-3">
              <motion.div
                className="action-buttons"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <button
                  className="action-btn share-btn"
                  onClick={handleShare}
                >
                  <ShareIcon className="h-5 w-5" />
                  分享名片
                </button>
                {/* 移除下載聯絡人按鈕 */}
                <button
                  className="action-btn customize-btn"
                  onClick={() => navigate('/nfc-card-editor')}
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                  自定義板塊
                </button>
                <button
                  className="action-btn bookmark-btn"
                  onClick={openQrModal}
                >
                  <PhotoIcon className="h-5 w-5" />
                  顯示 QR Code
                </button>
              </motion.div>
            </div>

            {/* 版型渲染：四宮格 / 滿版滑動 / 標準 */}
            {layoutType === 'four_grid' ? (
              <FourGridLayout 
                cardData={cardData} 
                renderContentBlock={renderContentBlock}
                displayBlocks={getDisplayBlocks()}
              />
            ) : layoutType === 'full_slider' ? (
              <FullSliderLayout
                cardData={cardData}
                renderContentBlock={renderContentBlock}
                borderTopCss={borderTopCss}
                currentMediaIndex={currentMediaIndex}
                setCurrentMediaIndex={setCurrentMediaIndex}
                swipeHandlers={swipeHandlers}
                displayBlocks={getDisplayBlocks()}
              />
            ) : (
              <StandardLayout
                cardData={cardData}
                renderContentBlock={renderContentBlock}
                borderTopCss={borderTopCss}
                onOpenPreview={(url) => { setPreviewImageUrl(url); setImagePreviewOpen(true); }}
                onDownload={(url, username) => downloadImage(url, username)}
                renderContactInfo={renderContactInfo}
                displayBlocks={getDisplayBlocks()}
              />
            )}
      </div>
    </div>
      </div>

      {/* 自定義板塊入口改為導向 Pro 編輯器 */}

      {/* 成功提示 */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 z-50"
          >
            <div className="max-w-md mx-auto bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
              {successMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分享模態框 */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">分享名片</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setShowSuccessToast(true);
                    setShowShareModal(false);
                    trackEvent('share', { source: 'copy_link_modal' });
                  }}
                  className="w-full flex items-center space-x-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <LinkIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-white">複製連結</span>
                </button>

                <button
                  onClick={() => {
                    const text = `查看 ${cardData.user_name} 的數位名片：${window.location.href}`;
                    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                    setShowShareModal(false);
                  }}
                  className="w-full flex items-center space-x-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <FaLine className="w-5 h-5 text-green-400" />
                  <span className="text-white">透過 LINE 分享</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 圖片預覽模態框 */}
      <AnimatePresence>
        {imagePreviewOpen && previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setImagePreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImageUrl}
                alt="預覽"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setImagePreviewOpen(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code 彈窗 */}
      {showQrModal && (
        <div className="qr-overlay" onClick={() => setShowQrModal(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <h3>掃描 QR Code 分享名片</h3>
            <div className="qr-code-container">
              <QRCodeSVG value={shareShortUrl || `${window.location.origin}/member-card/${memberId}?v=${(new URLSearchParams(window.location.search).get('v')) || Date.now()}`} size={200} />
            </div>
            <p>可長按儲存或直接掃描</p>
            <button className="close-qr-btn" onClick={() => setShowQrModal(false)}>關閉</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MemberCard;

const FourGridLayout = ({ cardData, renderContentBlock, displayBlocks }) => {
  return (
    <div className="px-3 grid grid-cols-2 gap-4">
      {displayBlocks.slice(0, 4).map((block, i) => (
        <div key={block?.id || i} className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
          {renderContentBlock(block, i)}
        </div>
      ))}
    </div>
  );
};

const FullSliderLayout = ({ cardData, renderContentBlock, borderTopCss, currentMediaIndex, setCurrentMediaIndex, swipeHandlers, displayBlocks }) => {
  return (
    <div className="px-3" {...(swipeHandlers || {})}>
      {displayBlocks.map((block, i) => (
        <div key={block?.id || i} className="mb-4 rounded-xl overflow-hidden bg-white/5 border border-white/10" style={{ borderTop: borderTopCss }}>
          {renderContentBlock(block, i)}
        </div>
      ))}
    </div>
  );
};

const StandardLayout = ({ cardData, renderContentBlock, borderTopCss, onOpenPreview, onDownload, renderContactInfo, displayBlocks }) => {
  return (
    <div className="px-3">
      {typeof renderContactInfo === 'function' ? renderContactInfo(cardData) : null}
      {displayBlocks.map((block, i) => (
        <div key={block?.id || i} className="mb-4 rounded-xl overflow-hidden bg-white/5 border border-white/10" style={{ borderTop: borderTopCss }}>
          {renderContentBlock(block, i)}
        </div>
      ))}
    </div>
  );
};
