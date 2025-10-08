import React from 'react';
import { motion } from 'framer-motion';
import SparkleLayer from './SparkleLayer';
import '../styles/premium-card.css';
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
  const [glow, setGlow] = React.useState(null);

  // 動畫與版面常數（確保一致角度與速度）
  const HEADER_HEIGHT = 72; // 標題區固定高度，確保折疊時標題可見
  const EXPANDED_BODY = 240; // 展開內容高度（可微調）
  const FOLD_ANGLE = -18; // 一致的翻頁折疊角度（同一方向）
  const DURATION = 0.35; // 一致的動畫速度
  const EASING = [0.22, 1, 0.36, 1]; // 自然平滑的緩動函數（ease-out）

  // 疊堆配置：同向聚集，保持高級質感
  const STACK_OVERLAP = 56; // 疊堆重疊距離（越大重疊越明顯）
  const STACK_ROTATE = -2; // 疊堆輕微傾斜角度，營造層次
  const STACK_SCALE_STEP = 0.01; // 疊堆每層縮放差異
  const isStacking = Boolean(openId);

  // 為非選中卡片建立疊堆層級索引（同向聚集）
  const stackIndexMap = React.useMemo(() => {
    if (!openId) return {};
    let rank = 0;
    const map = {};
    for (const it of items) {
      if (it.id !== openId) {
        map[it.id] = rank++;
      }
    }
    return map;
  }, [items, openId]);

  return (
    <div className="relative">
      {/* 垂直排列的橫式卡片列表（翻頁折疊 + 非選中卡片同向疊堆） */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 12px 84px', position: 'relative' }}>
        {items.map((item) => {
          const isActive = openId === item.id;
          const isCollapsed = openId && openId !== item.id;
          const sIndex = isCollapsed ? stackIndexMap[item.id] ?? 0 : 0;
          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={{
                height: isActive ? HEADER_HEIGHT + EXPANDED_BODY : HEADER_HEIGHT,
                opacity: 1,
                // 疊堆時，非選中卡片以同向方式聚集並重疊
                y: isCollapsed ? -sIndex * (STACK_OVERLAP - 12) : 0,
                scale: isCollapsed ? 1 - sIndex * STACK_SCALE_STEP : 1,
                rotate: isCollapsed ? STACK_ROTATE : 0,
                marginBottom: isCollapsed ? -STACK_OVERLAP : 12,
              }}
              transition={{ duration: DURATION, ease: EASING }}
              style={{
                overflow: 'hidden',
                borderRadius: 16,
                color: '#F7F7F7',
                // 讓選中卡片置於最上層，其餘依疊堆層級遞減
                zIndex: isActive ? 100 : 90 - sIndex,
                // 使選中卡片優先排列，其餘卡片置於後面群組（同向疊堆更集中）
                order: isActive ? 0 : 1,
              }}
              className="premium-card"
              whileTap={{ scale: 0.98 }}
            >
              {/* Glow diffusion overlay */}
              {glow && glow.id === item.id && (
                <div
                  className="premium-glow"
                  style={{ ['--glow-x']: `${glow.x}%`, ['--glow-y']: `${glow.y}%` }}
                  key={glow.t}
                />
              )}
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
                onMouseDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setGlow({ id: item.id, x, y, t: Date.now() });
                }}
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
                    <div style={{ position: 'relative' }}>
                      <SparkleLayer active={isActive} intensity="medium" />
                      {item.content}
                    </div>
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