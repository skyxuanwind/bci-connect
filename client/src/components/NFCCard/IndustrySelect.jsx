import React, { useMemo, useState } from 'react';
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

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-xs">分類
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 outline-none text-sm"
            aria-label="選擇分類"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>
            ))}
          </select>
        </label>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="mt-5 px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
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
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((it) => {
            const Icon = IndustryIcons[it.key];
            return (
              <button
                key={it.key}
                className="text-left px-3 py-2 flex items-center gap-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
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
  );
}