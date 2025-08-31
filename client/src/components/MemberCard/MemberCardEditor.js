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
  const [cardData, setCardData] = useState(null);
  const [contentBlocks, setContentBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [buttonStyle, setButtonStyle] = useState('A');
  const [localBlockData, setLocalBlockData] = useState({});
  const debounceTimers = useRef({});

  // 模板數據
  const templates = [
    { id: 'tech-professional', name: '科技專業版', category: 'tech', color: '#1e293b', description: '具備深色與淺色模式切換，資訊區塊採卡片式設計' },
    { id: 'creative-vibrant', name: '活力創意版', category: 'creative', color: '#f59e0b', description: '色彩鮮明活潑，使用柔和的波浪形狀或有機曲線作為背景' },
    { id: 'minimal-elegant', name: '簡約質感版', category: 'minimal', color: '#374151', description: '設計簡潔線條俐落，注重留白，極簡且具質感' }
  ];

  // 載入電子名片資料
  const loadCardData = useCallback(async () => {
    try {
      const response = await axios.get('/api/member-cards/my-card');
      setCardData(response.data.card);
      setContentBlocks(response.data.blocks || []);
    } catch (error) {
      console.error('載入電子名片資料失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCardData();
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, [loadCardData]);

  // 防抖更新函數
  const debouncedUpdate = useCallback((blockId, data) => {
    if (debounceTimers.current[blockId]) {
      clearTimeout(debounceTimers.current[blockId]);
    }
    
    debounceTimers.current[blockId] = setTimeout(async () => {
      try {
        await axios.put(`/api/member-cards/content-block/${blockId}`, data);
      } catch (error) {
        console.error('更新內容區塊失敗:', error);
      }
    }, 1000);
  }, []);

  // 更新內容區塊
  const updateContentBlock = useCallback((blockId, data) => {
    setContentBlocks(prev => 
      prev.map(block => 
        block.id === blockId ? { ...block, ...data } : block
      )
    );
    
    setLocalBlockData(prev => ({
      ...prev,
      [blockId]: { ...prev[blockId], ...data }
    }));
    
    debouncedUpdate(blockId, data);
  }, [debouncedUpdate]);

  // 新增內容區塊
  const addContentBlock = async (type) => {
    try {
      const response = await axios.post('/api/member-cards/content-block', {
        block_type: type,
        title: '',
        content: JSON.stringify(getDefaultContent(type)),
        display_order: contentBlocks.length
      });
      
      setContentBlocks(prev => [...prev, response.data.block]);
    } catch (error) {
      console.error('新增內容區塊失敗:', error);
    }
  };

  // 刪除內容區塊
  const deleteContentBlock = async (blockId) => {
    try {
      await axios.delete(`/api/member-cards/content-block/${blockId}`);
      setContentBlocks(prev => prev.filter(block => block.id !== blockId));
    } catch (error) {
      console.error('刪除內容區塊失敗:', error);
    }
  };

  // 重新排序區塊
  const reorderBlocks = async (newOrder) => {
    try {
      await axios.put('/api/member-cards/reorder-blocks', { blocks: newOrder });
      setContentBlocks(newOrder);
    } catch (error) {
      console.error('重新排序失敗:', error);
    }
  };

  // 移動區塊
  const moveBlock = (blockId, direction) => {
    const currentIndex = contentBlocks.findIndex(block => block.id === blockId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= contentBlocks.length) return;
    
    const newBlocks = [...contentBlocks];
    [newBlocks[currentIndex], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[currentIndex]];
    
    // 更新 display_order
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      display_order: index
    }));
    
    reorderBlocks(updatedBlocks);
  };

  // 處理圖片上傳
  const handleImageUpload = async (blockId, file) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await axios.post('/api/member-cards/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      updateContentBlock(blockId, { image_url: response.data.imageUrl });
    } catch (error) {
      console.error('圖片上傳失敗:', error);
    }
  };

  // 獲取預設內容
  const getDefaultContent = (type) => {
    const defaults = {
      text: { text: '請輸入文字內容...' },
      image: { image_url: '', alt_text: '圖片描述' },
      link: { url: 'https://', title: '連結標題', description: '連結描述' },
      video: { video_url: '', title: '影片標題' },
      contact: { 
        phone: user?.phone || '', 
        email: user?.email || '', 
        address: user?.address || '' 
      },
      social: { 
        facebook: '', 
        instagram: '', 
        line: '', 
        linkedin: '', 
        twitter: '', 
        youtube: '' 
      }
    };
    return defaults[type] || {};
  };

  // 模板相關函數
  const handleTemplateChange = async (templateId) => {
    try {
      await axios.put('/api/member-cards/template', { templateId: templateId });
      setCardData(prev => ({ ...prev, template_id: templateId }));
    } catch (error) {
      console.error('更新模板失敗:', error);
    }
  };

  const getTemplatePreviewClasses = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return 'bg-gray-100';
    
    const classMap = {
      business: 'bg-gradient-to-br from-blue-50 to-blue-100',
      creative: 'bg-gradient-to-br from-purple-50 to-purple-100',
      modern: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      luxury: 'bg-gradient-to-br from-amber-50 to-amber-100',
      tech: 'bg-gradient-to-br from-cyan-50 to-cyan-100',
      nature: 'bg-gradient-to-br from-green-50 to-green-100',
      warm: 'bg-gradient-to-br from-orange-50 to-orange-100',
      minimal: 'bg-gradient-to-br from-gray-50 to-gray-100',
      dark: 'bg-gradient-to-br from-gray-800 to-gray-900',
      cool: 'bg-gradient-to-br from-sky-50 to-sky-100'
    };
    
    return classMap[template.category] || 'bg-gray-100';
  };

  const getTemplateIcon = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return <RectangleGroupIcon className="w-4 h-4" />;
    
    const iconMap = {
      business: <BriefcaseIcon className="w-4 h-4" />,
      creative: <SparklesIcon className="w-4 h-4" />,
      modern: <Squares2X2Icon className="w-4 h-4" />,
      luxury: <TrophyIcon className="w-4 h-4" />,
      tech: <RectangleGroupIcon className="w-4 h-4" />,
      nature: <MapPinIcon className="w-4 h-4" />,
      warm: <CalendarIcon className="w-4 h-4" />,
      minimal: <RectangleGroupIcon className="w-4 h-4" />,
      dark: <MoonIcon className="w-4 h-4" />,
      cool: <ClockIcon className="w-4 h-4" />
    };
    
    return iconMap[template.category] || <RectangleGroupIcon className="w-4 h-4" />;
  };

  // 自定義顏色處理
  const handleCustomColorChange = async (colorType, color) => {
    try {
      const customColors = {
        ...cardData?.custom_colors,
        [colorType]: color
      };
      
      await axios.put('/api/member-cards/custom-colors', { custom_colors: customColors });
      setCardData(prev => ({ ...prev, custom_colors: customColors }));
    } catch (error) {
      console.error('更新自定義顏色失敗:', error);
    }
  };

  // 預覽功能
  const openPreview = () => {
    const previewUrl = `/member-card/${user?.id}`;
    window.open(previewUrl, '_blank');
  };

  // 分享功能
  const shareCard = async () => {
    const shareUrl = `${window.location.origin}/member-card/${user?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user?.name}的電子名片`,
          url: shareUrl
        });
      } catch (error) {
        console.log('分享取消');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('連結已複製到剪貼簿');
    }
  };

  // 下載 vCard
  const downloadVCard = async () => {
    try {
      const response = await axios.get(`/api/member-cards/${user?.id}/vcard`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user?.name || 'contact'}.vcf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
    }
  };

  // 渲染內容區塊
  const renderContentBlock = (block) => {
    const blockData = { ...block, ...localBlockData[block.id] };
    
    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-3">
            <textarea
              value={blockData.content?.text || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, text: e.target.value } 
              })}
              placeholder="輸入文字內容..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>
        );
        
      case 'image':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleImageUpload(block.id, file);
                }}
                className="hidden"
                id={`image-upload-${block.id}`}
              />
              <label
                htmlFor={`image-upload-${block.id}`}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
              >
                <PhotoIcon className="w-4 h-4 mr-2" />
                選擇圖片
              </label>
            </div>
            
            {blockData.content?.image_url && (
              <div className="relative">
                <img
                  src={blockData.content.image_url}
                  alt={blockData.content.alt_text || '圖片'}
                  className="w-full max-w-md rounded-lg shadow-sm"
                />
              </div>
            )}
            
            <input
              type="text"
              value={blockData.content?.alt_text || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, alt_text: e.target.value } 
              })}
              placeholder="圖片描述（選填）"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
        
      case 'link':
        return (
          <div className="space-y-3">
            <input
              type="url"
              value={blockData.content?.url || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, url: e.target.value } 
              })}
              placeholder="https://example.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={blockData.content?.title || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, title: e.target.value } 
              })}
              placeholder="連結標題"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={blockData.content?.description || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, description: e.target.value } 
              })}
              placeholder="連結描述（選填）"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>
        );
        
      case 'video':
        return (
          <div className="space-y-3">
            <input
              type="url"
              value={blockData.content?.video_url || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, video_url: e.target.value } 
              })}
              placeholder="YouTube 或其他影片連結"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={blockData.content?.title || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, title: e.target.value } 
              })}
              placeholder="影片標題"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );
        
      case 'contact':
        return (
          <div className="space-y-3">
            <input
              type="tel"
              value={blockData.content?.phone || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, phone: e.target.value } 
              })}
              placeholder="電話號碼"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="email"
              value={blockData.content?.email || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, email: e.target.value } 
              })}
              placeholder="電子郵件"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={blockData.content?.address || ''}
              onChange={(e) => updateContentBlock(block.id, { 
                content: { ...blockData.content, address: e.target.value } 
              })}
              placeholder="地址"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>
        );
        
      case 'social':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <FaFacebook className="w-5 h-5 text-blue-600" />
                <input
                  type="url"
                  value={blockData.content?.facebook || ''}
                  onChange={(e) => updateContentBlock(block.id, { 
                    content: { ...blockData.content, facebook: e.target.value } 
                  })}
                  placeholder="Facebook 連結"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FaInstagram className="w-5 h-5 text-pink-600" />
                <input
                  type="url"
                  value={blockData.content?.instagram || ''}
                  onChange={(e) => updateContentBlock(block.id, { 
                    content: { ...blockData.content, instagram: e.target.value } 
                  })}
                  placeholder="Instagram 連結"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FaLine className="w-5 h-5 text-green-500" />
                <input
                  type="text"
                  value={blockData.content?.line || ''}
                  onChange={(e) => updateContentBlock(block.id, { 
                    content: { ...blockData.content, line: e.target.value } 
                  })}
                  placeholder="LINE ID"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FaLinkedin className="w-5 h-5 text-blue-700" />
                <input
                  type="url"
                  value={blockData.content?.linkedin || ''}
                  onChange={(e) => updateContentBlock(block.id, { 
                    content: { ...blockData.content, linkedin: e.target.value } 
                  })}
                  placeholder="LinkedIn 連結"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FaTwitter className="w-5 h-5 text-blue-400" />
                <input
                  type="url"
                  value={blockData.content?.twitter || ''}
                  onChange={(e) => updateContentBlock(block.id, { 
                    content: { ...blockData.content, twitter: e.target.value } 
                  })}
                  placeholder="Twitter 連結"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FaYoutube className="w-5 h-5 text-red-600" />
                <input
                  type="url"
                  value={blockData.content?.youtube || ''}
                  onChange={(e) => updateContentBlock(block.id, { 
                    content: { ...blockData.content, youtube: e.target.value } 
                  })}
                  placeholder="YouTube 連結"
                  className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-gray-500 text-center py-4">
            未知的內容類型: {block.type}
          </div>
        );
    }
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
            <EyeIcon className="w-4 h-4 mr-2" />
            預覽名片
          </button>
          
          <button
            onClick={shareCard}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ShareIcon className="w-4 h-4 mr-2" />
            分享名片
          </button>
          
          <button
            onClick={downloadVCard}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            下載 vCard
          </button>
        </div>
      </div>

      {/* 標籤導航 */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'template', name: '模板設計', icon: PaintBrushIcon },
            { id: 'content', name: '內容編輯', icon: DocumentTextIcon },
            { id: 'stats', name: '瀏覽統計', icon: ChartBarIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 模板設計標籤 */}
      {activeTab === 'template' && (
        <div className="space-y-8">
          {/* 按鈕樣式選擇 */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-4">按鈕樣式</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'A', title: '選項 A', subtitle: '圓角陰影 + 小尺寸（精緻）', demo: (
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

          {/* 模板選擇區域 */}
          <div className="border-t pt-8">
            <h3 className="text-lg font-semibold mb-6">選擇模板樣式</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`group relative border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    cardData?.template_id === template.id
                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  {/* 模板預覽 */}
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <div 
                      className={`w-full h-full ${getTemplatePreviewClasses(template.id)} relative`}
                      style={{background: `linear-gradient(135deg, ${template.color}15, ${template.color}35)`}}
                    >
                      {/* 模擬名片內容 */}
                      <div className="absolute inset-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm p-3 flex flex-col">
                        {/* 頭部區域 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="space-y-1">
                            <div className="h-3 w-16 rounded" style={{backgroundColor: template.color}} />
                            <div className="h-2 w-12 bg-gray-300 rounded" />
                          </div>
                          <div 
                            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                            style={{backgroundColor: `${template.color}40`}}
                          />
                        </div>
                        
                        {/* 按鈕區域 */}
                        <div className="flex gap-1 mb-2">
                          <div 
                            className="h-2 w-8 rounded-full"
                            style={{backgroundColor: template.color}}
                          />
                          <div className="h-2 w-6 bg-gray-200 rounded-full" />
                        </div>
                        
                        {/* 內容區域 */}
                        <div className="flex-1 space-y-1">
                          <div className="h-1.5 w-full bg-gray-200 rounded" />
                          <div className="h-1.5 w-3/4 bg-gray-200 rounded" />
                          <div className="h-1.5 w-1/2 bg-gray-200 rounded" />
                        </div>
                      </div>
                      
                      {/* 選中指示器 */}
                      {cardData?.template_id === template.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* 懸停效果 */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    </div>
                  </div>
                  
                  {/* 模板信息 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {getTemplateIcon(template.id)}
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span 
                            className="inline-block w-3 h-3 rounded-full"
                            style={{backgroundColor: template.color}}
                          />
                          <span className="text-xs text-gray-500 capitalize">
                            {template.category === 'business' && '商務專業'}
                            {template.category === 'creative' && '創意設計'}
                            {template.category === 'modern' && '現代時尚'}
                            {template.category === 'luxury' && '奢華典雅'}
                            {template.category === 'tech' && '科技未來'}
                            {template.category === 'nature' && '自然清新'}
                            {template.category === 'warm' && '溫暖舒適'}
                            {template.category === 'minimal' && '極簡風格'}
                            {template.category === 'dark' && '暗黑模式'}
                            {template.category === 'cool' && '清涼色調'}
                          </span>
                        </div>
                      </div>
                      
                      {cardData?.template_id === template.id && (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          使用中
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                    <span className="text-sm text-gray-600">
                      {cardData?.custom_colors?.primary || '#3B82F6'}
                    </span>
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
                    <span className="text-sm text-gray-600">
                      {cardData?.custom_colors?.secondary || '#6B7280'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">強調顏色</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={cardData?.custom_colors?.accent || '#10B981'}
                      onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">
                      {cardData?.custom_colors?.accent || '#10B981'}
                    </span>
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
                    <span className="text-sm text-gray-600">
                      {cardData?.custom_colors?.background || '#FFFFFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 內容編輯標籤 */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* 新增內容區塊按鈕 */}
          <div className="flex flex-wrap gap-3">
            {[
              { type: 'text', icon: DocumentTextIcon, label: '文字內容' },
              { type: 'image', icon: PhotoIcon, label: '圖片' },
              { type: 'link', icon: LinkIcon, label: '連結' },
              { type: 'video', icon: VideoCameraIcon, label: '影片' },
              { type: 'contact', icon: ChatBubbleLeftRightIcon, label: '聯絡資訊' },
              { type: 'social', icon: ShareIcon, label: '社群媒體' }
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => addContentBlock(type)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Icon className="w-4 h-4 mr-2" />
                新增{label}
              </button>
            ))}
          </div>

          {/* 內容區塊列表 */}
          <div className="space-y-4">
            {contentBlocks.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">還沒有任何內容區塊</p>
                <p className="text-sm text-gray-400">點擊上方按鈕開始新增內容</p>
              </div>
            ) : (
              contentBlocks.map((block, index) => (
                <div key={block.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {block.type === 'text' && <DocumentTextIcon className="w-5 h-5 text-gray-600" />}
                        {block.type === 'image' && <PhotoIcon className="w-5 h-5 text-gray-600" />}
                        {block.type === 'link' && <LinkIcon className="w-5 h-5 text-gray-600" />}
                        {block.type === 'video' && <VideoCameraIcon className="w-5 h-5 text-gray-600" />}
                        {block.type === 'contact' && <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600" />}
                        {block.type === 'social' && <ShareIcon className="w-5 h-5 text-gray-600" />}
                        <span className="font-medium text-gray-900">
                          {{
                            text: '文字內容',
                            image: '圖片',
                            link: '連結',
                            video: '影片',
                            contact: '聯絡資訊',
                            social: '社群媒體'
                          }[block.type]}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* 移動按鈕 */}
                      <button
                        onClick={() => moveBlock(block.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => moveBlock(block.id, 'down')}
                        disabled={index === contentBlocks.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowDownIcon className="w-4 h-4" />
                      </button>
                      
                      {/* 刪除按鈕 */}
                      <button
                        onClick={() => deleteContentBlock(block.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 內容編輯區域 */}
                  {renderContentBlock(block)}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 瀏覽統計標籤 */}
      {activeTab === 'stats' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center py-12">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>載入統計資料中...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberCardEditor;