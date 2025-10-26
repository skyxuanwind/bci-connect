import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../config/axios';

const INDUSTRY_CATEGORY_MAP = {
  photographer: ['creative-marketing', 'japanese-minimal'],
  store: ['creative-marketing', 'premium-business'],
  business: ['premium-business'],
  designer: ['creative-marketing', 'japanese-minimal', 'cute-graffiti'],
  fitness: ['creative-marketing', 'premium-business'],
  restaurant: ['creative-marketing', 'japanese-minimal', 'cute-graffiti'],
  education: ['japanese-minimal', 'premium-business'],
  legal: ['premium-business', 'japanese-minimal'],
  musician: ['cyberpunk', 'creative-marketing']
};

export default function IndustryTemplates() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const industryKey = searchParams.get('industry');

  const [industries, setIndustries] = useState([]);
  const [loadingIndustries, setLoadingIndustries] = useState(false);
  const [errorIndustries, setErrorIndustries] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorTemplates, setErrorTemplates] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);

  const fetchIndustries = async () => {
    setLoadingIndustries(true);
    setErrorIndustries('');
    try {
      const resp = await axios.get('/api/nfc-cards/industries');
      const list = Array.isArray(resp.data?.items) ? resp.data.items : [];
      setIndustries(list);
    } catch (e) {
      setErrorIndustries('行業資料載入失敗');
    } finally {
      setLoadingIndustries(false);
    }
  };

  const fetchTemplates = async () => {
    if (!industryKey) return;
    setLoadingTemplates(true);
    setErrorTemplates('');
    try {
      const resp = await axios.get('/api/nfc-cards/templates');
      const list = Array.isArray(resp.data?.templates) ? resp.data.templates : [];
      const cats = INDUSTRY_CATEGORY_MAP[industryKey] || [];
      const filtered = cats.length ? list.filter(t => cats.includes(t.category)) : list;
      setTemplates(filtered);
    } catch (e) {
      setErrorTemplates('模板庫載入失敗');
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    fetchIndustries();
    if (industryKey) fetchTemplates();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [industryKey]);

  const pickIndustry = (key) => navigate(`/industry-templates?industry=${encodeURIComponent(key)}`);
  const useTemplate = (key) => navigate(`/nfc-card-editor?template=${encodeURIComponent(industryKey || key)}`);

  const currentIndustry = industries.find(i => i.key === industryKey);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-bold">
            {industryKey ? (currentIndustry?.name || '行業模板庫') : '選擇您的行業'}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-2 opacity-80">
            {industryKey ? (currentIndustry?.description || '瀏覽並挑選適合的模板樣式') : '我們會為您匹配最適合的專業模板，並提供完整範例數據'}
          </motion.p>
        </div>

        {offline && (
          <div className="mt-3 text-sm rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-2">
            當前離線狀態，將顯示有限資訊；恢復連線後可重試。
          </div>
        )}

        {!industryKey && (
          <div className="mt-6">
            {loadingIndustries ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="group rounded-2xl p-4 bg-white/5 border border-white/10 animate-pulse">
                    <div className="h-6 w-24 bg-white/10 rounded mb-2" />
                    <div className="h-4 w-40 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            ) : errorIndustries ? (
              <div className="text-center">
                <div className="text-sm opacity-80">{errorIndustries}</div>
                <button onClick={fetchIndustries} className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">重試</button>
              </div>
            ) : industries.length === 0 ? (
              <div className="text-center text-sm opacity-70">暫無行業資料</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {industries.map(cat => (
                  <motion.button key={cat.key} onClick={() => pickIndustry(cat.key)} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="group rounded-2xl p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-left transition focus:outline-none focus:ring">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{cat.emoji || '🔖'}</div>
                      <div>
                        <div className="font-semibold">{cat.name}</div>
                        <div className="text-xs opacity-80">{cat.description || ''}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs opacity-70">含範例：可拖拽調整模塊、即時替換多媒體、支援增刪區塊</div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {industryKey && (
          <div className="mt-6">
            {loadingTemplates ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse h-48" />
                ))}
              </div>
            ) : errorTemplates ? (
              <div className="text-center">
                <div className="text-sm opacity-80">{errorTemplates}</div>
                <button onClick={fetchTemplates} className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">重試</button>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center text-sm opacity-70">暫無此行業模板，您可直接前往編輯器使用範例資料</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {templates.map(t => (
                  <motion.div key={`${t.category}-${t.name}`} whileHover={{ y: -2 }} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                    <div className="h-40 bg-black/20 flex items-center justify-center">
                      {t.preview_image_url ? (
                        <img src={t.preview_image_url} alt={t.name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                      ) : (
                        <div className="text-xs opacity-70">無預覽圖</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs opacity-70">{t.category}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => useTemplate(industryKey)} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs">使用此模板</button>
                        <button onClick={() => navigate('/nfc-card-editor')} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs">前往編輯器</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">
            <span>✨ 高質感視覺設計 · 多頁面切換 · WYSIWYG 編輯器</span>
          </div>
        </div>
      </div>
    </div>
  );
}