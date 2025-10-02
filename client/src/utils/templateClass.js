// 將模板名稱映射到統一的 CSS 類名，供預覽與完整版本共用
export const mapTemplateNameToClass = (name) => {
  if (!name) return 'template-minimal-luxury';
  const normalized = String(name).trim();

  // 若已是類名則直接返回
  if (normalized.startsWith('template-')) return normalized;

  const MAP = {
    // 新命名
    '質感商務感': 'template-professional-business',
    'Cyberpunk風格': 'template-futuristic',
    '簡約日系風': 'template-minimal-luxury',
    '創意行銷風格': 'template-creative-brand',
    '塗鴉可愛風': 'template-dynamic-interactive',

    // 舊命名（與 MemberCard/NFCCardEditor 原有映射一致）
    '極簡高級風格': 'template-minimal-luxury',
    '未來科技感風格': 'template-futuristic',
    '創意品牌風格': 'template-creative-brand',
    '專業商務風格': 'template-professional-business',
    '動態互動風格': 'template-dynamic-interactive',

    // 更早期命名
    '科技專業版': 'template-futuristic',
    '活力創意版': 'template-creative-brand',
    '簡約質感版': 'template-minimal-luxury',
    '商務專業版': 'template-professional-business',
    '現代簡約版': 'template-minimal-luxury',
    '環保綠意版': 'template-dynamic-interactive',
    '質感黑金版': 'template-minimal-luxury',
    '插畫塗鴉版': 'template-dynamic-interactive'
  };

  return MAP[normalized] || 'template-minimal-luxury';
};

// 根據是否深色模式，補上 dark-mode（僅未來科技風格適用）
export const buildTemplateClass = (name, darkMode = false) => {
  const base = mapTemplateNameToClass(name);
  if (base === 'template-futuristic') {
    return `${base} ${darkMode ? 'dark-mode' : ''}`.trim();
  }
  return base;
};