import React, { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const AvatarUpload = ({ currentAvatar, onAvatarChange, size = 'large' }) => {
  const [preview, setPreview] = useState(currentAvatar);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 檢查文件類型
    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片文件');
      return;
    }

    // 檢查文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('圖片大小不能超過 5MB');
      return;
    }

    // 創建預覽
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // 通知父組件
    if (onAvatarChange) {
      onAvatarChange(file);
    }
  };

  const handleRemoveAvatar = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onAvatarChange) {
      onAvatarChange(null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} rounded-full border-2 border-gray-300 border-dashed flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors duration-200 overflow-hidden bg-gray-50`}
          onClick={handleClick}
        >
          {preview ? (
            <img
              src={preview}
              alt="頭像預覽"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="text-center">
              <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-1 text-xs text-gray-500">點擊上傳</p>
            </div>
          )}
        </div>
        
        {preview && (
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
        <p className="text-sm text-gray-600">支援 JPG、PNG 格式</p>
        <p className="text-xs text-gray-500">檔案大小不超過 5MB</p>
      </div>
    </div>
  );
};

export default AvatarUpload;