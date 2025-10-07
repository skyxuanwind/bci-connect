import React from 'react';
import ExpandableCard from './ExpandableCard';

/**
 * MobileGrid 手機九宮格
 * - 3x3 網格，主視覺功能入口
 * - 點擊格子打開 ExpandableCard 展示詳細內容
 * - 無障礙：button、aria-label、tabIndex 與鍵盤操作
 */
export default function MobileGrid({ items, openId, setOpenId }) {
  const handleOpen = (id) => setOpenId(id);
  const handleClose = () => setOpenId(null);
  const activeItem = items.find((i) => i.id === openId);

  return (
    <div className="relative">
      {/* 3x3 九宮格 */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="group flex flex-col items-center justify-center rounded-xl h-24 bg-primary-800 border border-primary-700 hover:border-gold-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-gold-500"
            aria-label={`開啟 ${item.title} 詳細面板`}
            tabIndex={0}
            onClick={() => handleOpen(item.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(item.id); }}
          >
            <div className="text-gold-400 text-2xl mb-1">
              {item.icon}
            </div>
            <div className="text-sm text-gold-300 font-medium">
              {item.title}
            </div>
          </button>
        ))}
      </div>

      {/* 展開卡片：顯示選定項目的詳細內容 */}
      <ExpandableCard isOpen={!!openId} title={activeItem?.title || ''} onClose={handleClose}>
        {activeItem && (
          <div className="space-y-3 text-gold-200">
            {/* 節錄資料摘要，可替換成真實 API */}
            {activeItem.content}
          </div>
        )}
      </ExpandableCard>
    </div>
  );
}