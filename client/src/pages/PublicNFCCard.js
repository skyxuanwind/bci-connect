import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { useParams } from 'react-router-dom';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  LinkIcon,
  PlayIcon,
  PhotoIcon,
  HeartIcon,
  ShareIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';
import {
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaTiktok
} from 'react-icons/fa';

const PublicNFCCard = () => {
  const chineseFontStack = "-apple-system, BlinkMacSystemFont, 'PingFang SC','PingFang TC','Noto Sans CJK','Microsoft YaHei','Segoe UI','Helvetica Neue', Arial, sans-serif";
  const { memberId } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareShortUrl, setShareShortUrl] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchCardData();
    checkIfCollected();
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
          // 僅當事件目標為目前頁的 memberId 時刷新
          if (!payload.memberId || String(payload.memberId) === String(memberId)) {
            fetchCardData();
          }
        } catch {
          // 忽略解析錯誤
        }
      };
      es.addEventListener('card:update', onUpdate);
      es.onerror = () => {
        // 瀏覽器會自動重連，這裡只做日誌
        console.warn('PublicNFCCard SSE 連線錯誤，將自動重試');
      };
    } catch (e) {
      console.warn('建立 PublicNFCCard SSE 失敗:', e);
    }
    return () => {
      try { es && es.close(); } catch {}
    };
  }, [memberId]);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const shareVersion = Number(params.get('v')) || Date.now();
      const response = await axios.get(`/api/nfc-cards/member/${memberId}`, {
        params: { v: shareVersion },
        headers: { 'Cache-Control': 'no-cache' }
      });
      setCardData(response.data);
      const serverVersion = Number(response.data?.cardConfig?.version || response.data?.version || 0);
      if (!params.get('v') || (serverVersion && serverVersion > shareVersion)) {
        const newVersion = serverVersion || Date.now();
        params.set('v', String(newVersion));
        const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (error) {
      console.error('獲取電子名片失敗:', error);
      setError('無法載入電子名片');
    } finally {
      setLoading(false);
    }
  };

  const checkIfCollected = () => {
    // 檢查本地儲存中是否已收藏此名片
    const collections = JSON.parse(localStorage.getItem('nfc_card_collections') || '[]');
    setIsCollected(collections.some(card => card.memberId === memberId));
  };

  const handleCollectCard = () => {
    const collections = JSON.parse(localStorage.getItem('nfc_card_collections') || '[]');
    
    if (isCollected) {
      // 移除收藏
      const updatedCollections = collections.filter(card => card.memberId !== memberId);
      localStorage.setItem('nfc_card_collections', JSON.stringify(updatedCollections));
      setIsCollected(false);
    } else {
      // 添加收藏
      const newCollection = {
        memberId,
        memberName: cardData.member.name,
        memberCompany: cardData.member.company,
        memberTitle: cardData.member.title,
        collectedAt: new Date().toISOString(),
        notes: ''
      };
      collections.push(newCollection);
      localStorage.setItem('nfc_card_collections', JSON.stringify(collections));
      setIsCollected(true);
    }
  };

  // vCard 下載功能已移除

  const handleShare = async () => {
    const title = `${cardData.member.name} - 電子名片`;
    const url = getVersionedUrl();
    let shortUrl = url;

    // 先嘗試生成短連結，失敗則退回原連結
    try {
      const resp = await axios.post('/api/links/shorten', { url, label: `nfc-card-${memberId}` });
      shortUrl = resp.data?.shortUrl || url;
      setShareShortUrl(shortUrl);
    } catch (error) {
      setShareShortUrl(url);
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, url: shortUrl });
      } catch (error) {
        console.log('分享取消');
      }
    } else {
      // 複製到剪貼板（優先短連結）
      navigator.clipboard.writeText(shortUrl);
      setShowShareModal(true);
      setTimeout(() => setShowShareModal(false), 2000);
    }
  };

  const [blockCarouselIndexMap, setBlockCarouselIndexMap] = useState({});

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

  // 產生帶版本參數的目前頁面 URL（避免快取）
  const getVersionedUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const currentV = params.get('v') || `${Date.now()}`;
    params.set('v', currentV);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  // 啟用各區塊輪播的自動播放（僅依據目前卡片內容）
  useEffect(() => {
    const blocks = cardData?.cardConfig?.content_blocks || cardData?.cardConfig?.contentBlocks || cardData?.content_blocks || [];
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
  }, [cardData?.content_blocks, cardData?.cardConfig]);

  const renderContentBlock = (block, idx) => {
    switch (block.content_type) {
      case 'text':
        // 專用樣式：LINE ID（以標題辨識）
        if ((block.content_data?.title || '').trim() === 'LINE ID') {
          const lineId = (block.content_data?.content || '').trim();
          if (!lineId) return null;
          // 不在下方生成卡片；改由頭像區域顯示，這裡返回 null 以避免重複
          return null;
        }
        return (
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">{block.content_data.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">{block.content_data.content}</p>
          </div>
        );
      
      case 'link':
        return (
          <div className="mb-4">
            <a 
              href={block.content_data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <LinkIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
              <span className="text-blue-600 dark:text-blue-400 font-medium">{block.content_data.title}</span>
            </a>
          </div>
        );
      
      case 'video':
        return (
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">{block.content_data.title}</h3>
            {block.content_data.type === 'youtube' && block.content_data.url ? (
              <div className="video-container">
                <iframe
                  src={`https://www.youtube.com/embed/${block.content_data.url.split('v=')[1] || block.content_data.url.split('/').pop()}`}
                  title={block.content_data.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-64 rounded-lg"
                />
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                <PlayIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-300">{block.content_data.title}</p>
                {block.content_data.url && (
                  <a 
                    href={block.content_data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    觀看影片
                  </a>
                )}
              </div>
            )}
          </div>
        );
      
      case 'image':
        return (
          <div className="mb-4">
            {block.content_data.title && (
              <h3 className="font-semibold text-lg mb-2">{block.content_data.title}</h3>
            )}
            {block.content_data.url ? (
              <img 
                src={block.content_data.url}
                alt={block.content_data.alt || '圖片'}
                className="w-full rounded-lg shadow-md object-contain"
                style={{ maxHeight: '400px' }}
              />
            ) : (
              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <PhotoIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
            {block.content_data.alt && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center italic">
                {block.content_data.alt}
              </p>
            )}
          </div>
        );
      
      case 'carousel': {
        const imgs = block?.content_data?.images || [];
        if (imgs.length === 0) {
          return (
            <div className="mb-4">
              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <PhotoIcon className="h-12 w-12 text-gray-400" />
              </div>
            </div>
          );
        }
        const curIdx = blockCarouselIndexMap[idx] || 0;
        const goto = (n) => {
          const next = ((n % imgs.length) + imgs.length) % imgs.length;
          setBlockCarouselIndexMap(prev => ({ ...prev, [idx]: next }));
        };
        const prevSlide = () => goto(curIdx - 1);
        const nextSlide = () => goto(curIdx + 1);
        return (
          <div className="mb-4">
            {block.content_data?.title && (
              <h3 className="font-semibold text-lg mb-2">{block.content_data.title}</h3>
            )}
            <div className="relative">
              <div className="w-full h-56 bg-black/10 dark:bg-white/5 rounded-lg flex items-center justify-center overflow-hidden">
                <img src={(imgs[curIdx]?.url) || (imgs[curIdx]?.src) || imgs[curIdx]} alt="" className="max-h-56 w-auto object-contain" />
              </div>
              <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded hover:bg-black/60" aria-label="上一張">
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded hover:bg-black/60" aria-label="下一張">
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-center gap-2 mt-2">
                {imgs.map((_, i) => (
                  <button key={i} onClick={() => goto(i)} className={`h-2 w-2 rounded-full ${i === curIdx ? 'bg-amber-400' : 'bg-gray-500'}`} aria-label={`第 ${i + 1} 張`} />
                ))}
              </div>
            </div>
          </div>
        );
      }
      
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
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-3">社群媒體</h3>
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
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <MapPinIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 mr-2" />
              <h3 className="font-semibold text-lg">{block.content_data.title || '地圖位置'}</h3>
            </div>
            {block.content_data.address ? (
              <>
                <div className="mb-3">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-TK7VFC&q=${encodeURIComponent(block.content_data.address)}`}
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={block.content_data.title || '地圖位置'}
                    className="rounded-lg"
                  />
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  📍 {block.content_data.address}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500">尚未設定地址</p>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  // 四宮格專用渲染
  const renderFourGridSection = (cardConfig) => {
    const gridBlocks = (cardConfig?.content_blocks || []).slice(0, 4);
    if (gridBlocks.length === 0) return null;
    return (
      <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">精選內容</h2>
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence initial={false}>
            {gridBlocks.map((block, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-black/60 border border-yellow-500/20 rounded-xl p-4"
              >
                {renderContentBlock(block)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // 滿版滑動專用渲染
  const renderFullSliderSection = (cardConfig) => {
    const blocks = cardConfig?.content_blocks || [];
    if (blocks.length === 0) return null;
    const clampIndex = (i) => {
      const len = blocks.length;
      return ((i % len) + len) % len;
    };
    const activeIndex = clampIndex(currentSlide);
    const swipeHandlers = useSwipeable({
      onSwipedLeft: () => setCurrentSlide(activeIndex + 1),
      onSwipedRight: () => setCurrentSlide(activeIndex - 1),
      preventDefaultTouchmoveEvent: true,
      trackTouch: true
    });
    return (
      <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-2xl shadow-lg p-0 overflow-hidden">
        <div className="relative">
          <div className="p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                {...swipeHandlers}
              >
                {renderContentBlock(blocks[activeIndex])}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            {blocks.map((_, i) => (
              <button
                key={i}
                aria-label={`slide-${i}`}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 w-2 rounded-full ${i === activeIndex ? 'bg-amber-400' : 'bg-gray-500'}`}
              />
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 flex items-center">
            <button
              onClick={() => setCurrentSlide(activeIndex - 1)}
              className="m-2 px-3 py-2 rounded-full bg-black/60 text-white border border-yellow-500/30"
            >◀</button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              onClick={() => setCurrentSlide(activeIndex + 1)}
              className="m-2 px-3 py-2 rounded-full bg-black/60 text-white border border-yellow-500/30"
            >▶</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">載入失敗</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={fetchCardData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">名片不存在</h1>
          <p className="text-gray-600 dark:text-gray-300">找不到此電子名片</p>
        </div>
      </div>
    );
  }

  const { member, cardConfig } = cardData;
  const cssConfig = cardConfig?.css_config || {};
  const layoutType = cardConfig?.layout_type || 'standard';

  // 根據版型渲染不同的內容區段
  const renderByLayout = () => {
    if (layoutType === 'four_grid') return renderFourGridSection(cardConfig);
    if (layoutType === 'full_slider') return renderFullSliderSection(cardConfig);
    return (
      <>
        {/* 動態內容區塊 */}
        {cardConfig?.content_blocks && cardConfig.content_blocks.length > 0 && (
          <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">更多信息</h2>
            {cardConfig.content_blocks.map((block, index) => (
              <div key={index}>{renderContentBlock(block, index)}</div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
      }`}
      style={{ fontFamily: chineseFontStack }}
    >
      {/* 頂部操作欄 */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-yellow-500/30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCollectCard}
              className={`p-2 rounded-lg transition-colors ${
                isCollected 
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {isCollected ? <HeartSolidIcon className="h-5 w-5" /> : <HeartIcon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ShareIcon className="h-5 w-5" />
            </button>
            
            {/* 下載聯絡人按鈕已移除 */}
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 名片頭部 */}
        <div className="bg-gradient-to-br from-black/90 to-gray-900/90 border border-yellow-500/30 rounded-2xl shadow-xl overflow-hidden mb-6"
             style={{
               background: darkMode 
                 ? `linear-gradient(135deg, ${cssConfig.gradientFrom || '#1e293b'}, ${cssConfig.gradientTo || '#334155'})`
                 : `linear-gradient(135deg, ${cssConfig.gradientFrom || '#f8fafc'}, ${cssConfig.gradientTo || '#e2e8f0'})`,
               borderRadius: cssConfig.borderRadius || '16px',
               boxShadow: cssConfig.cardShadow || '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
             }}>
          <div className="p-8 text-center">
            {/* 頭像 */}
            <div className="w-24 h-24 mx-auto mb-4 overflow-hidden bg-gray-200 dark:bg-gray-700" style={{ borderRadius: '12px' }}>
              {member.profile_picture_url ? (
                <img 
                  src={member.profile_picture_url} 
                  alt={member.name}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* 基本信息：姓名＋職稱＋公司橫向排列 */}
            <div className="flex flex-wrap items-baseline justify-center gap-2 text-white mb-4">
              <h1 className="text-2xl font-bold">
                {cardConfig?.card_title || member.name}
              </h1>
              {(cardConfig?.card_subtitle || member.title || member.company) && (
                <span className="text-white/80">
                  {(cardConfig?.card_subtitle || member.title || '')}
                  {member.company ? ` @ ${member.company}` : ''}
                </span>
              )}
            </div>

            {/* 聯絡方式 ICON 按鈕 */}
            <div className="flex justify-center gap-4 mb-4">
              {member.contact_number && (
                <a 
                  href={`tel:${member.contact_number}`}
                  className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 hover:scale-110"
                  title={`電話: ${member.contact_number}`}
                >
                  <PhoneIcon className="h-6 w-6 text-white" />
                </a>
              )}
              {member.email && (
                <a 
                  href={`mailto:${member.email}`}
                  className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 hover:scale-110"
                  title={`Email: ${member.email}`}
                >
                  <EnvelopeIcon className="h-6 w-6 text-white" />
                </a>
              )}
              {(() => {
                const lineBlock = (cardConfig?.content_blocks || []).find(b => b?.content_type === 'text' && (b?.content_data?.title || '').trim() === 'LINE ID');
                const lineId = (lineBlock?.content_data?.content || '').trim();
                if (!lineId) return null;
                const deeplink = buildLineDeepLink(lineId);
                return (
                  <a
                    href={deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 bg-green-600/80 hover:bg-green-600 rounded-full transition-all duration-200 hover:scale-110"
                    title={`LINE: ${lineId}`}
                  >
                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                  </a>
                );
              })()}
              {member.website && (
                <a 
                  href={member.website?.startsWith('http') ? member.website : `https://${member.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 hover:scale-110"
                  title={`網站: ${member.website}`}
                >
                  <LinkIcon className="h-6 w-6 text-white" />
                </a>
              )}
            </div>
            
            {/* 會員等級 */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm">
              {member.membership_level === 1 && '🥇 金級會員'}
              {member.membership_level === 2 && '🥈 銀級會員'}
              {member.membership_level === 3 && '🥉 銅級會員'}
            </div>
          </div>
        </div>

        {renderByLayout()}
      </div>

      {/* 底部社群按鈕式固定列 */}
      {layoutType === 'bottom_social' && (
        <div className="fixed bottom-4 inset-x-0">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 bg-black/70 border border-yellow-500/30 rounded-xl px-3 py-2">
              {(() => {
                const socialBlock = (cardConfig?.content_blocks || []).find(b => b?.content_type === 'social');
                const entries = Object.entries(socialBlock?.content_data || {}).filter(([_, v]) => !!v);
                return entries.length > 0 ? (
                  entries.map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-amber-600 text-amber-100 text-xs rounded">
                      {key}
                    </a>
                  ))
                ) : (
                  <span className="text-amber-100 text-xs">請在社群區塊填入連結</span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 分享成功提示 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 border border-yellow-500/30 rounded-lg p-6 mx-4 max-w-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">連結已複製</h3>
              <p className="text-gray-600 dark:text-gray-300">名片連結已複製到剪貼板</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicNFCCard;