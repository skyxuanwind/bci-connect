import React from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { key: 'photographer', name: '攝影師', desc: '個人簡介 + 作品輪播', emoji: '📸' },
  { key: 'store', name: '店家', desc: '營業資訊 + 互動地圖 + 數位菜單', emoji: '🏪' },
  { key: 'business', name: '商務人士', desc: '聯絡資訊 + 經歷時間軸 + 文件下載', emoji: '👔' },
  { key: 'designer', name: '設計師', desc: '作品集展示 + 社群連結', emoji: '🎨' },
  { key: 'fitness', name: '健身教練', desc: '課程方案 + 預約聯絡', emoji: '💪' },
  { key: 'restaurant', name: '餐飲', desc: '菜單展示 + 外送平台連結', emoji: '🍜' },
  { key: 'education', name: '教育顧問', desc: '課程介紹 + 資源下載', emoji: '📚' },
  { key: 'legal', name: '律師/法律', desc: '專業簡介 + 成功案例', emoji: '⚖️' },
  { key: 'musician', name: '音樂人', desc: '音樂/影片 + 社群互動', emoji: '🎵' },
];

export default function IndustryTemplates() {
  const navigate = useNavigate();

  const pick = (key) => {
    navigate(`/nfc-card-editor?template=${encodeURIComponent(key)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold">選擇您的行業</h1>
          <p className="mt-2 opacity-80">我們會為您匹配最適合的專業模板，並提供完整範例數據</p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => pick(cat.key)}
              className="group rounded-2xl p-4 bg-white/5 hover:bg-white/10 border border-white/10 text-left transition transform hover:-translate-y-0.5 focus:outline-none focus:ring">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{cat.emoji}</div>
                <div>
                  <div className="font-semibold">{cat.name}</div>
                  <div className="text-xs opacity-80">{cat.desc}</div>
                </div>
              </div>
              <div className="mt-3 text-xs opacity-70">含範例：可拖拽調整模塊順序、即時替換多媒體、支援自定義增刪區塊</div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">
            <span>✨ 高質感視覺設計 · 多頁面切換 · WYSIWYG 編輯器</span>
          </div>
        </div>
      </div>
    </div>
  );
}