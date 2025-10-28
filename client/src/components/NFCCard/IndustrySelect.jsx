import React, { useRef } from 'react';
import IndustryIcons from './IndustryIcons';

// 行業選擇：直接顯示行業名稱清單，不含風格分類與重載按鈕
export default function IndustrySelect({ items = [], loading, error, onSelect }) {
  const listRef = useRef(null);

  return (
    <div>
      {loading && (
        <div className="mt-2 text-xs opacity-70">正在載入行業資料…</div>
      )}
      {error && (
        <div className="mt-2 text-xs text-red-300">{error}</div>
      )}
      {!loading && !error && (
        <div
          ref={listRef}
          className="mt-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((it) => {
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
        </div>
      )}
    </div>
  );
}