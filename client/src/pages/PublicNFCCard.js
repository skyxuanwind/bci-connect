import React, { useState, useEffect } from 'react';
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
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
  UserIcon
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
  const { memberId } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchCardData();
    checkIfCollected();
  }, [memberId]);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/nfc-cards/member/${memberId}`);
      setCardData(response.data);
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

  const handleDownloadVCard = async () => {
    try {
      const response = await axios.get(`/api/nfc-cards/member/${memberId}/vcard`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardData.member.name}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載聯絡人失敗:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${cardData.member.name} - 電子名片`,
      text: `查看 ${cardData.member.name} 的電子名片`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('分享取消');
      }
    } else {
      // 複製到剪貼板
      navigator.clipboard.writeText(window.location.href);
      setShowShareModal(true);
      setTimeout(() => setShowShareModal(false), 2000);
    }
  };

  const renderContentBlock = (block) => {
    switch (block.content_type) {
      case 'text':
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
                className="w-full rounded-lg shadow-md object-cover"
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* 頂部操作欄 */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
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
            
            <button
              onClick={handleDownloadVCard}
              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 名片頭部 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6"
             style={{
               background: darkMode 
                 ? `linear-gradient(135deg, ${cssConfig.gradientFrom || '#1e293b'}, ${cssConfig.gradientTo || '#334155'})`
                 : `linear-gradient(135deg, ${cssConfig.gradientFrom || '#f8fafc'}, ${cssConfig.gradientTo || '#e2e8f0'})`,
               borderRadius: cssConfig.borderRadius || '16px',
               boxShadow: cssConfig.cardShadow || '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
             }}>
          <div className="p-8 text-center">
            {/* 頭像 */}
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              {member.profile_picture_url ? (
                <img 
                  src={member.profile_picture_url} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* 基本信息 */}
            <h1 className="text-2xl font-bold text-white mb-2">
              {cardConfig?.card_title || member.name}
            </h1>
            <p className="text-white/80 mb-4">
              {cardConfig?.card_subtitle || `${member.title} @ ${member.company}`}
            </p>
            
            {/* 會員等級 */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm">
              {member.membership_level === 1 && '🥇 金級會員'}
              {member.membership_level === 2 && '🥈 銀級會員'}
              {member.membership_level === 3 && '🥉 銅級會員'}
            </div>
          </div>
        </div>

        {/* 聯絡信息 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">聯絡方式</h2>
          
          <div className="space-y-3">
            {member.contact_number && (
              <a 
                href={`tel:${member.contact_number}`}
                className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <PhoneIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                <span className="text-gray-900 dark:text-white">{member.contact_number}</span>
              </a>
            )}
            
            <a 
              href={`mailto:${member.email}`}
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <EnvelopeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
              <span className="text-gray-900 dark:text-white">{member.email}</span>
            </a>
            
            {member.company && (
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <BuildingOfficeIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-3" />
                <span className="text-gray-900 dark:text-white">{member.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* 動態內容區塊 */}
        {cardConfig?.content_blocks && cardConfig.content_blocks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">更多信息</h2>
            {cardConfig.content_blocks.map((block, index) => (
              <div key={index}>
                {renderContentBlock(block)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分享成功提示 */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 max-w-sm">
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