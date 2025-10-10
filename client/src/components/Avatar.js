import React from 'react';
import { UserIcon } from '@heroicons/react/24/outline';

const Avatar = ({ 
  src, 
  alt = '用戶頭像', 
  size = 'medium', 
  className = '',
  fallbackIcon,
  fallbackIconClass = ''
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const iconSizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-5 w-5',
    large: 'h-6 w-6',
    xl: 'h-8 w-8',
    '2xl': 'h-10 w-10'
  };

  const FallbackIcon = fallbackIcon || UserIcon;

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-primary-100 flex items-center justify-center ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain object-center"
          onError={(e) => {
            // 如果圖片載入失敗，隱藏圖片並顯示預設圖標
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        className={`${src ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}
        style={{ display: src ? 'none' : 'flex' }}
      >
        <FallbackIcon className={`${iconSizeClasses[size]} ${fallbackIconClass || 'text-primary-600'}`} />
      </div>
    </div>
  );
};

export default Avatar;