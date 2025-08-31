import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PublicNFCCard.css';

const PublicNFCCard = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCollected, setIsCollected] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionNotes, setCollectionNotes] = useState('');
  const [collectionTags, setCollectionTags] = useState('');
  const [collectionFolder, setCollectionFolder] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchCardData();
    checkLoginStatus();
  }, [cardId]);

  useEffect(() => {
    if (cardData && isLoggedIn) {
      checkCollectionStatus();
    }
  }, [cardData, isLoggedIn]);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/nfc-cards/public/${slug}`);
      setCardData(response.data.card);
      
      // 已由後端在 /public/:identifier 內部自動記錄瀏覽與分析，這裡不再額外呼叫
    } catch (error) {
      console.error('獲取名片資料失敗:', error);
      setError(error.response?.data?.error || '名片不存在或未公開');
    } finally {
      setLoading(false);
    }
  };

  const checkLoginStatus = () => {
    const token = localStorage.getItem('cardholderToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp > Date.now() / 1000) {
          setIsLoggedIn(true);
          setCurrentUser({ id: payload.id, email: payload.email });
        } else {
          localStorage.removeItem('cardholderToken');
        }
      } catch (error) {
        localStorage.removeItem('cardholderToken');
      }
    }
  };

  const checkCollectionStatus = async () => {
    if (!cardData || !isLoggedIn) return;
    
    try {
      const token = localStorage.getItem('cardholderToken');
      const response = await axios.get(
        `/api/digital-cardholder/collections/check/${cardData.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsCollected(response.data.isCollected);
    } catch (error) {
      console.error('檢查收藏狀態失敗:', error);
    }
  };

  const handleDownloadVCard = async () => {
    try {
      const identifier = cardData.custom_url_slug || cardData.user_id;
      const response = await axios.get(`/api/nfc-cards/vcard/${slug}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cardData.member_name || 'contact'}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const handleCollectCard = () => {
    if (!isLoggedIn) {
      alert('請先登入數位名片夾才能收藏名片');
      navigate('/digital-cardholder/login');
      return;
    }
    
    if (isCollected) {
      alert('此名片已在您的收藏中');
      return;
    }
    
    setShowCollectionModal(true);
  };

  const submitCollection = async () => {
    try {
      const token = localStorage.getItem('cardholderToken');
      const tags = collectionTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await axios.post('/api/digital-cardholder/collections', {
        card_id: cardData.id,
        notes: collectionNotes,
        tags: tags,
        folder_name: collectionFolder || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsCollected(true);
      setShowCollectionModal(false);
      setCollectionNotes('');
      setCollectionTags('');
      setCollectionFolder('');
      alert('名片收藏成功！');
    } catch (error) {
      console.error('收藏名片失敗:', error);
      alert(error.response?.data?.error || '收藏失敗，請稍後再試');
    }
  };

  const renderContentBlock = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={block.id} className={`content-block text-block ${block.style || ''}`}>
            {block.title && <h3>{block.title}</h3>}
            <p>{block.content}</p>
          </div>
        );
      
      case 'link':
        return (
          <div key={block.id} className="content-block link-block">
            <a href={block.url} target="_blank" rel="noopener noreferrer" className="link-button">
              {block.icon && <i className={`icon ${block.icon}`}></i>}
              <span>{block.title}</span>
            </a>
          </div>
        );
      
      case 'social':
        return (
          <div key={block.id} className="content-block social-block">
            <a href={block.url} target="_blank" rel="noopener noreferrer" className={`social-link ${block.platform}`}>
              <i className={`fab fa-${block.platform}`}></i>
              <span>{block.title || block.platform}</span>
            </a>
          </div>
        );
      
      case 'image':
        return (
          <div key={block.id} className="content-block image-block">
            {block.title && <h3>{block.title}</h3>}
            <img src={block.image_url} alt={block.title || '圖片'} />
            {block.description && <p>{block.description}</p>}
          </div>
        );
      
      case 'video':
        return (
          <div key={block.id} className="content-block video-block">
            {block.title && <h3>{block.title}</h3>}
            <div className="video-wrapper">
              <iframe
                src={block.embed_url}
                title={block.title || '影片'}
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
            {block.description && <p>{block.description}</p>}
          </div>
        );
      
      case 'map':
        return (
          <div key={block.id} className="content-block map-block">
            {block.title && <h3>{block.title}</h3>}
            <div className="map-wrapper">
              <iframe
                src={block.embed_url}
                title={block.title || '地圖'}
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
            {block.description && <p>{block.description}</p>}
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="public-nfc-card loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-nfc-card error">
        <div className="error-message">
-          <h2>找不到名片</h2>
-          <p>{error}</p>
-          <button onClick={() => navigate('/')} className="back-button">
-            返回首頁
-          </button>
+          <h2>名片不存在或未公開</h2>
+          <p>{error || '這張名片可能已被設定為非公開，或網址有誤。'}</p>
+          <div className="actions">
+            <button onClick={() => navigate('/')} className="back-button">
+              返回首頁
+            </button>
+            <button onClick={() => window.history.back()} className="secondary-button" style={{ marginLeft: 12 }}>
+              返回上一頁
+            </button>
+          </div>
        </div>
      </div>
    );
  }

  if (!cardData) {
    return null;
  }

  return (
    <div className={`public-nfc-card template-${cardData.template_category}`}>
      {/* 名片頭部 */}
      <div className="card-header">
        {cardData.profile_picture_url && (
          <div className="profile-picture">
            <img src={cardData.profile_picture_url} alt={cardData.member_name} />
          </div>
        )}
        <div className="basic-info">
          <h1 className="member-name">{cardData.member_name}</h1>
          {cardData.member_title && <p className="member-title">{cardData.member_title}</p>}
          {cardData.member_company && <p className="member-company">{cardData.member_company}</p>}
          {cardData.member_email && (
            <a href={`mailto:${cardData.member_email}`} className="member-email">
              {cardData.member_email}
            </a>
          )}
          {cardData.member_phone && (
            <a href={`tel:${cardData.member_phone}`} className="member-phone">
              {cardData.member_phone}
            </a>
          )}
        </div>
      </div>

      {/* 動作按鈕 */}
      <div className="action-buttons">
        <button onClick={handleDownloadVCard} className="download-vcard-btn">
          <i className="fas fa-download"></i>
          儲存聯絡人
        </button>
        <button 
          onClick={handleCollectCard} 
          className={`collect-btn ${isCollected ? 'collected' : ''}`}
          disabled={isCollected}
        >
          <i className={`fas ${isCollected ? 'fa-heart' : 'fa-heart-o'}`}></i>
          {isCollected ? '已收藏' : '收藏名片'}
        </button>
      </div>

      {/* 內容區塊 */}
      <div className="content-blocks">
        {cardData.content_blocks && cardData.content_blocks.length > 0 ? (
          cardData.content_blocks
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(block => renderContentBlock(block))
        ) : (
          <div className="no-content">
            <p>此名片暫無額外內容</p>
          </div>
        )}
      </div>

      {/* 名片統計 */}
      <div className="card-stats">
        <p>瀏覽次數: {cardData.view_count || 0}</p>
      </div>

      {/* 收藏模態框 */}
      {showCollectionModal && (
        <div className="modal-overlay" onClick={() => setShowCollectionModal(false)}>
          <div className="collection-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>收藏名片</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowCollectionModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>備註</label>
                <textarea
                  value={collectionNotes}
                  onChange={(e) => setCollectionNotes(e.target.value)}
                  placeholder="為這張名片添加備註..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>標籤</label>
                <input
                  type="text"
                  value={collectionTags}
                  onChange={(e) => setCollectionTags(e.target.value)}
                  placeholder="用逗號分隔多個標籤，例如：客戶,重要,合作夥伴"
                />
              </div>
              <div className="form-group">
                <label>資料夾</label>
                <input
                  type="text"
                  value={collectionFolder}
                  onChange={(e) => setCollectionFolder(e.target.value)}
                  placeholder="選擇或創建資料夾"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="cancel-btn" 
                onClick={() => setShowCollectionModal(false)}
              >
                取消
              </button>
              <button className="confirm-btn" onClick={submitCollection}>
                確認收藏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicNFCCard;