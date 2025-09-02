import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  Bars3Icon,
  PhotoIcon,
  LinkIcon,
  PlayIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const NFCCardEditor = () => {
  const { user } = useAuth();
  const [cardConfig, setCardConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  useEffect(() => {
    fetchCardData();
    fetchTemplates();
  }, []);

  const fetchCardData = async () => {
    try {
      const response = await axios.get('/api/nfc-cards/my-card');
      setCardConfig(response.data.cardConfig);
    } catch (error) {
      console.error('獲取名片配置失敗:', error);
    } finally {
      setLoading(false);
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

  const handleSaveBasicInfo = async () => {
    try {
      setSaving(true);
      await axios.put('/api/nfc-cards/my-card', {
        card_title: cardConfig.card_title,
        card_subtitle: cardConfig.card_subtitle,
        template_id: cardConfig.template_id,
        custom_css: cardConfig.custom_css
      });
      alert('基本信息保存成功！');
    } catch (error) {
      console.error('保存失敗:', error);
      alert('保存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setSaving(true);
      await axios.post('/api/nfc-cards/my-card/content', {
        content_blocks: cardConfig.content_blocks || []
      });
      alert('內容保存成功！');
    } catch (error) {
      console.error('保存內容失敗:', error);
      alert('保存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setCardConfig({
      ...cardConfig,
      template_id: templateId,
      template_name: template?.name,
      css_config: template?.css_config
    });
  };

  const handleAddContentBlock = (blockType) => {
    const newBlock = {
      id: Date.now(),
      content_type: blockType,
      content_data: getDefaultContentData(blockType),
      display_order: (cardConfig.content_blocks || []).length,
      is_visible: true,
      custom_styles: {}
    };
    
    setCardConfig({
      ...cardConfig,
      content_blocks: [...(cardConfig.content_blocks || []), newBlock]
    });
    
    setShowAddBlockModal(false);
  };

  const getDefaultContentData = (blockType) => {
    switch (blockType) {
      case 'text':
        return { title: '標題', content: '內容描述' };
      case 'link':
        return { title: '連結標題', url: 'https://example.com' };
      case 'video':
        return { title: '影片標題', url: 'https://youtube.com/watch?v=...' };
      case 'image':
        return { url: '', alt: '圖片描述', caption: '' };
      case 'social':
        return { linkedin: '', facebook: '', instagram: '', twitter: '' };
      case 'map':
        return { address: '地址', map_url: '', coordinates: null };
      default:
        return {};
    }
  };

  const handleDeleteBlock = (blockIndex) => {
    const updatedBlocks = cardConfig.content_blocks.filter((_, index) => index !== blockIndex);
    setCardConfig({
      ...cardConfig,
      content_blocks: updatedBlocks
    });
  };

  const handleEditBlock = (blockIndex, newData) => {
    const updatedBlocks = [...cardConfig.content_blocks];
    updatedBlocks[blockIndex] = {
      ...updatedBlocks[blockIndex],
      content_data: newData
    };
    setCardConfig({
      ...cardConfig,
      content_blocks: updatedBlocks
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(cardConfig.content_blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新 display_order
    const updatedItems = items.map((item, index) => ({
      ...item,
      display_order: index
    }));

    setCardConfig({
      ...cardConfig,
      content_blocks: updatedItems
    });
  };

  const copyCardUrl = () => {
    const cardUrl = `${window.location.origin}/member/${user.id}`;
    navigator.clipboard.writeText(cardUrl);
    alert('名片網址已複製到剪貼板！');
  };

  const renderBlockEditor = (block, index) => {
    const isEditing = editingBlock === index;
    
    return (
      <Draggable key={block.id || index} draggableId={String(block.id || index)} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div {...provided.dragHandleProps}>
                  <Bars3Icon className="h-5 w-5 text-gray-400 cursor-move" />
                </div>
                <span className="font-medium text-gray-700 capitalize">
                  {getBlockTypeLabel(block.content_type)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingBlock(isEditing ? null : index)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  {isEditing ? <CheckIcon className="h-4 w-4" /> : <PencilIcon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleDeleteBlock(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {isEditing ? (
              <BlockContentEditor 
                block={block}
                onSave={(newData) => {
                  handleEditBlock(index, newData);
                  setEditingBlock(null);
                }}
                onCancel={() => setEditingBlock(null)}
              />
            ) : (
              <BlockPreview block={block} />
            )}
          </div>
        )}
      </Draggable>
    );
  };

  const getBlockTypeLabel = (type) => {
    const labels = {
      text: '文字',
      link: '連結',
      video: '影片',
      image: '圖片',
      social: '社群',
      map: '地圖'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部操作欄 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">電子名片編輯器</h1>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={copyCardUrl}
                className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                複製名片網址
              </button>
              
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  previewMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                {previewMode ? '編輯模式' : '預覽模式'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {previewMode ? (
          // 預覽模式
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">名片預覽</h2>
              <div className="border border-gray-200 rounded-lg p-6 min-h-96">
                {/* 預覽內容 */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {cardConfig?.card_title || '未設定標題'}
                  </h1>
                  <p className="text-gray-600">
                    {cardConfig?.card_subtitle || '未設定副標題'}
                  </p>
                </div>
                
                {/* 內容區塊預覽 */}
                <div className="space-y-4">
                  {cardConfig?.content_blocks?.length > 0 ? (
                    cardConfig.content_blocks.map((block, index) => (
                      <div key={index} className="border border-gray-100 rounded-lg p-4">
                        <BlockPreview block={block} />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>尚未添加任何內容區塊</p>
                      <p className="text-sm mt-1">請在編輯模式中添加內容</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                  <a 
                    href={`/member/${user.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    查看完整版本
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 編輯模式
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 左側：基本設定 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">基本設定</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      名片標題
                    </label>
                    <input
                      type="text"
                      value={cardConfig?.card_title || ''}
                      onChange={(e) => setCardConfig({
                        ...cardConfig,
                        card_title: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="輸入名片標題"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      副標題
                    </label>
                    <input
                      type="text"
                      value={cardConfig?.card_subtitle || ''}
                      onChange={(e) => setCardConfig({
                        ...cardConfig,
                        card_subtitle: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="輸入副標題"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇模板
                    </label>
                    <select
                      value={cardConfig?.template_id || ''}
                      onChange={(e) => handleTemplateChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={handleSaveBasicInfo}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '保存中...' : '保存基本設定'}
                  </button>
                </div>
              </div>
              
              {/* 添加內容區塊 */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">添加內容</h2>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: 'text', icon: ChatBubbleLeftRightIcon, label: '文字' },
                    { type: 'link', icon: LinkIcon, label: '連結' },
                    { type: 'video', icon: PlayIcon, label: '影片' },
                    { type: 'image', icon: PhotoIcon, label: '圖片' },
                    { type: 'social', icon: ChatBubbleLeftRightIcon, label: '社群' },
                    { type: 'map', icon: MapPinIcon, label: '地圖' }
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => handleAddContentBlock(type)}
                      className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Icon className="h-6 w-6 text-gray-600 mb-1" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 右側：內容編輯 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">內容區塊</h2>
                  <button
                    onClick={handleSaveContent}
                    disabled={saving}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '保存中...' : '保存內容'}
                  </button>
                </div>
                
                {cardConfig?.content_blocks && cardConfig.content_blocks.length > 0 ? (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="content-blocks">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          {cardConfig.content_blocks.map((block, index) => 
                            renderBlockEditor(block, index)
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <PhotoIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>尚未添加任何內容區塊</p>
                    <p className="text-sm">點擊左側按鈕開始添加內容</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 區塊內容編輯器組件
const BlockContentEditor = ({ block, onSave, onCancel }) => {
  const [data, setData] = useState(block.content_data);
  
  const handleSave = () => {
    onSave(data);
  };
  
  const renderEditor = () => {
    switch (block.content_type) {
      case 'text':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="標題"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={data.content || ''}
              onChange={(e) => setData({ ...data, content: e.target.value })}
              placeholder="內容"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );
      
      case 'link':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="連結標題"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="url"
              value={data.url || ''}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );
      
      case 'social':
        return (
          <div className="space-y-3">
            {['linkedin', 'facebook', 'instagram', 'twitter'].map(platform => (
              <input
                key={platform}
                type="url"
                value={data[platform] || ''}
                onChange={(e) => setData({ ...data, [platform]: e.target.value })}
                placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            ))}
          </div>
        );
      
      default:
        return (
          <div className="text-gray-500 text-center py-4">
            此類型的編輯器尚未實現
          </div>
        );
    }
  };
  
  return (
    <div>
      {renderEditor()}
      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
};

// 區塊預覽組件
const BlockPreview = ({ block }) => {
  const { content_data } = block;
  
  switch (block.content_type) {
    case 'text':
      return (
        <div>
          <h4 className="font-medium text-gray-900">{content_data.title}</h4>
          <p className="text-gray-600 text-sm mt-1">{content_data.content}</p>
        </div>
      );
    
    case 'link':
      return (
        <div className="flex items-center">
          <LinkIcon className="h-4 w-4 text-blue-600 mr-2" />
          <span className="text-blue-600">{content_data.title}</span>
        </div>
      );
    
    case 'social':
      return (
        <div className="flex flex-wrap gap-2">
          {Object.entries(content_data).filter(([_, url]) => url).map(([platform, url]) => (
            <span key={platform} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              {platform}
            </span>
          ))}
        </div>
      );
    
    default:
      return (
        <div className="text-gray-500 text-sm">
          {getBlockTypeLabel(block.content_type)} 內容
        </div>
      );
  }
};

const getBlockTypeLabel = (type) => {
  const labels = {
    text: '文字',
    link: '連結',
    video: '影片',
    image: '圖片',
    social: '社群',
    map: '地圖'
  };
  return labels[type] || type;
};

export default NFCCardEditor;