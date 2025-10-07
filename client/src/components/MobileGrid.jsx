import React, { useState } from 'react';
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

  return (
    <div className="relative">
      {/* 垂直排列的橫式卡片列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 12px 24px' }}>
        {items.map((item) => {
          const isActive = openId === item.id;
          const isCollapsed = openId && openId !== item.id;
          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={
                isCollapsed
                  ? { rotateX: -90, opacity: 0, height: 0, marginBottom: 0 }
                  : isActive
                  ? { rotateX: 0, opacity: 1, height: 320, marginBottom: 12 }
                  : { rotateX: 0, opacity: 1, height: 140, marginBottom: 12 }
              }
              transition={{ type: 'spring', stiffness: 230, damping: 26 }}
              style={{
                transformOrigin: 'top',
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
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  style={{ color: '#FFD666' }}
                >
                  ▾
                </motion.span>
              </button>

              {/* 展開內容（僅在選中卡片顯示） */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  style={{ padding: '0 16px 16px' }}
                >
                  <div className="text-gold-200 text-sm space-y-3">
                    {item.description && <p style={{ opacity: 0.85 }}>{item.description}</p>}
                    {item.content}
                  </div>
                </motion.div>
              )}
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