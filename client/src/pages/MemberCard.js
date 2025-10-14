import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import {
  ShareIcon,
  DocumentArrowDownIcon,
  PhotoIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowTopRightOnSquareIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  LinkIcon,
  GlobeAltIcon
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
import { mapTemplateNameToClass } from '../utils/templateClass';

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

  // 獲取名片資料
  const fetchCardData = async () => {
    try {
      setLoading(true);
      setError('');

      // 測試名片
      if (memberId === 'test') {
        setCardData({
          card_title: '測試名片',
          card_subtitle: '',
          user_name: user?.name || '測試用戶',
          user_title: user?.title || '',
          user_company: user?.company || '',
          avatar_url: user?.avatar_url || '',
          ui_show_avatar: true,
          ui_show_name: true,
          ui_show_company: true,
          ui_show_contacts: true,
          contact_info: {
            phone: user?.contactNumber || '',
            email: user?.email || '',
            website: '',
            company: user?.company || '',
            address: '',
            line_id: ''
          },
          content_blocks: []
        });
        setTemplate({ name: 'default', css_config: {} });
        return;
      }

      // 從數位錢包獲取
      const walletResponse = await axios.get('/api/digital-wallet/cards');
      const walletCards = walletResponse.data?.cards || [];
      const found = walletCards.find(c => c.id === memberId || c.member_id === memberId);

      if (found) {
        const transformed = {
          card_title: found.card_title || found.name || '數位名片',
          card_subtitle: found.card_subtitle || found.title || '',
          user_name: found.name || '',
          user_title: found.title || '',
          user_company: found.company || '',
          avatar_url: found.avatar_url || '',
          avatar_style: found.avatar_style || 'original',
          ui_show_avatar: found.ui_show_avatar !== false,
          ui_show_name: found.ui_show_name !== false,
          ui_show_company: found.ui_show_company !== false,
          ui_show_contacts: found.ui_show_contacts !== false,
          contact_info: {
            phone: found.phone || '',
            email: found.email || '',
            website: found.website || '',
            company: found.company || '',
            address: found.address || '',
            line_id: found.line_id || ''
          },
          content_blocks: found.content_blocks || [],
          layout_type: found.layout_type || 'standard',
          scanned_image_url: found.scanned_image_url
        };
        setCardData(transformed);
        setTemplate({ name: found.template_name || 'default', css_config: found.css_config || {} });
        return;
      }

      // 從後端 API 獲取
      const response = await axios.get(`/api/nfc-cards/member/${memberId}`);
      const { member, cardConfig } = response.data;

      if (!member && !cardConfig) {
        setError('找不到該名片');
        return;
      }

      const transformed = {
        card_title: cardConfig?.card_title || member?.name || '會員名片',
        card_subtitle: cardConfig?.card_subtitle || member?.title || '',
        user_name: member?.name || '',
        user_title: member?.title || '',
        user_company: member?.company || '',
        avatar_url: cardConfig?.avatar_url || member?.avatar_url || '',
        avatar_style: cardConfig?.avatar_style || 'original',
        ui_show_avatar: cardConfig?.ui_show_avatar !== false,
        ui_show_name: cardConfig?.ui_show_name !== false,
        ui_show_company: cardConfig?.ui_show_company !== false,
        ui_show_contacts: cardConfig?.ui_show_contacts !== false,
        contact_info: {
          phone: cardConfig?.user_phone ?? member?.contactNumber ?? '',
          email: cardConfig?.user_email ?? member?.email ?? '',
          website: cardConfig?.user_website ?? member?.website ?? '',
          company: cardConfig?.user_company ?? member?.company ?? '',
          address: cardConfig?.user_address ?? member?.address ?? '',
          line_id: cardConfig?.line_id ?? member?.line_id ?? ''
        },
        content_blocks: cardConfig?.content_blocks || [],
        layout_type: cardConfig?.layout_type || 'standard'
      };

      setCardData(transformed);
      setTemplate({
        name: cardConfig?.template_name || 'default',
        css_config: cardConfig?.css_config || {}
      });

    } catch (error) {
      console.error('獲取名片資料失敗:', error);
      setError('載入名片失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchCardData();
    }
  }, [memberId]);

  // 顯示成功訊息
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  // 分享功能
  const handleShare = async () => {
    const url = window.location.href;
    const title = `${cardData?.user_name || ''}的數位名片`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        showSuccess('分享成功！');
      } catch (error) {
        if (error.name !== 'AbortError') {
          fallbackShare(url);
        }
      }
    } else {
      fallbackShare(url);
    }
  };

  const fallbackShare = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('連結已複製到剪貼簿！');
    }).catch(() => {
      setShowShareModal(true);
    });
  };

  // 下載 vCard
  const downloadVCard = async () => {
    try {
      if (!cardData) return;

      // 測試名片：本地生成 vCard
      if (memberId === 'test') {
        const info = cardData?.contact_info || {};
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${cardData?.user_name || ''}`,
          `ORG:${info.company || ''}`,
          `TITLE:${cardData?.user_title || ''}`,
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
        a.download = `${cardData?.user_name || 'contact'}.vcf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showSuccess('聯絡人已下載！');
        return;
      }

      // 一般名片：後端下載
      const response = await axios.get(`/api/nfc-cards/member/${memberId}/vcard`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cardData?.user_name || 'contact'}.vcf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess('聯絡人已下載！');
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      showSuccess('下載失敗，請稍後再試');
    }
  };

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
                >
                  <span>🗺️</span>
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
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gold-100 mb-2">載入失敗</h2>
          <p className="text-gold-300 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gold-100 mb-2">找不到名片</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const templateClass = getTemplateClassName();
  const accentColor = template?.css_config?.accentColor || template?.css_config?.secondaryColor || '#cccccc';
  const dividerStyle = cardData?.ui_divider_style || template?.css_config?.dividerOptions?.[0] || 'solid-thin';
  const dividerOpacity = typeof cardData?.ui_divider_opacity === 'number' ? cardData.ui_divider_opacity : (template?.css_config?.dividerOpacity ?? 0.6);
  const borderTopCss = getDividerBorder(dividerStyle, accentColor, dividerOpacity);
  const layoutType = cardData?.layout_type || 'standard';

  // 背景樣式與模板配色一致
  const backgroundStyle = (() => {
    const css = template?.css_config || {};
    if (css.backgroundGradient) {
      return { backgroundImage: css.backgroundGradient };
    }
    if (css.backgroundColor) {
      return { background: css.backgroundColor };
    }
    const rgb = hexToRgb(css.accentColor || css.secondaryColor || '#0b0f14');
    return { background: `linear-gradient(to bottom, rgba(${rgb}, 0.12), #0b0f14)` };
  })();

  return (
    <div className="min-h-screen" style={backgroundStyle}>

      {/* 名片內容 */}
      <div className="max-w-md mx-auto">
        <div className={`nfc-card-container nfc-card-base ${templateClass}`}>
          <div className="card-content">
            {/* 頂部：頭像 + 基本資訊 */}
            <div className="basic-info-panel px-3 py-4">
              <div className="flex items-center gap-3 mb-3">
                {cardData?.ui_show_avatar && (
                  <div className={`relative ${cardData?.avatar_style === 'full' ? 'w-full' : ''}`}>
                    {cardData?.avatar_style === 'full' ? (
                      <img
                        src={cardData?.avatar_url || '/nfc-templates/avatar-placeholder.png'}
                        alt="頭像"
                        className="w-full h-auto object-contain border-0 rounded-none shadow-lg"
                      />
                    ) : (
                      <img
                        src={cardData?.avatar_url || '/nfc-templates/avatar-placeholder.png'}
                        alt="頭像"
                        className="w-32 h-32 rounded-full border-2 border-gold-500 object-cover shadow-lg"
                      />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {cardData?.ui_show_name && (
                    <div className="text-gold-100 text-base font-semibold truncate">
                      {cardData?.user_name || '—'}
                      {cardData?.user_title && (
                        <span className="ml-2 text-gold-300 font-normal">{cardData.user_title}</span>
                      )}
                    </div>
                  )}
                  {cardData?.ui_show_company && (
                    <div className="text-sm text-gold-300 truncate">{cardData?.user_company || ''}</div>
                  )}
                  {(cardData?.contact_info?.line_id || cardData?.line_id) && (
                    <div className="mt-2">
                      <a
                        href={buildLineDeepLink(cardData?.contact_info?.line_id || cardData?.line_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-green-600/20 text-green-300 border border-green-500/40 hover:bg-green-600/30 hover:text-green-200 transition-colors"
                      >
                        <FaLine className="h-4 w-4" />
                        <span className="text-xs">LINE 加好友</span>
                        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 版型渲染：四宮格 / 滿版滑動 / 標準 */}
            {layoutType === 'four_grid' ? (
              <div className="px-3">
                <AnimatePresence initial={false}>
                  <div className="grid grid-cols-2 gap-3">
                    {(cardData.content_blocks || []).slice(0,4).map((block, idx) => {
                      const key = block?.id ?? `${block?.content_type || 'block'}-${idx}`;
                      return (
                        <motion.div
                          key={key}
                          className="content-block bg-primary-800/40 rounded border border-gold-700/30 p-3"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                        >
                          {renderContentBlock(block, idx)}
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatePresence>
              </div>
            ) : layoutType === 'full_slider' ? (
              <div className="relative">
                <div className="p-3">
                  {cardData.content_blocks && cardData.content_blocks.length > 0 && (
                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        key={currentMediaIndex % cardData.content_blocks.length}
                        className="content-block"
                        style={{ borderTop: borderTopCss }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.28 }}
                        {...swipeHandlers}
                      >
                        {renderContentBlock(
                          cardData.content_blocks[currentMediaIndex % cardData.content_blocks.length],
                          currentMediaIndex % cardData.content_blocks.length
                        )}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
                <div className="absolute inset-y-0 left-0 flex items-center">
                  <button
                    onClick={() => setCurrentMediaIndex((currentMediaIndex - 1 + cardData.content_blocks.length) % cardData.content_blocks.length)}
                    className="m-2 px-3 py-2 rounded-full bg-black/40 text-white border border-gold-700/40"
                  >◀</button>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <button
                    onClick={() => setCurrentMediaIndex((currentMediaIndex + 1) % cardData.content_blocks.length)}
                    className="m-2 px-3 py-2 rounded-full bg-black/40 text-white border border-gold-700/40"
                  >▶</button>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
                  {(cardData.content_blocks || []).map((_, i) => (
                    <span key={i} className={`h-2 w-2 rounded-full ${i === (currentMediaIndex % cardData.content_blocks.length) ? 'bg-amber-400' : 'bg-primary-700'}`}/>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {cardData.scanned_image_url && (
                  <div className="content-block">
                    <h3 className="block-title">掃描名片</h3>
                    <div className="relative">
                      <img
                        src={cardData.scanned_image_url}
                        alt="掃描名片"
                        className="rounded-lg w-full object-contain cursor-zoom-in bg-gray-50"
                        style={{ maxHeight: '480px' }}
                        onClick={() => {
                          setPreviewImageUrl(cardData.scanned_image_url);
                          setImagePreviewOpen(true);
                        }}
                      />
                      <button
                        onClick={() => downloadImage(cardData.scanned_image_url, cardData.user_name)}
                        className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-white/90 text-gray-700 rounded shadow hover:bg-white"
                        title="下載掃描原圖"
                      >
                        下載原圖
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">點擊圖片可放大預覽</p>
                  </div>
                )}
                {renderContactInfo()}
                {cardData.content_blocks && cardData.content_blocks
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((block, idx) => {
                    const key = block?.id ?? `${block?.content_type || 'block'}-${block?.display_order ?? idx}-${idx}`;
                    return (
                      <div key={key} className="content-block" style={{ borderTop: borderTopCss }}>
                        {renderContentBlock(block, idx)}
                      </div>
                    );
                  })
                }
              </>
            )}
      </div>
    </div>
      </div>

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
              className="bg-primary-800 rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gold-100">分享名片</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gold-300 hover:text-gold-100"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-primary-700 rounded border text-gold-200 text-sm break-all">
                  {window.location.href}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showSuccess('連結已複製！');
                    setShowShareModal(false);
                  }}
                  className="w-full px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors"
                >
                  複製連結
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
    </div>
  );
};

export default MemberCard;
