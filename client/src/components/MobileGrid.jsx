import React from 'react';
import { motion } from 'framer-motion';
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

  // 動畫與版面常數（確保一致角度與速度）
  const HEADER_HEIGHT = 72; // 標題區固定高度，確保折疊時標題可見
  const EXPANDED_BODY = 240; // 展開內容高度（可微調）
  const FOLD_ANGLE = -18; // 一致的翻頁折疊角度（同一方向）
  const DURATION = 0.35; // 一致的動畫速度
  const EASING = [0.22, 1, 0.36, 1]; // 自然平滑的緩動函數（ease-out）

  return (
    <div className="relative">
      {/* 垂直排列的橫式卡片列表（翻頁折疊：標題始終可見） */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 12px 84px' }}>
        {items.map((item) => {
          const isActive = openId === item.id;
          const isCollapsed = openId && openId !== item.id;
          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={{
                height: isActive ? HEADER_HEIGHT + EXPANDED_BODY : HEADER_HEIGHT,
                opacity: 1,
                marginBottom: 12,
              }}
              transition={{ duration: DURATION, ease: EASING }}
              style={{
                overflow: 'hidden',
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(15,15,15,1), rgba(25,25,25,1))',
                border: '1px solid rgba(255,214,102,0.25)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.35), inset 0 0 0.5px rgba(255,214,102,0.25)',
                color: '#F7F7F7',
              }}
            >
              {/* 卡片標頭（橫式） */}
              <button
                type="button"
                onClick={() => (isActive ? handleClose() : handleOpen(item.id))}
                className="w-full focus:outline-none focus:ring-2 focus:ring-gold-500"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  height: HEADER_HEIGHT,
                }}
                aria-label={`切換 ${item.title} 展開狀態`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {item.icon && (
                    <div
                      aria-hidden
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(255,214,102,0.12), rgba(255,214,102,0.02))',
                        border: '1px solid rgba(255,214,102,0.25)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#FFD666',
                      }}
                    >
                      {item.icon}
                    </div>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{item.title}</div>
                </div>
                <motion.span
                  initial={false}
                  animate={{ rotate: isActive ? 180 : 0 }}
                  transition={{ duration: DURATION, ease: EASING }}
                  style={{ color: '#FFD666' }}
                >
                  ▾
                </motion.span>
              </button>

              {/* 內容區：翻頁折疊效果（同一方向），非選中時仍保留標題可見 */}
              <motion.div
                initial={false}
                animate={{
                  height: isActive ? EXPANDED_BODY : 0,
                  opacity: isActive ? 1 : 0,
                }}
                transition={{ duration: DURATION, ease: EASING }}
                style={{
                  transformOrigin: 'top',
                  padding: isActive ? '0 16px 16px' : '0 16px 0',
                  willChange: 'transform, height, opacity',
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ rotateX: isActive ? 0 : FOLD_ANGLE }}
                  transition={{ duration: DURATION, ease: EASING }}
                  style={{
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="text-gold-200 text-sm space-y-3">
                    {item.description && <p style={{ opacity: 0.85 }}>{item.description}</p>}
                    {item.content}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* 若仍需全屏展示，可保留 Overlay 模式 */}
      <ExpandableCard isOpen={false} title={activeItem?.title || ''} onClose={handleClose}>
        {/* 保留結構，預設不開啟 */}
      </ExpandableCard>
    </div>
  );
}