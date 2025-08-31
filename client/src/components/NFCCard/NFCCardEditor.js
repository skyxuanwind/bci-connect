import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './NFCCardEditor.css';

const NFCCardEditor = () => {
  const navigate = useNavigate();
  const [cardData, setCardData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [contentBlocks, setContentBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [newBlockType, setNewBlockType] = useState('text');
  const [editingBlock, setEditingBlock] = useState(null);
  const [user, setUser] = useState(null);

  // 新增區塊的表單數據
  const [blockFormData, setBlockFormData] = useState({
    type: 'text',
    title: '',
    content: '',
    url: '',
    image_url: '',
    embed_url: '',
    description: '',
    icon: '',
    platform: '',
    style: ''
  });

  useEffect(() => {
    checkAuth();
    fetchTemplates();
    fetchCardData();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      // 未登入用戶可以瀏覽，但無法編輯
      setUser(null);
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Date.now() / 1000) {
        localStorage.removeItem('token');
        setUser(null);
        return;
      }
      setUser({ id: payload.id, email: payload.email });
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/nfc-cards/templates');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('獲取模板失敗:', error);
    }
  };

  const fetchCardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // 未登入用戶顯示空白編輯器
        setCardData(null);
        setContentBlocks([]);
        setLoading(false);
        return;
      }
      
      const response = await axios.get('/api/nfc-cards/my-card', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.card) {
        setCardData(response.data.card);
        setContentBlocks(response.data.card.content_blocks || []);
      } else {
        // 如果沒有名片，創建一個預設的
        await createDefaultCard();
      }
    } catch (error) {
      console.error('獲取名片資料失敗:', error);
      if (error.response?.status === 404) {
        await createDefaultCard();
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/nfc-cards/my-card', {
        template_id: 1, // 預設使用第一個模板
        is_public: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCardData(response.data.card);
      setContentBlocks([]);
    } catch (error) {
      console.error('創建預設名片失敗:', error);
    }
  };

  const handleSaveCard = async () => {
    if (!cardData) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      await axios.put(`/api/nfc-cards/my-card`, {
        template_id: cardData.template_id,
        is_public: cardData.is_public,
        content_blocks: contentBlocks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('名片儲存成功！');
    } catch (error) {
      console.error('儲存名片失敗:', error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    setCardData(prev => ({
      ...prev,
      template_id: templateId
    }));
  };

  const handlePublicToggle = () => {
    setCardData(prev => ({
      ...prev,
      is_public: !prev.is_public
    }));
  };

  const handleAddBlock = () => {
    const newBlock = {
      id: Date.now(), // 臨時 ID
      type: blockFormData.type,
      title: blockFormData.title,
      content: blockFormData.content,
      url: blockFormData.url,
      image_url: blockFormData.image_url,
      embed_url: blockFormData.embed_url,
      description: blockFormData.description,
      icon: blockFormData.icon,
      platform: blockFormData.platform,
      style: blockFormData.style,
      sort_order: contentBlocks.length
    };
    
    setContentBlocks(prev => [...prev, newBlock]);
    setShowAddBlockModal(false);
    resetBlockForm();
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
    setBlockFormData({
      type: block.type,
      title: block.title || '',
      content: block.content || '',
      url: block.url || '',
      image_url: block.image_url || '',
      embed_url: block.embed_url || '',
      description: block.description || '',
      icon: block.icon || '',
      platform: block.platform || '',
      style: block.style || ''
    });
    setShowAddBlockModal(true);
  };

  const handleUpdateBlock = () => {
    setContentBlocks(prev => prev.map(block => 
      block.id === editingBlock.id 
        ? { ...block, ...blockFormData }
        : block
    ));
    setShowAddBlockModal(false);
    setEditingBlock(null);
    resetBlockForm();
  };

  const handleDeleteBlock = (blockId) => {
    if (window.confirm('確定要刪除此內容區塊嗎？')) {
      setContentBlocks(prev => prev.filter(block => block.id !== blockId));
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(contentBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // 更新排序
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index
    }));
    
    setContentBlocks(updatedItems);
  };

  const resetBlockForm = () => {
    setBlockFormData({
      type: 'text',
      title: '',
      content: '',
      url: '',
      image_url: '',
      embed_url: '',
      description: '',
      icon: '',
      platform: '',
      style: ''
    });
  };

  const handleImageUpload = async (file, blockId = null) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/nfc-cards/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      const imageUrl = response.data.imageUrl;
      
      if (blockId) {
        // 更新現有區塊的圖片
        setContentBlocks(prev => prev.map(block => 
          block.id === blockId 
            ? { ...block, image_url: imageUrl }
            : block
        ));
      } else {
        // 更新表單中的圖片 URL
        setBlockFormData(prev => ({ ...prev, image_url: imageUrl }));
      }
      
      return imageUrl;
    } catch (error) {
      console.error('圖片上傳失敗:', error);
      alert('圖片上傳失敗，請稍後再試');
      return null;
    }
  };

  const copyCardUrl = () => {
    if (cardData && cardData.custom_url_slug) {
      const url = `${window.location.origin}/nfc-card/${cardData.custom_url_slug}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('名片網址已複製到剪貼板！');
      }).catch(() => {
        alert('複製失敗，請手動複製網址');
      });
    }
  };

  const renderBlockForm = () => {
    switch (blockFormData.type) {
      case 'text':
        return (
          <>
            <div className="form-group">
              <label>標題</label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="輸入標題"
              />
            </div>
            <div className="form-group">
              <label>內容</label>
              <textarea
                value={blockFormData.content}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="輸入文字內容"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>樣式</label>
              <select
                value={blockFormData.style}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, style: e.target.value }))}
              >
                <option value="">一般</option>
                <option value="highlight">重點標示</option>
                <option value="important">重要提醒</option>
              </select>
            </div>
          </>
        );
      
      case 'link':
        return (
          <>
            <div className="form-group">
              <label>連結標題</label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="輸入連結標題"
              />
            </div>
            <div className="form-group">
              <label>連結網址</label>
              <input
                type="url"
                value={blockFormData.url}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="form-group">
              <label>圖示 (Font Awesome 類別)</label>
              <input
                type="text"
                value={blockFormData.icon}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, icon: e.target.value }))}
                placeholder="例如: fas fa-globe"
              />
            </div>
          </>
        );
      
      case 'social':
        return (
          <>
            <div className="form-group">
              <label>社群平台</label>
              <select
                value={blockFormData.platform}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, platform: e.target.value }))}
              >
                <option value="">選擇平台</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="line">LINE</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div className="form-group">
              <label>顯示標題</label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="輸入顯示標題"
              />
            </div>
            <div className="form-group">
              <label>連結網址</label>
              <input
                type="url"
                value={blockFormData.url}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
          </>
        );
      
      case 'image':
        return (
          <>
            <div className="form-group">
              <label>圖片標題</label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="輸入圖片標題"
              />
            </div>
            <div className="form-group">
              <label>圖片</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                }}
              />
              {blockFormData.image_url && (
                <div className="image-preview">
                  <img src={blockFormData.image_url} alt="預覽" />
                </div>
              )}
            </div>
            <div className="form-group">
              <label>圖片描述</label>
              <textarea
                value={blockFormData.description}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="輸入圖片描述"
                rows={2}
              />
            </div>
          </>
        );
      
      case 'video':
        return (
          <>
            <div className="form-group">
              <label>影片標題</label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="輸入影片標題"
              />
            </div>
            <div className="form-group">
              <label>嵌入網址 (YouTube/Vimeo)</label>
              <input
                type="url"
                value={blockFormData.embed_url}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, embed_url: e.target.value }))}
                placeholder="https://www.youtube.com/embed/VIDEO_ID"
              />
            </div>
            <div className="form-group">
              <label>影片描述</label>
              <textarea
                value={blockFormData.description}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="輸入影片描述"
                rows={2}
              />
            </div>
          </>
        );
      
      case 'map':
        return (
          <>
            <div className="form-group">
              <label>地點標題</label>
              <input
                type="text"
                value={blockFormData.title}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="輸入地點標題"
              />
            </div>
            <div className="form-group">
              <label>地圖嵌入網址</label>
              <input
                type="url"
                value={blockFormData.embed_url}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, embed_url: e.target.value }))}
                placeholder="Google Maps 嵌入網址"
              />
            </div>
            <div className="form-group">
              <label>地址描述</label>
              <textarea
                value={blockFormData.description}
                onChange={(e) => setBlockFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="輸入詳細地址或說明"
                rows={2}
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const renderContentBlock = (block, index) => {
    return (
      <Draggable key={block.id} draggableId={block.id.toString()} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`content-block-item ${snapshot.isDragging ? 'dragging' : ''}`}
          >
            <div className="block-header">
              <div className="block-info">
                <span className="block-type">{getBlockTypeName(block.type)}</span>
                <span className="block-title">{block.title || '無標題'}</span>
              </div>
              <div className="block-actions">
                <button
                  {...provided.dragHandleProps}
                  className="drag-handle"
                  title="拖曳排序"
                >
                  <i className="fas fa-grip-vertical"></i>
                </button>
                <button
                  onClick={() => handleEditBlock(block)}
                  className="edit-btn"
                  title="編輯"
                >
                  <i className="fas fa-edit"></i>
                </button>
                <button
                  onClick={() => handleDeleteBlock(block.id)}
                  className="delete-btn"
                  title="刪除"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
            <div className="block-preview">
              {renderBlockPreview(block)}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const getBlockTypeName = (type) => {
    const typeNames = {
      text: '文字',
      link: '連結',
      social: '社群',
      image: '圖片',
      video: '影片',
      map: '地圖'
    };
    return typeNames[type] || type;
  };

  const renderBlockPreview = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="text-preview">
            {block.title && <h4>{block.title}</h4>}
            <p>{block.content}</p>
          </div>
        );
      case 'link':
        return (
          <div className="link-preview">
            {block.icon && <i className={block.icon}></i>}
            <span>{block.title}</span>
          </div>
        );
      case 'social':
        return (
          <div className="social-preview">
            <i className={`fab fa-${block.platform}`}></i>
            <span>{block.title || block.platform}</span>
          </div>
        );
      case 'image':
        return (
          <div className="image-preview">
            {block.image_url && <img src={block.image_url} alt={block.title} />}
            <span>{block.title}</span>
          </div>
        );
      case 'video':
        return (
          <div className="video-preview">
            <i className="fas fa-play-circle"></i>
            <span>{block.title}</span>
          </div>
        );
      case 'map':
        return (
          <div className="map-preview">
            <i className="fas fa-map-marker-alt"></i>
            <span>{block.title}</span>
          </div>
        );
      default:
        return <span>未知類型</span>;
    }
  };

  if (loading) {
    return (
      <div className="nfc-card-editor loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  if (!cardData && !user) {
    return (
      <div className="nfc-card-editor login-required">
        <div className="login-prompt">
          <h2>歡迎使用 NFC 電子名片編輯器</h2>
          <p>請先登入以建立和編輯您的專屬電子名片</p>
          <div className="login-actions">
            <button 
              onClick={() => navigate('/login')}
              className="login-btn"
            >
              會員登入
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="register-btn"
            >
              註冊帳號
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!cardData && user) {
    return (
      <div className="nfc-card-editor error">
        <p>無法載入名片資料</p>
        <button onClick={() => window.location.reload()}>重新載入</button>
      </div>
    );
  }

  return (
    <div className="nfc-card-editor">
      <div className="editor-header">
        <h1>NFC 電子名片編輯器</h1>
        <div className="header-actions">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="preview-btn"
          >
            <i className={`fas ${previewMode ? 'fa-edit' : 'fa-eye'}`}></i>
            {previewMode ? '編輯模式' : '預覽模式'}
          </button>
          <button onClick={copyCardUrl} className="copy-url-btn">
            <i className="fas fa-copy"></i>
            複製網址
          </button>
          <button
            onClick={handleSaveCard}
            disabled={saving}
            className="save-btn"
          >
            <i className="fas fa-save"></i>
            {saving ? '儲存中...' : '儲存名片'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        {!previewMode ? (
          <>
            {/* 設定面板 */}
            <div className="settings-panel">
              <div className="setting-group">
                <h3>基本設定</h3>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={cardData.is_public}
                      onChange={handlePublicToggle}
                    />
                    公開名片 (其他人可以瀏覽)
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h3>選擇模板</h3>
                <div className="template-grid">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className={`template-card ${
                        cardData.template_id === template.id ? 'selected' : ''
                      }`}
                      onClick={() => handleTemplateChange(template.id)}
                    >
                      <div className={`template-preview template-${template.category}`}>
                        <h4>{template.name}</h4>
                        <p>{template.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 內容區塊管理 */}
            <div className="content-management">
              <div className="content-header">
                <h3>內容區塊</h3>
                <button
                  onClick={() => setShowAddBlockModal(true)}
                  className="add-block-btn"
                >
                  <i className="fas fa-plus"></i>
                  新增區塊
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="content-blocks">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="content-blocks-list"
                    >
                      {contentBlocks.length === 0 ? (
                        <div className="empty-blocks">
                          <p>尚未新增任何內容區塊</p>
                          <p>點擊「新增區塊」開始建立您的名片內容</p>
                        </div>
                      ) : (
                        contentBlocks.map((block, index) => renderContentBlock(block, index))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </>
        ) : (
          /* 預覽模式 */
          <div className="preview-container">
            <div className="preview-frame">
              <iframe
                src={`/nfc-card/${cardData.custom_url_slug}?preview=true`}
                title="名片預覽"
                className="preview-iframe"
              />
            </div>
          </div>
        )}
      </div>

      {/* 新增/編輯區塊模態框 */}
      {showAddBlockModal && (
        <div className="modal-overlay" onClick={() => setShowAddBlockModal(false)}>
          <div className="block-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBlock ? '編輯區塊' : '新增區塊'}</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowAddBlockModal(false);
                  setEditingBlock(null);
                  resetBlockForm();
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>區塊類型</label>
                <select
                  value={blockFormData.type}
                  onChange={(e) => setBlockFormData(prev => ({ ...prev, type: e.target.value }))}
                  disabled={!!editingBlock}
                >
                  <option value="text">文字</option>
                  <option value="link">連結</option>
                  <option value="social">社群</option>
                  <option value="image">圖片</option>
                  <option value="video">影片</option>
                  <option value="map">地圖</option>
                </select>
              </div>
              {renderBlockForm()}
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowAddBlockModal(false);
                  setEditingBlock(null);
                  resetBlockForm();
                }}
              >
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={editingBlock ? handleUpdateBlock : handleAddBlock}
              >
                {editingBlock ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFCCardEditor;