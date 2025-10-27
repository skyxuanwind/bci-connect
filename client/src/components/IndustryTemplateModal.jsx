import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import axios from '../config/axios';

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

const IndustryTemplateModal = ({ isOpen, onClose, onSelectTemplate, isDarkTheme = true }) => {
  const [industries, setIndustries] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [loadingIndustries, setLoadingIndustries] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState('');

  // 獲取行業列表
  const fetchIndustries = async () => {
    setLoadingIndustries(true);
    setError('');
    try {
      const response = await axios.get('/api/nfc-cards/industries');
      const data = response.data || [];
      setIndustries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('獲取行業列表失敗:', err);
      setError('載入行業列表失敗');
      // 使用備用數據
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

  // 獲取模板列表
  const fetchTemplates = async (industryKey) => {
    setLoadingTemplates(true);
    setError('');
    try {
      const response = await axios.get('/api/nfc-cards/templates');
      const allTemplates = response.data?.templates || [];
      const categories = INDUSTRY_CATEGORY_MAP[industryKey] || [];
      const filteredTemplates = categories.length 
        ? allTemplates.filter(t => categories.includes(t.category))
        : allTemplates;
      setTemplates(filteredTemplates);
    } catch (err) {
      console.error('獲取模板列表失敗:', err);
      setError('載入模板列表失敗');
      // 使用備用模板數據
      setTemplates([
        { name: '質感商務風格', category: 'premium-business', preview_image_url: '/nfc-templates/premium-business.svg' },
        { name: '創意行銷風格', category: 'creative-marketing', preview_image_url: '/nfc-templates/creative-marketing.svg' },
        { name: '日式極簡風格', category: 'japanese-minimal', preview_image_url: '/nfc-templates/japanese-minimal.svg' }
      ]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 初始化載入行業列表
  useEffect(() => {
    if (isOpen) {
      fetchIndustries();
    }
  }, [isOpen]);

  // 選擇行業
  const handleIndustrySelect = (industry) => {
    setSelectedIndustry(industry);
    fetchTemplates(industry.key);
  };

  // 返回行業選擇
  const handleBackToIndustries = () => {
    setSelectedIndustry(null);
    setTemplates([]);
  };

  // 選擇模板
  const handleTemplateSelect = (template) => {
    onSelectTemplate({
      industry: selectedIndustry,
      template: template
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* 模態窗口內容 */}
        <motion.div
          className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* 標題欄 */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              {selectedIndustry && (
                <button
                  onClick={handleBackToIndustries}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedIndustry ? `${selectedIndustry.name} - 選擇模板` : '選擇您的行業'}
                </h2>
                <p className="text-sm text-white/70 mt-1">
                  {selectedIndustry 
                    ? '瀏覽並挑選適合的專業模板樣式' 
                    : '我們會為您匹配最適合的專業模板，並提供完整範例數據'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* 內容區域 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {!selectedIndustry ? (
              // 行業選擇視圖
              <div>
                {loadingIndustries ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-6 h-6 bg-white/10 rounded" />
                          <div className="h-5 w-20 bg-white/10 rounded" />
                        </div>
                        <div className="h-4 w-full bg-white/10 rounded mb-2" />
                        <div className="h-3 w-3/4 bg-white/10 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {industries.map((industry) => {
                      const IconComponent = IndustryIcons[industry.key];
                      return (
                        <motion.button
                          key={industry.key}
                          onClick={() => handleIndustrySelect(industry)}
                          className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all duration-200"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {IconComponent ? (
                              <IconComponent className="w-6 h-6" isDark={isDarkTheme} />
                            ) : (
                              <div className="w-6 h-6 rounded bg-white/20" />
                            )}
                            <div className="font-semibold text-white">{industry.name}</div>
                          </div>
                          <div className="text-sm text-white/70 mb-3">
                            {industry.description || '專業模板設計'}
                          </div>
                          <div className="text-xs text-white/50">
                            含範例：可拖拽調整模塊、即時替換多媒體、支援增刪區塊
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              // 模板選擇視圖
              <div>
                {loadingTemplates ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-xl overflow-hidden bg-white/5 border border-white/10 animate-pulse">
                        <div className="h-40 bg-white/10" />
                        <div className="p-4">
                          <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
                          <div className="h-3 w-1/2 bg-white/10 rounded mb-3" />
                          <div className="flex gap-2">
                            <div className="h-8 w-20 bg-white/10 rounded" />
                            <div className="h-8 w-16 bg-white/10 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-white/70 mb-4">暫無此行業模板</div>
                    <button
                      onClick={() => onSelectTemplate({ industry: selectedIndustry, template: null })}
                      className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                    >
                      直接前往編輯器
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                      <motion.div
                        key={`${template.category}-${template.name}`}
                        className="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-200"
                        whileHover={{ y: -2 }}
                      >
                        <div className="h-40 bg-black/20 flex items-center justify-center">
                          {template.preview_image_url ? (
                            <img
                              src={template.preview_image_url}
                              alt={template.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-xs text-white/50">無預覽圖</div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="text-sm font-semibold text-white mb-1">
                            {template.name}
                          </div>
                          <div className="text-xs text-white/50 mb-3">
                            {template.category}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTemplateSelect(template)}
                              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                            >
                              使用此模板
                            </button>
                            <button
                              onClick={() => onSelectTemplate({ industry: selectedIndustry, template: null })}
                              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                            >
                              編輯器
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部提示 */}
          <div className="p-4 border-t border-white/10 bg-white/5">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 text-sm">
                <span>✨ 高質感視覺設計 · 多頁面切換 · WYSIWYG 編輯器</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IndustryTemplateModal;