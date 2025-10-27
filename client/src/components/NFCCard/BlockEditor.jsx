import React, { useState } from 'react';

export default function BlockEditor({ block, onChange, onRemove }) {
  const [local, setLocal] = useState(block);

  const update = (next) => {
    const newBlock = { ...local, ...next };
    setLocal(newBlock);
    onChange && onChange(newBlock);
  };

  return (
    <div className="group border rounded-xl p-3 bg-white/5 hover:bg-white/8 transition-colors focus-within:ring-2 ring-emerald-500">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{labelOf(local.type)}</div>
        <button onClick={() => onRemove && onRemove(local.id)} className="text-xs text-red-500 hover:text-red-400">刪除</button>
      </div>

      {local.type === 'link' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="text-xs">連結標題
            <input
              aria-label="連結標題"
              className="mt-1 w-full px-2 py-1 rounded border border-white/10 bg-white/5"
              placeholder="例如：官方網站"
              value={local.title || ''}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label className="text-xs">網址
            <input
              aria-label="網址"
              className="mt-1 w-full px-2 py-1 rounded border border-white/10 bg-white/5"
              placeholder="https://example.com"
              value={local.url || ''}
              onChange={(e) => update({ url: e.target.value })}
            />
          </label>
        </div>
      )}

      {local.type === 'video' && (
        <div className="grid grid-cols-1 gap-2">
          <label className="text-xs">影片連結（YouTube 或 Vimeo）
            <input
              aria-label="影片連結"
              className="mt-1 w-full px-2 py-1 rounded border border-white/10 bg-white/5"
              placeholder="https://youtu.be/... 或 https://vimeo.com/..."
              value={local.url || ''}
              onChange={(e) => update({ url: e.target.value })}
            />
          </label>
        </div>
      )}

      {local.type === 'carousel' && (
        <div className="space-y-2">
          <div className="text-xs opacity-80">圖片清單</div>
          {(local.images || []).map((src, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                aria-label={`圖片${idx+1}`}
                className="flex-1 px-2 py-1 rounded border border-white/10 bg-white/5"
                placeholder="https://..."
                value={src}
                onChange={(e) => {
                  const next = [...(local.images || [])];
                  next[idx] = e.target.value;
                  update({ images: next });
                }}
              />
              <button
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                onClick={() => {
                  const next = (local.images || []).filter((_, i) => i !== idx);
                  update({ images: next });
                }}
              >移除</button>
            </div>
          ))}
          <button
            className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
            onClick={() => update({ images: [...(local.images || []), ''] })}
          >新增圖片 URL</button>
        </div>
      )}

      {local.type === 'richtext' && (
        <div className="grid grid-cols-1 gap-2">
          <label className="text-xs">介紹內容（支援基本HTML）
            <textarea
              aria-label="介紹內容"
              rows={4}
              className="mt-1 w-full px-2 py-1 rounded border border-white/10 bg-white/5"
              placeholder="在此輸入介紹文字，例如：\n<strong>擅長品牌設計與視覺識別。</strong>"
              value={local.html || ''}
              onChange={(e) => update({ html: e.target.value })}
            />
          </label>
          <div className="text-[11px] opacity-70">提示：可使用 &lt;strong&gt;、&lt;em&gt;、&lt;br/&gt; 等標籤進行排版。</div>
        </div>
      )}

      {local.type === 'contact' && (
        <div className="text-xs opacity-80">此模塊會顯示「立即聯絡」按鈕，並使用名片中的電話號碼。</div>
      )}
    </div>
  );
}

const labelOf = (t) => {
  switch (t) {
    case 'link': return '超連結';
    case 'video': return '影片';
    case 'carousel': return '圖片輪播';
    case 'richtext': return '文字介紹';
    case 'contact': return '聯絡按鈕';
    default: return t;
  }
};