import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PlayIcon,
  ShareIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const PublicMemberCard = () => {
  const { userId } = useParams();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchCardData();
  }, [userId]);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/member-cards/public/${userId}`);
      setCardData(response.data);
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
      link.download = `${cardData.user.name || 'contact'}.vcf`;
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
      title: `${cardData.user.name}的電子名片`,
      text: `查看${cardData.user.name}的電子名片`,
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
    switch (block.type) {
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
              {block.video_url ? (
                <iframe
                  src={block.video_url}
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
            <div className="flex flex-wrap gap-3">
              {block.social_links && Object.entries(block.social_links).map(([platform, url]) => {
                if (!url) return null;
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors capitalize"
                  >
                    {platform}
                  </a>
                );
              })}
            </div>
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
      accent: 'text-blue-600'
    },
    creative: {
      container: 'bg-gradient-to-br from-purple-50 to-pink-100',
      card: 'bg-white shadow-xl',
      header: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
      accent: 'text-purple-600'
    },
    elegant: {
      container: 'bg-gradient-to-br from-gray-50 to-slate-100',
      card: 'bg-white shadow-xl',
      header: 'bg-gradient-to-r from-gray-800 to-slate-800 text-white',
      accent: 'text-gray-700'
    }
  };

  const currentStyle = templateStyles[cardData.template?.style] || templateStyles.professional;

  return (
    <div className={`min-h-screen py-8 px-4 ${currentStyle.container}`}>
      <div className="max-w-2xl mx-auto">
        {/* 主要名片 */}
        <div className={`rounded-2xl overflow-hidden ${currentStyle.card}`}>
          {/* 頭部區域 */}
          <div className={`px-8 py-6 ${currentStyle.header}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">{cardData.user.name}</h1>
                {cardData.user.title && (
                  <p className="text-lg opacity-90">{cardData.user.title}</p>
                )}
                {cardData.user.company && (
                  <p className="opacity-80">{cardData.user.company}</p>
                )}
              </div>
              {cardData.user.avatar && (
                <img
                  src={cardData.user.avatar}
                  alt={cardData.user.name}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                />
              )}
            </div>
          </div>

          {/* 聯絡資訊 */}
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cardData.user.phone && (
                <a
                  href={`tel:${cardData.user.phone}`}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <PhoneIcon className="w-5 h-5 mr-3" />
                  {cardData.user.phone}
                </a>
              )}
              {cardData.user.email && (
                <a
                  href={`mailto:${cardData.user.email}`}
                  className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <EnvelopeIcon className="w-5 h-5 mr-3" />
                  {cardData.user.email}
                </a>
              )}
            </div>
          </div>

          {/* 動作按鈕 */}
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadVCard}
                className={`flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                儲存聯絡人
              </button>
              <button
                onClick={handleShare}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ShareIcon className="w-5 h-5 mr-2" />
                分享名片
              </button>
            </div>
          </div>

          {/* 內容區塊 */}
          {cardData.content_blocks && cardData.content_blocks.length > 0 && (
            <div className="px-8 py-6">
              {cardData.content_blocks
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(renderContentBlock)}
            </div>
          )}
        </div>

        {/* 瀏覽統計 */}
        {cardData.views > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            此名片已被瀏覽 {cardData.views} 次
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
    </div>
  );
};

export default PublicMemberCard;