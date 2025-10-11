import React from 'react';

// 黑金質感的預設頭像圖示（SVG），支援傳入 className 控制尺寸與顏色
const GoldAvatarIcon = ({ className = '' }) => (
  <svg
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#C9A13B" />
        <stop offset="50%" stopColor="#FFD56B" />
        <stop offset="100%" stopColor="#8C6B21" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#goldGrad)" stroke="#D4AF37" strokeWidth="2" />
    {/* 頭部 */}
    <circle cx="32" cy="26" r="10" fill="#0E0E0E" />
    {/* 肩頸與胸口剪影 */}
    <path d="M16 50c4-10 12-14 16-14s12 4 16 14" fill="#0E0E0E" />
  </svg>
);

export default GoldAvatarIcon;