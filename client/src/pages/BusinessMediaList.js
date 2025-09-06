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

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));

  const speakerId = useMemo(() => searchParams.get('speakerId') || '', [searchParams]);

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

  const handleGoSpeakerCard = async (item) => {
    try {
      await axios.post(`/api/business-media/${item.id}/track/card`, {
        targetMemberId: item.speaker_id,
      }).catch(() => {});
    } catch {}
    navigate(`/member/${item.speaker_id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">商媒體</h1>
        <p className="text-sm text-gray-500 mt-1">精選會員的影片與文章內容</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋標題或摘要"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {speakerId && (
            <span className="text-xs text-gray-500">過濾講者ID：{speakerId}</span>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-gray-600">載入中...</div>
      )}
      {error && !loading && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                  <div className="mt-1 space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {item.content_type}
                    </span>
                    {item.platform && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        {item.platform}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {item.summary && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-3">{item.summary}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleOpenItem(item)}
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  前往觀看
                </button>
                <button
                  onClick={() => handleGoSpeakerCard(item)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                >
                  查看講者名片
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-gray-500">暫無內容</div>
          )}
        </div>
      )}
    </div>
  );
}