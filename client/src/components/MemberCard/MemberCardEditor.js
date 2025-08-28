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
  ClipboardDocumentIcon,
  BriefcaseIcon,
  SparklesIcon,
  PaintBrushIcon,
  MoonIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  ArrowDownTrayIcon,
  ShareIcon,
  MapPinIcon,
  TrophyIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { FaFacebook, FaInstagram, FaLine, FaLinkedin, FaTwitter, FaYoutube, FaLink } from 'react-icons/fa';

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
    { id: 'elegant', name: '經典典雅版', style: 'elegant' },
    { id: 'modern-gradient', name: '現代漸變版', style: 'modern-gradient' },
    { id: 'coffee-warm', name: '咖啡暖色版', style: 'coffee-warm' },
    { id: 'tech-blue', name: '科技藍調版', style: 'tech-blue' },
    { id: 'nature-green', name: '自然綠意版', style: 'nature-green' },
    { id: 'luxury-gold', name: '奢華金色版', style: 'luxury-gold' }
  ]);
  const [showPreviewHint, setShowPreviewHint] = useState(false);
  const previewHintTimerRef = useRef(null);
  const [buttonStyle, setButtonStyle] = useState(() => {
    return localStorage.getItem('memberCardButtonStyle') || 'style-a';
  });

  useEffect(() => {
    fetchCardData();
    fetchStats();
  }, []);

  // 保存按鈕樣式到 localStorage
  useEffect(() => {
    localStorage.setItem('memberCardButtonStyle', buttonStyle);
  }, [buttonStyle]);

  // 清理防抖計時器
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      if (previewHintTimerRef.current) {
        clearTimeout(previewHintTimerRef.current);
      }
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
      triggerPreviewHint();
    } catch (error) {
      console.error('Error updating template:', error);
      alert('更新模板失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomColorChange = async (colorType, colorValue) => {
    try {
      const updatedColors = {
        ...cardData.custom_colors,
        [colorType]: colorValue
      };
      
      const response = await axios.put('/api/member-cards/custom-colors', {
        customColors: updatedColors
      });
      
      if (response.data.success) {
        setCardData(prev => ({ 
          ...prev, 
          custom_colors: updatedColors 
        }));
        triggerPreviewHint();
      }
    } catch (error) {
      console.error('更新自定義顏色失敗:', error);
      alert('更新顏色失敗，請稍後再試');
    }
  };

  const resetCustomColors = async () => {
    try {
      const response = await axios.put('/api/member-cards/custom-colors', {
        customColors: null
      });
      
      if (response.data.success) {
        setCardData(prev => ({ 
          ...prev, 
          custom_colors: null 
        }));
        triggerPreviewHint();
      }
    } catch (error) {
      console.error('重置顏色失敗:', error);
      alert('重置顏色失敗，請稍後再試');
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
       triggerPreviewHint();
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
      triggerPreviewHint();
      
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
      triggerPreviewHint();
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
      triggerPreviewHint();
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
      triggerPreviewHint();
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

      case 'contact':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input
                type="tel"
                value={block.phone || ''}
                onChange={(e) => updateContentBlock(block.id, { phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+886 912 345 678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={block.email || ''}
                onChange={(e) => updateContentBlock(block.id, { email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
              />
            </div>
          </div>
        );

      case 'location':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <textarea
              value={block.address || ''}
              onChange={(e) => updateContentBlock(block.id, { address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入完整地址"
            />
          </div>
        );

      case 'skills':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">技能列表 (每行一個)</label>
            <textarea
              value={block.skills || ''}
              onChange={(e) => updateContentBlock(block.id, { skills: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="JavaScript\nReact\nNode.js\nPython"
            />
          </div>
        );

      case 'experience':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工作經歷</label>
            <textarea
              value={block.experience || ''}
              onChange={(e) => updateContentBlock(block.id, { experience: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="公司名稱 - 職位\n時間期間\n工作內容描述..."
            />
          </div>
        );

      case 'education':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">學歷</label>
            <textarea
              value={block.education || ''}
              onChange={(e) => updateContentBlock(block.id, { education: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="學校名稱\n科系\n畢業年份"
            />
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作品描述</label>
              <textarea
                value={block.description || ''}
                onChange={(e) => updateContentBlock(block.id, { description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="作品介紹..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">作品連結</label>
              <input
                type="url"
                value={block.url || ''}
                onChange={(e) => updateContentBlock(block.id, { url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
            </div>
          </div>
        );

      case 'testimonial':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">推薦內容</label>
              <textarea
                value={block.testimonial || ''}
                onChange={(e) => updateContentBlock(block.id, { testimonial: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="推薦人的評價內容..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">推薦人</label>
              <input
                type="text"
                value={block.author || ''}
                onChange={(e) => updateContentBlock(block.id, { author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="推薦人姓名"
              />
            </div>
          </div>
        );

      case 'achievement':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">成就列表</label>
            <textarea
              value={block.achievements || ''}
              onChange={(e) => updateContentBlock(block.id, { achievements: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="獲獎記錄\n認證證書\n重要成就"
            />
          </div>
        );

      case 'service':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">服務項目</label>
            <textarea
              value={block.services || ''}
              onChange={(e) => updateContentBlock(block.id, { services: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="服務項目1\n服務項目2\n服務項目3"
            />
          </div>
        );

      case 'pricing':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">價格方案</label>
            <textarea
              value={block.pricing || ''}
              onChange={(e) => updateContentBlock(block.id, { pricing: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="基礎方案 - $1000\n進階方案 - $2000\n專業方案 - $3000"
            />
          </div>
        );

      case 'calendar':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">行事曆連結</label>
            <input
              type="url"
              value={block.url || ''}
              onChange={(e) => updateContentBlock(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Google Calendar 或其他行事曆服務連結"
            />
          </div>
        );

      case 'qrcode':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QR碼內容</label>
            <input
              type="text"
              value={block.qr_content || ''}
              onChange={(e) => updateContentBlock(block.id, { qr_content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入要生成QR碼的內容 (網址、文字等)"
            />
          </div>
        );

      case 'gallery':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">圖片畫廊</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  // Handle multiple image upload
                  console.log('Multiple images selected:', files);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">可選擇多張圖片</p>
          </div>
        );

      case 'map':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
              <input
                type="text"
                value={block.address || ''}
                onChange={(e) => updateContentBlock(block.id, { address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="輸入地址以顯示地圖"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps 嵌入連結 (選填)</label>
              <input
                type="url"
                value={block.map_url || ''}
                onChange={(e) => updateContentBlock(block.id, { map_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Google Maps 嵌入網址"
              />
            </div>
          </div>
        );

      case 'countdown':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">倒數標題</label>
              <input
                type="text"
                value={block.countdown_title || ''}
                onChange={(e) => updateContentBlock(block.id, { countdown_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="活動名稱或倒數標題"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目標日期時間</label>
              <input
                type="datetime-local"
                value={block.target_date || ''}
                onChange={(e) => updateContentBlock(block.id, { target_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              value={block.url || ''}
              onChange={(e) => updateContentBlock(block.id, { url: e.target.value })}
              onBlur={(e) => updateContentBlock(block.id, { url: normalizeVideoUrl(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
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
        const platforms = [
          { id: 'facebook', name: 'Facebook', icon: <FaFacebook className="text-[#1877F2]" /> },
          { id: 'instagram', name: 'Instagram', icon: <FaInstagram className="text-pink-500" /> },
          { id: 'line', name: 'Line', icon: <FaLine className="text-[#06C755]" /> },
          { id: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin className="text-[#0A66C2]" /> },
          { id: 'twitter', name: 'Twitter', icon: <FaTwitter className="text-[#1DA1F2]" /> },
          { id: 'youtube', name: 'YouTube', icon: <FaYoutube className="text-[#FF0000]" /> },
        ];
        const effectivePlatform = block.social_platform || block.socialPlatform || '';
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={effectivePlatform}
                onChange={(e) => updateContentBlock(block.id, { socialPlatform: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選擇平台</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {effectivePlatform ? (
                <div className="text-xl" title={platforms.find(p=>p.id===effectivePlatform)?.name || ''}>
                  {platforms.find(p=>p.id===effectivePlatform)?.icon || <FaLink />}
                </div>
              ) : (
                <div className="text-xl text-gray-400"><FaLink /></div>
              )}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={block.url || ''}
              onChange={(e) => updateContentBlock(block.id, { url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="輸入該平台的個人或公司頁面連結"
            />
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

  const getTemplateIcon = (templateId) => {
    const iconClass = 'w-6 h-6';
    switch (templateId) {
      case 'professional':
        return <BriefcaseIcon className={`${iconClass} text-blue-600`} />;
      case 'dynamic':
      case 'creative':
        return <SparklesIcon className={`${iconClass} text-purple-600`} />;
      case 'elegant':
        return <PaintBrushIcon className={`${iconClass} text-gray-700`} />;
      case 'minimal-dark':
        return <MoonIcon className={`${iconClass} text-emerald-500`} />;
      case 'card':
        return <RectangleGroupIcon className={`${iconClass} text-blue-600`} />;
      case 'neumorphism':
        return <Squares2X2Icon className={`${iconClass} text-slate-600`} />;
      default:
        return <PhotoIcon className={iconClass} />;
    }
  };

  const getTemplatePreviewClasses = (templateId) => {
    switch (templateId) {
      case 'professional':
        return 'bg-gradient-to-br from-blue-50 to-blue-100';
      case 'dynamic':
      case 'creative':
        return 'bg-gradient-to-br from-purple-50 to-pink-100';
      case 'elegant':
        return 'bg-gradient-to-br from-amber-50 to-stone-100';
      case 'minimal-dark':
        return 'bg-gradient-to-br from-slate-800 to-slate-700';
      case 'card':
        return 'bg-gradient-to-br from-slate-100 to-white';
      case 'neumorphism':
        return 'bg-gradient-to-br from-slate-100 to-slate-200';
      default:
        return 'bg-gradient-to-br from-gray-100 to-gray-200';
    }
  };

  // 模板樣式（與公開頁一致，供即時預覽使用）
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

  const getSocialMeta = (platform) => {
    const base = { className: 'w-4 h-4', label: platform };
    switch ((platform || '').toLowerCase()) {
      case 'facebook':
        return { icon: <FaFacebook className="text-[#1877F2]" />, ...base, label: 'Facebook' };
      case 'instagram':
        return { icon: <FaInstagram className="text-[#E4405F]" />, ...base, label: 'Instagram' };
      case 'line':
        return { icon: <FaLine className="text-[#06C755]" />, ...base, label: 'Line' };
      case 'linkedin':
        return { icon: <FaLinkedin className="text-[#0A66C2]" />, ...base, label: 'LinkedIn' };
      case 'twitter':
        return { icon: <FaTwitter className="text-[#1DA1F2]" />, ...base, label: 'Twitter' };
      case 'youtube':
        return { icon: <FaYoutube className="text-[#FF0000]" />, ...base, label: 'YouTube' };
      default:
        return { icon: <FaLink className="text-gray-500" />, ...base, label: platform || '社群' };
    }
  };

  const renderPreviewCard = () => {
    if (!cardData) return null;
    const templateId = cardData.template_id || 'professional';
    const currentStyle = templateStyles[templateId] || templateStyles.professional;

    const visibleBlocks = (cardData.content_blocks || [])
      .filter(b => b.is_visible !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    // Button style helper based on user selection
    const getCtaButtonClasses = (type) => {
      const sizeA = 'px-3 py-1.5 text-sm';
      switch (buttonStyle) {
        case 'A': // 更圓潤 + 陰影（擬物）
          return `${type === 'primary' ? currentStyle.primaryButton : currentStyle.secondaryButton} ${sizeA} rounded-xl shadow-md hover:shadow-lg active:shadow-sm transition-all`;
        case 'B': // 双色渐变 + 更大点击区（动感）
          return `${type === 'primary'
            ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white'
            : 'bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700'} px-5 py-3 text-base rounded-lg shadow-sm transition-colors`;
        case 'C': // 扁平無邊框 + 字重強調（極簡）
          return `${type === 'primary' ? 'bg-transparent text-gray-900 font-semibold' : 'bg-transparent text-gray-600 font-semibold'} px-2 py-1.5 text-sm rounded-none shadow-none border-0 hover:underline underline-offset-4`;
        default:
          return `${type === 'primary' ? currentStyle.primaryButton : currentStyle.secondaryButton} ${sizeA} rounded-lg`;
      }
    };

    return (
      <div className={`rounded-2xl overflow-hidden ${currentStyle.card}`}>
        <div className={`px-6 py-5 ${currentStyle.header}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">{user?.name || '您的姓名'}</h3>
              {user?.title && <p className="opacity-90">{user.title}</p>}
              {user?.company && <p className="opacity-80">{user.company}</p>}
            </div>
            {user?.profilePictureUrl ? (
              <img src={user.profilePictureUrl} alt="profile" className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/20" />
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-3">
            <button disabled className={`${getCtaButtonClasses('primary')} opacity-80 cursor-not-allowed`}>
              <ArrowDownTrayIcon className="w-4 h-4 mr-1.5" /> 儲存聯絡人
            </button>
            <button disabled className={`${getCtaButtonClasses('secondary')} opacity-80 cursor-not-allowed`}>
              <ShareIcon className="w-4 h-4 mr-1.5" /> 分享名片
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {visibleBlocks.length === 0 && (
            <div className="text-center text-gray-400 text-sm">尚未新增內容區塊</div>
          )}

          {visibleBlocks.map((block) => {
            switch (block.type) {
              case 'text':
                return (
                  <div key={block.id} className="">
                    {block.title && <h4 className={`font-semibold ${currentStyle.accent}`}>{block.title}</h4>}
                    {block.content && <p className="text-gray-700 whitespace-pre-line">{block.content}</p>}
                  </div>
                );
              case 'link': {
                const href = block.url || '#';
                return (
                  <a key={block.id} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      {block.title && <div className="font-medium text-gray-800">{block.title}</div>}
                      <div className="text-sm text-gray-500 truncate">{href}</div>
                    </div>
                    <LinkIcon className="w-5 h-5 text-gray-400" />
                  </a>
                );
              }
              case 'image':
                return (
                  <div key={block.id} className="">
                    {block.title && <div className={`font-medium mb-1 ${currentStyle.accent}`}>{block.title}</div>}
                    {block.image_url ? (
                      <img src={block.image_url} alt={block.title || 'image'} className="w-full rounded-lg object-cover" />
                    ) : (
                      <div className="w-full h-40 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">尚未選擇圖片</div>
                    )}
                  </div>
                );
              case 'video':
                return (
                  <div key={block.id} className="">
                    {block.title && <div className={`font-medium mb-1 ${currentStyle.accent}`}>{block.title}</div>}
                    <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      影片預覽（僅示意）
                    </div>
                  </div>
                );
              case 'social': {
                const meta = getSocialMeta(block.social_platform);
                const href = block.url || '#';
                return (
                  <a key={block.id} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 border rounded-full text-sm hover:bg-gray-50">
                    <span className="mr-2">{meta.icon}</span>
                    <span className="text-gray-700">{block.title || meta.label}</span>
                  </a>
                );
              }
              default:
                return null;
            }
          })}
        </div>
      </div>
    );
  };

  const normalizeVideoUrl = (input) => {
    if (!input) return '';
    try {
      const url = new URL(input);
      const host = url.hostname.replace('www.', '');
      // YouTube watch or share links -> embed
      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
        // youtu.be/VIDEOID
        if (host === 'youtu.be') {
          const id = url.pathname.split('/').filter(Boolean)[0];
          if (id) return `https://www.youtube.com/embed/${id}`;
        }
        // youtube.com/watch?v=VIDEOID
        const v = url.searchParams.get('v');
        if (v) return `https://www.youtube.com/embed/${v}`;
        // youtube.com/shorts/VIDEOID
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 'shorts' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`;
      }
      // Vimeo -> player embed
      if (host === 'vimeo.com') {
        const id = url.pathname.split('/').filter(Boolean)[0];
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
      return input;
    } catch {
      return input;
    }
  };

  const triggerPreviewHint = () => {
    setShowPreviewHint(true);
    if (previewHintTimerRef.current) clearTimeout(previewHintTimerRef.current);
    previewHintTimerRef.current = setTimeout(() => setShowPreviewHint(false), 8000);
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
        {showPreviewHint && (
          <div className="mt-3 p-3 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg flex items-center justify-between">
            <span>已保存變更，想立即查看公開頁最新效果？</span>
            <div className="space-x-2">
              <button onClick={openPreview} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">立即預覽</button>
              <button onClick={() => setShowPreviewHint(false)} className="px-3 py-1 text-blue-700 hover:underline">稍後</button>
            </div>
          </div>
        )}
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { type: 'text', name: '文字', icon: DocumentTextIcon },
                  { type: 'link', name: '連結', icon: LinkIcon },
                  { type: 'video', name: '影片', icon: VideoCameraIcon },
                  { type: 'image', name: '圖片', icon: PhotoIcon },
                  { type: 'social', name: '社群', icon: ChatBubbleLeftRightIcon },
                  { type: 'contact', name: '聯絡', icon: BriefcaseIcon },
                  { type: 'location', name: '地址', icon: MapPinIcon },
                  { type: 'qrcode', name: 'QR碼', icon: RectangleGroupIcon },
                  { type: 'skills', name: '技能', icon: Squares2X2Icon },
                  { type: 'experience', name: '經歷', icon: BriefcaseIcon },
                  { type: 'education', name: '學歷', icon: DocumentTextIcon },
                  { type: 'portfolio', name: '作品', icon: PaintBrushIcon },
                  { type: 'testimonial', name: '推薦', icon: ChatBubbleLeftRightIcon },
                  { type: 'achievement', name: '成就', icon: TrophyIcon },
                  { type: 'service', name: '服務', icon: BriefcaseIcon },
                  { type: 'pricing', name: '價格', icon: ChartBarIcon },
                  { type: 'calendar', name: '行事曆', icon: CalendarIcon },
                  { type: 'gallery', name: '畫廊', icon: PhotoIcon },
                  { type: 'map', name: '地圖', icon: MapPinIcon },
                  { type: 'countdown', name: '倒數', icon: ClockIcon }
                ].map(blockType => (
                  <button
                    key={blockType.type}
                    onClick={() => addContentBlock(blockType.type)}
                    className="flex flex-col items-center px-2 py-3 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    title={`新增${blockType.name}`}
                  >
                    <blockType.icon className="w-4 h-4 mb-1" />
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
              {renderPreviewCard()}
            </div>
          </div>
        </div>
      )}

      {/* 模板設計分頁 */}
      {activeTab === 'template' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">選擇模板</h2>

          <div className="mb-6">
            <h3 className="text-base font-medium mb-2">即時模板預覽</h3>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {renderPreviewCard()}
            </div>
          </div>

          {/* Button Style Picker */}
          <div className="mb-6">
            <h3 className="text-base font-medium mb-2">按鈕風格</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'A', title: '選項 A', subtitle: '更圓潤 + 陰影（擬物）', demo: (
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 text-sm rounded-xl shadow-md bg-blue-600 text-white">主要</span>
                    <span className="px-3 py-1.5 text-sm rounded-xl shadow-md border">次要</span>
                  </div>
                )},
                { id: 'B', title: '選項 B', subtitle: '双色漸變 + 更大點擊區（動感）', demo: (
                  <div className="flex gap-2">
                    <span className="px-5 py-3 text-base rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white">主要</span>
                    <span className="px-5 py-3 text-base rounded-lg bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700">次要</span>
                  </div>
                )},
                { id: 'C', title: '選項 C', subtitle: '扁平無邊框 + 字重強調（極簡）', demo: (
                  <div className="flex gap-2">
                    <span className="px-2 py-1.5 text-sm font-semibold">主要</span>
                    <span className="px-2 py-1.5 text-sm font-semibold text-gray-600">次要</span>
                  </div>
                )}
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setButtonStyle(opt.id)}
                  className={`text-left border rounded-lg p-4 transition-all ${buttonStyle === opt.id ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{opt.title}</div>
                    {buttonStyle === opt.id && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">已選擇</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">{opt.subtitle}</div>
                  {opt.demo}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <div className={`w-full h-full p-4 ${getTemplatePreviewClasses(template.id)} rounded-md`}
                       style={{display:'grid', gridTemplateRows:'auto auto 1fr', gap:'8px'}}>
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-40 bg-white/60 rounded" />
                      <div className="h-10 w-10 bg-white rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-3 bg-white/70 rounded" />
                      <div className="h-3 bg-white/70 rounded" />
                    </div>
                    <div className="bg-white/80 flex items-center justify-center text-xs text-gray-600">內容預覽</div>
                  </div>
                </div>
                <h3 className="font-medium text-center flex items-center justify-center gap-2">
                  {getTemplateIcon(template.id)}
                  {template.name}
                </h3>
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

          {/* 自定義顏色設定 */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4">自定義顏色主題</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">主要顏色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={cardData?.custom_colors?.primary || '#3B82F6'}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cardData?.custom_colors?.primary || '#3B82F6'}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">次要顏色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={cardData?.custom_colors?.secondary || '#6B7280'}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cardData?.custom_colors?.secondary || '#6B7280'}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="#6B7280"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">背景顏色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={cardData?.custom_colors?.background || '#FFFFFF'}
                      onChange={(e) => handleCustomColorChange('background', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cardData?.custom_colors?.background || '#FFFFFF'}
                      onChange={(e) => handleCustomColorChange('background', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">文字顏色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={cardData?.custom_colors?.text || '#1F2937'}
                      onChange={(e) => handleCustomColorChange('text', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cardData?.custom_colors?.text || '#1F2937'}
                      onChange={(e) => handleCustomColorChange('text', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      placeholder="#1F2937"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={resetCustomColors}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  重置為預設顏色
                </button>
                <div className="text-sm text-gray-500">
                  自定義顏色會覆蓋模板的預設配色
                </div>
              </div>
            </div>
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