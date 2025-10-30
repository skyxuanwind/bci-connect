import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PhotoIcon, XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const AvatarEditor = ({ currentAvatar, onAvatarChange, size = 'large' }) => {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(currentAvatar);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [backgroundType, setBackgroundType] = useState('transparent');
  const [customBackground, setCustomBackground] = useState('#ffffff');
  const [showEditor, setShowEditor] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  // 背景選項
  const backgroundOptions = [
    { type: 'transparent', label: '透明背景', preview: 'bg-gray-100 bg-opacity-50' },
    { type: 'white', label: '白色背景', preview: 'bg-white' },
    { type: 'gradient1', label: '漸層1', preview: 'bg-gradient-to-br from-blue-400 to-purple-600' },
    { type: 'gradient2', label: '漸層2', preview: 'bg-gradient-to-br from-pink-400 to-red-600' },
    { type: 'gradient3', label: '漸層3', preview: 'bg-gradient-to-br from-green-400 to-blue-600' },
    { type: 'custom', label: '自定義顏色', preview: 'bg-gray-300' }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 檢查文件類型
    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片文件');
      return;
    }

    // 檢查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('圖片大小不能超過 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target.result);
      setShowEditor(true);
      processImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // 簡化的去背處理（實際應用中可以整合更專業的去背API）
  const processImage = useCallback(async (imageData) => {
    setIsProcessing(true);
    try {
      // 這裡可以整合第三方去背API，如 remove.bg
      // 目前先使用原圖作為示例
      setProcessedImage(imageData);
      toast.success('圖片處理完成');
    } catch (error) {
      console.error('圖片處理失敗:', error);
      toast.error('圖片處理失敗');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 應用縮放和背景
  const applyTransformations = useCallback(() => {
    if (!processedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 設置畫布大小
      canvas.width = 300;
      canvas.height = 300;

      // 清除畫布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 繪製背景
      if (backgroundType !== 'transparent') {
        if (backgroundType === 'white') {
          ctx.fillStyle = '#ffffff';
        } else if (backgroundType === 'custom') {
          ctx.fillStyle = customBackground;
        } else if (backgroundType.startsWith('gradient')) {
          // 創建漸層背景
          let gradient;
          if (backgroundType === 'gradient1') {
            gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#60a5fa');
            gradient.addColorStop(1, '#a855f7');
          } else if (backgroundType === 'gradient2') {
            gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#f472b6');
            gradient.addColorStop(1, '#ef4444');
          } else if (backgroundType === 'gradient3') {
            gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#4ade80');
            gradient.addColorStop(1, '#2563eb');
          }
          ctx.fillStyle = gradient;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 計算縮放後的尺寸和位置
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;

      // 繪製圖片
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // 轉換為 blob 並通知父組件
      canvas.toBlob((blob) => {
        if (blob && onAvatarChange) {
          onAvatarChange(blob);
        }
      }, 'image/png');
    };

    img.src = processedImage;
  }, [processedImage, scale, backgroundType, customBackground, onAvatarChange]);

  useEffect(() => {
    if (processedImage && showEditor) {
      applyTransformations();
    }
  }, [processedImage, scale, backgroundType, customBackground, showEditor, applyTransformations]);

  const handleRemoveAvatar = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setShowEditor(false);
    setScale(1);
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

  const handleConfirm = () => {
    setShowEditor(false);
    toast.success('頭像設置完成');
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 頭像預覽 */}
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} border-2 border-gray-300 border-dashed flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors duration-200 overflow-hidden bg-gray-50`}
          onClick={handleClick}
          style={{ borderRadius: '12px' }}
        >
          {processedImage ? (
            <img
              src={processedImage}
              alt="頭像預覽"
              className="w-full h-full object-cover"
              style={{ borderRadius: '10px' }}
            />
          ) : (
            <div className="text-center">
              <PhotoIcon className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-1 text-xs text-gray-500">點擊上傳</p>
            </div>
          )}
        </div>
        
        {processedImage && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 編輯器 */}
      {showEditor && originalImage && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-4 border">
          <h3 className="text-lg font-semibold mb-4">頭像編輯</h3>
          
          {/* 隱藏的畫布用於處理 */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* 縮放控制 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              縮放大小: {Math.round(scale * 100)}%
            </label>
            <div className="flex items-center space-x-2">
              <ArrowsPointingInIcon className="h-4 w-4 text-gray-400" />
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1"
              />
              <ArrowsPointingOutIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* 背景選擇 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              背景樣式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {backgroundOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setBackgroundType(option.type)}
                  className={`p-2 rounded-lg border text-xs ${
                    backgroundType === option.type
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-full h-8 rounded mb-1 ${option.preview}`}></div>
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* 自定義顏色選擇器 */}
            {backgroundType === 'custom' && (
              <div className="mt-2">
                <input
                  type="color"
                  value={customBackground}
                  onChange={(e) => setCustomBackground(e.target.value)}
                  className="w-full h-8 rounded border border-gray-300"
                />
              </div>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="flex space-x-2">
            <button
              onClick={() => setShowEditor(false)}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              disabled={isProcessing}
            >
              {isProcessing ? '處理中...' : '確認'}
            </button>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="text-center">
        <p className="text-sm text-gray-600">支援 JPG、PNG 格式</p>
        <p className="text-xs text-gray-500">檔案大小不超過 10MB</p>
        <p className="text-xs text-gray-500">支援去背、縮放和背景自定義</p>
      </div>
    </div>
  );
};

export default AvatarEditor;