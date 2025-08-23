import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  LinkIcon,
  PhotoIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

const MemberCardEditor = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('content');
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [localBlockData, setLocalBlockData] = useState({});
  const debounceTimers = useRef({});
  const [templates, setTemplates] = useState([
    { id: 'professional', name: '簡約專業版', style: 'professional' },
    { id: 'creative', name: '活力動感版', style: 'creative' },
    { id: 'elegant', name: '經典典雅版', style: 'elegant' }
  ]);

  useEffect(() => {
    fetchCardData();
    fetchStats();
  }, []);

  // 清理防抖計時器
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/member-cards/my-card');
      const { card, templates } = response.data;
      setCardData({
        id: card.id,
        template_id: card.templateId,
        view_count: card.viewCount,
        content_blocks: (card.contentBlocks || []).map(block => ({
          id: block.id,
          type: block.block_type,
          title: block.title,
          content: block.content,
          url: block.url,
          image_url: block.image_url,
          social_platform: block.social_platform,
          display_order: block.display_order,
          is_visible: block.is_visible
        }))
      });
      if (templates) {
        setTemplates(templates.map(t => ({
          id: t.id,
          name: t.name,
          style: t.id
        })));
      }
    } catch (error) {
      console.error('Error fetching card data:', error);
      // 設置默認數據結構以防止錯誤
      setCardData({
        id: null,
        templateId: 'professional',
        viewCount: 0,
        content_blocks: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/member-cards/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTemplateChange = async (templateId) => {
    try {
      setSaving(true);
      await axios.put('/api/member-cards/template', {
        templateId: templateId
      });
      setCardData(prev => ({
        ...prev,
        template_id: templateId
      }));
    } catch (error) {
      console.error('Error updating template:', error);
      alert('更新模板失敗');
    } finally {
      setSaving(false);
    }
  };

  const addContentBlock = async (type) => {
    try {
      if (!cardData) {
        alert('請等待名片資料載入完成');
        return;
      }

      const newBlock = {
        blockType: type,
        title: '',
        content: '',
        url: '',
        socialPlatform: ''
      };

      const response = await axios.post('/api/member-cards/content-block', newBlock);
       const addedBlock = {
         id: response.data.block.id,
         type: response.data.block.block_type,
         title: response.data.block.title,
         content: response.data.block.content,
         url: response.data.block.url,
         image_url: response.data.block.image_url,
         social_platform: response.data.block.social_platform,
         display_order: response.data.block.display_order,
         is_visible: response.data.block.is_visible
       };
       setCardData(prev => ({
          ...prev,
          content_blocks: [...prev.content_blocks, addedBlock]
        }));
    } catch (error) {
      console.error('Error adding content block:', error);
      alert('新增內容區塊失敗');
    }
  };

  // 立即更新本地狀態
  const updateLocalBlockData = (blockId, updates) => {
    setLocalBlockData(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        ...updates
      }
    }));
  };

  // 防抖的 API 更新函數
  const debouncedUpdateContentBlock = useCallback(async (blockId, updates) => {
    try {
      // 找到當前區塊的完整數據
      const currentBlock = cardData.content_blocks.find(block => block.id === blockId);
      if (!currentBlock) {
        console.error('找不到要更新的區塊');
        return;
      }

      // 合併現有數據、本地數據和更新數據
      const localData = localBlockData[blockId] || {};
      const updateData = {
        title: currentBlock.title || '',
        content: currentBlock.content || '',
        url: currentBlock.url || '',
        video_url: currentBlock.video_url || '',
        socialPlatform: currentBlock.social_platform || '',
        isVisible: currentBlock.is_visible !== false,
        ...localData,
        ...updates
      };

      const response = await axios.put(`/api/member-cards/content-block/${blockId}`, updateData);
      const updatedBlock = {
        id: response.data.block.id,
        type: response.data.block.block_type,
        title: response.data.block.title,
        content: response.data.block.content,
        url: response.data.block.url,
        video_url: response.data.block.video_url,
        image_url: response.data.block.image_url,
        social_platform: response.data.block.social_platform,
        display_order: response.data.block.display_order,
        is_visible: response.data.block.is_visible
      };
      
      setCardData(prev => ({
        ...prev,
        content_blocks: prev.content_blocks.map(block =>
          block.id === blockId ? updatedBlock : block
        )
      }));
      
      // 清除本地數據
      setLocalBlockData(prev => {
        const newData = { ...prev };
        delete newData[blockId];
        return newData;
      });
    } catch (error) {
      console.error('Error updating content block:', error);
      alert('更新內容區塊失敗');
    }
  }, [cardData, localBlockData]);

  // 帶防抖的更新函數
  const updateContentBlock = (blockId, updates) => {
    // 立即更新本地狀態以提供即時反饋
    updateLocalBlockData(blockId, updates);
    
    // 清除之前的計時器
    if (debounceTimers.current[blockId]) {
      clearTimeout(debounceTimers.current[blockId]);
    }
    
    // 設置新的防抖計時器
    debounceTimers.current[blockId] = setTimeout(() => {
      debouncedUpdateContentBlock(blockId, updates);
    }, 500); // 500ms 防抖延遲
  };

  const deleteContentBlock = async (blockId) => {
    if (!window.confirm('確定要刪除此內容區塊嗎？')) return;

    try {
      await axios.delete(`/api/member-cards/content-block/${blockId}`);
      setCardData(prev => ({
        ...prev,
        content_blocks: prev.content_blocks.filter(block => block.id !== blockId)
      }));
    } catch (error) {
      console.error('Error deleting content block:', error);
      alert('刪除內容區塊失敗');
    }
  };

  const moveBlock = async (blockId, direction) => {
    const blocks = [...cardData.content_blocks];
    const currentIndex = blocks.findIndex(block => block.id === blockId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= blocks.length) return;

    // 交換位置
    [blocks[currentIndex], blocks[newIndex]] = [blocks[newIndex], blocks[currentIndex]];

    // 更新 sort_order
    const reorderedBlocks = blocks.map((block, index) => ({
      ...block,
      sort_order: index
    }));

    try {
      await axios.put('/api/member-cards/reorder-blocks', {
        blockIds: reorderedBlocks.map(block => block.id)
      });

      setCardData(prev => ({
        ...prev,
        content_blocks: reorderedBlocks
      }));
    } catch (error) {
      console.error('Error reordering blocks:', error);
      alert('調整順序失敗');
    }
  };

  const handleImageUpload = async (blockId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('blockId', blockId);

    try {
      const response = await axios.post('/api/member-cards/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      updateContentBlock(blockId, { image_url: response.data.imageUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('圖片上傳失敗');
    }
  };

  const copyCardUrl = () => {
    const cardUrl = `${window.location.origin}/member/${user.id}`;
    navigator.clipboard.writeText(cardUrl).then(() => {
      alert('名片網址已複製到剪貼簿');
    }).catch(() => {
      alert('複製失敗，請手動複製網址');
    });
  };

  const openPreview = () => {
    const cardUrl = `${window.location.origin}/member/${user.id}`;
    window.open(cardUrl, '_blank');
  };

  const renderContentBlockEditor = (block) => {
    const blockIndex = cardData.content_blocks.findIndex(b => b.id === block.id);
    const isFirst = blockIndex === 0;
    const isLast = blockIndex === cardData.content_blocks.length - 1;
    
    // 合併服務器數據和本地數據
    const localData = localBlockData[block.id] || {};
    const mergedBlock = { ...block, ...localData };

    return (
      <div key={block.id} className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getBlockIcon(block.type)}
            <span className="font-medium capitalize">{getBlockTypeName(block.type)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => moveBlock(block.id, 'up')}
              disabled={isFirst}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveBlock(block.id, 'down')}
              disabled={isLast}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteContentBlock(block.id)}
              className="p-1 text-red-400 hover:text-red-600"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 標題輸入 */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            標題
          </label>
          <input
            type="text"
            value={mergedBlock.title || ''}
            onChange={(e) => updateContentBlock(block.id, { title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="輸入標題"
          />
        </div>

        {/* 根據類型渲染不同的編輯器 */}
        {renderBlockTypeEditor(mergedBlock)}
      </div>
    );
  };

  const renderBlockTypeEditor = (block) => {
    switch (block.type) {
      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              內容
            </label>
            <textarea
              value={block.content || ''}
              onChange={(e) => updateContentBlock(block.id, { content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入文字內容"
            />
          </div>
        );

      case 'link':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              網址
            </label>
            <input
              type="url"
              value={block.url || ''}
              onChange={(e) => updateContentBlock(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>
        );

      case 'video':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              影片網址 (YouTube, Vimeo 等)
            </label>
            <input
              type="url"
              value={block.video_url || ''}
              onChange={(e) => updateContentBlock(block.id, { video_url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.youtube.com/embed/..."
            />
          </div>
        );

      case 'image':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              圖片
            </label>
            {block.image_url && (
              <div className="mb-3">
                <img
                  src={block.image_url}
                  alt="Preview"
                  className="w-full max-w-xs rounded-md"
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleImageUpload(block.id, file);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case 'social':
        const socialLinks = block.social_links || {};
        return (
          <div className="space-y-3">
            {['facebook', 'instagram', 'line', 'linkedin', 'twitter'].map(platform => (
              <div key={platform}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {platform}
                </label>
                <input
                  type="url"
                  value={socialLinks[platform] || ''}
                  onChange={(e) => {
                    const newSocialLinks = {
                      ...socialLinks,
                      [platform]: e.target.value
                    };
                    updateContentBlock(block.id, { social_links: newSocialLinks });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`${platform} 網址`}
                />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  const getBlockIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'text': return <DocumentTextIcon className={iconClass} />;
      case 'link': return <LinkIcon className={iconClass} />;
      case 'video': return <VideoCameraIcon className={iconClass} />;
      case 'image': return <PhotoIcon className={iconClass} />;
      case 'social': return <ChatBubbleLeftRightIcon className={iconClass} />;
      default: return <DocumentTextIcon className={iconClass} />;
    }
  };

  const getBlockTypeName = (type) => {
    const names = {
      text: '文字',
      link: '連結',
      video: '影片',
      image: '圖片',
      social: '社群'
    };
    return names[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">電子名片編輯器</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={openPreview}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <EyeIcon className="w-5 h-5 mr-2" />
            預覽名片
          </button>
          <button
            onClick={copyCardUrl}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ClipboardDocumentIcon className="w-5 h-5 mr-2" />
            複製網址
          </button>
        </div>
      </div>

      {/* 分頁導航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'content', name: '內容編輯', icon: DocumentTextIcon },
            { id: 'template', name: '模板設計', icon: PhotoIcon },
            { id: 'stats', name: '統計資料', icon: ChartBarIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 內容編輯分頁 */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">內容區塊</h2>
              <div className="flex space-x-2">
                {[
                  { type: 'text', name: '文字', icon: DocumentTextIcon },
                  { type: 'link', name: '連結', icon: LinkIcon },
                  { type: 'video', name: '影片', icon: VideoCameraIcon },
                  { type: 'image', name: '圖片', icon: PhotoIcon },
                  { type: 'social', name: '社群', icon: ChatBubbleLeftRightIcon }
                ].map(blockType => (
                  <button
                    key={blockType.type}
                    onClick={() => addContentBlock(blockType.type)}
                    className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    title={`新增${blockType.name}`}
                  >
                    <blockType.icon className="w-4 h-4 mr-1" />
                    {blockType.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {cardData?.content_blocks
                ?.sort((a, b) => a.sort_order - b.sort_order)
                ?.map(renderContentBlockEditor) || []}
            </div>

            {(!cardData?.content_blocks || cardData.content_blocks.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>尚未新增任何內容區塊</p>
                <p className="text-sm">點擊上方按鈕開始新增內容</p>
              </div>
            )}
          </div>

          {/* 預覽區域 */}
          <div className="lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold mb-4">即時預覽</h2>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="text-center text-gray-500 py-8">
                <EyeIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>點擊「預覽名片」查看完整效果</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 模板設計分頁 */}
      {activeTab === 'template' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">選擇模板</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map(template => (
              <div
                key={template.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  cardData?.template_id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTemplateChange(template.id)}
              >
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-md mb-3 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">模板預覽</span>
                </div>
                <h3 className="font-medium text-center">{template.name}</h3>
                {cardData?.template_id === template.id && (
                  <div className="text-center mt-2">
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      目前使用
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 統計資料分頁 */}
      {activeTab === 'stats' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">瀏覽統計</h2>
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">總瀏覽量</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.total_views}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">獨立訪客</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.unique_visitors}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">近7天</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.views_7_days}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">近30天</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.views_30_days}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>載入統計資料中...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemberCardEditor;