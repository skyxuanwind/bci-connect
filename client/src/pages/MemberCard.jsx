import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUser,
  FaBuilding,
  FaBriefcase,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaMapMarkerAlt,
  FaDownload,
  FaShare,
  FaHeart,
  FaHeartBroken,
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaLink,
  FaImage,
  FaVideo,
  FaEye,
  FaPalette,
  FaMoon,
  FaSun,
  FaQrcode,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import axios from 'axios';
import QRCode from 'qrcode.react';
import './MemberCard.css';

const MemberCard = () => {
  const { memberId } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('tech');
  const [darkMode, setDarkMode] = useState(false);
  const [showBookmarkSuccess, setShowBookmarkSuccess] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    if (memberId) {
      fetchCardData();
      checkBookmarkStatus();
      incrementViewCount();
    }
  }, [memberId]);

  useEffect(() => {
    // 檢查系統深色模式偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/nfc-cards/${memberId}`);
      setCardData(response.data);
      setSelectedTemplate(response.data.template || 'tech');
    } catch (error) {
      console.error('獲取名片資料失敗:', error);
      setError('名片不存在或已被刪除');
    } finally {
      setLoading(false);
    }
  };

  const checkBookmarkStatus = () => {
    const bookmarks = JSON.parse(localStorage.getItem('nfc_bookmarks') || '[]');
    const isAlreadyBookmarked = bookmarks.some(bookmark => bookmark.userId === memberId);
    setIsBookmarked(isAlreadyBookmarked);
  };

  const incrementViewCount = async () => {
    try {
      const response = await axios.post(`/api/nfc-cards/${memberId}/view`);
      setViewCount(response.data.viewCount || 0);
    } catch (error) {
      console.error('更新瀏覽次數失敗:', error);
    }
  };

  const handleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('nfc_bookmarks') || '[]');
    
    if (isBookmarked) {
      // 移除收藏
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.userId !== memberId);
      localStorage.setItem('nfc_bookmarks', JSON.stringify(updatedBookmarks));
      setIsBookmarked(false);
    } else {
      // 添加收藏
      const bookmarkData = {
        userId: memberId,
        userName: cardData.personalInfo?.name || '未知用戶',
        userCompany: cardData.personalInfo?.company || '',
        userPosition: cardData.personalInfo?.position || '',
        userAvatar: cardData.personalInfo?.avatar || '',
        cardTitle: cardData.title || '',
        bookmarkedAt: new Date().toISOString(),
        template: selectedTemplate
      };
      
      const updatedBookmarks = [...bookmarks, bookmarkData];
      localStorage.setItem('nfc_bookmarks', JSON.stringify(updatedBookmarks));
      setIsBookmarked(true);
      setShowBookmarkSuccess(true);
      setTimeout(() => setShowBookmarkSuccess(false), 3000);
    }
  };

  const downloadVCard = async () => {
    try {
      const response = await axios.get(`/api/nfc-cards/vcard/${memberId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardData.personalInfo?.name || 'contact'}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const shareCard = async () => {
    const cardUrl = window.location.href;
    const shareData = {
      title: `${cardData.personalInfo?.name}的電子名片`,
      text: `查看 ${cardData.personalInfo?.name} 的電子名片`,
      url: cardUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('分享失敗:', error);
        copyToClipboard(cardUrl);
      }
    } else {
      copyToClipboard(cardUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('名片網址已複製到剪貼板！');
    }).catch(() => {
      alert('複製失敗');
    });
  };

  const renderContentBlock = (block, index) => {
    switch (block.type) {
      case 'text':
        return (
          <motion.div 
            key={index}
            className="content-block text-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <h3>{block.title}</h3>
            <p>{block.content}</p>
          </motion.div>
        );
      
      case 'link':
        return (
          <motion.div 
            key={index}
            className="content-block link-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <a 
              href={block.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="link-button"
            >
              <FaLink className="link-icon" />
              <span>{block.title}</span>
            </a>
          </motion.div>
        );
      
      case 'image':
        return (
          <motion.div 
            key={index}
            className="content-block image-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {block.title && (
              <h3 className="block-title">{block.title}</h3>
            )}
            <div className="image-container">
              {block.url ? (
                <img 
                  src={block.url} 
                  alt={block.alt || '圖片'} 
                  className="rounded-lg w-full object-cover"
                  style={{ maxHeight: '400px' }}
                />
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">尚未上傳圖片</p>
                </div>
              )}
              {block.alt && (
                <p className="mt-2 text-sm text-gray-600 italic text-center">
                  {block.alt}
                </p>
              )}
            </div>
          </motion.div>
        );
      
      case 'video':
        return (
          <motion.div 
            key={index}
            className="content-block video-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {block.title && <h3>{block.title}</h3>}
            <div className="video-container">
              {block.type === 'youtube' && block.videoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${block.videoId}`}
                  title={block.title || '影片'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : block.file ? (
                <video controls className="w-full rounded-lg">
                  <source src={block.file} type="video/mp4" />
                  您的瀏覽器不支援影片播放。
                </video>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">尚未設定影片內容</p>
                </div>
              )}
            </div>
            {block.description && <p className="video-description">{block.description}</p>}
          </motion.div>
        );
      
      case 'social':
        const socialPlatforms = [
          { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: 'bg-blue-600 hover:bg-blue-700' },
          { key: 'facebook', name: 'Facebook', icon: <FaFacebook />, color: 'bg-blue-500 hover:bg-blue-600' },
          { key: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: 'bg-pink-500 hover:bg-pink-600' },
          { key: 'twitter', name: 'Twitter', icon: <FaTwitter />, color: 'bg-blue-400 hover:bg-blue-500' },
          { key: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: 'bg-red-500 hover:bg-red-600' },
          { key: 'tiktok', name: 'TikTok', icon: <FaLink />, color: 'bg-black hover:bg-gray-800' }
        ];
        
        const activePlatforms = socialPlatforms.filter(platform => block[platform.key]);
        
        if (activePlatforms.length === 0) return null;
        
        return (
          <motion.div 
            key={index}
            className="content-block social-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <h3>社群媒體</h3>
            <div className="grid grid-cols-2 gap-3">
              {activePlatforms.map(platform => (
                <a 
                  key={platform.key}
                  href={block[platform.key]} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg text-white font-medium transition-colors ${platform.color}`}
                >
                  <span className="text-lg">{platform.icon}</span>
                  <span>{platform.name}</span>
                </a>
              ))}
            </div>
          </motion.div>
        );
      
      case 'map':
        return (
          <motion.div 
            key={index}
            className="content-block map-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <h3>{block.title || '地圖位置'}</h3>
            <div className="map-container">
              {block.address ? (
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWTgHz-TK7VFC&q=${encodeURIComponent(block.address)}`}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={block.title || '地圖位置'}
                  className="rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <p className="text-gray-500">尚未設定地址</p>
                </div>
              )}
              {block.address && (
                <p className="mt-2 text-sm text-gray-600 text-center">
                  📍 {block.address}
                </p>
              )}
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="member-card-page loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="member-card-page error">
        <div className="error-message">
          <FaTimes className="error-icon" />
          <h2>載入失敗</h2>
          <p>{error}</p>
          <button onClick={() => window.history.back()} className="back-button">
            返回上頁
          </button>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="member-card-page error">
        <div className="error-message">
          <FaUser className="error-icon" />
          <h2>名片不存在</h2>
          <p>您要查看的名片可能已被刪除或不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`member-card-page template-${selectedTemplate} ${darkMode ? 'dark-mode' : ''}`}>
      {/* 成功提示 */}
      <AnimatePresence>
        {showBookmarkSuccess && (
          <motion.div 
            className="bookmark-success"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            <FaCheck className="success-icon" />
            <span>已加入名片夾！</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頂部工具欄 */}
      <div className="top-toolbar">
        <div className="toolbar-left">
          <button 
            onClick={() => setShowQR(!showQR)}
            className="toolbar-btn qr-btn"
            title="顯示QR碼"
          >
            <FaQrcode />
          </button>
          <div className="view-count">
            <FaEye className="view-icon" />
            <span>{viewCount}</span>
          </div>
        </div>
        
        <div className="toolbar-right">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="toolbar-btn theme-btn"
            title={darkMode ? '淺色模式' : '深色模式'}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          
          <div className="template-selector">
            <button 
              onClick={() => setSelectedTemplate('tech')}
              className={`template-btn ${selectedTemplate === 'tech' ? 'active' : ''}`}
              title="科技專業版"
            >
              <FaPalette />
            </button>
            <button 
              onClick={() => setSelectedTemplate('creative')}
              className={`template-btn ${selectedTemplate === 'creative' ? 'active' : ''}`}
              title="活力創意版"
            >
              <FaPalette />
            </button>
            <button 
              onClick={() => setSelectedTemplate('minimal')}
              className={`template-btn ${selectedTemplate === 'minimal' ? 'active' : ''}`}
              title="簡約質感版"
            >
              <FaPalette />
            </button>
            <button 
              onClick={() => setSelectedTemplate('business')}
              className={`template-btn ${selectedTemplate === 'business' ? 'active' : ''}`}
              title="商務專業版"
            >
              <FaPalette />
            </button>
            <button 
              onClick={() => setSelectedTemplate('modern')}
              className={`template-btn ${selectedTemplate === 'modern' ? 'active' : ''}`}
              title="現代簡約版"
            >
              <FaPalette />
            </button>
            <button 
              onClick={() => setSelectedTemplate('eco')}
              className={`template-btn ${selectedTemplate === 'eco' ? 'active' : ''}`}
              title="環保綠意版"
            >
              <FaPalette />
            </button>
          </div>
        </div>
      </div>

      {/* QR碼彈窗 */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            className="qr-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
          >
            <motion.div 
              className="qr-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>掃描QR碼分享名片</h3>
              <div className="qr-code-container">
                <QRCode 
                  value={window.location.href}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p>使用手機掃描此QR碼即可快速訪問名片</p>
              <button onClick={() => setShowQR(false)} className="close-qr-btn">
                關閉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主要內容 */}
      <div className="card-container">
        {/* 個人資訊區域 */}
        <motion.div 
          className="personal-info-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="avatar-container">
            {cardData.personalInfo?.avatar ? (
              <img 
                src={cardData.personalInfo.avatar} 
                alt={cardData.personalInfo.name}
                className="user-avatar"
              />
            ) : (
              <div className="avatar-placeholder">
                <FaUser />
              </div>
            )}
          </div>
          
          <div className="personal-details">
            <h1 className="user-name">{cardData.personalInfo?.name || '未知用戶'}</h1>
            
            {cardData.personalInfo?.position && (
              <p className="user-position">
                <FaBriefcase className="info-icon" />
                {cardData.personalInfo.position}
              </p>
            )}
            
            {cardData.personalInfo?.company && (
              <p className="user-company">
                <FaBuilding className="info-icon" />
                {cardData.personalInfo.company}
              </p>
            )}
            
            {cardData.personalInfo?.bio && (
              <p className="user-bio">{cardData.personalInfo.bio}</p>
            )}
          </div>
        </motion.div>

        {/* 聯絡資訊 */}
        {(cardData.personalInfo?.phone || cardData.personalInfo?.email || cardData.personalInfo?.website) && (
          <motion.div 
            className="contact-info-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2>聯絡資訊</h2>
            <div className="contact-grid">
              {cardData.personalInfo.phone && (
                <a href={`tel:${cardData.personalInfo.phone}`} className="contact-item phone">
                  <FaPhone className="contact-icon" />
                  <span>{cardData.personalInfo.phone}</span>
                </a>
              )}
              
              {cardData.personalInfo.email && (
                <a href={`mailto:${cardData.personalInfo.email}`} className="contact-item email">
                  <FaEnvelope className="contact-icon" />
                  <span>{cardData.personalInfo.email}</span>
                </a>
              )}
              
              {cardData.personalInfo.website && (
                <a href={cardData.personalInfo.website} target="_blank" rel="noopener noreferrer" className="contact-item website">
                  <FaGlobe className="contact-icon" />
                  <span>{cardData.personalInfo.website}</span>
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* 動態內容區塊 */}
        {cardData.contentBlocks && cardData.contentBlocks.length > 0 && (
          <div className="content-blocks-section">
            {cardData.contentBlocks.map((block, index) => renderContentBlock(block, index))}
          </div>
        )}

        {/* 操作按鈕 */}
        <motion.div 
          className="action-buttons"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <button 
            onClick={handleBookmark}
            className={`action-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          >
            {isBookmarked ? <FaHeartBroken /> : <FaHeart />}
            <span>{isBookmarked ? '取消收藏' : '收藏名片'}</span>
          </button>
          
          <button onClick={downloadVCard} className="action-btn download-btn">
            <FaDownload />
            <span>儲存聯絡人</span>
          </button>
          
          <button onClick={shareCard} className="action-btn share-btn">
            <FaShare />
            <span>分享名片</span>
          </button>
        </motion.div>
      </div>

      {/* 底部資訊 */}
      <div className="card-footer">
        <p>由 BCI Connect 提供技術支援</p>
        <a href="/digital-wallet" className="wallet-link">
          查看我的名片夾 →
        </a>
      </div>
    </div>
  );
};

export default MemberCard;