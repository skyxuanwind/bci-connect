import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * ExpandableCard 可展開卡片
 * - 用於手機九宮格點擊後，平滑放大展開顯示詳細面板
 * - 具備背景遮罩，點擊遮罩或按下 ESC 可關閉
 * - 無障礙：role、aria-*、tabIndex 與鍵盤操作支援
 */
export default function ExpandableCard({ isOpen, title, onClose, children }) {
  const [showStack, setShowStack] = useState(false);

  // 點開時短暫顯示「堆疊展開」動畫
  useEffect(() => {
    let timer;
    if (isOpen) {
      setShowStack(true);
      timer = setTimeout(() => setShowStack(false), 700);
    } else {
      setShowStack(false);
    }
    return () => timer && clearTimeout(timer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩：點擊可關閉 */}
          <motion.div
            role="button"
            aria-label="關閉展開面板"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') onClose(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40"
          />

          {/* 展開卡片容器 */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} 詳細面板`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="fixed inset-x-3 bottom-3 top-16 md:top-20 z-50 rounded-2xl overflow-hidden shadow-elegant-lg bg-primary-900 border border-gold-600"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold-700 bg-primary-800">
              <h3 className="text-gold-300 text-lg font-semibold">{title}</h3>
              <button
                className="px-3 py-1 rounded-md bg-gold-600 text-black hover:bg-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                onClick={onClose}
                aria-label="關閉"
              >
                關閉
              </button>
            </div>
            {/* 堆疊展開動畫層（短暫顯示） */}
            <AnimatePresence>
              {showStack && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`stack-${i}`}
                      initial={{
                        x: -18 + i * 12,
                        y: -14 + i * 10,
                        rotate: -5 + i * 3,
                        scale: 0.96 - i * 0.02,
                        opacity: 0.8,
                      }}
                      animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 28, duration: 0.6 }}
                      style={{
                        position: 'absolute',
                        left: 16,
                        right: 16,
                        top: 64,
                        bottom: 16,
                        borderRadius: 16,
                        background:
                          'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(30,30,30,0.95))',
                        border: '1px solid rgba(255,214,102,0.35)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {/* 內容淡入 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full overflow-y-auto p-4"
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}