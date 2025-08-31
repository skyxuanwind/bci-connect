import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PlayIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { FaFacebook, FaInstagram, FaLine, FaLinkedin, FaTwitter, FaYoutube, FaLink } from 'react-icons/fa';

const getSocialMeta = (platform) => {
  const key = (platform || '').toLowerCase();
  switch (key) {
    case 'facebook':
      return { label: 'Facebook', icon: <FaFacebook className="mr-2" />, classes: 'bg-[#1877F2] hover:bg-[#165FDB] text-white' };
    case 'instagram':
      return { label: 'Instagram', icon: <FaInstagram className="mr-2" />, classes: 'bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white' };
    case 'line':
      return { label: 'LINE', icon: <FaLine className="mr-2" />, classes: 'bg-[#06C755] hover:bg-[#05b64d] text-white' };
    case 'linkedin':
      return { label: 'LinkedIn', icon: <FaLinkedin className="mr-2" />, classes: 'bg-[#0A66C2] hover:bg-[#095AA9] text-white' };
    case 'twitter':
      return { label: 'Twitter', icon: <FaTwitter className="mr-2" />, classes: 'bg-[#1DA1F2] hover:bg-[#178CD1] text-white' };
    case 'youtube':
      return { label: 'YouTube', icon: <FaYoutube className="mr-2" />, classes: 'bg-[#FF0000] hover:bg-[#E60000] text-white' };
    default:
      return { label: '社群', icon: <FaLink className="mr-2" />, classes: 'bg-gray-100 hover:bg-gray-200 text-gray-700' };
  }
};

const PublicMemberCard = () => {
  const { userId } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [collectLoading, setCollectLoading] = useState(false);

  useEffect(() => {
    fetchCardData();
    checkCollectionStatus();
  }, [userId]);

  const checkCollectionStatus = async () => {
    const token = localStorage.getItem('cardholderToken');
    if (!token) return;

    try {
      const response = await axios.get(`/api/digital-cardholder/check-collection/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setIsCollected(response.data.isCollected);
      }
    } catch (error) {
      console.error('Error checking collection status:', error);
    }
  };

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/member-cards/public/${userId}`);
      if (response.data.success) {
        setCardData(response.data.card);
      } else {
        setError('電子名片不存在');
      }
    } catch (error) {
      console.error('Error fetching card data:', error);
      setError('無法載入電子名片');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVCard = async () => {
    try {
      const response = await axios.get(`/api/member-cards/vcard/${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardData.member?.name || 'contact'}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading vCard:', error);
      alert('下載聯絡人失敗');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${cardData.member?.name || ''}的電子名片`,
      text: `查看${cardData.member?.name || ''}的電子名片`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const handleCollect = async () => {
    const token = localStorage.getItem('cardholderToken');
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setCollectLoading(true);
    try {
      if (isCollected) {
        // 取消收藏
        const response = await axios.delete(`/api/digital-cardholder/collections/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setIsCollected(false);
        }
      } else {
        // 添加收藏
        const response = await axios.post('/api/digital-cardholder/collections', {
          cardId: userId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setIsCollected(true);
        }
      }
    } catch (error) {
      console.error('Error handling collection:', error);
      alert(isCollected ? '取消收藏失敗' : '收藏失敗');
    } finally {
      setCollectLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('網址已複製到剪貼簿');
      setShowShareModal(false);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const renderContentBlock = (block) => {
    switch (block.block_type) {
      case 'text':
        return (
          <div key={block.id} className="mb-6">
            {block.title && (
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {block.title}
              </h3>
            )}
            {block.content && (
              <p className="text-gray-600 whitespace-pre-wrap">
                {block.content}
              </p>
            )}
          </div>
        );

      case 'link':
        return (
          <div key={block.id} className="mb-6">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <GlobeAltIcon className="w-5 h-5 mr-2" />
              {block.title || block.url}
            </a>
          </div>
        );

      case 'video':
        return (
          <div key={block.id} className="mb-6">
            {block.title && (
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {block.title}
              </h3>
            )}
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {block.url ? (
                <iframe
                  src={block.url}
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  title={block.title || 'Video'}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <PlayIcon className="w-12 h-12" />
                </div>
              )}
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className="mb-6">
            {block.title && (
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {block.title}
              </h3>
            )}
            {block.image_url && (
              <img
                src={block.image_url}
                alt={block.title || 'Image'}
                className="w-full rounded-lg shadow-md"
              />
            )}
          </div>
        );

      case 'social':
        return (
          <div key={block.id} className="mb-6">
            {block.title && (
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                {block.title}
              </h3>
            )}
            {block.url ? (
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center px-3 py-2 rounded-lg transition-colors ${getSocialMeta(block.social_platform || block.socialPlatform).classes}`}
              >
                {getSocialMeta(block.social_platform || block.socialPlatform).icon}
                <span className="font-medium">{block.title || getSocialMeta(block.social_platform || block.socialPlatform).label}</span>
              </a>
            ) : (
              <p className="text-gray-500">未提供連結</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !cardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">找不到電子名片</h2>
          <p className="text-gray-600">{error || '此電子名片不存在或已被刪除'}</p>
        </div>
      </div>
    );
  }

  const templateStyles = {
    professional: {
      container: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      card: 'bg-white shadow-xl',
      header: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
      accent: 'text-blue-600',
      primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondaryButton: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
    },
    dynamic: {
      container: 'bg-gradient-to-br from-purple-50 to-pink-100',
      card: 'bg-white shadow-xl',
      header: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
      accent: 'text-purple-600',
      primaryButton: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white',
      secondaryButton: 'border border-pink-300 text-purple-700 hover:bg-pink-50'
    },
    elegant: {
      container: 'bg-gradient-to-br from-gray-50 to-slate-100',
      card: 'bg-white shadow-xl',
      header: 'bg-gradient-to-r from-gray-800 to-slate-800 text-white',
      accent: 'text-gray-700',
      primaryButton: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      secondaryButton: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
    },
    'minimal-dark': {
      container: 'bg-slate-900',
      card: 'bg-slate-800 text-gray-100 shadow-xl',
      header: 'bg-gradient-to-r from-slate-800 to-slate-700 text-white',
      accent: 'text-emerald-400',
      primaryButton: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      secondaryButton: 'border border-slate-600 text-gray-100 hover:bg-slate-700'
    },
    card: {
      container: 'bg-slate-100',
      card: 'bg-white shadow-2xl',
      header: 'bg-white text-slate-800 border-b border-slate-200',
      accent: 'text-blue-600',
      primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white rounded-full',
      secondaryButton: 'border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full'
    },
    neumorphism: {
      container: 'bg-slate-100',
      card: 'bg-slate-100 shadow-[inset_8px_8px_16px_#cbd5e1,inset_-8px_-8px_16px_#ffffff] rounded-2xl',
      header: 'bg-slate-100 text-slate-700',
      accent: 'text-slate-600',
      primaryButton: 'bg-slate-200 hover:bg-slate-300 text-slate-800 shadow-[8px_8px_16px_#cbd5e1,-8px_-8px_16px_#ffffff]',
      secondaryButton: 'bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200'
    },
    'modern-gradient': {
      container: 'bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100',
      card: 'bg-white/90 backdrop-blur-sm shadow-2xl border border-white/20',
      header: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white',
      accent: 'text-indigo-600',
      primaryButton: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg',
      secondaryButton: 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50 backdrop-blur-sm'
    },
    'coffee-warm': {
      container: 'bg-gradient-to-br from-amber-50 to-orange-100',
      card: 'bg-gradient-to-b from-white to-amber-50/50 shadow-xl border border-amber-200/50',
      header: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
      accent: 'text-amber-700',
      primaryButton: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md',
      secondaryButton: 'border border-amber-300 text-amber-800 hover:bg-amber-50'
    },
    'tech-blue': {
      container: 'bg-gradient-to-br from-slate-900 to-blue-900',
      card: 'bg-slate-800/90 backdrop-blur-sm shadow-2xl border border-blue-500/20 text-gray-100',
      header: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white',
      accent: 'text-cyan-400',
      primaryButton: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25',
      secondaryButton: 'border border-blue-400 text-blue-300 hover:bg-blue-900/50'
    },
    'nature-green': {
      container: 'bg-gradient-to-br from-emerald-50 to-teal-100',
      card: 'bg-white/95 backdrop-blur-sm shadow-xl border border-emerald-200/50',
      header: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
      accent: 'text-emerald-700',
      primaryButton: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md',
      secondaryButton: 'border border-emerald-300 text-emerald-800 hover:bg-emerald-50'
    },
    'luxury-gold': {
      container: 'bg-gradient-to-br from-yellow-50 to-amber-100',
      card: 'bg-gradient-to-b from-white to-yellow-50/30 shadow-2xl border border-yellow-300/30',
      header: 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white',
      accent: 'text-yellow-700',
      primaryButton: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-yellow-500/25',
      secondaryButton: 'border border-yellow-400 text-yellow-800 hover:bg-yellow-50'
    }
  };

  const currentStyle = templateStyles[cardData.templateId] || templateStyles.professional;

  return (
    <div className={`min-h-screen py-8 px-4 ${currentStyle.container}`}>
      <div className="max-w-2xl mx-auto">
        {/* 主要名片 */}
        <div className={`rounded-2xl overflow-hidden ${currentStyle.card}`}>
          {/* 頭部區域 */}
          <div className={`px-8 py-6 ${currentStyle.header}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">{cardData.member?.name}</h1>
                {cardData.member?.title && (
                  <p className="text-lg opacity-90">{cardData.member.title}</p>
                )}
                {cardData.member?.company && (
                  <p className="opacity-80">{cardData.member.company}</p>
                )}
                {cardData.member?.industry && (
                  <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 text-white text-xs">
                    {cardData.member.industry}
                  </div>
                )}
              </div>
              {cardData.member?.profilePictureUrl && (
                <img
                  src={cardData.member.profilePictureUrl}
                  alt={cardData.member?.name || 'Profile'}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                />
              )}
            </div>
          </div>

          {/* 聯絡資訊 */}
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cardData.member?.contactNumber && (
                <a
                  href={`tel:${cardData.member.contactNumber}`}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <PhoneIcon className="w-5 h-5 mr-3" />
                  {cardData.member.contactNumber}
                </a>
              )}
              {cardData.member?.email && (
                <a
                  href={`mailto:${cardData.member.email}`}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <EnvelopeIcon className="w-5 h-5 mr-3" />
                  {cardData.member.email}
                </a>
              )}
            </div>
          </div>

          {/* 動作按鈕 */}
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadVCard}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${currentStyle.primaryButton}`}
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                儲存聯絡人
              </button>
              <button
                onClick={handleShare}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${currentStyle.secondaryButton}`}
              >
                <ShareIcon className="w-5 h-5 mr-2" />
                分享名片
              </button>
              <button
                onClick={handleCollect}
                disabled={collectLoading}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isCollected 
                    ? 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200' 
                    : currentStyle.secondaryButton
                } ${collectLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {collectLoading ? (
                  <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : isCollected ? (
                  <HeartSolidIcon className="w-5 h-5 mr-2 text-red-500" />
                ) : (
                  <HeartIcon className="w-5 h-5 mr-2" />
                )}
                {isCollected ? '已收藏' : '收藏名片'}
              </button>
            </div>
          </div>

          {/* 內容區塊 */}
          {cardData.contentBlocks && cardData.contentBlocks.length > 0 && (
            <div className="px-8 py-6">
              {cardData.contentBlocks
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((block) => {
                  switch (block.block_type) {
                    case 'skills':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">技能專長</h3>
                          <div className="flex flex-wrap gap-2">
                            {block.content && block.content.split('\n').filter(skill => skill.trim()).map((skill, idx) => (
                              <span key={idx} className={`px-3 py-1 rounded-full text-sm ${currentStyle.accent} bg-gray-100`}>
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    case 'experience':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">工作經歷</h3>
                          <div className="whitespace-pre-line text-gray-700">{block.content}</div>
                        </div>
                      );
                    case 'education':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">教育背景</h3>
                          <div className="whitespace-pre-line text-gray-700">{block.content}</div>
                        </div>
                      );
                    case 'portfolio':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">作品集</h3>
                          {block.content && <p className="text-gray-700 mb-3">{block.content}</p>}
                          {block.url && (
                            <a 
                              href={block.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${currentStyle.primaryButton}`}
                            >
                              查看作品
                            </a>
                          )}
                        </div>
                      );
                    case 'testimonial':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">客戶推薦</h3>
                          <blockquote className="text-gray-700 italic mb-2">"{block.content}"</blockquote>
                          {block.author && (
                            <cite className={`text-sm ${currentStyle.accent} not-italic`}>— {block.author}</cite>
                          )}
                        </div>
                      );
                    case 'achievement':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">成就獎項</h3>
                          <div className="space-y-2">
                            {block.content && block.content.split('\n').filter(achievement => achievement.trim()).map((achievement, idx) => (
                              <div key={idx} className="flex items-center">
                                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></span>
                                <span className="text-gray-700">{achievement.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    case 'service':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">服務項目</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {block.content && block.content.split('\n').filter(service => service.trim()).map((service, idx) => (
                              <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                                <span className="text-gray-700">{service.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    case 'pricing':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">價格方案</h3>
                          <div className="whitespace-pre-line text-gray-700">{block.content}</div>
                        </div>
                      );
                    case 'location':
                      return (
                        <div key={block.id} className="mb-6">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">地址位置</h3>
                          <p className="text-gray-700">{block.content}</p>
                        </div>
                      );
                    case 'qrcode':
                      return (
                        <div key={block.id} className="mb-6 text-center">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">QR Code</h3>
                          <div className="inline-block p-4 bg-white rounded-lg">
                            <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded">
                              <span className="text-xs text-gray-500">QR Code</span>
                            </div>
                          </div>
                          {block.content && <p className="text-sm text-gray-600 mt-2">{block.content}</p>}
                        </div>
                      );
                    case 'countdown':
                      return (
                        <div key={block.id} className="mb-6 text-center">
                          <h3 className="text-lg font-semibold mb-3 text-gray-800">{block.title || '倒數計時'}</h3>
                          <div className="text-2xl font-bold text-gray-800">
                            {block.target_date ? new Date(block.target_date).toLocaleDateString() : '設定目標日期'}
                          </div>
                        </div>
                      );
                    default:
                      return renderContentBlock(block);
                  }
                })}
            </div>
          )}
        </div>

        {/* 瀏覽統計 */}
        {cardData.viewCount > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            此名片已被瀏覽 {cardData.viewCount} 次
          </div>
        )}
      </div>

      {/* 分享模態框 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">分享電子名片</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                複製網址
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
                >
                  複製
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 認證模態框 */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">需要登入才能收藏</h3>
            <p className="text-gray-600 mb-6">
              請登入或註冊數位名片夾帳號，即可收藏此電子名片並在您的名片夾中管理。
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  window.location.href = '/cardholder/auth?mode=login';
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                登入帳號
              </button>
              <button
                onClick={() => {
                  window.location.href = '/cardholder/auth?mode=register';
                }}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                註冊新帳號
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMemberCard;