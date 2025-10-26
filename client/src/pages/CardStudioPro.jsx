import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbGet, dbSet, dbSubscribe } from '../services/firebaseClient';
import { uploadImage } from '../services/nfcCards';
import AvatarUpload from '../components/AvatarUpload';
import { toast } from 'react-hot-toast';
import axios from '../config/axios';
import { motion, AnimatePresence } from 'framer-motion';

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
                return (
                  <div key={b.id} className="rounded-xl p-3 flex items-center gap-2" style={{ background: colors.card, color: colors.text }}>
                    <a href={info.phone ? `tel:${info.phone}` : '#'} className={getButtonClass(buttonStyleId)}>立即聯絡</a>
                    {info.phone && (<span className="text-xs opacity-60">{info.phone}</span>)}
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

const ThemePicker = ({ themeId, setThemeId }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map(t => (
        <button key={t.id} onClick={() => setThemeId(t.id)} aria-label={`選擇主題 ${t.name}`}
          className={`rounded-xl p-2 border ${themeId === t.id ? 'ring-2 ring-blue-400' : ''}`} style={{ background: t.colors.card, color: t.colors.text }}>
          <div className="h-20 rounded-md" style={{ background: t.colors.bg }} />
          <div className="mt-2 text-xs">{t.name}</div>
        </button>
      ))}
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

// 行業選擇覆蓋層（頁面載入即顯示）
const IndustryPicker = ({ onClose, onPick }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);

  const fetchIndustries = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await axios.get('/api/nfc-cards/industries');
      const list = Array.isArray(resp.data?.items) ? resp.data.items : [];
      setItems(list);
    } catch (e) {
      setError('資料載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    fetchIndustries();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // 在編輯器內直接套用模板，不再跳轉到行業模板頁
  const go = (key) => {
    if (typeof onPick === 'function') {
      onPick(key);
    } else {
      // 回退：若未提供 onPick，保持在本頁（或導回編輯器）
      navigate(`/nfc-card-editor?template=${encodeURIComponent(key)}`);
    }
  };

  return (
    <AnimatePresence initial={false}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="w-full max-w-4xl rounded-2xl bg-slate-900 text-white border border-white/10 shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xl font-semibold">選擇行業</div>
              <div className="text-xs opacity-70">我們將為您匹配合適模板與範例</div>
            </div>
            <button onClick={onClose} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20">稍後選擇</button>
          </div>

          {offline && (
            <div className="mb-3 text-sm rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-2">
              當前離線狀態，將顯示有限資訊；恢復連線後可重試。
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 bg-white/5 border border-white/10 animate-pulse">
                  <div className="h-6 w-24 bg-white/10 rounded mb-2" />
                  <div className="h-4 w-40 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="text-sm opacity-80">{error}</div>
              <button onClick={fetchIndustries} className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">重試</button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-sm opacity-70">暫無行業資料</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(item => (
                <motion.button key={item.key} onClick={() => go(item.key)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="group rounded-2xl p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-left transition">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.emoji || '🔖'}</div>
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs opacity-80">{item.description || ''}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function CardStudioPro() {
  const { user } = useAuth();
  const location = useLocation();
  const [themeId, setThemeId] = useState('simple');
  const [blocks, setBlocks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [nfcStatus, setNfcStatus] = useState('idle');
  const [buttonStyleId, setButtonStyleId] = useState('solid-blue');
  const [bgStyle, setBgStyle] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [showIndustryPicker, setShowIndustryPicker] = useState(true);

  const [info, setInfo] = useState({ name: '', title: '', company: '', phone: '', line: '', email: '', facebook: '', linkedin: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);

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

  // 載入與訂閱資料（多設備同步 & 離線草稿）
  useEffect(() => {
    if (!user?.id) return;
    const path = `cards/${user.id}/editor`;
    (async () => {
      const data = await dbGet(path);
      if (data) {
        setThemeId(data.themeId || 'simple');
        setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
        setInfo(data.info || {});
        setAvatarUrl(data.avatarUrl || '');
        setShareUrl(data.shareUrl || '');
        setButtonStyleId(data.design?.buttonStyleId || 'solid-blue');
        setBgStyle(data.design?.bgStyle || '');
      } else {
        const rawDraft = (() => { try { return localStorage.getItem(`card_editor_${user.id}`); } catch { return null; } })();
        if (rawDraft) {
          try {
            const draft = JSON.parse(rawDraft);
            setThemeId(draft.themeId || 'simple');
            setBlocks(Array.isArray(draft.blocks) ? draft.blocks : []);
            setInfo(draft.info || {});
            setAvatarUrl(draft.avatarUrl || '');
            setShareUrl(draft.shareUrl || '');
            setButtonStyleId(draft.design?.buttonStyleId || 'solid-blue');
            setBgStyle(draft.design?.bgStyle || '');
          } catch {}
        } else {
          const tpl = new URLSearchParams(location.search).get('template');
          if (tpl) {
            const sample = getTemplateSample(tpl);
            setBlocks(sample.blocks);
            setInfo(sample.info);
          }
        }
      }
    })();
    const unsub = dbSubscribe(path, (data) => {
      if (!data) return;
      setThemeId(data.themeId || 'simple');
      setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
      setInfo(data.info || {});
      setAvatarUrl(data.avatarUrl || '');
      setShareUrl(data.shareUrl || '');
      setButtonStyleId(data.design?.buttonStyleId || 'solid-blue');
      setBgStyle(data.design?.bgStyle || '');
    });
    return () => unsub();
  }, [user?.id, location.search]);

  // 自動儲存與離線快取
  useEffect(() => {
    if (!user?.id) return;
    const draft = { themeId, blocks, info, avatarUrl, shareUrl, design: { buttonStyleId, bgStyle } };
    try { localStorage.setItem(`card_editor_${user.id}`, JSON.stringify(draft)); } catch {}
    if (!navigator.onLine) return;
    const t = setTimeout(async () => {
      try { await dbSet(`cards/${user.id}/editor`, draft); } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [themeId, blocks, info, avatarUrl, shareUrl, buttonStyleId, bgStyle, user?.id]);

  // 上線後同步離線草稿
  useEffect(() => {
    const handler = async () => {
      if (!user?.id) return;
      try {
        const raw = localStorage.getItem(`card_editor_${user.id}`);
        if (raw) { await dbSet(`cards/${user.id}/editor`, JSON.parse(raw)); toast.success('已同步離線草稿'); }
      } catch {}
    };
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [user?.id]);

  const addBlock = (b) => { setBlocks(prev => [...prev, b]); setShowAdd(false); };
  const removeBlock = (id) => setBlocks(prev => prev.filter(b => b.id !== id));

  const moveBlock = (from, to) => {
    setBlocks(prev => {
      const copy = [...prev];
      const [m] = copy.splice(from, 1);
      copy.splice(to, 0, m);
      return copy;
    });
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
      }
      const payload = { themeId, blocks, info, avatarUrl: avatar, shareUrl, design: { buttonStyleId, bgStyle } };
      await dbSet(`cards/${user.id}/editor`, payload);
      setAvatarUrl(avatar);
      toast.success('已儲存');
    } catch (e) {
      console.error(e);
      toast.error('儲存失敗');
    } finally { setSaving(false); }
  };

  const generateShare = async () => {
    try {
      const base = window.location.origin;
      const params = new URLSearchParams();
      params.set('v', `${Date.now()}`);
      const rawUrl = `${base}/member-card/${user?.id || 'me'}?${params.toString()}`;

      // 嘗試生成短連結；若失敗則使用原始帶版本參數的 URL
      try {
        const resp = await axios.post('/api/links/shorten', { url: rawUrl, label: `nfc-card-${user?.id || 'me'}` });
        setShareUrl(resp.data?.shortUrl || rawUrl);
      } catch {
        setShareUrl(rawUrl);
      }

      // 儲存原始帶版本參數的 URL 到資料庫（避免短連結服務不可用）
      await dbSet(`cards/${user.id}/editor`, { themeId, blocks, info, avatarUrl, shareUrl: rawUrl });
      toast.success('已生成分享連結');
    } catch { toast.error('生成連結失敗'); }
  };

  const startNfcWrite = async () => {
    setNfcStatus('writing');
    try {
      const targetUrl = shareUrl || `${window.location.origin}/member-card/${user?.id || 'me'}`;
      if (typeof window !== 'undefined' && 'NDEFWriter' in window) {
        try {
          const writer = new window.NDEFWriter();
          await writer.write(targetUrl);
          setNfcStatus('success');
          toast.success('NFC 寫入完成');
        } catch (err) {
          console.warn('Web NFC 寫入失敗或未授權：', err);
          setNfcStatus('error');
          toast.error('NFC 寫入失敗');
        }
      } else {
        await new Promise((r) => setTimeout(r, 800));
        setNfcStatus(targetUrl ? 'success' : 'error');
      }
    } catch (e) {
      console.error(e);
      setNfcStatus('error');
    } finally {
      setTimeout(() => setNfcStatus('idle'), 2500);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: theme.colors.bg, backgroundImage: bgStyle || undefined }}>
      {showIndustryPicker && (
        <IndustryPicker onClose={() => setShowIndustryPicker(false)} onPick={(key) => {
          const sample = getTemplateSample(key);
          if (sample?.blocks) setBlocks(sample.blocks);
          if (sample?.info) setInfo(sample.info);
          setShowIndustryPicker(false);
        }} />
      )}
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
          {/* 左：設定面板 */}
          <div className="bg-white/90 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">名片資訊</h2>
              <button onClick={handleSave} className="px-3 py-2 rounded bg-blue-600 text-white" aria-label="儲存" disabled={saving}>{saving ? '儲存中…' : '儲存'}</button>
            </div>
            <div className="mt-3">
              <AvatarUpload currentAvatar={avatarUrl} onAvatarChange={setAvatarFile} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <label className="text-sm">姓名<input aria-label="姓名" value={info.name} onChange={(e)=>setInfo({...info, name:e.target.value})} className="mt-1 w-full border rounded p-2" required /></label>
                <label className="text-sm">公司名稱<input aria-label="公司名稱" value={info.company} onChange={(e)=>setInfo({...info, company:e.target.value})} className="mt-1 w-full border rounded p-2" required /></label>
                <label className="text-sm">職稱<input aria-label="職稱" value={info.title} onChange={(e)=>setInfo({...info, title:e.target.value})} className="mt-1 w-full border rounded p-2" required /></label>
                <label className="text-sm">手機（含國碼）<input aria-label="手機" placeholder="+886912345678" value={info.phone} onChange={(e)=>setInfo({...info, phone:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">LINE ID<input aria-label="LINE ID" value={info.line} onChange={(e)=>setInfo({...info, line:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">電子郵件<input aria-label="電子郵件" value={info.email} onChange={(e)=>setInfo({...info, email:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">Facebook 連結<input aria-label="Facebook" value={info.facebook} onChange={(e)=>setInfo({...info, facebook:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
                <label className="text-sm">LinkedIn 連結<input aria-label="LinkedIn" value={info.linkedin} onChange={(e)=>setInfo({...info, linkedin:e.target.value})} className="mt-1 w-full border rounded p-2" /></label>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">主題選擇</h3>
              <ThemePicker themeId={themeId} setThemeId={setThemeId} />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">樣式設計</h3>
              <label className="text-sm">按鈕樣式</label>
              <select value={buttonStyleId} onChange={(e)=>setButtonStyleId(e.target.value)} className="mt-1 w-full border rounded p-2">
                {BUTTON_STYLES.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
              <label className="text-sm mt-3">背景風格</label>
              <select value={bgStyle} onChange={(e)=>setBgStyle(e.target.value)} className="mt-1 w-full border rounded p-2">
                {BG_PRESETS.map(b => (<option key={b.id} value={b.css}>{b.name}</option>))}
              </select>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">內容模塊</h3>
                <button onClick={()=>setShowAdd(true)} className="px-3 py-2 rounded bg-gray-900 text-white" aria-label="新增模塊">新增</button>
              </div>
              <div className="mt-3 space-y-2">
                {blocks.map((b, i) => (
                  <div key={b.id} draggable onDragStart={()=>onDragStart(i)} onDragOver={onDragOver} onDrop={()=>onDrop(i)} className="border rounded-lg p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="cursor-grab select-none">≡</span>
                      <div className="text-sm">{b.type}</div>
                    </div>
                    <button onClick={()=>removeBlock(b.id)} className="text-xs text-red-600">刪除</button>
                  </div>
                ))}
                {blocks.length === 0 && (
                  <div className="text-xs text-gray-600">尚未添加模塊</div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">分享</h3>
                <button onClick={generateShare} className="px-3 py-2 rounded bg-green-600 text-white">生成分享連結</button>
              </div>
              {shareUrl && (
                <div className="mt-2 text-sm break-all">
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">{shareUrl}</a>
                </div>
              )}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">NFC</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        nfcStatus === 'writing' ? 'bg-blue-500 animate-pulse' :
                        nfcStatus === 'success' ? 'bg-emerald-500' :
                        nfcStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-600">
                        {nfcStatus === 'idle' ? '待命' : nfcStatus === 'writing' ? '寫入中…' : nfcStatus === 'success' ? '完成' : '錯誤'}
                      </span>
                    </div>
                    <button onClick={startNfcWrite} className="px-3 py-2 rounded bg-indigo-600 text-white">寫入 NFC</button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">請使用支援 Web NFC 的裝置（Android Chrome）</div>
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
    </div>
  );
}