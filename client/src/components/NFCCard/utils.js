export const parseCssVars = (cssText, accentFallback) => {
  try {
    const text = cssText || '';
    const getVar = (name, def) => {
      const m = text.match(new RegExp(`--${name}:\s*([^;]+);`));
      return m ? m[1].trim() : def;
    };
    const accent = getVar('nfc-accent', accentFallback || '#cccccc');
    const dividerStyle = getVar('nfc-divider-style', 'solid-thin');
    const dividerOpacityStr = getVar('nfc-divider-opacity', '0.6');
    const dividerOpacity = parseFloat(dividerOpacityStr);
    const iconPack = getVar('nfc-icon-pack', '');
    return { accent, dividerStyle, dividerOpacity: isNaN(dividerOpacity) ? 0.6 : dividerOpacity, iconPack };
  } catch {
    return { accent: accentFallback || '#cccccc', dividerStyle: 'solid-thin', dividerOpacity: 0.6, iconPack: '' };
  }
};

export const hexToRgb = (hex) => {
  try {
    const clean = (hex || '#cccccc').replace('#', '');
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  } catch { return '204, 204, 204'; }
};

export const getDividerBorder = (style, colorHex, opacity, darkMode) => {
  const rgb = hexToRgb(colorHex || '#cccccc');
  const alpha = typeof opacity === 'number' ? opacity : 0.6;
  const adjAlpha = darkMode ? Math.min(1, alpha + 0.15) : alpha;
  const rgba = `rgba(${rgb}, ${adjAlpha})`;
  switch (style) {
    case 'solid-thin': return `1px solid ${rgba}`;
    case 'solid-medium': return `2px solid ${rgba}`;
    case 'dashed': return `1px dashed ${rgba}`;
    case 'dotted': return `1px dotted ${rgba}`;
    case 'double': return `3px double ${rgba}`;
    case 'neon-blue':
    case 'neon-purple':
    case 'neon-pink':
      return `2px solid ${rgba}`;
    case 'gradient':
    case 'wave-soft':
    case 'curve-strong':
    case 'ornament':
      return `2px solid ${rgba}`;
    default:
      return `1px solid ${rgba}`;
  }
};

export const getIconPackClass = (pack) => {
  const p = (pack || '').toLowerCase();
  if (p.includes('outline-thick')) return 'icon-pack-outline-thick';
  if (p.includes('duotone')) return 'icon-pack-duotone';
  if (p.includes('stroke') || p.includes('outline')) return 'icon-pack-stroke';
  if (p.includes('filled') || p.includes('solid')) return 'icon-pack-filled';
  if (p.includes('neon-blue')) return 'icon-pack-neon-blue';
  if (p.includes('neon-purple')) return 'icon-pack-neon-purple';
  if (p.includes('neon-pink')) return 'icon-pack-neon-pink';
  return '';
};

export const buildLineDeepLink = (raw) => {
  const id = String(raw || '').trim();
  if (!id) return '';
  const hasAt = id.startsWith('@') || id.includes('@');
  const clean = id.replace(/^@/, '');
  return hasAt
    ? `https://line.me/R/ti/p/@${clean}`
    : `https://line.me/R/ti/p/~${clean}`;
};

export const getVersionedUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const currentV = params.get('v') || `${Date.now()}`;
  params.set('v', currentV);
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
};

export const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert('已複製到剪貼板');
  }).catch(() => {
    alert('複製失敗');
  });
};