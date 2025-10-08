import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function FloatingBackButton({ show = true }) {
  const navigate = useNavigate();
  if (!show) return null;
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(-1)}
      aria-label="返回"
      className="focus:outline-none"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1000,
        padding: '10px 14px',
        borderRadius: 12,
        background:
          'linear-gradient(135deg, rgba(30,30,30,0.9), rgba(45,45,45,0.9))',
        backdropFilter: 'blur(8px) saturate(120%)',
        WebkitBackdropFilter: 'blur(8px) saturate(120%)',
        color: '#FFD666',
        border: '1px solid rgba(255,214,102,0.28)',
        boxShadow:
          '0 10px 20px rgba(0,0,0,0.35), inset 0 0 0.5px rgba(255,214,102,0.25)',
      }}
    >
      ← 返回
    </motion.button>
  );
}