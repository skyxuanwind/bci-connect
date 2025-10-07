import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExpandableCard from './ExpandableCard';

/**
 * MobileGrid 手機九宮格
 * - 3x3 網格，主視覺功能入口
 * - 點擊格子打開 ExpandableCard 展示詳細內容
 * - 無障礙：button、aria-label、tabIndex 與鍵盤操作
 */
export default function MobileGrid({ items, openId, setOpenId }) {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const [tilts, setTilts] = useState([]);
  const [glows, setGlows] = useState([]);

  const handleOpen = (id) => setOpenId(id);
  const handleClose = () => setOpenId(null);
  const activeItem = items.find((i) => i.id === openId);

  const tiltMax = 8; // 最大傾斜角度（度）

  const updateTilts = () => {
    const viewportCenterX = window.innerWidth / 2;
    const nextTilts = cardRefs.current.map((el) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const ratio = (centerX - viewportCenterX) / window.innerWidth; // [-0.5, 0.5]
      const angle = Math.max(-1, Math.min(1, ratio)) * tiltMax;
      return angle;
    });
    setTilts(nextTilts);
  };

  useEffect(() => {
    const handler = () => updateTilts();
    handler();
    const container = containerRef.current;
    if (container) container.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      if (container) container.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  const onPointerMove = (e) => {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setGlows((prev) => {
      const next = [...prev, { id, x, y }];
      if (next.length > 14) next.shift();
      return next;
    });
  };

  return (
    <div className="relative">
      {/* 橫向九卡互動輪播 */}
      <div
        ref={containerRef}
        onPointerMove={onPointerMove}
        className="no-scrollbar"
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          position: 'relative',
          padding: '16px 12px',
          display: 'flex',
          gap: 16,
        }}
      >
        {/* 光暈軌跡層 */}
        <div
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
        >
          <AnimatePresence>
            {glows.map((g) => (
              <motion.span
                key={g.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 0.35, scale: 1 }}
                exit={{ opacity: 0, scale: 1.4 }}
                transition={{ type: 'spring', stiffness: 180, damping: 30, duration: 0.6 }}
                style={{
                  position: 'absolute',
                  left: g.x - 60,
                  top: g.y - 60,
                  width: 120,
                  height: 120,
                  borderRadius: 9999,
                  background:
                    'radial-gradient(closest-side, rgba(255,214,102,0.35), rgba(255,214,102,0.15), rgba(0,0,0,0))',
                  filter: 'blur(10px)',
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* 橫向卡片列表 */}
        <div style={{ display: 'flex', gap: 16 }}>
          {items.map((item, idx) => (
            <motion.button
              key={item.id}
              ref={(el) => (cardRefs.current[idx] = el)}
              type="button"
              whileHover={{ y: -4 }}
              onClick={() => handleOpen(item.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpen(item.id); }}
              aria-label={`開啟 ${item.title} 詳細面板`}
              className="focus:outline-none focus:ring-2 focus:ring-gold-500"
              style={{
                scrollSnapAlign: 'center',
                width: 260,
                minWidth: 260,
                height: 160,
                borderRadius: 16,
                background:
                  'linear-gradient(135deg, rgba(15,15,15,1), rgba(25,25,25,1))',
                border: '1px solid rgba(255,214,102,0.25)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.35), inset 0 0 0.5px rgba(255,214,102,0.25)',
                color: '#F7F7F7',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                transformStyle: 'preserve-3d',
                transform: `perspective(700px) rotateY(${tilts[idx] || 0}deg)`,
                transition: 'transform 300ms ease, box-shadow 300ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {item.icon && (
                  <div
                    aria-hidden
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background:
                        'linear-gradient(135deg, rgba(255,214,102,0.12), rgba(255,214,102,0.02))',
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
              <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
                {item.description || item.subtitle || ''}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* 展開卡片：顯示選定項目的詳細內容 */}
      <ExpandableCard isOpen={!!openId} title={activeItem?.title || ''} onClose={handleClose}>
        {activeItem && (
          <div className="space-y-3 text-gold-200">
            {activeItem.content}
          </div>
        )}
      </ExpandableCard>
    </div>
  );
}