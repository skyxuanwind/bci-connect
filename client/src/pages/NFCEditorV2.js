import React, { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';

// V2 NFC 名片編輯器（重設計版）
// - 拖放設計介面
// - 模板選擇與樣式控制
// - 多媒體元素支持
// - 實時預覽

const PALETTE = [
  { type: 'text', label: '文字' },
  { type: 'image', label: '圖片' },
  { type: 'video', label: '影片' },
  { type: 'link', label: '連結' },
  { type: 'social', label: '社群' },
];

const TEMPLATES = [
  { id: 'simple', name: '極簡', base: { bg: '#0f0f0f', fg: '#ffffff', accent: '#f5b301', font: 'Inter, system-ui' } },
  { id: 'elegant', name: '典雅', base: { bg: '#101418', fg: '#e6e6e6', accent: '#a78bfa', font: 'Inter, system-ui' } },
  { id: 'bold', name: '撞色', base: { bg: '#0c0c0c', fg: '#fefefe', accent: '#ef4444', font: 'Inter, system-ui' } },
];

const defaultBlockContent = (type) => {
  switch (type) {
    case 'text':
      return { text: '新文字內容', align: 'left', size: 'lg' };
    case 'image':
      return { url: '', alt: '圖片描述', fit: 'cover' };
    case 'video':
      return { url: '', provider: 'youtube' };
    case 'link':
      return { label: '我的網站', url: 'https://example.com' };
    case 'social':
      return { platform: 'instagram', url: '' };
    default:
      return {};
  }
};

const PreviewCard = ({ blocks, style }) => {
  return (
    <div
      className="w-full h-full"
      style={{
        background: style.bg,
        color: style.fg,
        fontFamily: style.font,
      }}
    >
      <div className="p-4 md:p-6 lg:p-8 space-y-4">
        {blocks.map((b) => (
          <div key={b.id} className="rounded-lg p-3" style={{ border: `1px dashed ${style.accent}40` }}>
            {b.type === 'text' && (
              <div className={`text-${b.content.size}`}
                   style={{ textAlign: b.content.align }}>
                {b.content.text}
              </div>
            )}
            {b.type === 'image' && (
              <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden flex items-center justify-center">
                {b.content.url ? (
                  <img src={b.content.url} alt={b.content.alt || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-sm opacity-70">未設定圖片</div>
                )}
              </div>
            )}
            {b.type === 'video' && (
              <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden flex items-center justify-center">
                {b.content.url ? (
                  <div className="text-xs">影片預留位置（{b.content.provider}）</div>
                ) : (
                  <div className="text-sm opacity-70">未設定影片 URL</div>
                )}
              </div>
            )}
            {b.type === 'link' && (
              <a href={b.content.url || '#'}
                 className="inline-flex items-center gap-2 px-3 py-2 rounded-md"
                 style={{ background: `${style.accent}20`, color: style.fg }}>
                <span className="text-sm font-medium">{b.content.label}</span>
                <span className="text-xs opacity-70">{b.content.url}</span>
              </a>
            )}
            {b.type === 'social' && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md"
                   style={{ border: `1px solid ${style.accent}55` }}>
                <span className="text-sm">{b.content.platform}</span>
                <span className="text-xs opacity-70">{b.content.url || '未設定'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function NFCEditorV2() {
  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [templateId, setTemplateId] = useState('simple');
  const [customStyle, setCustomStyle] = useState({ bg: '', fg: '', accent: '', font: '' });

  const style = useMemo(() => {
    const base = TEMPLATES.find(t => t.id === templateId)?.base || TEMPLATES[0].base;
    return {
      bg: customStyle.bg || base.bg,
      fg: customStyle.fg || base.fg,
      accent: customStyle.accent || base.accent,
      font: customStyle.font || base.font,
    };
  }, [templateId, customStyle]);

  const selectedBlock = blocks.find(b => b.id === selectedId) || null;

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
      const item = PALETTE[source.index];
      const newBlock = {
        id: uuidv4(),
        type: item.type,
        content: defaultBlockContent(item.type),
      };
      const next = [...blocks];
      next.splice(destination.index, 0, newBlock);
      setBlocks(next);
      setSelectedId(newBlock.id);
    }

    if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      const next = Array.from(blocks);
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setBlocks(next);
    }
  };

  const updateSelected = (patch) => {
    if (!selectedBlock) return;
    setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, content: { ...b.content, ...patch } } : b));
  };

  const removeSelected = () => {
    if (!selectedBlock) return;
    setBlocks(prev => prev.filter(b => b.id !== selectedBlock.id));
    setSelectedId(null);
  };

  const addQuick = (type) => {
    const newBlock = { id: uuidv4(), type, content: defaultBlockContent(type) };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">NFC 電子名片編輯器 · V2</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => addQuick('text')} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded">新增文字</button>
            <button onClick={() => addQuick('image')} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded">新增圖片</button>
            <button onClick={() => addQuick('link')} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded">新增連結</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* 左側：素材與模板 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">拖放元素</div>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="palette" isDropDisabled>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {PALETTE.map((p, idx) => (
                        <Draggable draggableId={`palette-${p.type}`} index={idx} key={p.type}>
                          {(provided2) => (
                            <div
                              ref={provided2.innerRef}
                              {...provided2.draggableProps}
                              {...provided2.dragHandleProps}
                              className="px-3 py-2 bg-black/40 rounded border border-amber-500/30 cursor-grab"
                            >
                              {p.label}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">模板選擇</div>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded border px-2 py-2 text-sm ${templateId===t.id?'border-amber-500 bg-amber-500/20':'border-amber-500/30 bg-black/30'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3">
              <div className="text-sm font-semibold mb-2">樣式</div>
              <div className="space-y-2">
                <label className="block text-xs">背景色</label>
                <input type="color" value={style.bg} onChange={(e)=>setCustomStyle(s=>({ ...s, bg:e.target.value }))} className="w-full h-8" />
                <label className="block text-xs">前景色</label>
                <input type="color" value={style.fg} onChange={(e)=>setCustomStyle(s=>({ ...s, fg:e.target.value }))} className="w-full h-8" />
                <label className="block text-xs">強調色</label>
                <input type="color" value={style.accent} onChange={(e)=>setCustomStyle(s=>({ ...s, accent:e.target.value }))} className="w-full h-8" />
              </div>
            </div>
          </div>

          {/* 中間：畫布（可拖放排序） */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3 min-h-[420px]">
              <div className="text-sm font-semibold mb-2">設計畫布</div>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="canvas">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                      {blocks.map((b, idx) => (
                        <Draggable draggableId={b.id} index={idx} key={b.id}>
                          {(provided2) => (
                            <div
                              ref={provided2.innerRef}
                              {...provided2.draggableProps}
                              {...provided2.dragHandleProps}
                              className={`p-3 rounded-lg border ${selectedId===b.id?'border-amber-500':'border-amber-500/30'} bg-black/40 cursor-grab`}
                              onClick={() => setSelectedId(b.id)}
                            >
                              <div className="text-xs uppercase opacity-70 mb-2">{b.type}</div>
                              {b.type === 'text' && <div className="text-sm">{b.content.text}</div>}
                              {b.type === 'image' && <div className="text-xs opacity-70">{b.content.url || '未設定圖片 URL'}</div>}
                              {b.type === 'video' && <div className="text-xs opacity-70">{b.content.url || '未設定影片 URL'}</div>}
                              {b.type === 'link' && <div className="text-xs opacity-70">{b.content.label} → {b.content.url}</div>}
                              {b.type === 'social' && <div className="text-xs opacity-70">{b.content.platform} → {b.content.url || '未設定'}</div>}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>

          {/* 右側：屬性編輯與預覽 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">屬性編輯</div>
                <button onClick={removeSelected} disabled={!selectedBlock} className="px-2 py-1 text-sm rounded bg-red-600 disabled:opacity-50">移除</button>
              </div>
              {!selectedBlock && (
                <div className="text-sm opacity-70">請從畫布選擇一個元素以編輯屬性</div>
              )}
              {selectedBlock && selectedBlock.type === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xs">文字內容</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.text} onChange={(e)=>updateSelected({ text:e.target.value })} />
                  <label className="block text-xs">對齊</label>
                  <select className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.align} onChange={(e)=>updateSelected({ align:e.target.value })}>
                    <option value="left">靠左</option>
                    <option value="center">置中</option>
                    <option value="right">靠右</option>
                  </select>
                  <label className="block text-xs">大小</label>
                  <select className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.size} onChange={(e)=>updateSelected({ size:e.target.value })}>
                    <option value="sm">小</option>
                    <option value="md">中</option>
                    <option value="lg">大</option>
                  </select>
                </div>
              )}
              {selectedBlock && selectedBlock.type === 'image' && (
                <div className="space-y-2">
                  <label className="block text-xs">圖片 URL</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.url} onChange={(e)=>updateSelected({ url:e.target.value })} />
                  <label className="block text-xs">替代文字</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.alt} onChange={(e)=>updateSelected({ alt:e.target.value })} />
                </div>
              )}
              {selectedBlock && selectedBlock.type === 'video' && (
                <div className="space-y-2">
                  <label className="block text-xs">影片 URL</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.url} onChange={(e)=>updateSelected({ url:e.target.value })} />
                  <label className="block text-xs">提供商</label>
                  <select className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.provider} onChange={(e)=>updateSelected({ provider:e.target.value })}>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="tiktok">TikTok</option>
                  </select>
                </div>
              )}
              {selectedBlock && selectedBlock.type === 'link' && (
                <div className="space-y-2">
                  <label className="block text-xs">標籤</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.label} onChange={(e)=>updateSelected({ label:e.target.value })} />
                  <label className="block text-xs">URL</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.url} onChange={(e)=>updateSelected({ url:e.target.value })} />
                </div>
              )}
              {selectedBlock && selectedBlock.type === 'social' && (
                <div className="space-y-2">
                  <label className="block text-xs">平台</label>
                  <select className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.platform} onChange={(e)=>updateSelected({ platform:e.target.value })}>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="x">X (Twitter)</option>
                  </select>
                  <label className="block text-xs">URL</label>
                  <input className="w-full px-3 py-2 rounded bg-black/40 border border-amber-500/30" value={selectedBlock.content.url} onChange={(e)=>updateSelected({ url:e.target.value })} />
                </div>
              )}
            </div>

            <div className="bg-gray-900/60 border border-amber-500/30 rounded-lg p-3 h-[420px]">
              <div className="text-sm font-semibold mb-2">即時預覽</div>
              <div className="w-full h-[360px] rounded overflow-hidden">
                <PreviewCard blocks={blocks} style={style} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}