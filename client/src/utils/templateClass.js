// 將模板名稱映射到統一的 CSS 類名，供預覽與完整版本共用
export const mapTemplateNameToClass = (name) => {
  if (!name) return 'template-minimal-luxury';
  const normalized = String(name).trim();

  // 若已是類名則直接返回
  if (normalized.startsWith('template-')) return normalized;

  // 擴充行業導向模板映射：
  const MAP = {
    // 風格別名
    'Cyberpunk風格': 'template-futuristic',
    '未來科技感風格': 'template-futuristic',
    '科技專業版': 'template-futuristic',
    '可愛手繪風': 'template-handdrawn-cute',
    '塗鴉可愛風': 'template-handdrawn-cute',
    '插畫塗鴉版': 'template-handdrawn-cute',
    '黑金質感・商務尊榮風': 'template-black-gold-prestige',
    '質感黑金版': 'template-black-gold-prestige',

    // 新增的六種模板樣式
    'black-gold-prestige': 'template-black-gold-prestige',
    'handdrawn-cute': 'template-handdrawn-cute', 
    'glassmorphism': 'template-glassmorphism',
    'creative-brand': 'template-creative-brand',
    'professional-business': 'template-professional-business',
    'dynamic-interactive': 'template-dynamic-interactive',

    // 行業模板
    'photographer': 'template-photographer',
    '攝影師': 'template-photographer',

    'store': 'template-store',
    '店家': 'template-store',

    'business': 'template-business',
    '商務人士': 'template-business',

    'designer': 'template-designer',
    '設計師': 'template-designer',

    'fitness': 'template-fitness',
    '健身教練': 'template-fitness',

    'restaurant': 'template-restaurant',
    '餐飲': 'template-restaurant',

    'education': 'template-education',
    '教育顧問': 'template-education',

    'legal': 'template-legal',
    '律師/法律': 'template-legal',

    'musician': 'template-musician',
    '音樂人': 'template-musician'
  };

  return MAP[normalized] || 'template-futuristic';
};

// 根據是否深色模式，補上 dark-mode（僅未來科技風格適用）
export const buildTemplateClass = (name, darkMode = false) => {
  const base = mapTemplateNameToClass(name);
  if (base === 'template-futuristic') {
    return `${base} ${darkMode ? 'dark-mode' : ''}`.trim();
  }
  return base;
};