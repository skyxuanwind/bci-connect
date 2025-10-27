import React, { useMemo, useState, useEffect, useRef } from 'react';
import IndustryIcons from './IndustryIcons';

/**
 * 可搜索下拉選單（行業模板選擇）
 * - 以一致SVG圖標替代 emoji
 * - 支援即時搜尋、鍵盤導覽、響應式
 */
export default function IndustrySelect({ items = [], loading, error, onReload, onSelect, placeholder = '搜尋行業…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.key || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!inputRef.current) return;
      if (!inputRef.current.parentElement.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-emerald-500 outline-none text-sm"
            aria-label="搜尋行業"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="px-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
          aria-label="開關下拉選單"
        >
          <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
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

      {/* 下拉清單 */}
      {open && !loading && !error && (
        <div className="absolute z-20 mt-2 w-full max-h-64 overflow-auto rounded-xl bg-slate-800/95 backdrop-blur border border-white/10 shadow-xl">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs opacity-70">找不到符合的行業</div>
          ) : (
            <ul className="py-1">
              {filtered.map((it) => {
                const Icon = IndustryIcons[it.key];
                return (
                  <li key={it.key}>
                    <button
                      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/10"
                      onClick={() => { setOpen(false); setQuery(it.name); onSelect && onSelect(it.key); }}
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}