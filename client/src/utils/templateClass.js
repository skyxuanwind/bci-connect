// 將模板名稱映射到統一的 CSS 類名，供預覽與完整版本共用
export const mapTemplateNameToClass = (name) => {
  if (!name) return 'template-minimal-luxury';
  const normalized = String(name).trim();

  // 若已是類名則直接返回
  if (normalized.startsWith('template-')) return normalized;

  // 僅保留三種模板風格的映射（含常見別名）：
  const MAP = {
    // 1) Cyberpunk 霓虹科技風（使用既有 futuristic 類名）
    'Cyberpunk風格': 'template-futuristic',
    '未來科技感風格': 'template-futuristic',
    '科技專業版': 'template-futuristic',
    // 2) 可愛手繪風
    '可愛手繪風': 'template-handdrawn-cute',
    '塗鴉可愛風': 'template-handdrawn-cute',
    '插畫塗鴉版': 'template-handdrawn-cute',
    // 3) 黑金質感・商務尊榮風
    '黑金質感・商務尊榮風': 'template-black-gold-prestige',
    '質感黑金版': 'template-black-gold-prestige'
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