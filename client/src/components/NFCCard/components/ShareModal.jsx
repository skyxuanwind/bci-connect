import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import { FaLine } from 'react-icons/fa';

const ShareModal = React.memo(({ show, onClose, cardData, trackEvent }) => {
  if (!show) return null;

  const shareUrl = window.location.href;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    trackEvent('share', { method: 'copy' });
    onClose();
  };

  const shareOnLine = () => {
    const text = `查看 ${cardData.user_name} 的數位名片：${shareUrl}`;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    trackEvent('share', { method: 'line' });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 rounded-2xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">分享名片</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <button onClick={copyLink} className="w-full flex items-center space-x-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <LinkIcon className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">複製連結</span>
            </button>
            <button onClick={shareOnLine} className="w-full flex items-center space-x-3 p-4 bg-green-500 hover:bg-green-600 rounded-lg transition-colors">
              <FaLine className="w-5 h-5 text-white" />
              <span className="font-medium text-white">使用 LINE 分享</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

export default ShareModal;