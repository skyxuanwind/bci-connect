import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPhone, 
  FaEnvelope, 
  FaGlobe, 
  FaMapMarkerAlt, 
  FaHeart, 
  FaShare,
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaPlay,
  FaExternalLinkAlt
} from 'react-icons/fa';
import './NFCCardViewer.css';

const NFCCardViewer = () => {
  const { userId } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareShortUrl, setShareShortUrl] = useState('');
  const [cssVars, setCssVars] = useState({ dividerStyle: 'solid-thin', dividerOpacity: 0.6, accent: '#cccccc', iconPack: '' });

  useEffect(() => {
    fetchCardData();
    checkBookmarkStatus();
  }, [userId]);

  // 訂閱後端 SSE：當名片更新時，自動重新抓取資料
  useEffect(() => {
    if (!userId) return;
    let es;
    try {
      const url = `/api/nfc-cards/events?memberId=${encodeURIComponent(userId)}`;
      es = new EventSource(url);
      const refresh = () => {
        // 重新拉取資料，確保跨裝置 3 秒內更新
        fetchCardData();
      };
      es.addEventListener('card:update', refresh);
      es.addEventListener('open', () => {});
      es.addEventListener('heartbeat', () => {});
      es.onerror = (err) => { console.warn('名片 SSE 連線錯誤:', err); };
    } catch (e) {
      console.warn('建立名片 SSE 失敗:', e);
    }
    return () => { try { es && es.close(); } catch (_) {} };
  }, [userId]);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const shareVersion = Number(params.get('v')) || Date.now();
      const response = await axios.get(`/api/nfc-cards/member/${userId}`, {
        params: { v: shareVersion },
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.data.success) {
        const data = response.data.data;
        const serverVersion = new Date(data?.updated_at || Date.now()).getTime();
        if (serverVersion > shareVersion) {
          const baseUrl = `${window.location.origin}${window.location.pathname}`;
          const newUrl = `${baseUrl}?v=${serverVersion}`;
          window.history.replaceState(null, '', newUrl);
        }
        setCardData(data);
        // 解析 custom_css 以取得 UI 變數
        const templateCfg = data.template_css_config || {};
        const accentFallback = templateCfg.accentColor || templateCfg.secondaryColor || '#cccccc';
        const vars = parseCssVars(data.custom_css, accentFallback);
        setCssVars(vars);
        // 檢查是否支援深色模式
        if (data.template_css_config?.supports_dark_mode) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setDarkMode(prefersDark);
        }
      } else {
        setError('名片不存在或已停用');
      }
    } catch (err) {
      console.error('獲取名片失敗:', err);
      setError('獲取名片失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 將 custom_css 解析為變數
  const parseCssVars = (cssText, accentFallback) => {
    try {
      const text = cssText || '';
      const getVar = (name, def) => {
        const m = text.match(new RegExp(`--${name}:\s*([^;]+);`));
        return m ? m[1].trim() : def;
      };
      const accent = getVar('nfc-accent', accentFallback || '#cccccc');
      const dividerStyle = getVar('nfc-divider-style', 'solid-thin');
      const dividerOpacityStr = getVar('nfc-divider-opacity', '0.6');
      const dividerOpacity = parseFloat(dividerOpacityStr);
      const iconPack = getVar('nfc-icon-pack', '');
      return { accent, dividerStyle, dividerOpacity: isNaN(dividerOpacity) ? 0.6 : dividerOpacity, iconPack };
    } catch {
      return { accent: accentFallback || '#cccccc', dividerStyle: 'solid-thin', dividerOpacity: 0.6, iconPack: '' };
    }
  };

  const hexToRgb = (hex) => {
    try {
      const clean = (hex || '#cccccc').replace('#', '');
      const bigint = parseInt(clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `${r}, ${g}, ${b}`;
    } catch { return '204, 204, 204'; }
  };

  const getDividerBorder = (style, colorHex, opacity) => {
    const rgb = hexToRgb(colorHex || '#cccccc');
    const alpha = typeof opacity === 'number' ? opacity : 0.6;
    const adjAlpha = darkMode ? Math.min(1, alpha + 0.15) : alpha;
    const rgba = `rgba(${rgb}, ${adjAlpha})`;
    switch (style) {
      case 'solid-thin': return `1px solid ${rgba}`;
      case 'solid-medium': return `2px solid ${rgba}`;
      case 'dashed': return `1px dashed ${rgba}`;
      case 'dotted': return `1px dotted ${rgba}`;
      case 'double': return `3px double ${rgba}`;
      case 'neon-blue':
      case 'neon-purple':
      case 'neon-pink':
        return `2px solid ${rgba}`;
      case 'gradient':
      case 'wave-soft':
      case 'curve-strong':
      case 'ornament':
        return `2px solid ${rgba}`;
      default:
        return `1px solid ${rgba}`;
    }
  };

  const getIconPackClass = (pack) => {
    const p = (pack || '').toLowerCase();
    if (p.includes('outline-thick')) return 'icon-pack-outline-thick';
    if (p.includes('duotone')) return 'icon-pack-duotone';
    if (p.includes('stroke') || p.includes('outline')) return 'icon-pack-stroke';
    if (p.includes('filled') || p.includes('solid')) return 'icon-pack-filled';
    if (p.includes('neon-blue')) return 'icon-pack-neon-blue';
    if (p.includes('neon-purple')) return 'icon-pack-neon-purple';
    if (p.includes('neon-pink')) return 'icon-pack-neon-pink';
    return '';
  };

  // 為特殊分隔線樣式注入背景圖層
  const renderDividerLayer = () => {
    const styleName = (cssVars.dividerStyle || '').toLowerCase();
    const rgb = hexToRgb(cssVars.accent);
    const alpha = typeof cssVars.dividerOpacity === 'number' ? cssVars.dividerOpacity : 0.6;
    const adjAlpha = darkMode ? Math.min(1, alpha + 0.15) : alpha;
    const bg = `rgba(${rgb}, ${adjAlpha})`;
    if (styleName === 'wave-soft') {
      return <div className="nfc-divider divider-wave-soft" style={{ backgroundColor: bg }} />;
    }
    if (styleName === 'curve-strong') {
      return <div className="nfc-divider divider-curve-strong" style={{ backgroundColor: bg }} />;
    }
    return null;
  };

  const checkBookmarkStatus = () => {
    const bookmarks = JSON.parse(localStorage.getItem('nfc_bookmarks') || '[]');
    setIsBookmarked(bookmarks.some(bookmark => bookmark.userId === userId));
  };

  const handleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('nfc_bookmarks') || '[]');
    
    if (isBookmarked) {
      // 移除收藏
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.userId !== userId);
      localStorage.setItem('nfc_bookmarks', JSON.stringify(updatedBookmarks));
      setIsBookmarked(false);
    } else {
      // 添加收藏
      const newBookmark = {
        userId: userId,
        userName: cardData.user_name,
        userCompany: cardData.user_company,
        userPosition: cardData.user_position,
        userAvatar: cardData.user_avatar,
        cardTitle: cardData.card_title,
        bookmarkedAt: new Date().toISOString(),
        notes: ''
      };
      bookmarks.push(newBookmark);
      localStorage.setItem('nfc_bookmarks', JSON.stringify(bookmarks));
      setIsBookmarked(true);
    }
  };

  // vCard 下載功能已移除

  const handleShare = async () => {
    try {
      const baseUrl = getVersionedUrl();
      let shortUrl = baseUrl;
      try {
        const resp = await axios.post('/api/links/shorten', {
          url: baseUrl,
          label: `nfc-card-${userId}`
        });
        shortUrl = resp.data?.shortUrl || baseUrl;
      } catch (e) {
        // 短連結服務不可用時，退回使用原始帶版本 URL
        shortUrl = baseUrl;
      }
      setShareShortUrl(shortUrl);

      const shareData = {
        title: `${cardData.user_name}的電子名片`,
        text: `查看 ${cardData.user_name} 的電子名片`,
        url: shortUrl
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          if (error?.name !== 'AbortError') {
            setShowShareModal(true);
          }
        }
      } else {
        setShowShareModal(true);
      }
    } catch (err) {
      console.error('分享流程發生錯誤:', err);
      setShowShareModal(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已複製到剪貼板');
    }).catch(() => {
      alert('複製失敗');
    });
  };

  // 建立 LINE 深連結（支援一般 ID 與官方帳號）
  const buildLineDeepLink = (raw) => {
    const id = String(raw || '').trim();
    if (!id) return '';
    const hasAt = id.startsWith('@') || id.includes('@');
    const clean = id.replace(/^@/, '');
    return hasAt
      ? `https://line.me/R/ti/p/@${clean}`
      : `https://line.me/R/ti/p/~${clean}`;
  };

  // 圖片輪播索引（每個內容區塊個別維護）
  const [blockCarouselIndexMap, setBlockCarouselIndexMap] = useState({});

  // 啟用各區塊輪播自動播放
  useEffect(() => {
    const blocks = cardData?.content || [];
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
  }, [cardData?.content]);

  const renderContentBlock = (content) => {
    const { content_type, content_data } = content;
    const usesLayer = ['wave-soft', 'curve-strong'].includes((cssVars.dividerStyle || '').toLowerCase());
    const borderTopCss = usesLayer ? 'none' : getDividerBorder(cssVars.dividerStyle, cssVars.accent, cssVars.dividerOpacity);
    const iconClass = getIconPackClass(cssVars.iconPack);

    switch (content_type) {
      case 'text':
        // 特別處理 LINE ID：提供可直接加好友的深連結
        if ((content_data?.title || '').trim() === 'LINE ID') {
          const lineId = (content_data?.content || content_data?.description || '').trim();
          if (!lineId) return null;
          const deeplink = buildLineDeepLink(lineId);
          return (
            <div className="content-block text-block" style={{ borderTop: borderTopCss }}>
              {usesLayer && renderDividerLayer()}
              <h3>LINE ID</h3>
              <a
                href={deeplink}
                target="_blank"
                rel="noopener noreferrer"
                className="link-button"
              >
                <FaExternalLinkAlt className={`link-icon ${iconClass}`} style={{ color: cssVars.accent }} />
                立即加為好友（{lineId}）
              </a>
            </div>
          );
        }
        return (
          <div className="content-block text-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            <h3>{content_data.title}</h3>
            <p>{content_data.description || content_data.content}</p>
          </div>
        );

      case 'link':
        return (
          <div className="content-block link-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            <a 
              href={content_data.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="link-button"
            >
              <FaExternalLinkAlt className={`link-icon ${iconClass}`} style={{ color: cssVars.accent }} />
              {content_data.title}
            </a>
            {content_data.description && (
              <p className="link-description">{content_data.description}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="content-block video-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            {content_data.title && <h3>{content_data.title}</h3>}
            <div className="video-container">
              {content_data.type === 'youtube' ? (
                <iframe
                  src={`https://www.youtube.com/embed/${content_data.videoId}`}
                  title={content_data.title}
                  frameBorder="0"
                  allowFullScreen
                ></iframe>
              ) : (
                <video controls poster={content_data.poster}>
                  <source src={content_data.url} type="video/mp4" />
                  您的瀏覽器不支援視頻播放
                </video>
              )}
            </div>
            {content_data.description && (
              <p className="video-description">{content_data.description}</p>
            )}
          </div>
        );

      case 'image':
        return (
          <div className="content-block image-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            {content_data.title && <h3>{content_data.title}</h3>}
            <img 
              src={content_data.url} 
              alt={content_data.alt || content_data.title}
              className="content-image"
            />
            {content_data.description && (
              <p className="image-description">{content_data.description}</p>
            )}
          </div>
        );

      case 'carousel': {
        const imgs = content_data?.images || [];
        if (imgs.length === 0) {
          return (
            <div className="content-block image-block" style={{ borderTop: borderTopCss }}>
              {usesLayer && renderDividerLayer()}
              {content_data.title && <h3>{content_data.title}</h3>}
              <div className="content-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}>
                無圖片
              </div>
            </div>
          );
        }
        const idx = (cardData?.content || []).indexOf(content);
        const curIdx = blockCarouselIndexMap[idx] || 0;
        const goto = (n) => {
          const next = ((n % imgs.length) + imgs.length) % imgs.length;
          setBlockCarouselIndexMap(prev => ({ ...prev, [idx]: next }));
        };
        const prevSlide = () => goto(curIdx - 1);
        const nextSlide = () => goto(curIdx + 1);
        return (
          <div className="content-block image-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            {content_data.title && <h3>{content_data.title}</h3>}
            <div className="relative">
              <div className="video-container" style={{ minHeight: 200 }}>
                <img src={imgs[curIdx]?.url} alt="" className="content-image" />
              </div>
              <button onClick={prevSlide} className="action-btn" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} aria-label="上一張">‹</button>
              <button onClick={nextSlide} className="action-btn" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} aria-label="下一張">›</button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                {imgs.map((_, i) => (
                  <button key={i} onClick={() => goto(i)} className="action-btn" aria-label={`第 ${i + 1} 張`} style={{ width: 10, height: 10, borderRadius: '50%', padding: 0, background: i === curIdx ? 'gold' : 'gray' }} />
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'social':
        return (
          <div className="content-block social-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            <h3>社群媒體</h3>
            <div className="social-links">
              {content_data.links?.map((link, index) => {
                const getSocialIcon = (platform) => {
                  switch (platform.toLowerCase()) {
                    case 'linkedin': return <FaLinkedin />;
                    case 'facebook': return <FaFacebook />;
                    case 'twitter': return <FaTwitter />;
                    case 'instagram': return <FaInstagram />;
                    case 'youtube': return <FaYoutube />;
                    default: return <FaGlobe />;
                  }
                };
                
                return (
                  <a 
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`social-link ${link.platform.toLowerCase()}`}
                    title={link.platform}
                  >
                    <span className={iconClass} style={{ color: cssVars.accent }}>{getSocialIcon(link.platform)}</span>
                    <span>{link.platform}</span>
                  </a>
                );
              })}
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="content-block map-block" style={{ borderTop: borderTopCss }}>
            {usesLayer && renderDividerLayer()}
            {content_data.title && <h3>{content_data.title}</h3>}
            <div className="map-container">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(content_data.address)}`}
                title={content_data.title || '地圖'}
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
            <div className="map-info">
              <FaMapMarkerAlt className={`map-icon ${iconClass}`} style={{ color: cssVars.accent }} />
              <span>{content_data.address}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="nfc-card-viewer loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nfc-card-viewer error">
        <div className="error-message">
          <h2>😔 找不到名片</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const templateClass = cardData.template_name?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'default';
  const themeClass = darkMode ? 'dark' : 'light';
  const contactIconStyle = { color: cssVars.accent };
  const iconClass = getIconPackClass(cssVars.iconPack);

  return (
    <div className={`nfc-card-viewer ${templateClass} ${themeClass}`}>
      {/* 注入 custom_css 以提供 CSS 變數 */}
      {cardData?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: cardData.custom_css }} />
      )}
      {/* 頂部操作欄 */}
      <div className="card-actions">
        <div className="action-buttons">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBookmark}
            className={`action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
            title={isBookmarked ? '取消收藏' : '收藏名片'}
          >
            <FaHeart />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="action-btn share-btn"
            title="分享名片"
          >
            <FaShare />
          </motion.button>
          
          {cardData.template_css_config?.supports_dark_mode && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className="action-btn theme-btn"
              title={darkMode ? '切換到淺色模式' : '切換到深色模式'}
            >
              {darkMode ? '🌞' : '🌙'}
            </motion.button>
          )}
        </div>
      </div>

      {/* 名片主體 */}
      <motion.div 
        className="card-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* 用戶頭像和基本資訊（依可見性旗標顯示，與即時預覽一致） */}
        <div className="card-header">
          {(cardData.ui_show_avatar !== false) && (cardData.avatar_url || cardData.user_avatar) && (
            <motion.div 
              className="avatar-container"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <img 
                src={cardData.avatar_url || cardData.user_avatar} 
                alt={cardData.user_name || 'avatar'}
                className="user-avatar"
              />
            </motion.div>
          )}
          
          <motion.div 
            className="user-info"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {(cardData.ui_show_name !== false) && (
              <>
                <h1 className="user-name">{cardData.user_name}</h1>
                {(cardData.user_title || cardData.user_position) && (
                  <p className="user-position">{cardData.user_title || cardData.user_position}</p>
                )}
              </>
            )}
            {(cardData.ui_show_company !== false) && cardData.user_company && (
              <p className="user-company">{cardData.user_company}</p>
            )}
            {/* 與即時預覽一致：移除 card_title 與 card_subtitle 顯示 */}
          </motion.div>
        </div>

        {/* 已依需求徹底移除完整版本聯絡資訊區塊 */}

        {/* 動態內容區塊 */}
        {cardData.content && cardData.content.length > 0 && (
          <motion.div 
            className="content-blocks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {cardData.content.map((content, index) => (
              <motion.div
                key={content.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                {renderContentBlock(content)}
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* 分享模態框 */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div 
              className="share-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>分享名片</h3>
              <div className="share-options">
                <button 
                  onClick={() => copyToClipboard(shareShortUrl || getVersionedUrl())}
                  className="share-option"
                >
                  📋 複製連結
                </button>
                <button 
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareShortUrl || getVersionedUrl())}`, '_blank')}
                  className="share-option facebook"
                >
                  📘 Facebook
                </button>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareShortUrl || getVersionedUrl())}&text=${encodeURIComponent(`查看 ${cardData.user_name} 的電子名片`)}`, '_blank')}
                  className="share-option twitter"
                >
                  🐦 Twitter
                </button>
                <button 
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareShortUrl || getVersionedUrl())}`, '_blank')}
                  className="share-option linkedin"
                >
                  💼 LinkedIn
                </button>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="close-modal"
              >
                關閉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NFCCardViewer;


  const getVersionedUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const currentV = params.get('v') || `${Date.now()}`;
    params.set('v', currentV);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };