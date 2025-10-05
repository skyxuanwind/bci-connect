import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
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
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  FaLinkedin,
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaTiktok
} from 'react-icons/fa';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import '../styles/templates.css';
import { mapTemplateNameToClass } from '../utils/templateClass';

// 解析 YouTube 影片網址取得 videoId（支援 watch?v=、youtu.be、embed、shorts 等格式）
const getYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return '';
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#\/]+)/,
    /youtube\.com\/embed\/([^&\n?#\/]+)/,
    /youtube\.com\/shorts\/([^&\n?#\/]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m && m[1]) return m[1];
  }
  // 退而求其次：嘗試最後一段 path
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    if (v) return v;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
};

  const NFCCardEditor = () => {
    const { user } = useAuth();
    const [cardConfig, setCardConfig] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // 移除預覽模式狀態
    const [editingBlock, setEditingBlock] = useState(null);
    const [editingBlockIndex, setEditingBlockIndex] = useState(null);
    const [showAddBlockModal, setShowAddBlockModal] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showDesktopTemplate, setShowDesktopTemplate] = useState(false);
    // 單畫面模式：永遠顯示預覽並隱藏左側列表與中欄
    // 調整預設為「關閉」，以便顯示左側基本設定面板（七個常駐欄位）
    const [singleScreenMode, setSingleScreenMode] = useState(false);
  // 已移除自動帶入：改為完全手動維護欄位與內容
  // 提示視窗狀態
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('已完成');
  // 使用者層級偏好與操作狀態
  const [userPreferences, setUserPreferences] = useState({ auto_populate_on_create: false, single_screen_edit: false });
  const [savingUserPref, setSavingUserPref] = useState(false);
  // 已移除：立即套用個人資訊按鈕狀態

  // 行動版預覽高度（可上下拖曳調整）以提供更多內容空間
  const [previewHeight, setPreviewHeight] = useState(640); // px，預設值約等於40rem
  const MIN_PREVIEW_HEIGHT = 480; // 480px ≈ 30rem，擴增以容納更多內容
  const MAX_PREVIEW_HEIGHT = 1200; // 上限避免過度拉伸

  const beginResize = (clientY, from) => {
    const startY = clientY || 0;
    const startHeight = previewHeight;
    const onMoveCalc = (currentY) => {
      const delta = from === 'bottom' ? (currentY - startY) : (startY - currentY);
      const next = Math.max(MIN_PREVIEW_HEIGHT, Math.min(MAX_PREVIEW_HEIGHT, startHeight + delta));
      setPreviewHeight(next);
    };

    const onMouseMove = (e) => { e.preventDefault(); onMoveCalc(e.clientY); };
    const onTouchMove = (e) => { if (e.touches && e.touches[0]) onMoveCalc(e.touches[0].clientY); };
    const onEnd = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  // 基本設定 -> 依模板提供的選項生成 custom_css
  const buildCustomCss = (template, opts = {}) => {
    try {
      const accent = template?.css_config?.accentColor || template?.css_config?.secondaryColor || '#FFD700';
      const { ui_icon_pack, ui_divider_style, ui_divider_opacity } = opts;
      const opacity = typeof ui_divider_opacity === 'number' ? ui_divider_opacity : 0.6;
      return `:root{--nfc-accent:${accent};--nfc-icon-pack:${ui_icon_pack || ''};--nfc-divider-style:${ui_divider_style || 'solid-thin'};--nfc-divider-opacity:${opacity};}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    fetchCardData();
    fetchTemplates();
  }, []);

  // 讀取使用者層級偏好
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await axios.get('/api/users/preferences');
        if (data && data.preferences) {
          setUserPreferences({
            auto_populate_on_create: !!data.preferences.auto_populate_on_create,
            single_screen_edit: !!data.preferences.single_screen_edit
          });
        }
      } catch (err) {
        console.error('讀取使用者偏好失敗:', err);
      }
    })();
  }, [user]);

  // 已移除：自動生成個資區塊邏輯（改由使用者手動維護）

  // 已移除：自動帶入 useEffect（姓名、公司、產業、電話、信箱、頭像）

  // 更新使用者層級偏好
  // 已移除：自動帶入偏好切換

  // 切換單畫面編輯（隱藏右側預覽容器）
  const handleToggleSingleScreenEdit = async (checked) => {
    try {
      setSavingUserPref(true);
      setUserPreferences(prev => ({ ...prev, single_screen_edit: checked }));
      await axios.put('/api/users/preferences', { single_screen_edit: checked });
    } catch (error) {
      console.error('更新使用者偏好失敗:', error);
      alert('更新使用者偏好失敗，請稍後再試');
      setUserPreferences(prev => ({ ...prev, single_screen_edit: !checked }));
    } finally {
      setSavingUserPref(false);
    }
  };

  // 已移除：立即套用個人資訊（改以手動維護欄位）

  // 將後端內容列轉換為前端需要的內容區塊結構
  const mapRowToBlock = (row) => {
    const type = row.content_type || row.block_type;
    let data = {};
    try {
      switch (type) {
        case 'text':
          data = {
            title: row.title || row.content_data?.title || '',
            content: row.content || row.content_data?.content || ''
          };
          break;
        case 'link':
          data = {
            title: row.title || row.content_data?.title || '',
            url: row.url || row.content_data?.url || ''
          };
          break;
        case 'video':
          data = {
            title: row.title || row.content_data?.title || '',
            type: row.video_type || row.content_data?.type || (row.url ? 'youtube' : ((row.file_url || row.file || row.content_data?.file) ? 'upload' : 'youtube')),
            url: row.url || row.content_data?.url || '',
            file: row.file_url || row.file || row.content_data?.file || '',
            videoId: row.video_id || row.content_data?.videoId || getYouTubeVideoId(row.url || row.content_data?.url || '')
          };
          break;
        case 'image':
          data = {
            url: row.image_url || row.url || row.content_data?.url || '',
            alt: row.title || row.content_data?.alt || '',
            caption: row.content_data?.caption || ''
          };
          break;
        case 'social': {
          const parsed = typeof row.content === 'string' ? (() => { try { return JSON.parse(row.content); } catch { return {}; } })() : (row.content || row.content_data || {});
          data = parsed || {};
          break;
        }
        case 'map':
          data = {
            address: row.map_address || row.content_data?.address || '',
            map_url: row.url || row.content_data?.map_url || '',
            coordinates: row.map_coordinates || row.content_data?.coordinates || null
          };
          break;
        case 'icon':
          data = {
            title: row.title || row.content_data?.title || '',
            icon_type: row.content_data?.icon_type || 'star',
            size: row.content_data?.size || 'medium',
            description: row.content_data?.description || ''
          };
          break;
        default:
          data = row.content_data || {};
      }
    } catch (e) {
      data = row.content_data || {};
    }

    return {
      id: row.id,
      content_type: type,
      content_data: data,
      display_order: row.display_order ?? 0,
      is_visible: row.is_visible ?? true,
      custom_styles: row.custom_styles || {}
    };
  };

  const fetchCardData = async () => {
    try {
      const response = await axios.get('/api/nfc-cards/my-card');
      const data = response.data || {};

      // 兼容不同返回結構：優先使用 cardConfig，其次使用 card 或直接使用根對象
      const card = data.cardConfig || data.card || data;
      const content = (card && (card.content_blocks || card.content)) || [];

      if (card && card.template_id !== undefined) {
        const mappedBlocks = Array.isArray(content) ? content.map(mapRowToBlock) : [];
        setCardConfig({
          template_id: card.template_id || null,
          template_name: card.template_name || '',
          custom_css: card.custom_css || '',
          card_title: card.card_title || '',
          card_subtitle: card.card_subtitle || '',
          user_name: card.user_name || (user?.name || ''),
          user_title: card.user_title || (user?.title || ''),
          user_company: card.user_company || (user?.company || ''),
          user_phone: card.user_phone || (user?.contactNumber || ''),
          user_email: card.user_email || (user?.email || ''),
          line_id: card.line_id || '',
          self_intro: card.self_intro || '',
          content_blocks: mappedBlocks
        });
      } else {
        setCardConfig({
          template_id: null,
          template_name: '',
          custom_css: '',
          card_title: '',
          card_subtitle: '',
          user_name: user?.name || '',
          user_title: user?.title || '',
          user_company: user?.company || '',
          user_phone: user?.contactNumber || '',
          user_email: user?.email || '',
          line_id: '',
          self_intro: '',
          content_blocks: []
        });
      }
    } catch (error) {
      console.error('獲取名片配置失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    // 新的模板列表（五個新風格）
    const newTemplates = [
      {
        id: 1,
        name: '質感商務感',
        description: '高質感商務設計，展現專業與品味的完美結合',
        preview_image_url: '/nfc-templates/premium-business.svg',
        is_active: true,
        display_order: 1,
        css_config: {
          accentColor: '#B8860B',
          primaryColor: '#ffffff',
          secondaryColor: '#34495e',
          iconPack: ['minimal', 'line', 'solid'],
          dividerOptions: ['solid-thin', 'solid-medium', 'dashed'],
          dividerOpacity: 0.6
        }
      },
      {
        id: 2,
        name: 'Cyberpunk風格',
        description: '未來科技感設計，霓虹色彩與數位美學的視覺衝擊',
        preview_image_url: '/nfc-templates/cyberpunk.svg',
        is_active: true,
        display_order: 2,
        css_config: {
          accentColor: '#00ffff',
          primaryColor: '#e6fffa',
          secondaryColor: '#8a2be2',
          iconPack: ['neon', 'outline', 'solid'],
          dividerOptions: ['solid-thin', 'neon-blue', 'neon-purple', 'neon-pink'],
          dividerOpacity: 0.7
        }
      },
      {
        id: 3,
        name: '簡約日系風',
        description: '日式極簡美學，清新自然的設計語言',
        preview_image_url: '/nfc-templates/japanese-minimal.svg',
        is_active: true,
        display_order: 3,
        css_config: {
          accentColor: '#ffd700',
          primaryColor: '#ffffff',
          secondaryColor: '#f5f5f5',
          iconPack: ['minimal', 'line'],
          dividerOptions: ['solid-thin', 'dotted', 'double'],
          dividerOpacity: 0.5
        }
      },
      {
        id: 4,
        name: '創意行銷風格',
        description: '活潑創意設計，吸引眼球的行銷視覺效果',
        preview_image_url: '/nfc-templates/creative-marketing.svg',
        is_active: true,
        display_order: 4,
        css_config: {
          accentColor: '#ff6b35',
          primaryColor: '#1f2937',
          secondaryColor: '#4b5563',
          iconPack: ['creative', 'rounded', 'filled'],
          dividerOptions: ['solid-thin', 'gradient', 'curve-strong'],
          dividerOpacity: 0.6
        }
      },
      {
        id: 5,
        name: '塗鴉可愛風',
        description: '手繪塗鴉風格，充滿童趣與創意的可愛設計',
        preview_image_url: '/nfc-templates/cute-graffiti.svg',
        is_active: true,
        display_order: 5,
        css_config: {
          accentColor: '#ff8fab',
          primaryColor: '#2d3748',
          secondaryColor: '#6bcb77',
          iconPack: ['handdrawn', 'rounded', 'filled'],
          dividerOptions: ['dashed', 'dotted', 'solid-thin'],
          dividerOpacity: 0.5
        }
      }
    ];

    // 追加：三款新模板
    const extraTemplates = [
      {
        id: 6,
        name: '黑金質感・商務尊榮風',
        description: '黑金配色，高級質感與專業尊榮的商務風格',
        preview_image_url: '/nfc-templates/black-gold-prestige.svg',
        is_active: true,
        display_order: 6,
        css_config: {
          accentColor: '#D4AF37',
          primaryColor: '#121212',
          secondaryColor: '#191919',
          iconPack: ['elegant', 'minimal', 'line'],
          dividerOptions: ['solid-thin', 'dashed', 'double'],
          dividerOpacity: 0.6
        }
      },
      {
        id: 7,
        name: '可愛手繪風',
        description: '柔和馬卡龍色系與手繪插畫，溫暖可愛風格',
        preview_image_url: '/nfc-templates/handdrawn-cute.svg',
        is_active: true,
        display_order: 7,
        css_config: {
          accentColor: '#FF8FAB',
          primaryColor: '#2D3748',
          secondaryColor: '#6BCB77',
          iconPack: ['handdrawn', 'rounded', 'filled'],
          dividerOptions: ['dashed', 'dotted', 'solid-thin'],
          dividerOpacity: 0.5
        }
      },
      {
        id: 8,
        name: '毛玻璃清透風',
        description: 'Glassmorphism 清透設計，白與淺藍漸層的優雅科技感',
        preview_image_url: '/nfc-templates/glassmorphism.svg',
        is_active: true,
        display_order: 8,
        css_config: {
          accentColor: '#3B82F6',
          primaryColor: '#F8FAFC',
          secondaryColor: '#E0F2FE',
          iconPack: ['outline', 'minimal', 'glass'],
          dividerOptions: ['solid-thin', 'gradient', 'wave-soft'],
          dividerOpacity: 0.4
        }
      }
    ];

    try {
      const response = await axios.get('/api/nfc-cards/templates');
      const list = response.data?.templates || response.data?.data || [];
      
      // 檢查是否包含舊模板名稱
      const hasOldTemplates = list.some(t => 
        t.name && (
          t.name.includes('科技專業版') || 
          t.name.includes('活力創意版') || 
          t.name.includes('簡約質感版') ||
          t.name.includes('商務專業版') ||
          t.name.includes('現代簡約版') ||
          t.name.includes('環保綠意版') ||
          t.name.includes('質感黑金版') ||
          t.name.includes('插畫塗鴉版')
        )
      );

      // 如果API返回舊模板或空數據，使用新模板（含追加三款）
      if (list.length === 0 || hasOldTemplates) {
        console.log('使用新模板列表（API返回舊模板或空數據）');
        setTemplates([...newTemplates, ...extraTemplates]);
        return;
      }

      // 去重（按名稱），但保留完整的模板數據
      const seen = new Map();
      const unique = [];
      for (const t of list) {
        if (!seen.has(t.name)) {
          seen.set(t.name, t);
          unique.push(t);
        } else {
          // 如果已存在同名模板，但當前模板有preview_image_url而已存在的沒有，則替換
          const existing = seen.get(t.name);
          if (t.preview_image_url && !existing.preview_image_url) {
            const index = unique.findIndex(item => item.name === t.name);
            if (index !== -1) {
              unique[index] = t;
              seen.set(t.name, t);
            }
          }
        }
      }
      
      // 加入三款新模板，並以名稱去重（避免重複）
      const merged = [...unique, ...extraTemplates];
      const seenNames = new Set();
      const deduped = merged.filter(t => {
        const name = (t.name || '').trim();
        if (seenNames.has(name)) return false;
        seenNames.add(name);
        return true;
      });
      setTemplates(deduped);
    } catch (error) {
      console.error('獲取模板失敗，使用新模板列表:', error);
      setTemplates([...newTemplates, ...extraTemplates]);
    }
  };

  const handleSaveBasicInfo = async () => {
    try {
      setSaving(true);
      // 更新名片的基本樣式與標題設定
      await axios.put('/api/nfc-cards/my-card', {
        template_id: cardConfig.template_id,
        custom_css: cardConfig.custom_css,
        card_title: cardConfig.card_title || '',
        card_subtitle: cardConfig.card_subtitle || ''
      });

      // 同步更新使用者檔案（姓名/職稱/公司/手機）
      await axios.put('/api/users/profile', {
        name: cardConfig.user_name || '',
        title: cardConfig.user_title || '',
        company: cardConfig.user_company || '',
        contact_number: cardConfig.user_phone || ''
      });
      setSuccessToastMessage('基本設定已保存');
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 1200);
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      const serverErrors = error?.response?.data?.errors;
      console.error('保存失敗:', { status, serverMessage, serverErrors, error });
      const detail = serverErrors ? `\n詳細: ${JSON.stringify(serverErrors)}` : '';
      alert(`保存失敗${status ? `（${status}）` : ''}：${serverMessage || '請稍後再試'}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContent = async () => {
    try {
      setSaving(true);
      // 在保存前以內容區塊方式同步 LINE ID 與自我介紹
      let blocks = upsertTextBlockByTitle(cardConfig.content_blocks || [], '自我介紹', cardConfig.self_intro);
      blocks = upsertTextBlockByTitle(blocks, 'LINE ID', cardConfig.line_id);
      const { sanitized, warnings } = sanitizeBlocksForSave(blocks);
      await axios.post('/api/nfc-cards/my-card/content', {
        content_blocks: sanitized.map((b, i) => ({
          ...b,
          display_order: i
        }))
      });
      if (warnings.length > 0) {
        alert('部分網址看起來不正確，系統已嘗試自動修正。');
      }
      setSuccessToastMessage('內容已保存');
      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 1200);
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      const serverErrors = error?.response?.data?.errors;
      console.error('保存內容失敗:', { status, serverMessage, serverErrors, error });
      const detail = serverErrors ? `\n詳細: ${JSON.stringify(serverErrors)}` : '';
      alert(`保存失敗${status ? `（${status}）` : ''}：${serverMessage || '請稍後再試'}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  // 一鍵保存：基本設定 + 內容
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      // 更新名片的基本樣式與標題設定
      await axios.put('/api/nfc-cards/my-card', {
        template_id: cardConfig.template_id,
        custom_css: cardConfig.custom_css,
        card_title: cardConfig.card_title || '',
        card_subtitle: cardConfig.card_subtitle || ''
      });

      // 同步更新使用者檔案（姓名/職稱/公司/手機）
      await axios.put('/api/users/profile', {
        name: cardConfig.user_name || '',
        title: cardConfig.user_title || '',
        company: cardConfig.user_company || '',
        contact_number: cardConfig.user_phone || ''
      });
      // 在保存前以內容區塊方式同步 LINE ID 與自我介紹
      let blocks = upsertTextBlockByTitle(cardConfig.content_blocks || [], '自我介紹', cardConfig.self_intro);
      blocks = upsertTextBlockByTitle(blocks, 'LINE ID', cardConfig.line_id);
      const { sanitized } = sanitizeBlocksForSave(blocks);
      await axios.post('/api/nfc-cards/my-card/content', {
        content_blocks: sanitized.map((b, i) => ({ ...b, display_order: i }))
      });
      setSuccessToastMessage('名片已保存');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 1200);
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;
      const serverErrors = error?.response?.data?.errors;
      console.error('保存失敗:', { status, serverMessage, serverErrors, error });
      const detail = serverErrors ? `\n詳細: ${JSON.stringify(serverErrors)}` : '';
      alert(`保存失敗${status ? `（${status}）` : ''}：${serverMessage || '請稍後再試'}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    const defaultIcon = Array.isArray(template?.css_config?.iconPack) ? template.css_config.iconPack[0] : '';
    const defaultDivider = Array.isArray(template?.css_config?.dividerOptions) ? template.css_config.dividerOptions[0] : 'solid-thin';
    const defaultOpacity = typeof template?.css_config?.dividerOpacity === 'number' ? template.css_config.dividerOpacity : 0.6;
    const next = {
      ...cardConfig,
      template_id: templateId,
      template_name: template?.name,
      css_config: template?.css_config || '',
      ui_icon_pack: cardConfig?.ui_icon_pack ?? defaultIcon,
      ui_divider_style: cardConfig?.ui_divider_style ?? defaultDivider,
      ui_divider_opacity: cardConfig?.ui_divider_opacity ?? defaultOpacity,
    };
    next.custom_css = buildCustomCss(template, next);
    setCardConfig(next);
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
    // 新增區塊並立即開啟就地編輯
    const newIndex = (cardConfig.content_blocks || []).length;
    setCardConfig({
      ...cardConfig,
      content_blocks: [...(cardConfig.content_blocks || []), newBlock]
    });
    // 立即開啟預覽側的就地編輯（或中央編輯器，視偏好）
    setEditingBlockIndex(newIndex);
    setEditingBlock(newIndex);
    setShowAddBlockModal(false);
    
    // 顯示成功提示
    setSuccessToastMessage('已添加內容區塊');
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 1000);
  };

  const getDefaultContentData = (blockType) => {
    switch (blockType) {
      case 'text':
        return { title: '標題', content: '內容描述' };
      case 'link':
        return { title: '連結標題', url: 'https://example.com' };
      case 'website':
        return { title: '網站標題', url: 'https://example.com' };
      case 'news':
        return { title: '新聞標題', url: 'https://example.com' };
      case 'file':
        return { title: '檔案標題', url: '' };
      case 'video':
        return { title: '影片標題', type: 'youtube', url: '', file: '', videoId: '' };
      case 'image':
        return { title: '圖片標題', url: '', alt: '圖片描述' };
      case 'social':
        return { linkedin: '', facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '' };
      case 'map':
        return { title: '地點名稱', address: '完整地址', map_url: '', coordinates: null };
      case 'icon':
        return { title: '圖標標題', icon_type: 'star', size: 'medium', description: '' };
      default:
        return {};
    }
  };

  // URL/地址 輕量校驗與標準化
  const normalizeUrl = (url) => {
    if (!url) return '';
    let v = String(url).trim();
    // 移除空白與中文全形空格
    v = v.replace(/\s+/g, '');
    // 若是以 www. 開頭，補 https://
    if (/^www\./i.test(v)) {
      return `https://${v}`;
    }
    // 若缺協議但像是網域
    if (!/^https?:\/\//i.test(v) && /\.[a-z]{2,}(\/|$)/i.test(v)) {
      return `https://${v}`;
    }
    return v;
  };

  const isLikelyUrl = (str) => {
    if (!str) return false;
    const v = String(str).trim();
    // 簡易判斷：有協議或像是網域
    return /^https?:\/\//i.test(v) || /\.[a-z]{2,}(\/|$)/i.test(v);
  };

  const sanitizeBlocksForSave = (blocks) => {
    const warnings = [];
    const sanitized = (blocks || []).map((b) => {
      if (!b || !b.type) return b;
      const type = b.type;
      const copy = { ...b };
      // 處理常見需要 URL 的型別
      if (['link', 'website', 'news', 'file'].includes(type)) {
        const url = normalizeUrl(copy.data?.url || copy.url || '');
        if (!isLikelyUrl(url) && url) {
          warnings.push({ type, id: b.id, field: 'url', value: url });
        }
        if (copy.data) copy.data.url = url; else copy.url = url;
      }
      // map_url 輕量處理
      if (type === 'map') {
        const mapUrl = normalizeUrl(copy.data?.map_url || copy.map_url || '');
        if (copy.data) copy.data.map_url = mapUrl; else copy.map_url = mapUrl;
      }
      return copy;
    });
    return { sanitized, warnings };
  };

  const handleDeleteBlock = (blockIndex) => {
    const updatedBlocks = cardConfig.content_blocks
      .filter((_, index) => index !== blockIndex)
      .map((b, i) => ({ ...b, display_order: i }));
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
    const cardUrl = `${window.location.origin}/member-card/${user.id}`;
    navigator.clipboard.writeText(cardUrl);
    alert('名片網址已複製到剪貼板！');
  };

  // 就地編輯：更新區塊單一欄位（供卡面 overlay 使用）
  const updateBlockField = (index, key, value) => {
    if (!cardConfig?.content_blocks || !cardConfig.content_blocks[index]) return;
    const prev = cardConfig.content_blocks[index].content_data || {};
    const next = { ...prev, [key]: value };
    handleEditBlock(index, next);
  };

  const inlineUpload = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await axios.post('/api/nfc-cards/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return resp?.data?.data?.url || null;
    } catch (e) {
      console.error('上傳失敗', e);
      return null;
    }
  };

  const handleInlineImageUpload = async (index, file) => {
    const url = await inlineUpload(file);
    if (url) {
      updateBlockField(index, 'url', url);
      const name = file?.name || '';
      if (!cardConfig?.content_blocks?.[index]?.content_data?.title) {
        updateBlockField(index, 'title', name);
      }
      if (!cardConfig?.content_blocks?.[index]?.content_data?.alt) {
        updateBlockField(index, 'alt', name);
      }
    } else {
      alert('圖片上傳失敗，請重試');
    }
  };

  const handleInlineIconUpload = async (index, file) => {
    const url = await inlineUpload(file);
    if (url) {
      const prev = cardConfig?.content_blocks?.[index]?.content_data || {};
      const next = { ...prev, icon_url: url, icon_type: 'custom' };
      handleEditBlock(index, next);
    } else {
      alert('圖標上傳失敗，請重試');
    }
  };

  // 就地編輯：基本資訊（姓名 / 職稱 / 公司）
  const updateBasicField = (key, value) => {
    setCardConfig(prev => ({ ...prev, [key]: value }));
  };

  // 以標題識別並新增/更新文字區塊（用於 LINE ID 與自我介紹）
  const upsertTextBlockByTitle = (blocks, title, content) => {
    const safeContent = (content || '').trim();
    const list = Array.isArray(blocks) ? [...blocks] : [];
    const idx = list.findIndex(b => b?.content_type === 'text' && (b?.content_data?.title || '').trim() === title);

    if (safeContent) {
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          content_data: { ...(list[idx].content_data || {}), title, content: safeContent },
          is_visible: true
        };
      } else {
        list.push({
          content_type: 'text',
          content_data: { title, content: safeContent },
          display_order: list.length,
          is_visible: true,
          custom_styles: {}
        });
      }
    } else if (idx >= 0) {
      // 若內容為空，移除既有區塊
      list.splice(idx, 1);
    }

    return list.map((b, i) => ({ ...b, display_order: i }));
  };

  // 區塊工具列：隱藏顯示
  const toggleBlockVisibility = (blockIndex) => {
    setCardConfig(prev => {
      if (!prev?.content_blocks || !prev.content_blocks[blockIndex]) return prev;
      const blocks = [...prev.content_blocks];
      blocks[blockIndex] = { ...blocks[blockIndex], is_visible: !blocks[blockIndex].is_visible };
      return { ...prev, content_blocks: blocks };
    });
  };

  // 區塊工具列：上移
  const moveBlockUp = (blockIndex) => {
    setCardConfig(prev => {
      if (!prev?.content_blocks || blockIndex <= 0) return prev;
      const blocks = [...prev.content_blocks];
      const tmp = blocks[blockIndex - 1];
      blocks[blockIndex - 1] = blocks[blockIndex];
      blocks[blockIndex] = tmp;
      const updated = blocks.map((b, i) => ({ ...b, display_order: i }));
      return { ...prev, content_blocks: updated };
    });
  };

  // 區塊工具列：下移
  const moveBlockDown = (blockIndex) => {
    setCardConfig(prev => {
      if (!prev?.content_blocks || blockIndex >= prev.content_blocks.length - 1) return prev;
      const blocks = [...prev.content_blocks];
      const tmp = blocks[blockIndex + 1];
      blocks[blockIndex + 1] = blocks[blockIndex];
      blocks[blockIndex] = tmp;
      const updated = blocks.map((b, i) => ({ ...b, display_order: i }));
      return { ...prev, content_blocks: updated };
    });
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
      map: '地圖',
      icon: '圖標'
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

  const selectedTemplate = templates.find(t => t.id === cardConfig?.template_id);
  const selectedPreview = selectedTemplate?.preview_image_url || '/nfc-templates/placeholder.svg';

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-black to-gray-900">
      {/* 頂部操作欄 */}
      <div className="bg-gradient-to-r from-black/90 to-gray-900/90 border-b border-yellow-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">電子名片編輯器</h1>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddBlockModal(true)}
                className="hidden md:inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-500 hover:to-yellow-400 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                新增內容
              </button>
              <button
                onClick={() => setShowDesktopTemplate(true)}
                className="hidden md:inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 text-gold-100 rounded-lg hover:from-gray-700 hover:to-gray-600 transition-colors"
              >
                <Bars3Icon className="h-4 w-4 mr-2" />
                模板選擇
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="hidden md:inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-500 hover:to-green-400 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                {saving ? '保存中…' : '保存'}
              </button>
              {/* 行動版保存按鈕 */}
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="md:hidden inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                {saving ? '保存中…' : '保存'}
              </button>
              <button
                onClick={copyCardUrl}
                className="flex items-center px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                複製名片網址
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-4rem)]">
        {/* 編輯模式 - 三欄布局：基本設定、內容編輯、即時預覽 */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
            {/* 左側：基本設定 */}
            <div className={singleScreenMode ? 'hidden' : 'xl:col-span-3'}>
              <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gold-100 mb-4">基本設定</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gold-300 mb-2">
                      選擇模板
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateChange(template.id)}
                          className={`group relative rounded-lg overflow-hidden border ${cardConfig?.template_id === template.id ? 'border-amber-500 ring-2 ring-amber-400' : 'border-gold-600'}`}
                          title={template.name}
                        >
                          <img
                            src={template.preview_image_url || '/nfc-templates/placeholder.svg'}
                            alt={template.name}
                            className="w-full h-24 object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/50 text-xs text-gold-100 px-2 py-1">
                            {template.name}
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* 模板預覽 */}
                    <div className="mt-3">
                      <div className="text-sm text-gold-300 mb-2">模板預覽</div>
                      <div className="border border-gold-600 bg-black/20 rounded-lg p-3 flex items-center space-x-3">
                        <img src={selectedPreview} alt="模板預覽" className="w-20 h-14 object-cover rounded border border-gold-600" />
                        <div>
                          <div className="font-medium text-gold-100">{selectedTemplate?.name || '未選擇模板'}</div>
                          <div className="text-xs text-gold-400">{selectedTemplate?.description || '請選擇一個模板以查看預覽'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 圖標庫與分隔線選擇 */}
                  {selectedTemplate?.css_config && (
                    <div className="space-y-4 mt-4">
                      {Array.isArray(selectedTemplate.css_config.iconPack) && (
                        <div>
                          <label className="block text-sm font-medium text-gold-300 mb-2">
                            圖標庫
                          </label>
                          <select
                            value={cardConfig?.ui_icon_pack || (selectedTemplate.css_config.iconPack[0] || '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCardConfig(prev => {
                                const next = { ...prev, ui_icon_pack: value };
                                next.custom_css = buildCustomCss(selectedTemplate, next);
                                return next;
                              });
                            }}
                            className="w-full px-3 py-2 bg-black/40 border border-gold-600 rounded-lg text-gold-100 focus:ring-2 focus:ring-gold-500 focus:border-gold-400"
                          >
                            {selectedTemplate.css_config.iconPack.map((opt, idx) => (
                              <option key={`${opt}-${idx}`} value={opt} className="bg-black text-gold-100">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {Array.isArray(selectedTemplate.css_config.dividerOptions) && (
                        <div>
                          <label className="block text-sm font-medium text-gold-300 mb-2">
                            分隔線樣式
                          </label>
                          <select
                            value={cardConfig?.ui_divider_style || (selectedTemplate.css_config.dividerOptions[0] || 'solid-thin')}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCardConfig(prev => {
                                const next = { ...prev, ui_divider_style: value };
                                next.custom_css = buildCustomCss(selectedTemplate, next);
                                return next;
                              });
                            }}
                            className="w-full px-3 py-2 bg-black/40 border border-gold-600 rounded-lg text-gold-100 focus:ring-2 focus:ring-gold-500 focus:border-gold-400"
                          >
                            {selectedTemplate.css_config.dividerOptions.map((opt, idx) => (
                              <option key={`${opt}-${idx}`} value={opt} className="bg-black text-gold-100">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gold-300 mb-2">
                          分隔線透明度 ({(cardConfig?.ui_divider_opacity ?? (selectedTemplate?.css_config?.dividerOpacity ?? 0.6)).toFixed(2)})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={cardConfig?.ui_divider_opacity ?? (selectedTemplate?.css_config?.dividerOpacity ?? 0.6)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setCardConfig(prev => {
                              const next = { ...prev, ui_divider_opacity: value };
                              next.custom_css = buildCustomCss(selectedTemplate, next);
                              return next;
                            });
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}


                  <button
                    onClick={handleSaveBasicInfo}
                    disabled={saving}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '保存中...' : '保存基本設定'}
                  </button>

                  {/* 常駐欄位：姓名 / 職稱 / 公司 / 手機 / Email / LINE ID / 自我介紹 */}
                  <div className="mt-6 space-y-4 border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200">姓名</label>
                      <input
                        type="text"
                        value={cardConfig?.user_name || ''}
                        onChange={(e) => updateBasicField('user_name', e.target.value)}
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="請輸入姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">職稱</label>
                      <input
                        type="text"
                        value={cardConfig?.user_title || ''}
                        onChange={(e) => updateBasicField('user_title', e.target.value)}
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="請輸入職稱"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">公司</label>
                      <input
                        type="text"
                        value={cardConfig?.user_company || ''}
                        onChange={(e) => updateBasicField('user_company', e.target.value)}
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="請輸入公司名稱"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">手機</label>
                      <input
                        type="tel"
                        value={cardConfig?.user_phone || ''}
                        onChange={(e) => updateBasicField('user_phone', e.target.value)}
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="例：0912-345-678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">電子信箱（僅顯示）</label>
                      <input
                        type="email"
                        value={cardConfig?.user_email || user?.email || ''}
                        readOnly
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="信箱由註冊資料提供"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">LINE ID</label>
                      <input
                        type="text"
                        value={cardConfig?.line_id || ''}
                        onChange={(e) => updateBasicField('line_id', e.target.value)}
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="請輸入 LINE ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200">自我介紹</label>
                      <textarea
                        value={cardConfig?.self_intro || ''}
                        onChange={(e) => updateBasicField('self_intro', e.target.value)}
                        className="mt-1 w-full border border-gold-600 bg-black/40 rounded-md p-2 text-gold-100"
                        placeholder="簡短介紹自己（最多 140 字）"
                        maxLength={140}
                        rows={3}
                      />
                    </div>
                  </div>
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
                    { type: 'map', icon: MapPinIcon, label: '地圖' },
                    { type: 'icon', icon: UserIcon, label: '圖標' }
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
            
            {/* 中間：內容編輯（單畫面模式隱藏） */}
            <div className={singleScreenMode ? 'hidden' : 'xl:col-span-5'}>
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
            
            {/* 右側：即時預覽（單畫面模式：全寬） */}
            <div className={singleScreenMode ? "xl:col-span-12" : "xl:col-span-4"}>
              <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-lg shadow-lg py-8 px-6 md:sticky md:top-8">
                <h2 className="text-lg font-semibold text-gold-100 mb-4 flex items-center">
                  <EyeIcon className="h-5 w-5 mr-2 text-gold-400" />
                  即時預覽
                </h2>
                
                <div className="border border-gold-600 rounded-lg overflow-hidden shadow-inner bg-gradient-to-b from-gray-900/50 to-black/50 relative">
                  {/* 行動版上下拖曳把手：僅在手機顯示 */}
                  <div className="absolute top-0 left-0 right-0 md:hidden flex justify-center items-center z-10 pt-2">
                    <div
                      className="w-12 h-1.5 bg-yellow-500/70 rounded-full"
                      onMouseDown={(e) => beginResize(e.clientY, 'top')}
                      onTouchStart={(e) => beginResize(e.touches && e.touches[0] ? e.touches[0].clientY : 0, 'top')}
                    />
                  </div>
                  {/* 套用模板樣式的預覽（加大底部內距以避免固定按鈕遮擋） */}
                  <div
                    className="mx-auto px-3 sm:px-4 pb-24 overflow-y-auto max-w-[360px] sm:max-w-[420px] md:max-w-[480px] xl:max-w-[512px] 2xl:max-w-[720px]"
                    style={{ minHeight: '28rem' }}
                  >
                    <TemplatePreview 
                      template={selectedTemplate}
                      cardConfig={cardConfig}
                      editingBlockIndex={editingBlockIndex}
                      updateBlockField={updateBlockField}
                      updateBasicField={updateBasicField}
                      onDeleteBlock={handleDeleteBlock}
                      onToggleVisibility={toggleBlockVisibility}
                      onMoveUp={moveBlockUp}
                      onMoveDown={moveBlockDown}
                      setEditingBlockIndex={setEditingBlockIndex}
                      onInlineImageUpload={handleInlineImageUpload}
                      onInlineIconUpload={handleInlineIconUpload}
                    />
                  </div>
                  {/* 底部拖曳把手（手機版） */}
                  <div className="absolute bottom-0 left-0 right-0 md:hidden flex justify-center items-center z-10 pb-2">
                    <div
                      className="w-12 h-1.5 bg-yellow-500/70 rounded-full"
                      onMouseDown={(e) => beginResize(e.clientY, 'bottom')}
                      onTouchStart={(e) => beginResize(e.touches && e.touches[0] ? e.touches[0].clientY : 0, 'bottom')}
                    />
                  </div>
                  {/* 編輯器容器內的新增內容按鈕 */}
                  {/* 移除容器內絕對定位的新增內容按鈕，避免與內容重疊、並改用全局固定按鈕 */}
                  
                  <div className="p-4 bg-gradient-to-r from-black/40 to-gray-900/40 border-t border-gold-600/50 text-center backdrop-blur-sm">
                    <a 
                      href={`/member-card/${user?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white font-medium text-sm rounded-lg hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      完整版本
                    </a>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-gold-300 text-center bg-gradient-to-r from-transparent via-gold-900/20 to-transparent py-2 rounded-lg">
                  💡 修改會即時反映在預覽中
                </div>
              </div>
            </div>
          </div>
      </div>
      
      {/* 全局固定：左下角新增內容按鈕（行動端優先），不隨頁面滑動 */}
      <div
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 md:hidden lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => setShowAddBlockModal(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-gray-900 font-medium shadow-lg hover:from-yellow-500 hover:to-yellow-400 active:scale-95 transition text-sm"
        >
          新增內容
        </button>
      </div>

      {/* 成功提示視窗 */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            className="fixed top-5 right-5 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-lg">✓</span>
            <span>{successToastMessage || '已完成'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 模板選擇面板（右側抽屜，桌面） */}
      <AnimatePresence>
        {showDesktopTemplate && (
          <motion.div
            className="fixed inset-0 z-40 hidden md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDesktopTemplate(false)}
          >
            <motion.div
              className="absolute top-20 right-6 w-[380px] bg-white rounded-2xl shadow-2xl p-4 border"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-800 font-semibold">選擇模板</div>
                <button
                  onClick={() => setShowDesktopTemplate(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <select
                className="hidden"
              />
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={`desktop-${template.id}`}
                    onClick={() => handleTemplateChange(template.id)}
                    className={`group relative rounded-lg overflow-hidden border ${cardConfig?.template_id === template.id ? 'border-amber-500 ring-2 ring-amber-400' : 'border-gray-300'}`}
                    title={template.name}
                  >
                    <img
                      src={template.preview_image_url || '/nfc-templates/placeholder.svg'}
                      alt={template.name}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/40 text-xs text-white px-2 py-1">
                      {template.name}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowDesktopTemplate(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  完成
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 全局固定：右下角模板選擇按鈕（僅行動端顯示） */}
      <div
        className="fixed bottom-4 right-4 md:hidden lg:hidden z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => setShowTemplatePicker(true)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 font-medium shadow-lg hover:from-amber-400 hover:to-yellow-300 active:scale-95 transition text-sm"
        >
          模板選擇
        </button>
      </div>

      {/* 模板選擇面板（底部抽屜，行動端） */}
      <AnimatePresence>
        {showTemplatePicker && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTemplatePicker(false)}
          >
            <motion.div
              className="absolute bottom-16 right-4 left-4 sm:left-auto sm:w-96 bg-white rounded-2xl shadow-2xl p-4"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-800 font-semibold">選擇模板</div>
                <button
                  onClick={() => setShowTemplatePicker(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={`mobile-${template.id}`}
                    onClick={() => handleTemplateChange(template.id)}
                    className={`group relative rounded-lg overflow-hidden border ${cardConfig?.template_id === template.id ? 'border-amber-500 ring-2 ring-amber-400' : 'border-gray-300'}`}
                    title={template.name}
                  >
                    <img
                      src={template.preview_image_url || '/nfc-templates/placeholder.svg'}
                      alt={template.name}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/40 text-xs text-white px-2 py-1">
                      {template.name}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowTemplatePicker(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  完成
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 內容類型選單（面板/底部抽屜） */}
      <AnimatePresence>
        {showAddBlockModal && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddBlockModal(false)}
          >
            <motion.div
              className="absolute bottom-16 left-4 right-4 sm:left-4 sm:right-auto sm:w-96 bg-white rounded-2xl shadow-2xl p-4"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-gray-800 font-semibold mb-2">選擇內容類型</div>
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => handleAddContentBlock('text')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">文字</span>
                </button>
                <button onClick={() => handleAddContentBlock('link')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">連結</span>
                </button>
                <button onClick={() => handleAddContentBlock('video')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <PlayIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">影片</span>
                </button>
                <button onClick={() => handleAddContentBlock('image')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <PhotoIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">圖片</span>
                </button>
                <button onClick={() => handleAddContentBlock('social')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <FaInstagram className="h-5 w-5 text-pink-500" />
                  <span className="text-xs">社群媒體</span>
                </button>
                <button onClick={() => handleAddContentBlock('map')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <MapPinIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">地圖</span>
                </button>
                <button onClick={() => handleAddContentBlock('icon')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                  <DocumentDuplicateIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-xs">圖標</span>
                </button>
              </div>
              <div className="mt-3 text-right">
                <button
                  onClick={() => setShowAddBlockModal(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 區塊內容編輯器組件
const BlockContentEditor = ({ block, onSave, onCancel }) => {
  const [data, setData] = useState(block.content_data || {});

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
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <textarea
              value={data.content || ''}
              onChange={(e) => setData({ ...data, content: e.target.value })}
              placeholder="內容"
              rows={3}
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <input
              type="url"
              value={data.url || ''}
              onChange={(e) => setData({ ...data, url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="影片標題"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <select
              value={data.type || 'youtube'}
              onChange={(e) => setData({ ...data, type: e.target.value })}
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="youtube">YouTube</option>
              <option value="upload">上傳影片</option>
            </select>
            {data.type === 'youtube' ? (
              <input
                type="text"
                value={data.url || ''}
                onChange={(e) => {
                  const url = e.target.value;
                  setData({ ...data, url, videoId: getYouTubeVideoId(url) });
                }}
                placeholder="YouTube 網址 (例如: https://www.youtube.com/watch?v=dQw4w9WgXcQ)"
                className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // 這裡可以實現文件上傳邏輯
                      setData({ ...data, file: file.name });
                    }
                  }}
                  className="hidden"
                  id={`video-upload-${block.id}`}
                />
                <label htmlFor={`video-upload-${block.id}`} className="cursor-pointer">
                  <PlayIcon className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                  <p className="text-sm text-amber-200">點擊上傳影片文件</p>
                  {data.file && <p className="text-xs text-amber-400 mt-1">已選擇: {data.file}</p>}
                </label>
              </div>
            )}
          </div>
        );
      
      case 'image':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="圖片標題"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setData({ ...data, url: e.target.result, alt: file.name });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id={`image-upload-${block.id}`}
              />
              <label htmlFor={`image-upload-${block.id}`} className="cursor-pointer">
                {data.url ? (
                  <div>
                    <img src={data.url} alt={data.alt} className="max-w-full h-32 object-cover mx-auto rounded" />
                    <p className="text-xs text-green-600 mt-2">點擊更換圖片</p>
                  </div>
                ) : (
                  <div>
                    <PhotoIcon className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                    <p className="text-sm text-amber-200">點擊上傳圖片</p>
                  </div>
                )}
              </label>
            </div>
            <input
              type="text"
              value={data.alt || ''}
              onChange={(e) => setData({ ...data, alt: e.target.value })}
              placeholder="圖片描述"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        );
      
      case 'social':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-amber-200 mb-3">社群媒體連結</h4>
            {[
              { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: 'bg-blue-600' },
              { key: 'facebook', name: 'Facebook', icon: <FaFacebook />, color: 'bg-blue-500' },
              { key: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: 'bg-pink-500' },
              { key: 'twitter', name: 'Twitter', icon: <FaTwitter />, color: 'bg-blue-400' },
              { key: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: 'bg-red-500' },
              { key: 'tiktok', name: 'TikTok', icon: <FaTiktok />, color: 'bg-black' }
            ].map(platform => (
              <div key={platform.key} className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${platform.color} rounded flex items-center justify-center text-white text-sm`}>
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <input
                    type="url"
                    value={data[platform.key] || ''}
                    onChange={(e) => setData({ ...data, [platform.key]: e.target.value })}
                    placeholder={`${platform.name} 網址`}
                    className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'map':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="地點名稱"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <textarea
              value={data.address || ''}
              onChange={(e) => setData({ ...data, address: e.target.value })}
              placeholder="完整地址"
              rows={2}
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <input
              type="text"
              value={data.map_url || ''}
              onChange={(e) => setData({ ...data, map_url: e.target.value })}
              placeholder="Google Maps 網址 (可選)"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            {data.address && (
              <div className="bg-gray-800 p-3 rounded border border-amber-300">
                <p className="text-sm text-amber-200 mb-2">地圖預覽:</p>
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(data.address)}`}
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded"
                  title="地圖預覽"
                ></iframe>
                <p className="text-xs text-amber-300 mt-1">注意：需要設定 Google Maps API Key 才能正常顯示地圖</p>
              </div>
            )}
          </div>
        );
      
      case 'icon':
        return (
          <div className="space-y-3">
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="圖標標題"
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">
                選擇圖標
              </label>
              <select
                value={data.icon_type || 'star'}
                onChange={(e) => setData({ ...data, icon_type: e.target.value })}
                className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="star">⭐ 星星</option>
                <option value="heart">❤️ 愛心</option>
                <option value="diamond">💎 鑽石</option>
                <option value="crown">👑 皇冠</option>
                <option value="trophy">🏆 獎盃</option>
                <option value="fire">🔥 火焰</option>
                <option value="lightning">⚡ 閃電</option>
                <option value="rocket">🚀 火箭</option>
                <option value="target">🎯 目標</option>
                <option value="medal">🏅 獎牌</option>
                <option value="gem">💍 寶石</option>
                <option value="sparkles">✨ 閃光</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-300 mb-2">
                圖標大小
              </label>
              <select
                value={data.size || 'medium'}
                onChange={(e) => setData({ ...data, size: e.target.value })}
                className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="small">小 (16px)</option>
                <option value="medium">中 (24px)</option>
                <option value="large">大 (32px)</option>
                <option value="xlarge">特大 (48px)</option>
              </select>
            </div>
            <textarea
              value={data.description || ''}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              placeholder="圖標描述 (可選)"
              rows={2}
              className="w-full px-3 py-2 border border-amber-300 bg-gray-900 text-amber-100 placeholder-amber-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <div className="bg-gray-800 p-3 rounded border border-amber-300">
              <p className="text-sm text-amber-200 mb-2">預覽:</p>
              <div className="flex items-center space-x-2">
                <span style={{ fontSize: data.size === 'small' ? '16px' : data.size === 'medium' ? '24px' : data.size === 'large' ? '32px' : '48px' }}>
                  {data.icon_type === 'star' ? '⭐' :
                   data.icon_type === 'heart' ? '❤️' :
                   data.icon_type === 'diamond' ? '💎' :
                   data.icon_type === 'crown' ? '👑' :
                   data.icon_type === 'trophy' ? '🏆' :
                   data.icon_type === 'fire' ? '🔥' :
                   data.icon_type === 'lightning' ? '⚡' :
                   data.icon_type === 'rocket' ? '🚀' :
                   data.icon_type === 'target' ? '🎯' :
                   data.icon_type === 'medal' ? '🏅' :
                   data.icon_type === 'gem' ? '💍' :
                   data.icon_type === 'sparkles' ? '✨' : '⭐'}
                </span>
                <div>
                  <div className="text-amber-100 font-medium">{data.title || '圖標標題'}</div>
                  {data.description && (
                    <div className="text-amber-300 text-sm">{data.description}</div>
                  )}
                </div>
              </div>
            </div>
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
          className="px-3 py-1 text-amber-200 bg-gray-800 border border-amber-300 rounded hover:bg-gray-700 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1 text-gray-900 bg-amber-500 rounded hover:bg-amber-400 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
};

// 模板預覽組件
const TemplatePreview = ({ template, cardConfig, editingBlockIndex, updateBlockField, updateBasicField, onDeleteBlock, onToggleVisibility, onMoveUp, onMoveDown, setEditingBlockIndex, onInlineImageUpload, onInlineIconUpload }) => {
  const { user } = useAuth();
  
  const hexToRgb = (hex) => {
    try {
      const clean = hex?.replace('#', '') || 'ffffff';
      const bigint = parseInt(clean, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `${r}, ${g}, ${b}`;
    } catch { return '255, 255, 255'; }
  };

  const getDividerBorder = (style, colorHex, opacity) => {
    const rgb = hexToRgb(colorHex || '#cccccc');
    const rgba = `rgba(${rgb}, ${typeof opacity === 'number' ? opacity : 0.6})`;
    switch (style) {
      case 'solid-thin': return `1px solid ${rgba}`;
      case 'solid-medium': return `2px solid ${rgba}`;
      case 'dashed': return `1px dashed ${rgba}`;
      case 'dotted': return `1px dotted ${rgba}`;
      case 'double': return `3px double ${rgba}`;
      case 'neon-blue':
      case 'neon-purple':
      case 'neon-pink':
        return `2px solid ${rgba}`;
      case 'gradient':
      case 'wave-soft':
      case 'curve-strong':
      case 'ornament':
        return `2px solid ${rgba}`;
      default:
        return `1px solid ${rgba}`;
    }
  };

  const getTemplateClassName = () => mapTemplateNameToClass(template?.name);

  const templateClass = getTemplateClassName();
  const accentColor = template?.css_config?.accentColor || template?.css_config?.secondaryColor || '#cccccc';
  const dividerStyle = cardConfig?.ui_divider_style || template?.css_config?.dividerOptions?.[0] || 'solid-thin';
  const dividerOpacity = typeof cardConfig?.ui_divider_opacity === 'number' ? cardConfig.ui_divider_opacity : (template?.css_config?.dividerOpacity ?? 0.6);
  const borderTopCss = getDividerBorder(dividerStyle, accentColor, dividerOpacity);

  return (
    <div className={`nfc-card-container nfc-card-preview nfc-card-base ${templateClass}`}>
      <div className="card-content">
        {/* 移除名片標題與副標題（即時預覽不顯示） */}

        {/* 個人資訊區塊 */}
        <div className="personal-info-section">
          <div className="avatar-container">
            {user?.profilePictureUrl ? (
              <img 
                src={user.profilePictureUrl} 
                alt={user.name}
                className="user-avatar"
              />
            ) : (
              <div className="avatar-placeholder">
                <UserIcon className="h-12 w-12 text-white" />
              </div>
            )}
          </div>
          <div className="user-info">
            <h2 className="user-name">{cardConfig?.user_name || user?.name || '用戶姓名'}</h2>
            {(cardConfig?.user_title || user?.title) && (
              <p className="user-position">{cardConfig?.user_title || user?.title}</p>
            )}
            {(cardConfig?.user_company || user?.company) && (
              <p className="user-company">{cardConfig?.user_company || user?.company}</p>
            )}
            {/* 即時顯示：LINE 與自我介紹（僅在有資料時顯示） */}
            {cardConfig?.line_id && (
              <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-green-500/15 text-green-300 text-xs">
                <span className="mr-1">💬</span>
                <span>LINE ID：{cardConfig.line_id}</span>
              </div>
            )}
            {cardConfig?.self_intro && (
              <p className="mt-2 text-sm text-amber-200/90">{cardConfig.self_intro}</p>
            )}
          </div>
          {/* 基本資訊就地編輯 Overlay */}
              {editingBlockIndex === 'basic' && (
            <div className="inline-editor-overlay">
              <label>姓名</label>
              <input
                type="text"
                value={cardConfig?.user_name || ''}
                onChange={(e) => updateBasicField('user_name', e.target.value)}
                className="inline-editor-input"
              />
              <label>職稱</label>
              <input
                type="text"
                value={cardConfig?.user_title || ''}
                onChange={(e) => updateBasicField('user_title', e.target.value)}
                className="inline-editor-input"
              />
              <label>公司</label>
              <input
                type="text"
                value={cardConfig?.user_company || ''}
                onChange={(e) => updateBasicField('user_company', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-toolbar">
                <button className="inline-toolbar-button" onClick={() => setEditingBlockIndex(null)}>完成</button>
              </div>
              <div className="inline-editor-hint">基本資訊就地編輯（保存於基本設定）</div>
            </div>
          )}
        </div>

        {/* 內容區塊 */}
        <div className="content-blocks">
          {cardConfig?.content_blocks?.length > 0 ? (
            cardConfig.content_blocks.map((block, index) => (
              <div key={index} className="content-block" style={{ borderTop: borderTopCss }}>
                {/* 工具列（置於卡片標題上方） */}
                <div className="block-toolbar">
                  <button className="inline-toolbar-button" onClick={() => setEditingBlockIndex(editingBlockIndex === index ? null : index)}>編輯</button>
                  <button className="inline-toolbar-button" onClick={() => onToggleVisibility(index)}>{block?.is_visible === false ? '顯示' : '隱藏'}</button>
                  <button className="inline-toolbar-button" onClick={() => onMoveUp(index)}>上移</button>
                  <button className="inline-toolbar-button" onClick={() => onMoveDown(index)}>下移</button>
                  <button className="inline-toolbar-button" onClick={() => onDeleteBlock(index)}>刪除</button>
                </div>
                <BlockPreview block={block} index={index} editingBlockIndex={editingBlockIndex} updateBlockField={updateBlockField} />
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <PhotoIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">尚未添加內容</p>
              <p className="text-xs mt-1">按下「新增內容」按鈕添加內容</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 區塊預覽組件（支援就地編輯 overlay）
const BlockPreview = ({ block, index, editingBlockIndex, updateBlockField }) => {
  if (!block) return null;
  const { content_data } = block;
  
  switch (block.content_type) {
    case 'text':
      return (
        <div>
          <div className="block-title">
            {content_data?.title || '文字區塊'}
          </div>
          <div className="description-text text-xs">
            {content_data?.content || '內容文字'}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>內容</label>
              <textarea
                rows={3}
                value={content_data?.content || ''}
                onChange={(e) => updateBlockField(index, 'content', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    case 'link':
      return (
        <div>
          <div className="block-title">
            {content_data?.title || '連結標題'}
          </div>
          <div className="description-text text-xs">
            {content_data?.url || 'https://example.com'}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>網址</label>
              <input
                type="url"
                value={content_data?.url || ''}
                onChange={(e) => updateBlockField(index, 'url', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    case 'website':
      return (
        <div>
          <div className="block-title">
            {content_data?.title || '網站標題'}
          </div>
          <div className="description-text text-xs">
            {content_data?.url || 'https://example.com'}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>網址</label>
              <input
                type="url"
                value={content_data?.url || ''}
                onChange={(e) => updateBlockField(index, 'url', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    case 'news':
      return (
        <div>
          <div className="block-title">
            {content_data?.title || '新聞標題'}
          </div>
          <div className="description-text text-xs">
            {content_data?.url || 'https://example.com/news'}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>網址</label>
              <input
                type="url"
                value={content_data?.url || ''}
                onChange={(e) => updateBlockField(index, 'url', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    case 'file':
      return (
        <div>
          <div className="block-title">
            {content_data?.title || '檔案標題'}
          </div>
          <div className="description-text text-xs">
            {content_data?.url || 'https://example.com/file.pdf'}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>檔案標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>檔案網址</label>
              <input
                type="url"
                value={content_data?.url || ''}
                onChange={(e) => updateBlockField(index, 'url', e.target.value)}
                className="inline-editor-input"
                placeholder="https://example.com/file.pdf"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    case 'video':
      return (
        <div>
          <div className="block-title">
            {content_data?.title || '影片標題'}
          </div>
          <div className="description-text text-xs">
            {content_data?.type === 'youtube' ? (
              (content_data?.url || content_data?.videoId) ? (
                <div className="flex items-center gap-1">
                  <span>📺</span>
                  <span>YouTube 影片</span>
                </div>
              ) : (
                '請輸入 YouTube 網址'
              )
            ) : (
              content_data?.file ? (
                <div className="flex items-center gap-1">
                  <span>🎬</span>
                  <span>{content_data.file}</span>
                </div>
              ) : (
                '請上傳影片文件'
              )
            )}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>來源</label>
              <select
                value={content_data?.type || 'youtube'}
                onChange={(e) => updateBlockField(index, 'type', e.target.value)}
                className="inline-editor-input"
              >
                <option value="youtube">YouTube</option>
                <option value="upload">上傳影片</option>
              </select>
              {content_data?.type === 'youtube' ? (
                <>
                  <label>YouTube 網址</label>
                  <input
                    type="text"
                    value={content_data?.url || ''}
                    onChange={(e) => updateBlockField(index, 'url', e.target.value)}
                    className="inline-editor-input"
                  />
                </>
              ) : (
                <>
                  <label>影片檔名</label>
                  <input
                    type="text"
                    value={content_data?.file || ''}
                    onChange={(e) => updateBlockField(index, 'file', e.target.value)}
                    className="inline-editor-input"
                  />
                </>
              )}
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    case 'image':
      return (
        <div>
          <div className="block-title text-amber-200" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {content_data?.title || '圖片標題'}
          </div>
          {content_data?.url ? (
            <div className="mb-2">
              <img 
                src={content_data.url} 
                alt={content_data.alt} 
                className="max-w-full h-16 object-cover rounded" 
                style={{ maxHeight: '64px' }}
              />
            </div>
          ) : (
            <div className="text-amber-100 text-xs mb-2">
              <span>🖼️ 請上傳圖片</span>
            </div>
          )}
          {content_data?.alt && (
            <div className="text-amber-300 text-xs italic">
              {content_data.alt}
            </div>
          )}
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>上傳圖片</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onInlineImageUpload(index, e.target.files?.[0])}
                className="inline-editor-input"
              />
              <label>圖片網址</label>
              <input
                type="text"
                value={content_data?.url || ''}
                onChange={(e) => updateBlockField(index, 'url', e.target.value)}
                className="inline-editor-input"
              />
              <label>描述</label>
              <input
                type="text"
                value={content_data?.alt || ''}
                onChange={(e) => updateBlockField(index, 'alt', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    case 'social':
      return (
        <div>
          <div className="block-title" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            社群媒體
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin /> },
              { key: 'facebook', name: 'Facebook', icon: <FaFacebook /> },
              { key: 'instagram', name: 'Instagram', icon: <FaInstagram /> },
              { key: 'twitter', name: 'Twitter', icon: <FaTwitter /> },
              { key: 'youtube', name: 'YouTube', icon: <FaYoutube /> },
              { key: 'tiktok', name: 'TikTok', icon: <FaTiktok /> }
            ].filter(platform => content_data?.[platform.key]).map(platform => (
              <span key={platform.key} className="px-2 py-1 bg-amber-600 text-amber-100 text-xs rounded flex items-center gap-1">
                <span>{platform.icon}</span>
                <span>{platform.name}</span>
              </span>
            ))}
            {!Object.values(content_data || {}).some(url => url) && (
              <span className="description-text text-xs">請添加社群媒體連結</span>
            )}
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              {['linkedin','facebook','instagram','twitter','youtube','tiktok'].map(key => (
                <div key={key} style={{ marginTop: '6px' }}>
                  <label style={{ display: 'block' }}>{key} 網址</label>
                  <input
                    type="url"
                    value={content_data?.[key] || ''}
                    onChange={(e) => updateBlockField(index, key, e.target.value)}
                    className="inline-editor-input"
                  />
                </div>
              ))}
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    case 'map':
      return (
        <div>
          <div className="block-title text-amber-200" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {content_data?.title || '地點名稱'}
          </div>
          <div className="text-amber-100 text-xs mb-1">
            📍 {content_data?.address || '請輸入地址'}
          </div>
          {content_data?.address && (
            <div className="bg-gray-800 rounded text-xs p-2 text-amber-200">
              🗺️ Google Maps 地圖
            </div>
          )}
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>地點名稱</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>地址</label>
              <textarea
                rows={2}
                value={content_data?.address || ''}
                onChange={(e) => updateBlockField(index, 'address', e.target.value)}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    case 'icon':
      return (
        <div>
          <div className="block-title text-amber-200" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {content_data?.title || '圖標標題'}
          </div>
          <div className="flex items-center gap-2 text-amber-100 text-xs">
            {content_data?.icon_url ? (
              <img src={content_data.icon_url} alt={content_data?.description || 'icon'} style={{ height: content_data?.size === 'small' ? 16 : content_data?.size === 'medium' ? 20 : content_data?.size === 'large' ? 24 : 28 }} />
            ) : (
              <span style={{ fontSize: content_data?.size === 'small' ? '12px' : content_data?.size === 'medium' ? '16px' : content_data?.size === 'large' ? '20px' : '24px' }}>
                {content_data?.icon_type === 'star' ? '⭐' :
                 content_data?.icon_type === 'heart' ? '❤️' :
                 content_data?.icon_type === 'diamond' ? '💎' :
                 content_data?.icon_type === 'crown' ? '👑' :
                 content_data?.icon_type === 'trophy' ? '🏆' :
                 content_data?.icon_type === 'fire' ? '🔥' :
                 content_data?.icon_type === 'lightning' ? '⚡' :
                 content_data?.icon_type === 'rocket' ? '🚀' :
                 content_data?.icon_type === 'target' ? '🎯' :
                 content_data?.icon_type === 'medal' ? '🏅' :
                 content_data?.icon_type === 'gem' ? '💍' :
                 content_data?.icon_type === 'sparkles' ? '✨' : '⭐'}
              </span>
            )}
            <span>{content_data?.description || '裝飾圖標'}</span>
          </div>
          {editingBlockIndex === index && (
            <div className="inline-editor-overlay">
              <label>標題</label>
              <input
                type="text"
                value={content_data?.title || ''}
                onChange={(e) => updateBlockField(index, 'title', e.target.value)}
                className="inline-editor-input"
              />
              <label>圖標</label>
              <select
                value={content_data?.icon_type || 'star'}
                onChange={(e) => updateBlockField(index, 'icon_type', e.target.value)}
                className="inline-editor-input"
              >
                <option value="star">⭐</option>
                <option value="heart">❤️</option>
                <option value="diamond">💎</option>
                <option value="crown">👑</option>
                <option value="trophy">🏆</option>
                <option value="fire">🔥</option>
                <option value="lightning">⚡</option>
                <option value="rocket">🚀</option>
                <option value="target">🎯</option>
                <option value="medal">🏅</option>
                <option value="gem">💍</option>
                <option value="sparkles">✨</option>
              </select>
              <label>大小</label>
              <select
                value={content_data?.size || 'medium'}
                onChange={(e) => updateBlockField(index, 'size', e.target.value)}
                className="inline-editor-input"
              >
                <option value="small">小</option>
                <option value="medium">中</option>
                <option value="large">大</option>
                <option value="xlarge">特大</option>
              </select>
              <label>描述</label>
              <input
                type="text"
                value={content_data?.description || ''}
                onChange={(e) => updateBlockField(index, 'description', e.target.value)}
                className="inline-editor-input"
              />
              <label>自訂圖標上傳（可選）</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onInlineIconUpload(index, e.target.files?.[0])}
                className="inline-editor-input"
              />
              <div className="inline-editor-hint">正在就地編輯（自動保存）</div>
            </div>
          )}
        </div>
      );
    
    default:
      return (
        <div className="text-amber-100 text-xs">
          {getBlockTypeLabel(block.content_type)} 內容
        </div>
      );
  }
};

const getBlockTypeLabel = (type) => {
  const labels = {
    text: '文字',
    link: '連結',
    website: '網站',
    news: '新聞',
    file: '檔案',
    video: '影片',
    image: '圖片',
    social: '社群',
    map: '地圖',
    icon: '圖標'
  };
  return labels[type] || type;
};

export default NFCCardEditor;