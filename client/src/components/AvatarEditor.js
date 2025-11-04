import React, { useRef, useState, useEffect } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

// 極簡版 AvatarEditor：僅上傳並原尺寸顯示
const AvatarEditor = ({ currentAvatar, onAvatarChange, size = 'large' }) => {
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);

  useEffect(() => {
    setPreviewUrl(currentAvatar || null);
  }, [currentAvatar]);

  const sizeClasses = {
    small: 'w-full max-w-[96px]',
    medium: 'w-full max-w-[128px]',
    large: 'w-full max-w-[256px]'
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    // 直接提供原檔給父層上傳；預覽使用本地 URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onAvatarChange && onAvatarChange(file);
  };

  const handleRemoveAvatar = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onAvatarChange && onAvatarChange(null);
  };

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-2 border-gray-300 border-dashed flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors duration-200 bg-gray-50 rounded-xl`}
          onClick={openPicker}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="頭像預覽" className="w-full h-auto object-contain rounded-lg" />
          ) : (
            <div className="text-center">
              <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-1 text-xs text-gray-500">點擊上傳</p>
            </div>
          )}
        </div>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="text-center">
        <p className="text-sm text-gray-700">支援 JPG、PNG 格式</p>
        <p className="text-xs text-gray-600">檔案大小不超過 10MB</p>
      </div>
    </div>
  );
};

export default AvatarEditor;