import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../config/axios';
import sharedRenderContentBlock, { normalizeBlock } from '../components/CardRenderer';
import { PhoneIcon, EnvelopeIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaLine } from 'react-icons/fa';

// 輕量主題（與編輯器一致）
const THEMES = [
  { id: 'simple', name: 'Simple', colors: { bg: '#0B0F1A', card: '#1C2140', text: '#FFFFFF', accent: '#3B82F6' }, font: 'system-ui' },
  { id: 'classic', name: 'Classic', colors: { bg: '#FAFAFA', card: '#FFFFFF', text: '#111827', accent: '#2563EB' }, font: 'Georgia, serif' },
  { id: 'coolblack', name: 'Cool Black', colors: { bg: '#0E0E11', card: '#1F2437', text: '#E5E7EB', accent: '#22D3EE' }, font: 'system-ui' },
  { id: 'forest', name: 'Forest', colors: { bg: '#0b1410', card: '#1d3127', text: '#e7f3ed', accent: '#10b981' }, font: 'system-ui' },
  { id: 'ocean', name: 'Ocean', colors: { bg: '#071932', card: '#0a2a4f', text: '#dbeafe', accent: '#60a5fa' }, font: 'system-ui' }
];

const getTheme = (id) => THEMES.find(t => t.id === id) || THEMES[0];
const isUrl = (v) => /^(https?:\/\/)[^\s]+$/i.test(v || '');

// 生成 Cloudinary 友好的 responsive srcSet（若非 Cloudinary，回退為 ?w= 寬度參數）
const buildResponsiveSrcSet = (url, widths = [480, 720, 1080, 1440]) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com')) {
      const parts = u.pathname.split('/');
      const uploadIdx = parts.findIndex(p => p === 'upload');
      if (uploadIdx !== -1) {
        const prefix = parts.slice(0, uploadIdx + 1).join('/');
        const suffix = parts.slice(uploadIdx + 1).join('/');
        return widths.map(w => `${u.origin}${prefix}/f_auto,q_auto,dpr_auto,w_${w}/${suffix} ${w}w`).join(', ');
      }
    }
    return widths.map(w => `${url}${url.includes('?') ? '&' : '?'}w=${w} ${w}w`).join(', ');
  } catch {
    return widths.map(w => `${url}${url.includes('?') ? '&' : '?'}w=${w} ${w}w`).join(', ');
  }
};

export default function CardOpen() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardConfig, setCardConfig] = useState(null);
  const [member, setMember] = useState(null);

  // 展示頁主題切換（系統/亮/暗）
  const [colorMode, setColorMode] = useState('system'); // 'system' | 'light' | 'dark'
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => setSystemDark(!!mq.matches);
      if (mq) {
        apply();
        if (mq.addEventListener) mq.addEventListener('change', apply);
        else if (mq.addListener) mq.addListener(apply);
        return () => {
          if (mq.removeEventListener) mq.removeEventListener('change', apply);
          else if (mq.removeListener) mq.removeListener(apply);
        };
      }
    } catch {}
    return () => {};
  }, []);

  // 輪播互動（與 Editor 預覽一致）
  const [blockCarouselIndexMap, setBlockCarouselIndexMap] = useState({});
  const swipeRef = useRef({});

  useEffect(() => {
    fetchCard();
  }, [memberId]);

  // SSE：後端廣播更新時即時刷新
  useEffect(() => {
    let es;
    try {
      es = new EventSource(`/api/nfc-cards/events?memberId=${memberId}`);
      const onUpdate = (e) => {
        try {
          const payload = JSON.parse(e.data || '{}');
          if (!payload.memberId || String(payload.memberId) === String(memberId)) {
            fetchCard(true);
          }
        } catch {}
      };
      es.addEventListener('card:update', onUpdate);
      es.onerror = () => {};
    } catch {}
    return () => { try { es && es.close(); } catch {} };
  }, [memberId]);

  const fetchCard = async (skipVersionBump = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams(window.location.search);
      const shareVersion = Number(params.get('v')) || Date.now();
      const resp = await axios.get(`/api/nfc-cards/member/${memberId}`, {
        params: { v: shareVersion },
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = resp.data || {};
      setMember(data.member || {});
      setCardConfig(data.cardConfig || {});

      // 以 server 版本覆蓋 URL 參數，避免快取
      const serverVersion = Number(data?.cardConfig?.version || data?.version || 0);
      if (!skipVersionBump && (!params.get('v') || (serverVersion && serverVersion > shareVersion))) {
        params.set('v', String(serverVersion || Date.now()));
        const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
      }
      setError('');
    } catch (e) {
      console.error('載入名片失敗:', e);
      setError('無法載入名片');
    } finally {
      setLoading(false);
    }
  };

  const themeId = cardConfig?.design?.themeId || cardConfig?.themeId || 'simple';
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const bgStyle = cardConfig?.design?.bgStyle || '';
  const layoutId = cardConfig?.design?.layoutId || 'standard';

  // 頁面色彩（不影響名片自身主題）
  const pageMode = useMemo(() => (colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode), [colorMode, systemDark]);
  const pageColors = useMemo(() => (pageMode === 'dark'
    ? { bg: '#0B0F1A', text: '#FFFFFF' }
    : { bg: '#FAFAFA', text: '#111827' }
  ), [pageMode]);
  const infoBoxStyle = useMemo(() => ({
    background: pageMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    borderColor: pageMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  }), [pageMode]);

  const info = useMemo(() => ({
    name: (cardConfig?.card_title || member?.name || ''),
    title: (cardConfig?.card_subtitle || member?.title || ''),
    company: (member?.company || cardConfig?.user_company || ''),
    phone: (member?.contact_number || cardConfig?.user_phone || ''),
    email: (member?.email || cardConfig?.user_email || ''),
    facebook: (cardConfig?.facebook || ''),
    instagram: (cardConfig?.instagram || ''),
    youtube: (cardConfig?.youtube || ''),
    tiktok: (cardConfig?.tiktok || ''),
    line: (member?.line_id || cardConfig?.line_id || '')
  }), [cardConfig, member]);

  const avatarUrl = cardConfig?.avatar_url || '';
  const blocksRaw = cardConfig?.content_blocks || cardConfig?.contentBlocks || [];
  const blocks = useMemo(() => (blocksRaw || []).map(b => normalizeBlock(b)), [blocksRaw]);

  const carouselCountsMap = useMemo(() => {
    const m = new Map();
    blocks.forEach((nb, idx) => {
      const count = nb?.content_type === 'carousel' ? (nb?.content_data?.images?.length || 0) : 0;
      m.set(idx, count);
    });
    return m;
  }, [blocks]);

  const getCarouselSwipeHandlers = useCallback((idx) => {
    const count = carouselCountsMap.get(idx) || 0;
    if (count <= 1) return {};
    return {
      onTouchStart: (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        swipeRef.current[idx] = { x: t.clientX, time: Date.now() };
      },
      onTouchEnd: (e) => {
        const s = swipeRef.current[idx];
        const t = e.changedTouches?.[0];
        if (!s || !t) return;
        const dx = t.clientX - s.x;
        const dt = Date.now() - s.time;
        delete swipeRef.current[idx];
        if (Math.abs(dx) < 40 || dt > 1000) return;
        const cur = blockCarouselIndexMap[idx] || 0;
        const next = dx < 0 ? (cur + 1) % count : (cur - 1 + count) % count;
        setBlockCarouselIndexMap(prev => ({ ...prev, [idx]: next }));
      }
    };
  }, [carouselCountsMap, blockCarouselIndexMap]);

  const lineId = (info.line || '').trim();
  const facebookUrl = (info.facebook || '').trim();
  const instagramUrl = (info.instagram || '').trim();
  const youtubeUrl = (info.youtube || '').trim();
  const tiktokUrl = (info.tiktok || '').trim();

  const socialButtons = [
    info.phone ? { key: 'phone', href: `tel:${info.phone}`, icon: <PhoneIcon className="h-6 w-6" />, title: '電話' } : null,
    info.email ? { key: 'email', href: `mailto:${info.email}`, icon: <EnvelopeIcon className="h-6 w-6" />, title: '電子郵件' } : null,
    lineId ? { key: 'line', href: `https://line.me/ti/p/~${lineId}`, icon: <FaLine className="h-6 w-6" />, title: 'LINE' } : null,
    isUrl(facebookUrl) ? { key: 'facebook', href: facebookUrl, icon: <FaFacebook className="h-6 w-6" />, title: 'Facebook' } : null,
    isUrl(instagramUrl) ? { key: 'instagram', href: instagramUrl, icon: <FaInstagram className="h-6 w-6" />, title: 'Instagram' } : null,
    isUrl(youtubeUrl) ? { key: 'youtube', href: youtubeUrl, icon: <FaYoutube className="h-6 w-6" />, title: 'YouTube' } : null,
    isUrl(tiktokUrl) ? { key: 'tiktok', href: tiktokUrl, icon: <FaTiktok className="h-6 w-6" />, title: 'TikTok' } : null,
  ].filter(Boolean);

  // 一致風格的一鍵聯絡列（Email/LINE/Facebook）
  const contactBarButtons = [
    info.email ? { key: 'email', href: `mailto:${info.email}`, icon: <EnvelopeIcon className="h-5 w-5" />, label: 'Email' } : null,
    lineId ? { key: 'line', href: `https://line.me/ti/p/~${lineId}`, icon: <FaLine className="h-5 w-5" />, label: 'LINE' } : null,
    isUrl(facebookUrl) ? { key: 'facebook', href: facebookUrl, icon: <FaFacebook className="h-5 w-5" />, label: 'Facebook' } : null,
  ].filter(Boolean);

  const handleShare = async () => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v') || `${Date.now()}`;
    params.set('v', v);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    try {
      const resp = await axios.post('/api/links/shorten', { url, label: `card-open-${memberId}` }).catch(() => ({}));
      const shortUrl = resp?.data?.shortUrl || url;
      if (navigator.share) {
        await navigator.share({ title: `${info.name || '名片'}`, url: shortUrl });
      } else {
        await navigator.clipboard.writeText(shortUrl);
        alert('已複製分享連結');
      }
    } catch {}
  };

  const handleBackToEditor = () => {
    navigate(`/nfc-card-editor?memberId=${memberId}`);
  };

  // 頁面載入動畫
  const containerVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div style={{ fontFamily: theme.font, minHeight: '100vh', background: pageColors.bg, backgroundImage: bgStyle || undefined, color: pageColors.text }} className="p-4">
      <AnimatePresence mode="wait">
        <motion.div variants={containerVariants} initial="initial" animate="animate" exit="exit" className="max-w-md mx-auto">
          {/* 頁面工具列 */}
          <div className="flex items-center justify-between mb-3" style={{ color: pageColors.text }}>
            <div className="flex items-center gap-2">
              <div className="text-sm">正式名片</div>
              {/* 主題切換：系統 / 亮 / 暗 */}
              <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg border" style={{ borderColor: pageMode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}>
                <button aria-label="依系統" onClick={() => setColorMode('system')} className="p-1 rounded-md hover:opacity-80" style={{ backgroundColor: colorMode === 'system' ? (pageMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : 'transparent' }}>
                  <ComputerDesktopIcon className="h-5 w-5" />
                </button>
                <button aria-label="亮色" onClick={() => setColorMode('light')} className="p-1 rounded-md hover:opacity-80" style={{ backgroundColor: colorMode === 'light' ? (pageMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : 'transparent' }}>
                  <SunIcon className="h-5 w-5" />
                </button>
                <button aria-label="暗色" onClick={() => setColorMode('dark')} className="p-1 rounded-md hover:opacity-80" style={{ backgroundColor: colorMode === 'dark' ? (pageMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)') : 'transparent' }}>
                  <MoonIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBackToEditor} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10">返回編輯器</button>
              <button onClick={handleShare} className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">分享</button>
            </div>
          </div>

          {/* 名片卡片 */}
          <div className="rounded-2xl shadow-lg p-4" style={{ background: theme.colors.card, color: theme.colors.text }}>
            {/* 頭像置中，圖片自適應解析度 */}
            <div className="w-full mb-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="頭像"
                  className="w-full rounded-xl ring-2 object-cover"
                  style={{ borderColor: theme.colors.accent, aspectRatio: '16/9' }}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 480px) 100vw, 480px"
                  srcSet={buildResponsiveSrcSet(avatarUrl)}
                />
              ) : (
                <div className="w-full min-h-[160px] flex items-center justify-center rounded-xl bg-black/20">{(info.name || 'N').slice(0,1).toUpperCase()}</div>
              )}
            </div>

            {/* 姓名 / 職稱 */}
            {(info.name || info.title) && (
              <div className="text-center mb-3">
                {info.name && (<div className="text-xl font-semibold tracking-wide">{info.name}</div>)}
                {info.title && (<div className="text-sm opacity-80">{info.title}</div>)}
              </div>
            )}

            {/* 一鍵聯絡列（一致風格） */}
            {contactBarButtons.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-center items-center gap-3">
                  {contactBarButtons.map(btn => (
                    <a key={btn.key} href={btn.href} target="_blank" rel="noopener noreferrer" aria-label={btn.label} className="transition-transform active:scale-90">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border" style={{ borderColor: theme.colors.accent }}>
                        {btn.icon}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 聯絡資訊 */}
            {socialButtons.length > 0 && (
              <div className="mb-4 rounded-xl overflow-hidden border" style={infoBoxStyle}>
                <div className="p-3">
                  <div className="text-sm opacity-90">聯絡資訊</div>
                  <div className="flex justify-center items-center gap-4 mt-2">
                    {socialButtons.map(btn => (
                      <a key={btn.key} href={btn.href} target="_blank" rel="noopener noreferrer" title={btn.title} className="transition-transform active:scale-90">
                        {btn.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 內容區塊：共用渲染器 */}
            <div className="space-y-4">
              {blocks.map((block, idx) => (
                <div key={idx} {...getCarouselSwipeHandlers(idx)}>
                  {sharedRenderContentBlock({
                    block,
                    index: idx,
                    options: {
                      layoutType: layoutId,
                      contactInfo: info,
                      accentColor: theme.colors.accent,
                      blockCarouselIndexMap,
                      setBlockCarouselIndexMap,
                      getCarouselSwipeHandlers
                    }
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 載入與錯誤提示 */}
          {loading && (
            <div className="mt-3 text-center text-white/80">載入中…</div>
          )}
          {!!error && (
            <div className="mt-3 text-center text-red-400">{error}</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}