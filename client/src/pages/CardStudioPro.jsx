import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbGet, dbSet, dbSubscribe } from '../services/firebaseClient';
import { uploadImage } from '../services/nfcCards';
import AvatarUpload from '../components/AvatarUpload';
import IndustrySelect from '../components/NFCCard/IndustrySelect';
import BlockEditor from '../components/NFCCard/BlockEditor';
import { toast } from 'react-hot-toast';
import axios from '../config/axios';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { SyncStatusToolbar } from '../components/SyncStatusIndicator';
import dataSyncManager from '../utils/dataSyncManager';
import { DataConsistencyChecker } from '../utils/dataConsistencyChecker';
// framer-motion 未使用，已移除覆蓋層

// 簡易主題集合（≥10）
const THEMES = [
  { id: 'simple', name: 'Simple', colors: { bg: '#0B0F1A', card: '#1C2140', text: '#FFFFFF', accent: '#3B82F6' }, font: 'system-ui' },
  { id: 'youth', name: 'Youth', colors: { bg: '#0C0C0C', card: '#2C2C54', text: '#FFF', accent: '#F59E0B' }, font: 'system-ui' },
  { id: 'coolblack', name: 'Cool Black', colors: { bg: '#0E0E11', card: '#1F2437', text: '#E5E7EB', accent: '#22D3EE' }, font: 'system-ui' },
  { id: 'classic', name: 'Classic', colors: { bg: '#FAFAFA', card: '#FFFFFF', text: '#111827', accent: '#2563EB' }, font: 'Georgia, serif' },
  { id: 'forest', name: 'Forest', colors: { bg: '#0b1410', card: '#1d3127', text: '#e7f3ed', accent: '#10b981' }, font: 'system-ui' },
  { id: 'sunset', name: 'Sunset', colors: { bg: '#1a1416', card: '#3b1d2a', text: '#ffe8f3', accent: '#fb7185' }, font: 'system-ui' },
  { id: 'ocean', name: 'Ocean', colors: { bg: '#071932', card: '#0a2a4f', text: '#dbeafe', accent: '#60a5fa' }, font: 'system-ui' },
  { id: 'mint', name: 'Mint', colors: { bg: '#0d1b17', card: '#102720', text: '#d1fae5', accent: '#34d399' }, font: 'system-ui' },
  { id: 'lavender', name: 'Lavender', colors: { bg: '#1a1622', card: '#2b2540', text: '#ede9fe', accent: '#a78bfa' }, font: 'system-ui' },
  { id: 'warm', name: 'Warm', colors: { bg: '#1b1512', card: '#3a2a22', text: '#fef3c7', accent: '#f59e0b' }, font: 'system-ui' },
  { id: 'neon', name: 'Neon', colors: { bg: '#09090b', card: '#171717', text: '#fafafa', accent: '#22c55e' }, font: 'system-ui' },
];

// 區塊類型
const BLOCK_TYPES = [
  { id: 'link', label: '超連結' },
  { id: 'video', label: '影片' },
  { id: 'carousel', label: '圖片輪播' },
  { id: 'richtext', label: '文字介紹' },
  { id: 'contact', label: '聯絡按鈕' },
];

// 按鈕樣式庫
const BUTTON_STYLES = [
  { id: 'solid-blue', name: '藍色・實心', className: 'px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow' },
  { id: 'solid-emerald', name: '綠色・實心', className: 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow' },
  { id: 'solid-rose', name: '玫紅・實心', className: 'px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow' },
  { id: 'solid-indigo', name: '靛藍・實心', className: 'px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow' },
  { id: 'outline-blue', name: '藍色・外框', className: 'px-4 py-2 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm' },
  { id: 'outline-emerald', name: '綠色・外框', className: 'px-4 py-2 rounded-xl border border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm' },
  { id: 'outline-rose', name: '玫紅・外框', className: 'px-4 py-2 rounded-xl border border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white shadow-sm' },
  { id: 'outline-indigo', name: '靛藍・外框', className: 'px-4 py-2 rounded-xl border border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm' },
  { id: 'glass-blue', name: '玻璃・藍', className: 'px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 backdrop-blur border border-white/10' },
  { id: 'glass-emerald', name: '玻璃・綠', className: 'px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 backdrop-blur border border-white/10' },
  { id: 'glass-rose', name: '玻璃・玫紅', className: 'px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 backdrop-blur border border-white/10' },
  { id: 'glass-indigo', name: '玻璃・靛藍', className: 'px-4 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 backdrop-blur border border-white/10' },
  { id: 'neumorphism', name: '新擬物', className: 'px-4 py-2 rounded-xl bg-white text-gray-900 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]' },
  { id: 'gradient-sunset', name: '漸層・暮色', className: 'px-4 py-2 rounded-xl text-white shadow bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400' },
  { id: 'gradient-ocean', name: '漸層・海洋', className: 'px-4 py-2 rounded-xl text-white shadow bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600' },
  { id: 'gradient-forest', name: '漸層・森林', className: 'px-4 py-2 rounded-xl text-white shadow bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500' },
  { id: 'minimal', name: '極簡', className: 'px-4 py-2 rounded-lg border border-gray-200 text-gray-900 hover:bg-gray-50' },
  { id: 'pill-blue', name: '膠囊・藍', className: 'px-5 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow' },
  { id: 'pill-emerald', name: '膠囊・綠', className: 'px-5 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow' },
  { id: 'pill-rose', name: '膠囊・玫紅', className: 'px-5 py-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow' },
  { id: 'pill-indigo', name: '膠囊・靛藍', className: 'px-5 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow' },
  { id: 'soft', name: '柔和', className: 'px-4 py-2 rounded-xl bg-white/80 text-gray-900 border border-gray-200 shadow-sm' },
  { id: 'mono', name: '單色', className: 'px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black' }
];

// 背景預設
const BG_PRESETS = [
  { id: 'bg0', name: '主題預設', css: '' },
  { id: 'bg1', name: '深藍漸層', css: 'linear-gradient(135deg,#0b0f1a,#1c2140)' },
  { id: 'bg2', name: '暮色', css: 'linear-gradient(135deg,#1a1416,#3b1d2a)' },
  { id: 'bg3', name: '森林', css: 'linear-gradient(135deg,#0d1b17,#102720)' },
  { id: 'bg4', name: '薰衣草', css: 'linear-gradient(135deg,#1a1622,#2b2540)' },
  { id: 'bg5', name: '黑金', css: 'radial-gradient(circle at 20% 20%,#1f1f1f,#0b0b0b 60%), linear-gradient(135deg,#d4af37 0%,#775c19 100%)' },
  { id: 'bg6', name: '霓虹', css: 'linear-gradient(135deg,#0b0b0d,#171717), radial-gradient(1200px circle at 0% 0%,rgba(34,197,94,0.2),transparent 40%)' },
  { id: 'bg7', name: '薄荷', css: 'linear-gradient(135deg,#0d1b17,#102720)' },
  { id: 'bg8', name: '海洋', css: 'linear-gradient(135deg,#071932,#0a2a4f)' },
  { id: 'bg9', name: '暖色', css: 'linear-gradient(135deg,#1b1512,#3a2a22)' }
];

// 基本驗證
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
const isE164 = (v) => /^\+\d{6,15}$/.test(v || '');
const isUrl = (v) => /^(https?:\/\/)[^\s]+$/i.test(v || '');
const youTubeId = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    return null;
  } catch { return null; }
};
const vimeoId = (url) => {
  try {
    const u = new URL(url);
    return u.hostname.includes('vimeo.com') ? u.pathname.split('/').pop() : null;
  } catch { return null; }
};

const getButtonClass = (id) => (BUTTON_STYLES.find(s => s.id === id)?.className || BUTTON_STYLES[0].className);

// 預覽卡片（套用按鈕樣式與背景預設）
const PreviewCard = ({ info, avatarUrl, theme, blocks, buttonStyleId, bgStyle }) => {
  const colors = theme.colors;
  return (
    <div style={{ fontFamily: theme.font, minHeight: '100vh', background: colors.bg, backgroundImage: bgStyle || undefined }} className="p-4">
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl shadow-lg p-4" style={{ background: colors.card, color: colors.text }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-80">預覽名片</div>
            <span className="text-xs opacity-70">Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2" style={{ borderColor: colors.accent }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="頭像" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-full h-full bg-black/20" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold leading-tight">{info.name || '姓名'}</div>
              <div className="text-xs opacity-80">{info.title || '職稱'}</div>
              <div className="text-xs opacity-70">{info.company || '公司名稱'}</div>
              <div className="flex gap-2 mt-1">
                {info.phone && (<span className="text-xs px-2 py-1 rounded" style={{ background: colors.accent + '33' }}>📞</span>)}
                {info.email && (<span className="text-xs px-2 py-1 rounded" style={{ background: colors.accent + '33' }}>✉️</span>)}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {blocks.map((b) => {
              if (b.type === 'link') {
                return (
                  <div key={b.id} className="rounded-xl p-3" style={{ background: colors.card, color: colors.text }}>
                    <a href={b.url || '#'} target="_blank" rel="noreferrer" className={getButtonClass(buttonStyleId)}>
                      {b.title || '連結'}
                    </a>
                    {b.url && (<div className="text-xs mt-1 opacity-70 break-all">{b.url}</div>)}
                  </div>
                );
              }
              if (b.type === 'video') {
                const yt = youTubeId(b.url);
                const vi = vimeoId(b.url);
                const src = yt ? `https://www.youtube.com/embed/${yt}` : vi ? `https://player.vimeo.com/video/${vi}` : '';
                return (
                  <div key={b.id} className="rounded-xl overflow-hidden" style={{ background: colors.card }}>
                    {src ? (
                      <iframe title="影片" src={src} className="w-full h-48" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                    ) : (
                      <div className="p-4 text-center text-sm" style={{ color: colors.text }}>請輸入 YouTube/Vimeo 連結</div>
                    )}
                  </div>
                );
              }
              if (b.type === 'carousel') {
                return (
                  <div key={b.id} className="rounded-xl p-2" style={{ background: colors.card }}>
                    <div className="flex gap-2 overflow-x-auto">
                      {(b.images || []).map((src, idx) => (
                        <img key={idx} src={src} alt="作品" className="w-40 h-28 object-cover rounded" loading="lazy" decoding="async" />
                      ))}
                    </div>
                  </div>
                );
              }
              if (b.type === 'richtext') {
                return (
                  <div key={b.id} className="rounded-xl p-3" style={{ background: colors.card, color: colors.text }}>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: b.html || '' }} />
                  </div>
                );
              }
              if (b.type === 'contact') {
                const buttons = [];
                if (info.phone) buttons.push({ label: '電話', href: `tel:${info.phone}` });
                if (info.email) buttons.push({ label: '電子郵件', href: `mailto:${info.email}` });
                if (info.website) buttons.push({ label: '網站', href: info.website?.startsWith('http') ? info.website : `https://${info.website}` });
                
                if (buttons.length === 0) return null;
                
                return (
                  <div key={b.id} className="rounded-xl p-3" style={{ background: colors.card, color: colors.text }}>
                    <div className="flex flex-wrap gap-2">
                      {buttons.map((btn, idx) => (
                        <a
                          key={idx}
                          href={btn.href}
                          className={getButtonClass(buttonStyleId)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {btn.label}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const ThemeSelect = ({ themeId, setThemeId }) => {
  const [open, setOpen] = useState(false);
  const current = THEMES.find(t => t.id === themeId) || THEMES[0];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between rounded-lg border border-white/20 px-3 py-2 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition duration-150">
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-[120px] rounded-md overflow-hidden ring-1 ring-white/10 shadow-sm">
            <div className="absolute inset-0" style={{ background: current.colors.bg }} />
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(120px_60px_at_15%_10%,rgba(255,255,255,0.35),transparent_50%)]" />
            <div className="absolute inset-0 border border-white/10 rounded-md" />
          </div>
          <span className="text-sm">{current.name}</span>
        </div>
        <svg className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-lg border border-white/20 bg-gray-800/90 p-2 shadow-xl backdrop-blur">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setThemeId(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-md p-2 hover:bg-white/10 active:scale-[0.99] transition ${themeId === t.id ? 'ring-2 ring-blue-400' : ''}`}
              aria-label={`選擇主題 ${t.name}`}
            >
              <div className="relative h-20 w-[120px] rounded-md overflow-hidden ring-1 ring-white/10 shadow-sm">
                <div className="absolute inset-0" style={{ background: t.colors.bg }} />
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(120px_60px_at_15%_10%,rgba(255,255,255,0.35),transparent_50%)]" />
                <div className="absolute inset-0 border border-white/10 rounded-md" />
              </div>
              <div className="text-left">
                <div className="text-sm">{t.name}</div>
                <div className="text-xs opacity-60">{t.colors.card}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const BlockAddModal = ({ onAdd, onClose }) => {
  const [type, setType] = useState('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleImages = async (files) => {
    const arr = Array.from(files).slice(0, 5);
    setUploading(true);
    try {
      const urls = [];
      for (const f of arr) {
        const r = await uploadImage(f);
        if (r?.url) urls.push(r.url);
      }
      setImages(urls);
    } catch (e) {
      toast.error('圖片上傳失敗');
    } finally { setUploading(false); }
  };

  const confirm = () => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    if (type === 'link') return onAdd({ id, type, title, url });
    if (type === 'video') return onAdd({ id, type, url });
    if (type === 'carousel') return onAdd({ id, type, images });
    if (type === 'richtext') return onAdd({ id, type, html });
    if (type === 'contact') return onAdd({ id, type });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center" role="dialog" aria-label="新增模塊">
      <div className="bg-white w-full max-w-md rounded-t-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">新增模塊</div>
          <button className="text-sm" onClick={onClose} aria-label="關閉">✕</button>
        </div>
        <div className="mt-3">
          <label className="text-sm">類型</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full border rounded p-2">
            {BLOCK_TYPES.map(b => (<option key={b.id} value={b.id}>{b.label}</option>))}
          </select>
        </div>

        {type === 'link' && (
          <>
            <div className="mt-3">
              <label className="text-sm">標題</label>
              <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full border rounded p-2" />
            </div>
            <div className="mt-3">
              <label className="text-sm">URL</label>
              <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://" className="mt-1 w-full border rounded p-2" />
            </div>
          </>
        )}

        {type === 'video' && (
          <div className="mt-3">
            <label className="text-sm">YouTube 或 Vimeo 連結</label>
            <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-1 w-full border rounded p-2" />
          </div>
        )}

        {type === 'carousel' && (
          <div className="mt-3">
            <label className="text-sm">上傳最多 5 張圖片</label>
            <input type="file" accept="image/*" multiple onChange={(e)=>handleImages(e.target.files)} className="mt-1 w-full" />
            <div className="mt-2 text-xs text-gray-500">{uploading ? '上傳中...' : `已選擇 ${images.length} 張`}</div>
          </div>
        )}

        {type === 'richtext' && (
          <div className="mt-3">
            <label className="text-sm">文字內容（支援基本 HTML）</label>
            <textarea value={html} onChange={(e)=>setHtml(e.target.value)} rows={4} className="mt-1 w-full border rounded p-2" />
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">取消</button>
          <button onClick={confirm} className="px-3 py-2 rounded bg-blue-600 text-white">新增</button>
        </div>
      </div>
    </div>
  );
};

// IndustryPicker 覆蓋層已移除；行業選擇已改為側邊欄常駐清單。

export default function CardStudioPro() {
  const { user } = useAuth();
  const location = useLocation();
  
  // 使用 useMemo 穩定 userId 和 path，避免不必要的重新計算
  // 修正：優先使用 memberId，確保與 MemberCard 頁面路徑一致
  const userId = useMemo(() => {
    // 優先使用 memberId（如果存在），否則使用用戶 ID
    return user?.memberId || user?.id || user?.user_id || user?.uid;
  }, [user?.memberId, user?.id, user?.user_id, user?.uid]);
  
  const syncPath = useMemo(() => {
    if (!userId) return null;
    // 統一使用與 MemberCard 相同的路徑格式
    return `cards/${userId}`;
  }, [userId]);
  
  // 穩定的錯誤處理回調
  const handleSyncError = useCallback((error) => {
    console.error('Sync error:', error);
    toast.error('同步失敗，請檢查網路連線');
  }, []);
  
  // 使用即時同步 Hook
  const {
    syncData,
    isLoading,
    isSaving,
    syncStatus,
    lastSyncTime,
    updateSyncData,
    saveSyncData,
    reloadSyncData,
    ConflictModal
  } = useRealtimeSync({
    path: syncPath,
    initialData: null,
    autoSave: true,
    saveDelay: 800,
    onSyncError: handleSyncError
  });

  // 從同步資料中提取狀態 - 使用 useMemo 避免不必要的重新計算
  const themeId = useMemo(() => syncData?.themeId || 'simple', [syncData?.themeId]);
  const blocks = useMemo(() => syncData?.blocks || [], [syncData?.blocks]);
  const info = useMemo(() => syncData?.info || { name: '', title: '', company: '', phone: '', line: '', email: '', facebook: '', linkedin: '' }, [syncData?.info]);
  const avatarUrl = useMemo(() => syncData?.avatarUrl || '', [syncData?.avatarUrl]);
  const buttonStyleId = useMemo(() => syncData?.design?.buttonStyleId || 'solid-blue', [syncData?.design?.buttonStyleId]);
  const bgStyle = useMemo(() => syncData?.design?.bgStyle || '', [syncData?.design?.bgStyle]);

  // 本地狀態（不需要同步的）
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const skipNextAutoSaveRef = useRef(false);
  const applyingIndustryRef = useRef(false);

  // 數據一致性檢查狀態
  const [consistencyReport, setConsistencyReport] = useState(null);
  const [showConsistencyReport, setShowConsistencyReport] = useState(false);

  // 行業資料（側邊欄常駐）
  const [industries, setIndustries] = useState([]);
  const [industriesLoading, setIndustriesLoading] = useState(true);
  const [industriesError, setIndustriesError] = useState('');
  // 行業板塊收合狀態（預設收起，記憶使用者操作）
  const [industryCollapsed, setIndustryCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('card_industry_collapsed');
      return v ? v === '1' : true;
    } catch { return true; }
  });

  const [avatarFile, setAvatarFile] = useState(null);

  // 更新函數 - 使用新的同步系統
  const setThemeId = (newThemeId) => {
    // 僅傳遞更新片段，避免在 syncData 為 null 時展開失敗
    updateSyncData({ themeId: newThemeId });
  };

  const setBlocks = (newBlocks) => {
    const blocks = typeof newBlocks === 'function' ? newBlocks(syncData?.blocks || []) : newBlocks;
    updateSyncData({ blocks });
  };

  const setInfo = (newInfo) => {
    const info = typeof newInfo === 'function' ? newInfo(syncData?.info || {}) : newInfo;
    updateSyncData({ info });
  };

  const setAvatarUrl = (newAvatarUrl) => {
    updateSyncData({ avatarUrl: newAvatarUrl });
  };

  const setButtonStyleId = (newButtonStyleId) => {
    updateSyncData({ 
      design: { ...(syncData?.design || {}), buttonStyleId: newButtonStyleId }
    });
  };

  const setBgStyle = (newBgStyle) => {
    updateSyncData({ 
      design: { ...(syncData?.design || {}), bgStyle: newBgStyle }
    });
  };

  // 數據同步功能
  const runDataSync = useCallback(async () => {
    try {
      const memberId = user?.memberId || user?.id || user?.user_id || user?.uid;
      if (!memberId) {
        toast.error('無法獲取用戶 ID');
        return;
      }

      // 驗證數據一致性
      const validationResult = await dataSyncManager.validateDataConsistency(memberId);
      
      if (validationResult.isConsistent) {
        toast.success('數據已同步，無需額外操作');
        return;
      }

      // 準備當前編輯器數據
      const currentData = {
        info,
        themeId,
        blocks,
        avatarUrl,
        design: { buttonStyleId, bgStyle },
        lastUpdated: new Date().toISOString(),
        version: '2.0'
      };

      // 執行同步
      const syncSuccess = await dataSyncManager.syncEditorToDisplay(memberId, currentData);
      
      if (syncSuccess) {
        // 更新本地同步資料
        updateSyncData(currentData);
        await saveSyncData();
        
        toast.success('數據同步完成');
        
        // 重新檢查一致性
        setTimeout(async () => {
          await runConsistencyCheck();
        }, 1000);
      } else {
        toast.error('數據同步失敗');
      }
    } catch (error) {
      console.error('數據同步錯誤:', error);
      toast.error(`同步失敗: ${error.message}`);
    }
  }, [user, info, themeId, blocks, avatarUrl, buttonStyleId, bgStyle, updateSyncData, saveSyncData, runConsistencyCheck]);

  // 數據一致性檢查功能
  const runConsistencyCheck = useCallback(async () => {
    try {
      const currentData = {
        themeId,
        blocks,
        info,
        avatarUrl,
        design: {
          buttonStyleId,
          bgStyle
        },
        _lastModified: syncData?._lastModified
      };

      // 檢查數據完整性
      const checker = new DataConsistencyChecker();
      const integrityReport = checker.checkDataIntegrity(currentData);
      
      // 如果有同步路徑，比較本地和遠端數據
      let comparisonReport = null;
      if (syncPath && userId) {
        try {
          const remoteData = await dbGet(syncPath);
          if (remoteData) {
            comparisonReport = checker.compareDataSources(currentData, remoteData);
          }
        } catch (error) {
          console.warn('無法獲取遠端數據進行比較:', error);
        }
      }

      const report = {
        timestamp: new Date().toISOString(),
        integrity: integrityReport,
        comparison: comparisonReport,
        syncStatus: {
          isLoading,
          isSaving,
          syncStatus,
          lastSyncTime
        }
      };

      setConsistencyReport(report);
      setShowConsistencyReport(true);

      // 如果發現問題，顯示警告
      if (!integrityReport.isValid || (comparisonReport && comparisonReport.hasInconsistencies)) {
        toast.error('發現數據一致性問題，請查看詳細報告');
      } else {
        toast.success('數據一致性檢查通過');
      }

    } catch (error) {
      console.error('數據一致性檢查失敗:', error);
      toast.error('數據一致性檢查失敗');
    }
  }, [themeId, blocks, info, avatarUrl, buttonStyleId, bgStyle, syncData, syncPath, userId, isLoading, isSaving, syncStatus, lastSyncTime]);

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);

  // 行業載入（側邊欄常駐）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resp = await axios.get('/api/nfc-cards/industries');
        console.log('[Industry API] /api/nfc-cards/industries response:', resp.data);
        const list = Array.isArray(resp.data?.items) ? resp.data.items : [];
        // 容錯：若返回的 key 未包含於預設樣本，保留已知 key 的項目
        const knownKeys = new Set(['photographer','store','business','designer','fitness','restaurant','education','legal','musician']);
        const filtered = list.filter(i => knownKeys.has(i?.key));
        if (alive) setIndustries(filtered);
      } catch (e) {
        if (alive) setIndustriesError('資料載入失敗');
      } finally {
        if (alive) setIndustriesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // 記憶行業板塊收合狀態
  useEffect(() => {
    try { localStorage.setItem('card_industry_collapsed', industryCollapsed ? '1' : '0'); } catch {}
  }, [industryCollapsed]);

  const applyIndustry = (key) => {
    try {
      // 防止快速雙擊導致重複套用與狀態抖動
      if (applyingIndustryRef.current) return;
      applyingIndustryRef.current = true;
      setTimeout(() => { applyingIndustryRef.current = false; }, 500);

      const sample = getTemplateSample(key);
      console.log('[ApplyIndustry] key:', key, '\nSample:', sample);
      if (!sample) {
        toast.error('未支援的行業模板，請稍後再試');
        return;
      }

      // 為不同行業套用建議主題與背景/按鈕樣式，讓預覽更貼近行業風格
      const recommended = {
        photographer: { themeId: 'lavender', buttonStyleId: 'glass-indigo', bgStyle: BG_PRESETS[4].css },
        store:        { themeId: 'mint',     buttonStyleId: 'solid-emerald', bgStyle: BG_PRESETS[3].css },
        business:     { themeId: 'classic',  buttonStyleId: 'outline-indigo', bgStyle: BG_PRESETS[2].css },
        designer:     { themeId: 'neon',     buttonStyleId: 'gradient-ocean', bgStyle: BG_PRESETS[6].css },
        fitness:      { themeId: 'warm',     buttonStyleId: 'pill-rose',      bgStyle: BG_PRESETS[2].css },
        restaurant:   { themeId: 'sunset',   buttonStyleId: 'gradient-sunset', bgStyle: BG_PRESETS[2].css },
        education:    { themeId: 'forest',   buttonStyleId: 'outline-emerald', bgStyle: BG_PRESETS[3].css },
        legal:        { themeId: 'simple',   buttonStyleId: 'minimal',        bgStyle: BG_PRESETS[0].css },
        musician:     { themeId: 'ocean',    buttonStyleId: 'glass-blue',     bgStyle: BG_PRESETS[8].css },
      };
      const rec = recommended[key];

      // 批量更新所有狀態，避免多次重渲染導致閃現
      const updateData = {};
      if (sample?.blocks) updateData.blocks = sample.blocks;
      if (sample?.info) updateData.info = sample.info;
      if (rec) {
        updateData.themeId = rec.themeId;
        updateData.design = {
          ...(syncData?.design || {}),
          buttonStyleId: rec.buttonStyleId,
          bgStyle: rec.bgStyle
        };
      }

      // 單次批量更新，避免閃現
      updateSyncData(updateData);

      toast.success('已套用行業模板');
    } catch (err) {
      console.error('[ApplyIndustry] error:', err);
      toast.error('套用模板時發生錯誤');
    }
  };

  const getCardUrl = () => `${window.location.origin}/member-card/${user?.id || 'me'}?v=${Date.now()}`;
  const openCard = () => { const url = getCardUrl(); window.open(url, '_blank', 'noopener'); };
  const copyCardUrl = async () => {
    const url = getCardUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast.success('名片網址已複製');
    } catch {
      toast.error('複製失敗，請手動複製');
    }
  };

  const getTemplateSample = (tpl) => {
    switch (tpl) {
      case 'photographer':
        return {
          info: { name: 'Koy Sun', title: '商業攝影師', company: 'Sun Studio', phone: '+886900000000', email: 'koy@example.com', instagram: 'https://instagram.com/koysun' },
          blocks: [
            { id: 'b1', type: 'richtext', html: '<strong>擅長人像與商業攝影，10+年經驗。</strong>' },
            { id: 'b2', type: 'carousel', images: Array.from({ length: 10 }, (_, i) => `https://picsum.photos/seed/photo${i}/640/480`) },
            { id: 'b3', type: 'link', title: '官方網站', url: 'https://example.com' },
            { id: 'b4', type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' },
            { id: 'b5', type: 'contact' }
          ]
        };
      case 'store':
        return {
          info: { name: 'GBC Cafe', title: '咖啡店', company: 'GBC Cafe', phone: '+886912345678', email: 'hello@gbc-cafe.com' },
          blocks: [
            { id: 's1', type: 'richtext', html: '<strong>營業時間</strong><br/>週一至週日 09:00 - 21:00' },
            { id: 's2', type: 'link', title: 'Google 地圖', url: 'https://maps.google.com' },
            { id: 's3', type: 'link', title: '數位菜單（PDF）', url: 'https://example.com/menu.pdf' },
            { id: 's4', type: 'carousel', images: Array.from({ length: 6 }, (_, i) => `https://picsum.photos/seed/store${i}/640/480`) },
            { id: 's5', type: 'contact' }
          ]
        };
      case 'business':
        return {
          info: { name: 'Alex Chen', title: '商務開發', company: 'GBC Connect', phone: '+886988888888', email: 'alex@gbc-connect.com', linkedin: 'https://linkedin.com/in/alex' },
          blocks: [
            { id: 'x1', type: 'richtext', html: '<strong>經歷時間軸</strong><br/>2015-2018 業務專員<br/>2019-2022 事業部協理' },
            { id: 'x2', type: 'link', title: '公司網站', url: 'https://gbc-connect.com' },
            { id: 'x3', type: 'link', title: '下載履歷 PDF', url: 'https://example.com/resume.pdf' },
            { id: 'x4', type: 'contact' }
          ]
        };
      case 'designer':
        return {
          info: { name: 'Mina Wu', title: '品牌設計師', company: 'Studio M', email: 'mina@studio-m.com', instagram: 'https://instagram.com/mina.design' },
          blocks: [
            { id: 'd1', type: 'richtext', html: '<strong>設計理念：</strong>以使用者為中心，兼具美感與功能。' },
            { id: 'd2', type: 'carousel', images: Array.from({ length: 8 }, (_, i) => `https://picsum.photos/seed/design${i}/640/480`) },
            { id: 'd3', type: 'link', title: 'Behance 作品集', url: 'https://behance.net' },
            { id: 'd4', type: 'contact' }
          ]
        };
      case 'fitness':
        return {
          info: { name: 'Leo Wang', title: '私人教練', company: 'FitLab', phone: '+886976000000', email: 'leo@fitlab.com' },
          blocks: [
            { id: 'f1', type: 'richtext', html: '<strong>課程方案：</strong>增肌減脂、體態雕塑、跑步訓練。' },
            { id: 'f2', type: 'link', title: '線上預約', url: 'https://example.com/booking' },
            { id: 'f3', type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' },
            { id: 'f4', type: 'contact' }
          ]
        };
      case 'restaurant':
        return {
          info: { name: '森日料', title: '餐飲品牌', company: 'Mori Sushi', phone: '+886934000000', email: 'info@mori-sushi.com' },
          blocks: [
            { id: 'r1', type: 'carousel', images: Array.from({ length: 6 }, (_, i) => `https://picsum.photos/seed/food${i}/640/480`) },
            { id: 'r2', type: 'link', title: '外送平台', url: 'https://foodpanda.tw' },
            { id: 'r3', type: 'richtext', html: '<strong>主廚推薦：</strong>季節限定鮮魚與創意壽司。' },
            { id: 'r4', type: 'contact' }
          ]
        };
      case 'education':
        return {
          info: { name: 'BetterEdu', title: '教育顧問', company: 'Better Education', email: 'hello@betteredu.com' },
          blocks: [
            { id: 'e1', type: 'richtext', html: '<strong>課程介紹：</strong>升學規劃、留學準備、職涯諮詢。' },
            { id: 'e2', type: 'link', title: '資源下載', url: 'https://example.com/resources' },
            { id: 'e3', type: 'video', url: 'https://vimeo.com/76979871' },
            { id: 'e4', type: 'contact' }
          ]
        };
      case 'legal':
        return {
          info: { name: 'Grace Lin', title: '律師', company: 'Lin & Partners', phone: '+886930000000', email: 'grace@linpartners.com' },
          blocks: [
            { id: 'l1', type: 'richtext', html: '<strong>專業簡介：</strong>商務法務、智慧財產權、民事訴訟。' },
            { id: 'l2', type: 'link', title: '成功案例', url: 'https://example.com/cases' },
            { id: 'l3', type: 'contact' }
          ]
        };
      case 'musician':
        return {
          info: { name: 'Echo Lee', title: '音樂創作人', company: 'Echo Records', email: 'echo@records.com', youtube: 'https://youtube.com/@echo' },
          blocks: [
            { id: 'm1', type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ' },
            { id: 'm2', type: 'richtext', html: '<strong>最新單曲：</strong>融合電子與搖滾的跨界作品。' },
            { id: 'm3', type: 'link', title: 'Spotify', url: 'https://spotify.com' },
            { id: 'm4', type: 'contact' }
          ]
        };
      default:
        return { info: {}, blocks: [] };
    }
  };

  // 處理模板初始化
  useEffect(() => {
    if (!user?.id || syncData) return;
    const tpl = new URLSearchParams(location.search).get('template');
    if (tpl) {
      const sample = getTemplateSample(tpl);
      updateSyncData({
        blocks: sample.blocks,
        info: sample.info
      });
    }
  }, [user?.id, location.search, syncData, updateSyncData]);

  const addBlock = (b) => { 
    const newBlocks = [...blocks, b];
    updateSyncData({ blocks: newBlocks });
    setShowAdd(false); 
  };
  
  const removeBlock = (id) => {
    const newBlocks = blocks.filter(b => b.id !== id);
    updateSyncData({ blocks: newBlocks });
  };
  
  const updateBlock = (index, next) => {
    const newBlocks = blocks.map((b, i) => (i === index ? next : b));
    updateSyncData({ blocks: newBlocks });
  };
  
  const moveBlock = (from, to) => {
    const copy = [...blocks];
    const [m] = copy.splice(from, 1);
    copy.splice(to, 0, m);
    updateSyncData({ blocks: copy });
  };
  const onDragStart = (i) => setDragIndex(i);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (i) => { if (dragIndex === null || dragIndex === i) return; moveBlock(dragIndex, i); setDragIndex(null); };

  const validateInfo = () => {
    if (!info.name?.trim() || !info.title?.trim() || !info.company?.trim()) { toast.error('姓名、職稱、公司為必填'); return false; }
    if (info.phone && !isE164(info.phone)) { toast.error('手機需為含國碼格式（例 +886912345678）'); return false; }
    if (info.email && !isEmail(info.email)) { toast.error('Email 格式不正確'); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!user?.id) { toast.error('尚未登入'); return; }
    if (!validateInfo()) return;
    setSaving(true);
    try {
      let avatar = avatarUrl;
      if (avatarFile) {
        const up = await uploadImage(avatarFile);
        avatar = up?.url || avatarUrl;
        setAvatarUrl(avatar);
      }
      
      // 準備完整的同步數據
      const completeData = {
        info,
        themeId,
        blocks,
        avatarUrl: avatar,
        design: { buttonStyleId, bgStyle },
        lastUpdated: new Date().toISOString(),
        version: '2.0'
      };
      
      // 使用數據同步管理器確保一致性
      const memberId = user?.memberId || user?.id || user?.user_id || user?.uid;
      const syncSuccess = await dataSyncManager.syncEditorToDisplay(memberId, completeData);
      
      if (!syncSuccess) {
        throw new Error('數據同步失敗');
      }
      
      // 更新本地同步資料
      updateSyncData(completeData);
      await saveSyncData();
      
      // 同步到後端 API
      await axios.put('/api/nfc-cards/my-card', {
        info,
        themeId,
        blocks,
        avatarUrl: avatar,
        design: { buttonStyleId, bgStyle }
      });
      
      setAvatarFile(null);
      toast.success('已儲存並同步');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`儲存失敗: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // removed: 生成分享連結功能（generateShare）

  // removed: NFC 寫入功能（startNfcWrite）

  // 處理載入狀態，防止 PreviewCard 在數據未完全載入時渲染
  if (isLoading || !syncData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0F1A' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: theme.colors.bg, backgroundImage: bgStyle || undefined }}>
      <div className="max-w-6xl mx-auto p-4">
        {/* 同步狀態工具列 */}
        <SyncStatusToolbar 
          syncStatus={syncStatus}
          isSaving={isSaving}
          lastSyncTime={lastSyncTime}
          onReload={reloadSyncData}
        />
        
        {/* 數據一致性檢查工具列 */}
        <div className="mb-4 flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm">數據一致性檢查</span>
            {consistencyReport && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                consistencyReport.integrity.isValid && (!consistencyReport.comparison || !consistencyReport.comparison.hasInconsistencies)
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {consistencyReport.integrity.isValid && (!consistencyReport.comparison || !consistencyReport.comparison.hasInconsistencies)
                  ? '通過' : '發現問題'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runConsistencyCheck}
              className="px-3 py-1.5 text-sm bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              檢查數據一致性
            </button>
            <button
              onClick={runDataSync}
              className="px-3 py-1.5 text-sm bg-green-600/80 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              同步數據
            </button>
            {consistencyReport && (
              <button
                onClick={() => setShowConsistencyReport(true)}
                className="px-3 py-1.5 text-sm bg-gray-600/80 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                查看報告
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
          {/* 左：設定面板 */}
          <div className="bg-white/10 backdrop-blur-xl backdrop-saturate-150 rounded-2xl p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200 ease-out active:scale-[0.997] touch-manipulation">
             <div className="flex items-center justify-between">
               <h2 className="text-lg font-semibold">名片資訊</h2>
               <div className="flex items-center gap-2">
                 <InfoExpandToggle />
                 <button onClick={handleSave} className="px-3 py-2 rounded bg-blue-600 text-white" aria-label="儲存" disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
               </div>
             </div>
             <div className="mt-3">
               <AvatarUpload currentAvatar={avatarUrl} onAvatarChange={setAvatarFile} />
               {/* 名片基本欄位（整體可收合） */}
               <MainInfoFields info={info} setInfo={setInfo} />

               {/* 進階欄位（可收合） */}
               <AdvancedInfoFields info={info} setInfo={setInfo} />
             </div>

            <div className="mt-6 border-t border-white/10 pt-4">
               <h3 className="text-sm font-semibold mb-2 flex items-center justify-between">
                 <span>行業模板</span>
                 <button
                   onClick={() => setIndustryCollapsed(v => !v)}
                   className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/10 text-xs"
                   aria-expanded={!industryCollapsed}
                   aria-controls="industry-section"
                 >{industryCollapsed ? '展開' : '收起'}</button>
               </h3>

               <div
                 id="industry-section"
                 className={`transition-all duration-300 ease-out overflow-hidden ${industryCollapsed ? 'max-h-0 opacity-0 pointer-events-none -mt-2' : 'max-h-[1200px] opacity-100'}`}
                 aria-hidden={industryCollapsed}
               >
                 {industriesLoading ? (
                   <div className="grid grid-cols-1 gap-2">
                     {Array.from({ length: 6 }).map((_, i) => (
                       <div key={i} className="rounded-lg p-3 bg-white/5 border border-white/10 animate-pulse">
                         <div className="h-4 w-24 bg-white/10 rounded mb-1" />
                         <div className="h-3 w-40 bg-white/10 rounded" />
                       </div>
                     ))}
                   </div>
                 ) : industriesError ? (
                   <div className="text-xs opacity-80">
                     {industriesError}
                     <button
                       onClick={async () => {
                         try {
                           setIndustriesLoading(true);
                           setIndustriesError('');
                           const resp = await axios.get('/api/nfc-cards/industries');
                           const list = Array.isArray(resp.data?.items) ? resp.data.items : [];
                           setIndustries(list);
                         } catch (e) {
                           setIndustriesError('行業資料載入失敗');
                         } finally {
                           setIndustriesLoading(false);
                         }
                       }}
                       className="ml-2 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
                     >重試</button>
                   </div>
                 ) : (
                   <IndustrySelect
                     items={industries}
                     loading={industriesLoading}
                     error={industriesError}
                     onSelect={(key) => applyIndustry(key)}
                   />
                 )}
               </div>
             </div>

              <div className="mt-6 border-t border-white/10 pt-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold">內容模塊</h3>
                 <div className="flex items-center gap-3">
                   <button onClick={()=>setShowAdd(true)} className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors" aria-label="新增模塊">新增</button>
                 </div>
               </div>
              <div className="mt-3 space-y-3">
                {blocks.map((b, i) => (
                  <div key={b.id} draggable onDragStart={()=>onDragStart(i)} onDragOver={onDragOver} onDrop={()=>onDrop(i)}>
                    <BlockEditor
                      block={b}
                      onChange={(next)=>updateBlock(i, next)}
                      onRemove={()=>removeBlock(b.id)}
                      onMoveUp={() => i > 0 && moveBlock(i, i - 1)}
                      onMoveDown={() => i < blocks.length - 1 && moveBlock(i, i + 1)}
                      canMoveUp={i > 0}
                      canMoveDown={i < blocks.length - 1}
                    />
                  </div>
                ))}
                {blocks.length === 0 && (
                  <div className="text-xs opacity-70">尚未新增模塊，請點選「新增」。</div>
                )}
              </div>
             </div>

            <div className="mt-6 border-t border-white/10 pt-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold">名片操作</h3>
                 <div className="flex items-center gap-2">
              <button onClick={openCard} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors">開啟名片</button>
              <button onClick={copyCardUrl} className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-900 active:bg-black text-white transition-colors">複製名片網址</button>
                 </div>
               </div>
             </div>
          </div>

          {/* 右：即時預覽 */}
          <div className="rounded-2xl overflow-hidden">
            <PreviewCard info={info} avatarUrl={avatarUrl} theme={theme} blocks={blocks} buttonStyleId={buttonStyleId} bgStyle={bgStyle} />
          </div>
        </div>
      </div>

      {showAdd && (<BlockAddModal onAdd={addBlock} onClose={()=>setShowAdd(false)} />)}
        <ConflictModal />
        
        {/* 數據一致性報告模態框 */}
        {showConsistencyReport && consistencyReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">數據一致性檢查報告</h3>
                  <button
                    onClick={() => setShowConsistencyReport(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* 整體狀態 */}
                  <div className={`p-3 rounded-lg ${consistencyReport.isConsistent ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${consistencyReport.isConsistent ? 'text-green-800' : 'text-red-800'}`}>
                        {consistencyReport.isConsistent ? '✓ 數據一致性良好' : '⚠ 發現數據不一致問題'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 完整性檢查結果 */}
                  {consistencyReport.integrityCheck && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">數據完整性檢查</h4>
                      <div className="space-y-2">
                        {consistencyReport.integrityCheck.issues.map((issue, index) => (
                          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {issue}
                          </div>
                        ))}
                        {consistencyReport.integrityCheck.issues.length === 0 && (
                          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                            ✓ 數據結構完整
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 數據源比較結果 */}
                  {consistencyReport.comparison && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">數據源一致性比較</h4>
                      <div className="space-y-2">
                        {consistencyReport.comparison.differences.map((diff, index) => (
                          <div key={index} className="text-sm bg-yellow-50 border border-yellow-200 p-2 rounded">
                            <div className="font-medium text-yellow-800">{diff.path}</div>
                            <div className="text-yellow-700 mt-1">
                              本地: {JSON.stringify(diff.local)} → 遠端: {JSON.stringify(diff.remote)}
                            </div>
                          </div>
                        ))}
                        {consistencyReport.comparison.differences.length === 0 && (
                          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                            ✓ 本地與遠端數據一致
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* 檢查時間 */}
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    檢查時間: {new Date(consistencyReport.timestamp).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowConsistencyReport(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

// 顯示更多/收合切換按鈕（放在標題右側）
function InfoExpandToggle() {
  const [expanded, setExpanded] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('card_info_expanded') || 'false'); } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem('card_info_expanded', JSON.stringify(expanded)); } catch {} }, [expanded]);
  // 派發事件，讓資訊欄位與進階欄位同步收合
  useEffect(() => {
    const ev = new CustomEvent('card-info-toggle', { detail: { expanded } });
    window.dispatchEvent(ev);
  }, [expanded]);
  return (
    <button
      type="button"
      onClick={() => setExpanded(v => !v)}
      aria-pressed={expanded}
      className={`px-3 py-2 rounded ${expanded ? 'bg-white/20' : 'bg-white/10'} hover:bg-white/20 text-white text-sm border border-white/20`}
    >{expanded ? '收合欄位' : '展開欄位'}</button>
  );
}

// 進階欄位容器：帶平滑動畫的可收合
function AdvancedInfoFields({ info, setInfo }) {
  const [expanded, setExpanded] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('card_info_expanded') || 'false'); } catch { return false; }
  });
  const ref = React.useRef(null);
  useEffect(() => {
    const onToggle = (e) => setExpanded(Boolean(e.detail?.expanded));
    window.addEventListener('card-info-toggle', onToggle);
    return () => window.removeEventListener('card-info-toggle', onToggle);
  }, []);
  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-[max-height] duration-300 ${expanded ? 'mt-3' : ''}`}
      style={{ maxHeight: expanded ? (ref.current?.scrollHeight || 0) : 0 }}
      aria-hidden={!expanded}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">LINE ID<input aria-label="LINE ID" value={info.line || ''} onChange={(e)=>setInfo({...info, line:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm">Facebook 連結<input aria-label="Facebook" value={info.facebook || ''} onChange={(e)=>setInfo({...info, facebook:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm">LinkedIn 連結<input aria-label="LinkedIn" value={info.linkedin || ''} onChange={(e)=>setInfo({...info, linkedin:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
      </div>
    </div>
  );
}

// removed: duplicate hooks and helpers (already inside CardStudioPro)

// 名片基本欄位：同步 InfoExpandToggle 的收合狀態（整體可收合）
function MainInfoFields({ info, setInfo }) {
  const [expanded, setExpanded] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('card_info_expanded') || 'false'); } catch { return false; }
  });
  const ref = React.useRef(null);
  useEffect(() => {
    const onToggle = (e) => setExpanded(Boolean(e.detail?.expanded));
    window.addEventListener('card-info-toggle', onToggle);
    return () => window.removeEventListener('card-info-toggle', onToggle);
  }, []);
  return (
    <div
      ref={ref}
      className={`overflow-hidden transition-[max-height] duration-300 ${expanded ? 'mt-3' : ''}`}
      style={{ maxHeight: expanded ? (ref.current?.scrollHeight || 0) : 0 }}
      aria-hidden={!expanded}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">姓名<input aria-label="姓名" value={info.name} onChange={(e)=>setInfo({...info, name:e.target.value})} className="mt-1 w-full border rounded p-2" required /></label>
        <label className="text-sm">公司名稱<input aria-label="公司名稱" value={info.company} onChange={(e)=>setInfo({...info, company:e.target.value})} className="mt-1 w-full border rounded p-2" required /></label>
        <label className="text-sm">職稱<input aria-label="職稱" value={info.title} onChange={(e)=>setInfo({...info, title:e.target.value})} className="mt-1 w-full border rounded p-2" required /></label>
        <label className="text-sm">手機（含國碼）<input aria-label="手機" placeholder="+886912345678" value={info.phone} onChange={(e)=>setInfo({...info, phone:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
        <label className="text-sm">電子郵件<input aria-label="電子郵件" value={info.email} onChange={(e)=>setInfo({...info, email:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
      </div>
    </div>
  );
}