import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import shortener from '../services/shortener';
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaWhatsapp,
  FaTiktok,
  FaYoutube,
  FaGlobe,
  FaSpotify,
  FaTwitter
} from 'react-icons/fa';

// 基本平台定義（可擴充）
const PLATFORM_CATALOG = [
  { key: 'instagram', label: 'Instagram', icon: FaInstagram, baseUrl: 'https://instagram.com/' },
  { key: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, baseUrl: 'https://wa.me/' },
  { key: 'tiktok', label: 'TikTok', icon: FaTiktok, baseUrl: 'https://tiktok.com/@' },
  { key: 'youtube', label: 'YouTube', icon: FaYoutube, baseUrl: 'https://youtube.com/' },
  { key: 'website', label: 'Personal Website', icon: FaGlobe, baseUrl: 'https://'},
  { key: 'spotify', label: 'Spotify', icon: FaSpotify, baseUrl: 'https://open.spotify.com/' },
  { key: 'facebook', label: 'Facebook', icon: FaFacebook, baseUrl: 'https://facebook.com/' },
  { key: 'x', label: 'X (Twitter)', icon: FaTwitter, baseUrl: 'https://x.com/' },
  { key: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, baseUrl: 'https://linkedin.com/in/' },
];

// MAX_SELECT 改為 state 管理於元件內

const CardStudio = () => {
  const [step, setStep] = useState(1); // 1: 平台, 2: 連結, 3: 模板
  const [catalog, setCatalog] = useState(PLATFORM_CATALOG);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]); // [{key,label,icon,baseUrl}]
  const [links, setLinks] = useState([]); // [{platformKey,title,url,tags,shortUrl}]
  const [bulkText, setBulkText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [versionName, setVersionName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [statsMap, setStatsMap] = useState({});
  const [versions, setVersions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cardTplVersions') || '[]'); } catch { return []; }
  });
  const [theme, setTheme] = useState('linktree');
  const [maxSelect, setMaxSelect] = useState(9);
  // 局部樣式方案：根據主題切換按鈕/輸入樣式
  const btnPrimary = theme === 'linktree'
    ? 'py-2 px-4 rounded-lg bg-[#6C5CE7] hover:bg-[#5A4EDF] text-white focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]'
    : 'btn-primary';
  const btnSecondary = theme === 'linktree'
    ? 'py-2 px-4 rounded-lg border bg-white text-[#6C5CE7] hover:bg-[#F5F3FF] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]'
    : 'btn-secondary';
  const btnTertiary = theme === 'linktree'
    ? 'px-3 py-2 rounded-lg border text-[#6C5CE7] hover:bg-[#F5F3FF] focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]'
    : 'btn-outline';
  const inputClass = theme === 'linktree'
    ? 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]'
    : 'input';
  const phoneRef = useRef(null);
  const desktopRef = useRef(null);

  useEffect(() => {
    // 動態偵測裝置，微調預覽比例
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    document.body.dataset.device = isMobile ? 'mobile' : 'desktop';
  }, []);

  useEffect(() => {
    try { localStorage.setItem('cardTplVersions', JSON.stringify(versions)); } catch {}
  }, [versions]);

  const onPlatformClick = (p) => {
    if (selectedPlatforms.some(sp => sp.key === p.key)) {
      // 取消選擇
      const next = selectedPlatforms.filter(sp => sp.key !== p.key);
      setSelectedPlatforms(next);
      return;
    }
    if (selectedPlatforms.length >= maxSelect) {
      toast.info(`最多可選擇 ${maxSelect} 個平台`);
      return;
    }
    setSelectedPlatforms([...selectedPlatforms, p]);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(selectedPlatforms);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setSelectedPlatforms(items);
  };

  const proceedToLinks = () => {
    if (selectedPlatforms.length === 0) {
      toast.warn('請至少選擇一個平台');
      return;
    }
    // 初始化對應的連結資料
    const initialLinks = selectedPlatforms.map(sp => ({ platformKey: sp.key, title: sp.label, url: sp.baseUrl, tags: [], group: '', shortUrl: '' }));
    setLinks(initialLinks);
    setStep(2);
  };

  const updateLink = (idx, field, value) => {
    const next = [...links];
    next[idx] = { ...next[idx], [field]: value };
    setLinks(next);
  };

  const addBulkLinks = () => {
    // 支援每行: title, url 或只有 url
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => {
      const parts = l.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        return { title: parts[0], url: parts[1], tags: [], group: '' };
      }
      return { title: 'Link', url: parts[0], tags: [], group: '' };
    });
    setLinks(prev => [...prev, ...parsed.map((p, i) => ({ platformKey: `bulk-${Date.now()}-${i}`, ...p, shortUrl: '' }))]);
    setBulkText('');
    toast.success(`已加入 ${parsed.length} 筆連結`);
  };

  const generateShortLinks = async () => {
    try {
      const payload = links.map((item, idx) => ({
        url: item.url,
        label: item.title,
        tags: item.tags,
        idx
      }));
      const resp = await shortener.bulkShorten(payload);
      const map = {};
      (resp?.results || []).forEach(r => { map[r.idx] = r; });
      const next = links.map((item, idx) => {
        const r = map[idx];
        if (r && r.shortUrl) {
          return { ...item, shortUrl: r.shortUrl, code: r.code };
        }
        return item;
      });
      setLinks(next);
      toast.success('短網址已生成');
    } catch (e) {
      console.error(e);
      toast.error('短網址生成失敗');
    }
  };

  const publishProfile = async () => {
    // 雛形：以第一個短網址作為 NFC 寫入內容（可擴充為聚合頁）
    const primary = links.find(l => l.shortUrl) || links.find(l => l.url);
    if (!primary) return toast.warn('請先設定至少一個連結');
    setPreviewUrl(primary.shortUrl || primary.url);
    // 嘗試 Web NFC
    if ('NDEFReader' in window) {
      try {
        const reader = new window.NDEFReader();
        await reader.write({ records: [{ recordType: 'url', data: primary.shortUrl || primary.url }] });
        toast.success('已透過 Web NFC 寫入');
      } catch (e) {
        console.warn('Web NFC 寫入失敗', e);
        toast.info('Web NFC 不支援或寫入失敗，請改用 NFC Gateway');
      }
    } else {
      toast.info('此裝置不支援 Web NFC，請使用 NFC Gateway App');
    }
  };

  const TEMPLATE_LIBRARY = [
    { key: 'business', name: '商務·精緻', colors: ['#F5F3FF', '#EDE9FE'], font: 'ui-sans-serif' },
    { key: 'creative', name: '創意·活力', colors: ['#FFF7ED', '#FEF3C7'], font: 'ui-serif' },
    { key: 'tech', name: '技術·冷色', colors: ['#ECFEFF', '#CFFAFE'], font: 'ui-mono' },
    { key: 'minimal', name: '極簡·留白', colors: ['#FFFFFF', '#F9FAFB'], font: 'ui-sans-serif' },
  ];

  const TemplateCard = ({ tpl }) => (
    <button
      aria-label={`選擇模板 ${tpl.name}`}
      onClick={() => setSelectedTemplate(tpl.key)}
      className={`relative p-5 rounded-2xl border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition transform hover:scale-[1.02]`} 
      style={{ background: `linear-gradient(135deg, ${tpl.colors[0]}, ${tpl.colors[1]})` }}
    >
      <div className="text-left">
        <div className="text-sm font-semibold text-gray-700">{tpl.name}</div>
        <div className="mt-3 h-28 rounded-xl bg-white/60" />
      </div>
      <span className={`absolute bottom-3 right-3 text-xs px-3 py-1 rounded-full bg-[#6C5CE7] text-white shadow`}>Start with this template</span>
    </button>
  );

  return (
    <div className={"min-h-screen " + (theme === 'linktree' ? 'bg-gray-50' : theme === 'blackgold' ? 'bg-gradient-to-br from-black to-gray-900' : 'bg-white')}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">NFC 電子名片編輯器 · Card Studio</h1>
          <p className="text-gray-600">三步驟：社群媒體 → 連結配置 → 套用模板（雙視窗即時預覽）</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center space-x-4 mb-4" aria-label="建立流程導覽">
          {[1,2,3].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`px-4 py-2 rounded-full ${step===s? 'bg-primary-600 text-white':'bg-white text-gray-800 border'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              {s===1 && '1. 社群媒體選擇'}
              {s===2 && '2. 連結配置'}
              {s===3 && '3. 模板套用'}
            </button>
          ))}
        </div>
        {/* 主題與上限控制 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">主題</span>
            <div className="flex gap-2">
              <button className={`px-3 py-1 rounded-full ${theme==='linktree'? 'bg-[#6C5CE7] text-white':'bg-white border'}`} onClick={()=>setTheme('linktree')}>Linktree</button>
              <button className={`px-3 py-1 rounded-full ${theme==='blackgold'? 'bg-black text-gold-300 border border-gold-600':'bg-white border'}`} onClick={()=>setTheme('blackgold')}>黑金</button>
              <button className={`px-3 py-1 rounded-full ${theme==='minimal'? 'bg-gray-900 text-white':'bg-white border'}`} onClick={()=>setTheme('minimal')}>極簡</button>
            </div>
          </div>
          {step===1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">平台上限</span>
              <div className="flex gap-2">
                {[6,9,12].map(n => (
                  <button key={n} onClick={()=> setMaxSelect(n)} className={`px-3 py-1 rounded-full ${maxSelect===n? 'bg-primary-600 text-white':'bg-white border'}`}>{n}</button>
                ))}
                <input type="number" min={1} max={12} value={maxSelect} onChange={(e)=> setMaxSelect(Number(e.target.value)||9)} className="w-16 input"/>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" role="list" aria-label="平台清單">
            {catalog.map((p) => {
              const Icon = p.icon;
              const selected = selectedPlatforms.some(sp => sp.key === p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => onPlatformClick(p)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 ${selected ? 'bg-primary-50 border-primary-300' : 'bg-white'}`}
                  aria-pressed={selected}
                  aria-label={`選擇平台 ${p.label}`}
                >
                  <Icon className={`text-3xl ${selected ? 'text-primary-600' : 'text-gray-700'}`} />
                  <span className="mt-2 text-sm">{p.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && selectedPlatforms.length > 0 && (
          <div className="mt-6">
            <div className="text-sm text-gray-600 mb-2">拖曳以調整顯示順序</div>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="selectedPlatforms" direction="horizontal">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-3">
                    {selectedPlatforms.map((sp, idx) => (
                      <Draggable key={sp.key} draggableId={sp.key} index={idx}>
                        {(prov) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className="px-3 py-2 rounded-full bg-primary-100 text-primary-800">
                            {sp.label}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <div className="mt-6">
              <button onClick={proceedToLinks} className={btnPrimary}>繼續</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="space-y-4">
                  {links.map((l, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <input
                          aria-label="連結標題"
                          className={inputClass}
                          value={l.title}
                          onChange={e => updateLink(idx, 'title', e.target.value)}
                          placeholder="標題"
                        />
                        <input
                          aria-label="URL"
                          className={inputClass + ' md:col-span-2'}
                          value={l.url}
                          onChange={e => updateLink(idx, 'url', e.target.value)}
                          placeholder="https://"
                        />
                        <div className="text-xs text-gray-500 break-all">{l.shortUrl || '（尚未生成短網址）'}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <input
                          aria-label="標籤(逗號分隔)"
                          className={inputClass}
                          value={(l.tags||[]).join(', ')}
                          onChange={e => updateLink(idx, 'tags', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}
                          placeholder="標籤（例：活動, 特價）"
                        />
                        <input
                          aria-label="群組"
                          className={inputClass}
                          value={l.group || ''}
                          onChange={e => updateLink(idx, 'group', e.target.value)}
                          placeholder="群組（例：主力、次要）"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="bg-white rounded-xl p-4 border space-y-4">
                  <div>
                    <div className="font-medium mb-2">批量添加</div>
                    <textarea
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      rows={6}
                      placeholder={'每行一筆，可用「標題, https://url」或僅貼上 https://url'}
                      className="textarea"
                      aria-label="批量連結輸入區"
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={addBulkLinks} className="btn-secondary">加入</button>
                      <button onClick={generateShortLinks} className="btn-primary">生成短網址</button>
                      <button onClick={() => setStep(3)} className="btn-tertiary">下一步：模板</button>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">批量標籤 / 群組</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input aria-label="批量標籤" id="bulkTags" className="input" placeholder="逗號分隔（例：活動, 合作）" onChange={(e)=>{ const tags = e.target.value.split(',').map(s=>s.trim()).filter(Boolean); setLinks(prev => prev.map(l => ({ ...l, tags }))); }} />
                      <input aria-label="批量群組" id="bulkGroup" className="input" placeholder="群組名稱（例：主力）" onChange={(e)=>{ const group = e.target.value; setLinks(prev => prev.map(l => ({ ...l, group }))); }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TEMPLATE_LIBRARY.map(tpl => (
                  <TemplateCard key={tpl.key} tpl={tpl} />
                ))}
              </div>
              <div className="mt-6 bg-white rounded-xl p-4 border">
                <div className="font-medium mb-2">模板版本管理</div>
                <div className="flex gap-2">
                  <input className="input flex-1" value={versionName} onChange={e=>setVersionName(e.target.value)} placeholder="版本名稱（例：商務版 v1）" />
                  <button className="btn-secondary" onClick={()=>{ const name = versionName?.trim() || `版本 ${versions.length + 1}`; const v = { id: Date.now(), name, template: selectedTemplate, createdAt: Date.now() }; setVersions(prev => [...prev, v]); setVersionName(''); toast.success('已保存模板版本'); }}>保存</button>
                </div>
                <div className="mt-3 space-y-2">
                  {versions.map(v=> (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <div>{v.name}</div>
                      <div className="flex gap-2">
                        <button className="btn-tertiary" onClick={()=> setSelectedTemplate(v.template)}>套用</button>
                        <button className="btn-tertiary" onClick={()=> setVersions(prev => prev.filter(x=>x.id!==v.id))}>刪除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button className="btn-primary" onClick={publishProfile} aria-label="一鍵發布">一鍵發布並寫入 NFC</button>
                {previewUrl && (
                  <Link to={previewUrl} target="_blank" className={btnSecondary} aria-label="檢視分享連結">檢視分享連結</Link>
                )}
              </div>
            </div>
            <div>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border">
                  <div className="font-medium mb-2">雙向即時預覽</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      ref={phoneRef}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width - 0.5;
                        const y = (e.clientY - rect.top) / rect.height - 0.5;
                        e.currentTarget.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${y * -8}deg)`;
                      }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                      className="aspect-[9/16] rounded-xl border bg-gradient-to-br from-white to-gray-50 overflow-hidden transition-transform" aria-label="行動裝置預覽"
                    >
                      <div className="p-3 text-sm text-gray-700">Phone Preview</div>
                      <div className="p-3 space-y-2">
                        {links.slice(0,6).map((l, i) => (
                          <div key={i} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm truncate" title={l.title}>{l.title}</div>
                        ))}
                      </div>
                    </div>
                    <div
                      ref={desktopRef}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width - 0.5;
                        const y = (e.clientY - rect.top) / rect.height - 0.5;
                        e.currentTarget.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${y * -6}deg)`;
                      }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
                      className="aspect-[16/9] rounded-xl border bg-gradient-to-br from-white to-gray-50 overflow-hidden transition-transform" aria-label="桌面裝置預覽"
                    >
                      <div className="p-3 text-sm text-gray-700">Desktop Preview</div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {links.slice(0,8).map((l, i) => (
                          <div key={i} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm truncate" title={l.title}>{l.title}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border">
                  <div className="font-medium mb-2">短網址儀表板</div>
                  <div className="flex gap-2 mb-3">
                    <button className="btn-secondary" onClick={async ()=>{ const map = {}; for (const l of links) { if (l.code) { try { const r = await shortener.getStats(l.code); map[l.code] = { clicks: r?.clicks || 0, url: l.shortUrl }; } catch (e) { map[l.code] = { clicks: 0, url: l.shortUrl }; } } } setStatsMap(map); toast.info('已刷新統計'); }}>刷新統計</button>
                  </div>
                  <div className="space-y-2">
                    {links.filter(l=>l.shortUrl).map((l,i)=> (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="truncate max-w-[60%]">{l.shortUrl}</div>
                        <div className="text-gray-600">Clicks: {statsMap[l.code]?.clicks ?? '-'}</div>
                        <button className="btn-tertiary" onClick={()=>navigator.clipboard.writeText(l.shortUrl)}>複製</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border">
                  <div className="font-medium mb-2">可用性與提示</div>
                  <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                    <li>符合鍵盤可操作性與焦點顯示（WCAG 2.1 AA）</li>
                    <li>支援觸控手勢與拖曳排序</li>
                    <li>裝置自動偵測並最佳化預覽比例</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardStudio;