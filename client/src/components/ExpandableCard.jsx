import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * ExpandableCard 可展開卡片
 * - 用於手機九宮格點擊後，平滑放大展開顯示詳細面板
 * - 具備背景遮罩，點擊遮罩或按下 ESC 可關閉
 * - 無障礙：role、aria-*、tabIndex 與鍵盤操作支援
 */
export default function ExpandableCard({ isOpen, title, onClose, children }) {
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