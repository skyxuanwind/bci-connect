import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPhone, 
  FaEnvelope, 
  FaGlobe, 
  FaMapMarkerAlt, 
  FaDownload, 
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

  useEffect(() => {
    fetchCardData();
    checkBookmarkStatus();
  }, [userId]);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/nfc-cards/member/${userId}`);
      if (response.data.success) {
        setCardData(response.data.data);
        // 檢查是否支援深色模式
        if (response.data.data.template_css_config?.supports_dark_mode) {
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

  const handleDownloadVCard = async () => {
    try {
      const response = await axios.get(`/api/nfc-cards/member/${userId}/vcard`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardData.user_name || 'contact'}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${cardData.user_name}的電子名片`,
      text: `查看 ${cardData.user_name} 的電子名片`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('分享失敗:', error);
        setShowShareModal(true);
      }
    } else {
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

  const renderContentBlock = (content) => {
    const { content_type, content_data } = content;

    switch (content_type) {
      case 'text':
        return (
          <div className="content-block text-block">
            <h3>{content_data.title}</h3>
            <p>{content_data.description}</p>
          </div>
        );

      case 'link':
        return (
          <div className="content-block link-block">
            <a 
              href={content_data.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="link-button"
            >
              <FaExternalLinkAlt className="link-icon" />
              {content_data.title}
            </a>
            {content_data.description && (
              <p className="link-description">{content_data.description}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="content-block video-block">
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
          <div className="content-block image-block">
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

      case 'social':
        return (
          <div className="content-block social-block">
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
                    {getSocialIcon(link.platform)}
                    <span>{link.platform}</span>
                  </a>
                );
              })}
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="content-block map-block">
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
              <FaMapMarkerAlt className="map-icon" />
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

  return (
    <div className={`nfc-card-viewer ${templateClass} ${themeClass}`}>
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
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadVCard}
            className="action-btn download-btn"
            title="下載聯絡人"
          >
            <FaDownload />
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
        {/* 用戶頭像和基本信息 */}
        <div className="card-header">
          {cardData.user_avatar && (
            <motion.div 
              className="avatar-container"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <img 
                src={cardData.user_avatar} 
                alt={cardData.user_name}
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
            <h1 className="user-name">{cardData.user_name}</h1>
            {cardData.user_position && (
              <p className="user-position">{cardData.user_position}</p>
            )}
            {cardData.user_company && (
              <p className="user-company">{cardData.user_company}</p>
            )}
            {cardData.card_title && (
              <p className="card-title">{cardData.card_title}</p>
            )}
            {cardData.card_subtitle && (
              <p className="card-subtitle">{cardData.card_subtitle}</p>
            )}
          </motion.div>
        </div>

        {/* 聯絡方式 */}
        <motion.div 
          className="contact-info"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {cardData.user_phone && (
            <a href={`tel:${cardData.user_phone}`} className="contact-item phone">
              <FaPhone className="contact-icon" />
              <span>{cardData.user_phone}</span>
            </a>
          )}
          
          {cardData.user_email && (
            <a href={`mailto:${cardData.user_email}`} className="contact-item email">
              <FaEnvelope className="contact-icon" />
              <span>{cardData.user_email}</span>
            </a>
          )}
          
          {cardData.user_website && (
            <a 
              href={cardData.user_website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="contact-item website"
            >
              <FaGlobe className="contact-icon" />
              <span>{cardData.user_website}</span>
            </a>
          )}
          
          {cardData.user_address && (
            <div className="contact-item address">
              <FaMapMarkerAlt className="contact-icon" />
              <span>{cardData.user_address}</span>
            </div>
          )}
        </motion.div>

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
                  onClick={() => copyToClipboard(window.location.href)}
                  className="share-option"
                >
                  📋 複製連結
                </button>
                <button 
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                  className="share-option facebook"
                >
                  📘 Facebook
                </button>
                <button 
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`查看 ${cardData.user_name} 的電子名片`)}`, '_blank')}
                  className="share-option twitter"
                >
                  🐦 Twitter
                </button>
                <button 
                  onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')}
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