import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus,
  FaTrash,
  FaGripVertical,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaSave,
  FaUndo,
  FaRedo,
  FaImage,
  FaVideo,
  FaLink,
  FaFont,
  FaShareAlt,
  FaMapMarkerAlt,
  FaSpinner
} from 'react-icons/fa';
import NFCCardViewer from './NFCCardViewer';
import './NFCCardEditor.css';

const NFCCardEditor = () => {
  const [cardData, setCardData] = useState({
    card_title: '',
    card_subtitle: '',
    template_id: 1,
    custom_css: '',
    content: []
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [cardUrl, setCardUrl] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTemplates();
    fetchMyCard();
  }, []);

  useEffect(() => {
    // 保存歷史記錄
    if (cardData.content.length > 0 || cardData.card_title) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(cardData)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [cardData]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/nfc-cards/templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('獲取模板失敗:', error);
    }
  };

  const fetchMyCard = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/nfc-cards/my-card');
      if (response.data.success) {
        const { card, content, cardUrl } = response.data.data;
        if (card) {
          setCardData({
            card_title: card.card_title || '',
            card_subtitle: card.card_subtitle || '',
            template_id: card.template_id || 1,
            custom_css: card.custom_css || '',
            content: content || []
          });
        }
        setCardUrl(cardUrl || '');
      }
    } catch (error) {
      console.error('獲取名片失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCard = async () => {
    try {
      setSaving(true);
      const response = await axios.post('/api/nfc-cards/my-card', cardData);
      if (response.data.success) {
        setCardUrl(response.data.data.cardUrl);
        alert('名片保存成功！');
      }
    } catch (error) {
      console.error('保存名片失敗:', error);
      alert('保存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCardData(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCardData(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(cardData.content);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCardData({
      ...cardData,
      content: items
    });
  };

  const addContentBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      content_type: type,
      content_data: getDefaultContentData(type),
      is_visible: true,
      custom_styles: {}
    };

    setCardData({
      ...cardData,
      content: [...cardData.content, newBlock]
    });
    setShowAddContentModal(false);
  };

  const getDefaultContentData = (type) => {
    switch (type) {
      case 'text':
        return { title: '新標題', description: '請輸入內容描述...' };
      case 'link':
        return { title: '新連結', url: 'https://example.com', description: '連結描述' };
      case 'video':
        return { title: '影片標題', type: 'youtube', videoId: '', description: '影片描述' };
      case 'image':
        return { title: '圖片標題', url: '', alt: '圖片描述', description: '' };
      case 'social':
        return { links: [{ platform: 'LinkedIn', url: 'https://linkedin.com/in/username' }] };
      case 'map':
        return { title: '地址', address: '請輸入地址' };
      default:
        return {};
    }
  };

  const updateContentBlock = (index, field, value) => {
    const updatedContent = [...cardData.content];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      updatedContent[index].content_data[parent][child] = value;
    } else {
      updatedContent[index].content_data[field] = value;
    }
    setCardData({ ...cardData, content: updatedContent });
  };

  const toggleContentVisibility = (index) => {
    const updatedContent = [...cardData.content];
    updatedContent[index].is_visible = !updatedContent[index].is_visible;
    setCardData({ ...cardData, content: updatedContent });
  };

  const deleteContentBlock = (index) => {
    if (window.confirm('確定要刪除這個內容區塊嗎？')) {
      const updatedContent = cardData.content.filter((_, i) => i !== index);
      setCardData({ ...cardData, content: updatedContent });
    }
  };

  const handleFileUpload = async (file, contentIndex = null) => {
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/nfc-cards/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const fileUrl = response.data.data.url;
        
        if (contentIndex !== null) {
          // 更新現有內容區塊
          updateContentBlock(contentIndex, 'url', fileUrl);
        } else {
          // 創建新的內容區塊
          const contentType = file.type.startsWith('image/') ? 'image' : 'video';
          addContentBlock(contentType);
          // 更新剛創建的區塊
          setTimeout(() => {
            const lastIndex = cardData.content.length;
            updateContentBlock(lastIndex, 'url', fileUrl);
          }, 100);
        }
      }
    } catch (error) {
      console.error('文件上傳失敗:', error);
      alert('文件上傳失敗，請稍後再試');
    } finally {
      setUploadingFile(false);
    }
  };

  const copyCardUrl = () => {
    if (cardUrl) {
      navigator.clipboard.writeText(cardUrl).then(() => {
        alert('名片網址已複製到剪貼板！');
      }).catch(() => {
        alert('複製失敗，請手動複製');
      });
    } else {
      alert('請先保存名片以獲取網址');
    }
  };

  const renderContentEditor = (content, index) => {
    const { content_type, content_data, is_visible } = content;

    switch (content_type) {
      case 'text':
        return (
          <div className="content-editor text-editor">
            <input
              type="text"
              placeholder="標題"
              value={content_data.title || ''}
              onChange={(e) => updateContentBlock(index, 'title', e.target.value)}
              className="editor-input title-input"
            />
            <textarea
              placeholder="內容描述"
              value={content_data.description || ''}
              onChange={(e) => updateContentBlock(index, 'description', e.target.value)}
              className="editor-textarea"
              rows={4}
            />
          </div>
        );

      case 'link':
        return (
          <div className="content-editor link-editor">
            <input
              type="text"
              placeholder="連結標題"
              value={content_data.title || ''}
              onChange={(e) => updateContentBlock(index, 'title', e.target.value)}
              className="editor-input"
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={content_data.url || ''}
              onChange={(e) => updateContentBlock(index, 'url', e.target.value)}
              className="editor-input"
            />
            <input
              type="text"
              placeholder="連結描述（可選）"
              value={content_data.description || ''}
              onChange={(e) => updateContentBlock(index, 'description', e.target.value)}
              className="editor-input"
            />
          </div>
        );

      case 'video':
        return (
          <div className="content-editor video-editor">
            <input
              type="text"
              placeholder="影片標題"
              value={content_data.title || ''}
              onChange={(e) => updateContentBlock(index, 'title', e.target.value)}
              className="editor-input"
            />
            <select
              value={content_data.type || 'youtube'}
              onChange={(e) => updateContentBlock(index, 'type', e.target.value)}
              className="editor-select"
            >
              <option value="youtube">YouTube</option>
              <option value="upload">上傳影片</option>
            </select>
            {content_data.type === 'youtube' ? (
              <input
                type="text"
                placeholder="YouTube 影片 ID"
                value={content_data.videoId || ''}
                onChange={(e) => updateContentBlock(index, 'videoId', e.target.value)}
                className="editor-input"
              />
            ) : (
              <div className="file-upload-area">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], index)}
                  className="file-input"
                />
                {content_data.url && (
                  <div className="uploaded-file">
                    <video src={content_data.url} controls style={{width: '100%', maxHeight: '200px'}} />
                  </div>
                )}
              </div>
            )}
            <textarea
              placeholder="影片描述"
              value={content_data.description || ''}
              onChange={(e) => updateContentBlock(index, 'description', e.target.value)}
              className="editor-textarea"
              rows={3}
            />
          </div>
        );

      case 'image':
        return (
          <div className="content-editor image-editor">
            <input
              type="text"
              placeholder="圖片標題"
              value={content_data.title || ''}
              onChange={(e) => updateContentBlock(index, 'title', e.target.value)}
              className="editor-input"
            />
            <div className="file-upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], index)}
                className="file-input"
              />
              {content_data.url && (
                <div className="uploaded-file">
                  <img src={content_data.url} alt="預覽" style={{width: '100%', maxHeight: '200px', objectFit: 'cover'}} />
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="圖片描述"
              value={content_data.description || ''}
              onChange={(e) => updateContentBlock(index, 'description', e.target.value)}
              className="editor-input"
            />
          </div>
        );

      case 'social':
        return (
          <div className="content-editor social-editor">
            <h4>社群媒體連結</h4>
            {content_data.links?.map((link, linkIndex) => (
              <div key={linkIndex} className="social-link-editor">
                <select
                  value={link.platform || 'LinkedIn'}
                  onChange={(e) => {
                    const updatedLinks = [...content_data.links];
                    updatedLinks[linkIndex].platform = e.target.value;
                    updateContentBlock(index, 'links', updatedLinks);
                  }}
                  className="editor-select"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">Twitter</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                </select>
                <input
                  type="url"
                  placeholder="社群媒體網址"
                  value={link.url || ''}
                  onChange={(e) => {
                    const updatedLinks = [...content_data.links];
                    updatedLinks[linkIndex].url = e.target.value;
                    updateContentBlock(index, 'links', updatedLinks);
                  }}
                  className="editor-input"
                />
                <button
                  onClick={() => {
                    const updatedLinks = content_data.links.filter((_, i) => i !== linkIndex);
                    updateContentBlock(index, 'links', updatedLinks);
                  }}
                  className="delete-link-btn"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const updatedLinks = [...(content_data.links || []), { platform: 'LinkedIn', url: '' }];
                updateContentBlock(index, 'links', updatedLinks);
              }}
              className="add-link-btn"
            >
              <FaPlus /> 新增社群連結
            </button>
          </div>
        );

      case 'map':
        return (
          <div className="content-editor map-editor">
            <input
              type="text"
              placeholder="地點標題"
              value={content_data.title || ''}
              onChange={(e) => updateContentBlock(index, 'title', e.target.value)}
              className="editor-input"
            />
            <textarea
              placeholder="完整地址"
              value={content_data.address || ''}
              onChange={(e) => updateContentBlock(index, 'address', e.target.value)}
              className="editor-textarea"
              rows={3}
            />
          </div>
        );

      default:
        return <div>未知的內容類型</div>;
    }
  };

  if (loading) {
    return (
      <div className="nfc-card-editor loading">
        <div className="loading-spinner">
          <FaSpinner className="spin" />
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="preview-container">
        <div className="preview-header">
          <button 
            onClick={() => setPreviewMode(false)}
            className="back-to-editor-btn"
          >
            ← 返回編輯
          </button>
        </div>
        <NFCCardViewer />
      </div>
    );
  }

  return (
    <div className="nfc-card-editor">
      {/* 頂部工具欄 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <h1>NFC 電子名片編輯器</h1>
        </div>
        <div className="toolbar-right">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="toolbar-btn"
            title="復原"
          >
            <FaUndo />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="toolbar-btn"
            title="重做"
          >
            <FaRedo />
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className="toolbar-btn preview-btn"
            title="預覽"
          >
            <FaEye /> 預覽
          </button>
          <button
            onClick={copyCardUrl}
            className="toolbar-btn copy-btn"
            title="複製名片網址"
          >
            <FaCopy /> 複製網址
          </button>
          <button
            onClick={saveCard}
            disabled={saving}
            className="toolbar-btn save-btn"
            title="保存"
          >
            {saving ? <FaSpinner className="spin" /> : <FaSave />}
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        {/* 左側編輯面板 */}
        <div className="editor-panel">
          {/* 基本信息 */}
          <div className="editor-section">
            <h3>基本信息</h3>
            <div className="form-group">
              <label>名片標題</label>
              <input
                type="text"
                placeholder="例如：資深軟體工程師"
                value={cardData.card_title}
                onChange={(e) => setCardData({ ...cardData, card_title: e.target.value })}
                className="editor-input"
              />
            </div>
            <div className="form-group">
              <label>名片副標題</label>
              <input
                type="text"
                placeholder="例如：專精於全端開發"
                value={cardData.card_subtitle}
                onChange={(e) => setCardData({ ...cardData, card_subtitle: e.target.value })}
                className="editor-input"
              />
            </div>
          </div>

          {/* 模板選擇 */}
          <div className="editor-section">
            <h3>選擇模板</h3>
            <div className="template-grid">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${
                    cardData.template_id === template.id ? 'selected' : ''
                  }`}
                  onClick={() => setCardData({ ...cardData, template_id: template.id })}
                >
                  <div className="template-preview">
                    {/* 這裡可以放模板預覽圖 */}
                    <div className="template-placeholder">
                      {template.name}
                    </div>
                  </div>
                  <h4>{template.name}</h4>
                  <p>{template.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 內容區塊 */}
          <div className="editor-section">
            <div className="section-header">
              <h3>內容區塊</h3>
              <button
                onClick={() => setShowAddContentModal(true)}
                className="add-content-btn"
              >
                <FaPlus /> 新增內容
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
                    {cardData.content.map((content, index) => (
                      <Draggable
                        key={content.id}
                        draggableId={content.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <motion.div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`content-block-editor ${
                              snapshot.isDragging ? 'dragging' : ''
                            } ${!content.is_visible ? 'hidden' : ''}`}
                            layout
                          >
                            <div className="content-block-header">
                              <div className="drag-handle" {...provided.dragHandleProps}>
                                <FaGripVertical />
                              </div>
                              <span className="content-type">
                                {getContentTypeIcon(content.content_type)}
                                {getContentTypeName(content.content_type)}
                              </span>
                              <div className="content-block-actions">
                                <button
                                  onClick={() => toggleContentVisibility(index)}
                                  className="action-btn"
                                  title={content.is_visible ? '隱藏' : '顯示'}
                                >
                                  {content.is_visible ? <FaEye /> : <FaEyeSlash />}
                                </button>
                                <button
                                  onClick={() => deleteContentBlock(index)}
                                  className="action-btn delete-btn"
                                  title="刪除"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                            <div className="content-block-body">
                              {renderContentEditor(content, index)}
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {cardData.content.length === 0 && (
              <div className="empty-content">
                <p>還沒有任何內容區塊</p>
                <button
                  onClick={() => setShowAddContentModal(true)}
                  className="add-first-content-btn"
                >
                  <FaPlus /> 新增第一個內容區塊
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 右側預覽面板 */}
        <div className="preview-panel">
          <div className="preview-header">
            <h3>即時預覽</h3>
            {cardUrl && (
              <a
                href={cardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="view-live-btn"
              >
                查看線上版本
              </a>
            )}
          </div>
          <div className="preview-iframe-container">
            {/* 這裡可以嵌入預覽 */}
            <div className="preview-placeholder">
              <p>預覽功能開發中...</p>
              <p>請使用頂部的「預覽」按鈕查看完整效果</p>
            </div>
          </div>
        </div>
      </div>

      {/* 新增內容模態框 */}
      <AnimatePresence>
        {showAddContentModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddContentModal(false)}
          >
            <motion.div
              className="add-content-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>選擇內容類型</h3>
              <div className="content-type-grid">
                <button
                  onClick={() => addContentBlock('text')}
                  className="content-type-btn"
                >
                  <FaFont />
                  <span>文字</span>
                  <small>添加標題和描述文字</small>
                </button>
                <button
                  onClick={() => addContentBlock('link')}
                  className="content-type-btn"
                >
                  <FaLink />
                  <span>連結</span>
                  <small>添加外部網站連結</small>
                </button>
                <button
                  onClick={() => addContentBlock('video')}
                  className="content-type-btn"
                >
                  <FaVideo />
                  <span>影片</span>
                  <small>YouTube 或上傳影片</small>
                </button>
                <button
                  onClick={() => addContentBlock('image')}
                  className="content-type-btn"
                >
                  <FaImage />
                  <span>圖片</span>
                  <small>上傳並展示圖片</small>
                </button>
                <button
                  onClick={() => addContentBlock('social')}
                  className="content-type-btn"
                >
                  <FaShareAlt />
                  <span>社群</span>
                  <small>社群媒體連結</small>
                </button>
                <button
                  onClick={() => addContentBlock('map')}
                  className="content-type-btn"
                >
                  <FaMapMarkerAlt />
                  <span>地圖</span>
                  <small>顯示地址和地圖</small>
                </button>
              </div>
              <button
                onClick={() => setShowAddContentModal(false)}
                className="close-modal-btn"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 文件上傳進度 */}
      {uploadingFile && (
        <div className="upload-overlay">
          <div className="upload-progress">
            <FaSpinner className="spin" />
            <p>文件上傳中...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// 輔助函數
const getContentTypeIcon = (type) => {
  switch (type) {
    case 'text': return <FaFont />;
    case 'link': return <FaLink />;
    case 'video': return <FaVideo />;
    case 'image': return <FaImage />;
    case 'social': return <FaShareAlt />;
    case 'map': return <FaMapMarkerAlt />;
    default: return <FaFont />;
  }
};

const getContentTypeName = (type) => {
  switch (type) {
    case 'text': return '文字';
    case 'link': return '連結';
    case 'video': return '影片';
    case 'image': return '圖片';
    case 'social': return '社群';
    case 'map': return '地圖';
    default: return '未知';
  }
};

export default NFCCardEditor;