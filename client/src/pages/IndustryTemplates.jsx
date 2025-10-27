import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../config/axios';
import IndustryTemplateModal from '../components/IndustryTemplateModal';

// 專業 SVG 圖標組件（24x24px，支持淺色/深色主題）
const IndustryIcons = {
  photographer: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" 
              stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
    </svg>
  ),
  store: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V7" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 7H21L20 19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19L3 7Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 11V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 11V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 11V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  business: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
    </svg>
  ),
  designer: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 3V7" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 17V21" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 5H7" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="17 19H21" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  fitness: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 6.5H17.5C18.6 6.5 19.5 7.4 19.5 8.5V15.5C19.5 16.6 18.6 17.5 17.5 17.5H6.5C5.4 17.5 4.5 16.6 4.5 15.5V8.5C4.5 7.4 5.4 6.5 6.5 6.5Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <path d="M2 10H4.5" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M19.5 10H22" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M2 14H4.5" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M19.5 14H22" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  restaurant: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2V7C3 8.1 3.9 9 5 9C6.1 9 7 8.1 7 7V2" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 9V22" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 2V22" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 2C17 5 17 7 20 7" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  education: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 10V6L12 2L2 6V10L12 14L22 10Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 12V17C6 18.1 8.7 20 12 20C15.3 20 18 18.1 18 17V12" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  legal: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L2 7L12 11L22 7L12 3Z" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17H22" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 7V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 7V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M14 7V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 7V17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  musician: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18V5L21 3V16" 
            stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="3" 
              stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <circle cx="18" cy="16" r="3" 
              stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
    </svg>
  )
};

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
  const [showModal, setShowModal] = useState(false);

  const fetchIndustries = async () => {
    setLoadingIndustries(true);
    setErrorIndustries('');
    try {
      const resp = await axios.get('/api/nfc-cards/industries');
      const list = Array.isArray(resp.data?.items) ? resp.data.items : [];
      // 使用備用數據，確保有專業 SVG 圖標支持
      const industriesWithIcons = [
        { key: 'photographer', name: '攝影師', description: '個人簡介 + 作品輪播' },
        { key: 'store', name: '店家', description: '營業資訊 + 互動地圖 + 數位菜單' },
        { key: 'business', name: '商務人士', description: '聯絡資訊 + 經歷時間軸 + 文件下載' },
        { key: 'designer', name: '設計師', description: '作品集 + 創意展示 + 聯絡方式' },
        { key: 'fitness', name: '健身教練', description: '課程介紹 + 預約系統 + 成果展示' },
        { key: 'restaurant', name: '餐廳', description: '菜單展示 + 位置資訊 + 預約功能' },
        { key: 'education', name: '教育工作者', description: '課程資訊 + 教學理念 + 聯絡方式' },
        { key: 'legal', name: '法律專業', description: '專業資歷 + 服務項目 + 諮詢預約' },
        { key: 'musician', name: '音樂人', description: '作品試聽 + 演出資訊 + 社群連結' }
      ];
      setIndustries(industriesWithIcons);
    } catch (e) {
      setErrorIndustries('行業資料載入失敗');
      // 備用數據
      setIndustries([
        { key: 'photographer', name: '攝影師', description: '個人簡介 + 作品輪播' },
        { key: 'store', name: '店家', description: '營業資訊 + 互動地圖 + 數位菜單' },
        { key: 'business', name: '商務人士', description: '聯絡資訊 + 經歷時間軸 + 文件下載' },
        { key: 'designer', name: '設計師', description: '作品集 + 創意展示 + 聯絡方式' },
        { key: 'fitness', name: '健身教練', description: '課程介紹 + 預約系統 + 成果展示' },
        { key: 'restaurant', name: '餐廳', description: '菜單展示 + 位置資訊 + 預約功能' },
        { key: 'education', name: '教育工作者', description: '課程資訊 + 教學理念 + 聯絡方式' },
        { key: 'legal', name: '法律專業', description: '專業資歷 + 服務項目 + 諮詢預約' },
        { key: 'musician', name: '音樂人', description: '作品試聽 + 演出資訊 + 社群連結' }
      ]);
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

  const handleModalTemplateSelect = ({ industry, template }) => {
    navigate('/nfc-card-editor', { 
      state: { 
        selectedTemplate: template,
        industry: industry?.key 
      } 
    });
  };

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
          
          {/* 模態窗口切換按鈕 */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              模態窗口瀏覽模式
            </button>
          </motion.div>
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
                {industries.map(cat => {
                  const IconComponent = IndustryIcons[cat.key];
                  return (
                    <motion.button 
                      key={cat.key} 
                      onClick={() => pickIndustry(cat.key)} 
                      whileHover={{ y: -2 }} 
                      whileTap={{ scale: 0.98 }} 
                      className="group rounded-2xl p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-left transition focus:outline-none focus:ring"
                    >
                      <div className="flex items-center gap-3">
                        {IconComponent ? (
                          <IconComponent className="w-6 h-6" isDark={true} />
                        ) : (
                          <div className="text-2xl">🔖</div>
                        )}
                        <div>
                          <div className="font-semibold">{cat.name}</div>
                          <div className="text-xs opacity-80">{cat.description || ''}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs opacity-70">含範例：可拖拽調整模塊、即時替換多媒體、支援增刪區塊</div>
                    </motion.button>
                  );
                })}
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
                        <button onClick={() => navigate(`/nfc-card-editor?industry=${encodeURIComponent(industryKey)}&template=${encodeURIComponent(t.category)}`)} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs">使用此模板</button>
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

      {/* 模態窗口 */}
      <IndustryTemplateModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectTemplate={handleModalTemplateSelect}
        isDarkTheme={true}
      />
    </div>
  );
}