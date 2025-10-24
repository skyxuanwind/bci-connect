import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbGet, dbSet, dbSubscribe } from '../services/firebaseClient';
import { uploadImage } from '../services/nfcCards';
import AvatarUpload from '../components/AvatarUpload';
import { toast } from 'react-hot-toast';

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

// 預覽卡片
const PreviewCard = ({ info, avatarUrl, theme, blocks }) => {
  const colors = theme.colors;
  return (
    <div style={{ fontFamily: theme.font, background: colors.bg, minHeight: '100vh' }} className="p-4">
      <div className="max-w-md mx-auto">
        <div className="rounded-2xl shadow-lg p-4" style={{ background: colors.card, color: colors.text }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm opacity-80">預覽名片</div>
            <span className="text-xs opacity-70">Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-2" style={{ borderColor: colors.accent }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="頭像" className="w-full h-full object-cover" />
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
                {info.line && (<span className="text-xs px-2 py-1 rounded" style={{ background: colors.accent + '33' }}>LINE</span>)}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="py-2 rounded-lg font-medium focus:outline-none focus:ring" style={{ background: colors.accent }} aria-label="編輯">編輯</button>
            <button className="py-2 rounded-lg font-medium focus:outline-none focus:ring" style={{ background: colors.text, color: colors.card }} aria-label="主題">主題</button>
          </div>
        </div>

        {/* 模塊內容預覽 */}
        <div className="mt-6 space-y-3">
          {blocks.map((b) => {
            if (b.type === 'link') {
              return (
                <div key={b.id} className="rounded-xl p-3" style={{ background: colors.card, color: colors.text }}>
                  <div className="text-sm opacity-80">{b.title || '連結'}</div>
                  {b.url && (<a href={b.url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: colors.accent }}>{b.url}</a>)}
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
                    {(b.images || []).map((src, i) => (
                      <img key={i} src={src} alt={`輪播${i+1}`} className="w-32 h-24 object-cover rounded" />
                    ))}
                  </div>
                </div>
              );
            }
            if (b.type === 'richtext') {
              return (
                <div key={b.id} className="rounded-xl p-3 text-sm" style={{ background: colors.card, color: colors.text }}
                  dangerouslySetInnerHTML={{ __html: b.html || '<em>請輸入文字內容</em>' }} />
              );
            }
            if (b.type === 'contact') {
              return (
                <div key={b.id} className="rounded-xl p-3" style={{ background: colors.card, color: colors.text }}>
                  <div className="flex gap-2">
                    {info.phone && (<a href={`tel:${info.phone}`} className="px-3 py-2 rounded" style={{ background: colors.accent }}>一鍵撥號</a>)}
                    {info.email && (<a href={`mailto:${info.email}`} className="px-3 py-2 rounded" style={{ background: colors.accent }}>發郵件</a>)}
                  </div>
                </div>
              );
            }
            return null;
          })}
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

export default function CardStudioPro() {
  const { user } = useAuth();
  const [themeId, setThemeId] = useState('simple');
  const [blocks, setBlocks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [info, setInfo] = useState({ name: '', title: '', company: '', phone: '', line: '', email: '', facebook: '', linkedin: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const theme = useMemo(() => THEMES.find(t => t.id === themeId) || THEMES[0], [themeId]);

  // 載入與訂閱資料（多設備同步）
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
      }
    })();
    const unsub = dbSubscribe(path, (data) => {
      if (!data) return;
      setThemeId(data.themeId || 'simple');
      setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
      setInfo(data.info || {});
      setAvatarUrl(data.avatarUrl || '');
      setShareUrl(data.shareUrl || '');
    });
    return () => unsub();
  }, [user?.id]);

  const addBlock = (b) => { setBlocks(prev => [...prev, b]); setShowAdd(false); };
  const removeBlock = (id) => setBlocks(prev => prev.filter(b => b.id !== id));

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
      const payload = { themeId, blocks, info, avatarUrl: avatar, shareUrl };
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
      const url = `${base}/card/${user?.id || 'me'}`;
      // 若後端提供短鏈服務，可在此接入；目前直接使用原始網址
      setShareUrl(url);
      await dbSet(`cards/${user.id}/editor`, { themeId, blocks, info, avatarUrl, shareUrl: url });
      toast.success('已生成分享連結');
    } catch { toast.error('生成連結失敗'); }
  };

  return (
    <div className="min-h-screen" style={{ background: theme.colors.bg }}>
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">內容模塊</h3>
                <button onClick={()=>setShowAdd(true)} className="px-3 py-2 rounded bg-gray-900 text-white" aria-label="新增模塊">新增</button>
              </div>
              <div className="mt-3 space-y-2">
                {blocks.map((b) => (
                  <div key={b.id} className="border rounded-lg p-2 flex items-center justify-between">
                    <div className="text-sm">{b.type}</div>
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
            </div>
          </div>

          {/* 右：即時預覽 */}
          <div className="rounded-2xl overflow-hidden">
            <PreviewCard info={info} avatarUrl={avatarUrl} theme={theme} blocks={blocks} />
          </div>
        </div>
      </div>

      {showAdd && (<BlockAddModal onAdd={addBlock} onClose={()=>setShowAdd(false)} />)}
    </div>
  );
}