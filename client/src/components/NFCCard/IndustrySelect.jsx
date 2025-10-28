import React, { useMemo, useState, useRef, useEffect } from 'react';
import IndustryIcons from './IndustryIcons';

// 行業 -> 模板類別映射，用於分類篩選
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

const CATEGORY_LABELS = {
  all: '全部類別',
  'creative-marketing': '創意行銷',
  'japanese-minimal': '日式極簡',
  'premium-business': '質感商務',
  'cute-graffiti': '可愛塗鴉',
  cyberpunk: '賽博朋克',
  other: '其他'
};

/**
 * 分類下拉選單（行業選擇）
 * - 以固定類別進行篩選，不提供搜尋輸入
 * - 使用一致的 SVG 圖標顯示行業
 */
export default function IndustrySelect({ items = [], loading, error, onReload, onSelect }) {
  const [selectedCat, setSelectedCat] = useState('all');
  const [open, setOpen] = useState(false); // 分類下拉是否展開
  const [listVisible, setListVisible] = useState(false); // 首次點擊後才顯示行業選項
  const listRef = useRef(null);
  const optionRefs = useRef([]);
  const [focusIndex, setFocusIndex] = useState(null);

  const categories = useMemo(() => {
    const cats = new Set(['all']);
    items.forEach((i) => {
      const c = INDUSTRY_CATEGORY_MAP[i.key];
      if (Array.isArray(c)) c.forEach((v) => cats.add(v));
      else cats.add('other');
    });
    return Array.from(cats);
  }, [items]);

  const filtered = useMemo(() => {
    if (selectedCat === 'all') return items;
    return items.filter((i) => {
      const cats = INDUSTRY_CATEGORY_MAP[i.key] || ['other'];
      return cats.includes(selectedCat);
    });
  }, [items, selectedCat]);

  // 當打開下拉時，將焦點移至當前選中分類，並支援上下鍵導航
  useEffect(() => {
    if (open) {
      const idx = (focusIndex ?? categories.findIndex((c) => c === selectedCat));
      const safeIdx = idx >= 0 ? idx : 0;
      // 下一幀聚焦，確保元素已渲染
      requestAnimationFrame(() => {
        optionRefs.current[safeIdx]?.focus?.();
      });
    }
  }, [open, focusIndex, categories, selectedCat]);

  const handleListKeyDown = (e) => {
    if (!open) return;
    const max = categories.length - 1;
    const current = focusIndex ?? categories.findIndex((c) => c === selectedCat) ?? 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(current + 1, max);
      setFocusIndex(next);
      optionRefs.current[next]?.focus?.();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(current - 1, 0);
      setFocusIndex(prev);
      optionRefs.current[prev]?.focus?.();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = current >= 0 ? current : 0;
      const cat = categories[idx];
      setSelectedCat(cat);
      setOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <span className="text-xs block mb-1">分類</span>
          <div className="relative">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="listbox"
              onClick={() => {
                setOpen((v) => !v);
                if (!listVisible) setListVisible(true); // 首次點擊立即顯示列表
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen(true);
                  if (!listVisible) setListVisible(true);
                  setFocusIndex(categories.findIndex((c) => c === selectedCat));
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setOpen(true);
                  if (!listVisible) setListVisible(true);
                  const idx = categories.findIndex((c) => c === selectedCat);
                  setFocusIndex(idx >= 0 ? idx : 0);
                }
              }}
              className="w-full flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition duration-150"
            >
              <span className="text-sm">{CATEGORY_LABELS[selectedCat] || selectedCat}</span>
              <svg className={`h-4 w-4 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {open && (
              <div role="listbox" onKeyDown={handleListKeyDown} className="absolute z-10 mt-2 w-full max-h-60 overflow-auto rounded-lg border border-white/20 bg-gray-800/90 p-2 shadow-xl backdrop-blur">
                {categories.map((cat, idx) => (
                  <button
                    key={cat}
                    type="button"
                    role="option"
                    aria-selected={selectedCat === cat}
                    ref={(el) => { optionRefs.current[idx] = el; }}
                    onClick={() => { setSelectedCat(cat); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-white/10 text-sm ${selectedCat === cat ? 'bg-white/10' : ''} ${focusIndex === idx ? 'ring-1 ring-emerald-500' : ''}`}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="mt-6 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
          >重載</button>
        )}
      </div>

      {loading && (
        <div className="mt-2 text-xs opacity-70">正在載入行業資料…</div>
      )}
      {error && (
        <div className="mt-2 flex items-center justify-between text-xs text-red-300">
          <span>{error}</span>
          {onReload && (
            <button onClick={onReload} className="ml-2 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500">重試</button>
          )}
        </div>
      )}

      {!loading && !error && (
        <div
          ref={listRef}
          className={`overflow-hidden transition-[max-height] duration-300 ${listVisible ? 'mt-3' : ''}`}
          style={{ maxHeight: listVisible ? (listRef.current?.scrollHeight || 0) : 0 }}
        >
          {listVisible && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map((it) => {
                const Icon = IndustryIcons[it.key];
                return (
                  <button
                    key={it.key}
                    className="text-left px-3 py-2 flex items-center gap-3 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10"
                    onClick={() => onSelect && onSelect(it.key)}
                  >
                    {Icon ? (
                      <Icon className="w-5 h-5" isDark={true} />
                    ) : (
                      <div className="w-5 h-5 rounded bg-white/20" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{it.name}</div>
                      {it.description && (
                        <div className="text-xs opacity-70">{it.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}