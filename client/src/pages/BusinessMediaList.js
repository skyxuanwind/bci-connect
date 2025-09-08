import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../config/axios';

const typeOptions = [
  { value: '', label: '全部類型' },
  { value: 'video_long', label: '長影片' },
  { value: 'video_short', label: '短影片' },
  { value: 'article', label: '文章' },
];

export default function BusinessMediaList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 處理 Instagram 嵌入內容
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [items]);

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));

  const speakerId = useMemo(() => searchParams.get('speakerId') || '', [searchParams]);

  // Helper to compute embeddable URL from external link or embed code
  const getEmbedUrl = (item) => {
    // 優先使用 embed_code
    if (item?.embed_code) {
      return item.embed_code;
    }
    if (!item?.external_url) return null;
    const url = item.external_url;
    const lower = url.toLowerCase();
    // YouTube
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      // Try v=ID
      try {
        const vParam = new URL(url).searchParams.get('v');
        let videoId = vParam;
        if (!videoId && lower.includes('youtu.be/')) {
          // youtu.be/VIDEOID
          const m = lower.match(/youtu\.be\/([a-z0-9_-]{6,})/i);
          videoId = m ? m[1] : null;
        }
        if (!videoId && lower.includes('/shorts/')) {
          const m = lower.match(/\/shorts\/([a-z0-9_-]{6,})/i);
          videoId = m ? m[1] : null;
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      } catch {
        return null;
      }
    }
    // Vimeo
    if (lower.includes('vimeo.com')) {
      const m = lower.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      return m ? `https://player.vimeo.com/video/${m[1]}` : null;
    }
    // TikTok
    if (lower.includes('tiktok.com')) {
      let id = null;
      const m1 = lower.match(/\/video\/(\d+)/); // standard share URL
      const m2 = lower.match(/\/embed\/v\d+\/(\d+)/); // legacy embed
      const m3 = lower.match(/\/player\/v1\/(\d+)/); // direct player
      if (m1 && m1[1]) id = m1[1];
      else if (m2 && m2[1]) id = m2[1];
      else if (m3 && m3[1]) id = m3[1];
      return id ? `https://www.tiktok.com/player/v1/${id}` : null;
    }
    // Instagram (posts/reels/tv)
    if (lower.includes('instagram.com')) {
      const m = lower.match(/instagram\.com\/(reel|p|tv)\/([a-z0-9_-]+)/i);
      if (m && m[1] && m[2]) {
        // 對於Instagram，返回null讓它使用embed_code
        return null;
      }
      return null;
    }
    // Other platforms fallback to open externally
    return null;
  };

  useEffect(() => {
    const params = {};
    if (q) params.q = q;
    if (type) params.type = type;
    if (speakerId) params.speakerId = speakerId;
    if (page && page !== 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [q, type, speakerId, page, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    async function fetchItems() {
      try {
        setLoading(true);
        setError('');
        const resp = await axios.get('/api/business-media', {
          params: {
            q: q || undefined,
            type: type || undefined,
            speakerId: speakerId || undefined,
            page,
            limit: 20,
          },
        });
        if (!cancelled) {
          setItems(resp?.data?.items || []);
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || '載入失敗');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchItems();
    return () => { cancelled = true; };
  }, [q, type, speakerId, page]);

  const handleOpenItem = async (item) => {
    try {
      // 記錄 CTA 點擊
      await axios.post(`/api/business-media/${item.id}/track/cta`, {
        ctaLabel: 'open_external',
        ctaUrl: item.external_url || '',
        targetMemberId: null,
      }).catch(() => {});
    } catch {}
    if (item.external_url) {
      window.open(item.external_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePlayOnSite = async (item) => {
    const embedUrl = getEmbedUrl(item);
    if (!embedUrl) {
      // 若無法內嵌，直接外開
      return handleOpenItem(item);
    }
    // 記錄觀看
    try {
      await axios.post(`/api/business-media/${item.id}/track/view`, {}).catch(() => {});
    } catch {}
  };

  const handleGoSpeakerCard = async (item) => {
    try {
      await axios.post(`/api/business-media/${item.id}/track/card`, {
        targetMemberId: item.speaker_id,
      }).catch(() => {});
    } catch {}
    navigate(`/members/${item.speaker_id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-yellow-100">商媒體</h1>
        <p className="text-sm text-gray-300 mt-1">精選會員的影片與文章內容</p>
      </div>

      <div className="bg-gradient-to-br from-black/85 to-gray-900/85 p-4 rounded-lg shadow border border-yellow-500/30">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋標題或摘要"
            className="flex-1 px-3 py-2 border border-yellow-500/30 bg-black/40 text-gray-100 placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 border border-yellow-500/30 bg-black/40 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {speakerId && (
            <span className="text-xs text-gray-400">過濾講者ID：{speakerId}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-gray-300">載入中...</div>
      )}
      {error && !loading && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const embedUrl = getEmbedUrl(item);
                const lower = (item.external_url || '').toLowerCase();
                const isInstagram = lower.includes('instagram.com') || item.platform === 'instagram';
                const canEmbed = !!embedUrl || (isInstagram && item.embed_code);
            return (
              <div key={item.id} className="p-4 bg-gradient-to-br from-black/85 to-gray-900/85 rounded-lg border border-yellow-500/30">
                {/* 標題與標籤等保留既有內容 */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-yellow-100">{item.title}</h3>
                    <div className="mt-1 space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                        {item.content_type}
                      </span>
                      {item.platform && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                          {item.platform}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 封面圖片或影片區塊 */}
                {item.cover_image_url && !canEmbed && (
                  <div className="mt-2">
                    <img 
                      src={item.cover_image_url} 
                      alt={item.title}
                      className="w-full h-48 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {canEmbed && (
                  <div className="mt-2" style={{ width: '100%' }}>
                    {isInstagram && item.embed_code ? (
                      <div 
                        style={{ width: '100%', minHeight: '600px' }}
                        dangerouslySetInnerHTML={{ 
                          __html: item.embed_code + '<script async src="//www.instagram.com/embed.js"></script>'
                        }} 
                      />
                    ) : item.embed_code ? (
                      <div 
                        style={{ width: '100%', minHeight: '315px' }}
                        dangerouslySetInnerHTML={{ __html: item.embed_code }} 
                      />
                    ) : (
                      <iframe
                        src={embedUrl}
                        title={item.title || 'Embedded Media'}
                        allow={isInstagram ? 
                          "clipboard-write; encrypted-media; picture-in-picture; web-share" : 
                          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        }
                        allowFullScreen
                        loading="lazy"
                        width="100%"
                        height={isInstagram ? "600" : "315"}
                        style={{ 
                          border: 0,
                          maxWidth: '100%'
                        }}
                        frameBorder="0"
                      />
                    )}
                  </div>
                )}

                {/* 操作按鈕列 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={item.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs border border-yellow-500/30 text-yellow-100 rounded bg-black/40 hover:bg-black/60"
                  >
                    前往原平台
                  </a>
                  {/* 其餘按鈕保留 */}
                  <button
                    onClick={() => handleGoSpeakerCard(item)}
                    className="px-3 py-1.5 text-sm border border-yellow-500/30 text-yellow-100 rounded bg-black/40 hover:bg-black/60"
                  >
                    查看講者名片
                  </button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full text-gray-400">暫無內容</div>
          )}
        </div>
      )}
    </div>
  );
}