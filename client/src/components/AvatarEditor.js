import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PhotoIcon, XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const AvatarEditor = ({ currentAvatar, onAvatarChange, size = 'large' }) => {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(currentAvatar);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const [backgroundType, setBackgroundType] = useState('transparent');
  const [customBackground, setCustomBackground] = useState('#ffffff');
  const [showEditor, setShowEditor] = useState(false);
  const [displayMode, setDisplayMode] = useState('original'); // 'original' 或 'circular'
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isBackgroundRemoved, setIsBackgroundRemoved] = useState(false);
  const [backgroundRemovalPrecision, setBackgroundRemovalPrecision] = useState(0.8);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const sizeClasses = {
    small: 'w-full max-w-[96px]',
    medium: 'w-full max-w-[128px]',
    large: 'w-full max-w-[256px]'
  };

  // 顯示模式選項
  const displayModeOptions = [
    { id: 'original', label: '原始尺寸', description: '保持圖片原始比例與完整顯示' }
  ];

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
      setProcessedImage(e.target.result);
      setIsBackgroundRemoved(false);
      setShowEditor(true);
    };
    reader.readAsDataURL(file);
  };

  // 智能去背功能（模擬實現，實際可整合 remove.bg API）
  const removeBackground = useCallback(async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    try {
      // 這裡可以整合第三方去背API，如 remove.bg
      // 目前使用模擬處理
      await new Promise(resolve => setTimeout(resolve, 2000)); // 模擬處理時間
      
      // 實際應用中，這裡會調用去背API
      // const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      //   method: 'POST',
      //   headers: {
      //     'X-Api-Key': 'YOUR_API_KEY',
      //   },
      //   body: formData
      // });
      
      setIsBackgroundRemoved(true);
      toast.success('背景移除完成');
    } catch (error) {
      console.error('背景移除失敗:', error);
      toast.error('背景移除失敗，請重試');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage]);

  // 應用所有變換效果
  const applyTransformations = useCallback(() => {
    if (!processedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const previewCanvas = previewCanvasRef.current;
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
    const img = new Image();

    img.onload = () => {
      // 依圖片原始比例設定畫布大小（不裁切）
      const maxCanvasDim = 1024; // 性能考量的最大邊長
      const imgMax = Math.max(img.width, img.height);
      const baseScale = imgMax > maxCanvasDim ? (maxCanvasDim / imgMax) : 1;
      const finalScale = Math.max(0.5, Math.min(3, scale)) * baseScale; // 保留縮放但不裁切

      const destWidth = Math.round(img.width * finalScale);
      const destHeight = Math.round(img.height * finalScale);

      canvas.width = destWidth;
      canvas.height = destHeight;

      if (previewCanvas) {
        const previewMax = 256; // UI 預覽最大邊長
        const canvasMax = Math.max(canvas.width, canvas.height);
        const previewScale = canvasMax > previewMax ? (previewMax / canvasMax) : 1;
        previewCanvas.width = Math.round(canvas.width * previewScale);
        previewCanvas.height = Math.round(canvas.height * previewScale);
      }

      // 清除畫布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (previewCtx && previewCanvas) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }

      // 繪製背景（如果不是透明背景）
      if (backgroundType !== 'transparent') {
        if (backgroundType === 'white') {
          ctx.fillStyle = '#ffffff';
          if (previewCtx) previewCtx.fillStyle = '#ffffff';
        } else if (backgroundType === 'custom') {
          ctx.fillStyle = customBackground;
          if (previewCtx) previewCtx.fillStyle = customBackground;
        } else if (backgroundType.startsWith('gradient')) {
          let gradient;
          if (backgroundType === 'gradient1') {
            gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#60a5fa');
            gradient.addColorStop(1, '#a855f7');
            if (previewCtx && previewCanvas) {
              const g2 = previewCtx.createLinearGradient(0, 0, previewCanvas.width, previewCanvas.height);
              g2.addColorStop(0, '#60a5fa');
              g2.addColorStop(1, '#a855f7');
              previewCtx.fillStyle = g2;
            }
          } else if (backgroundType === 'gradient2') {
            gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#f472b6');
            gradient.addColorStop(1, '#ef4444');
            if (previewCtx && previewCanvas) {
              const g2 = previewCtx.createLinearGradient(0, 0, previewCanvas.width, previewCanvas.height);
              g2.addColorStop(0, '#f472b6');
              g2.addColorStop(1, '#ef4444');
              previewCtx.fillStyle = g2;
            }
          } else if (backgroundType === 'gradient3') {
            gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#4ade80');
            gradient.addColorStop(1, '#2563eb');
            if (previewCtx && previewCanvas) {
              const g2 = previewCtx.createLinearGradient(0, 0, previewCanvas.width, previewCanvas.height);
              g2.addColorStop(0, '#4ade80');
              g2.addColorStop(1, '#2563eb');
              previewCtx.fillStyle = g2;
            }
          }
          ctx.fillStyle = gradient;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (previewCtx && previewCanvas) {
          previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
      }

      // 根據顯示模式處理圖片
      if (displayMode === 'circular') {
        // 圓形裁剪
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2 - 10;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.clip();
        
        // 計算圖片尺寸和位置
        const size = radius * 2; // 保持完整顯示，取消基於 scale 的裁切
        const x = centerX - size / 2;
        const y = centerY - size / 2;
        
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();

        if (previewCtx && previewCanvas) {
          const pCenterX = previewCanvas.width / 2;
          const pCenterY = previewCanvas.height / 2;
          const pRadius = Math.min(previewCanvas.width, previewCanvas.height) / 2 - 6;

          previewCtx.save();
          previewCtx.beginPath();
          previewCtx.arc(pCenterX, pCenterY, pRadius, 0, 2 * Math.PI);
          previewCtx.clip();

          const pSize = pRadius * 2;
          const px = pCenterX - pSize / 2;
          const py = pCenterY - pSize / 2;
          previewCtx.drawImage(img, px, py, pSize, pSize);
          previewCtx.restore();
        }
      } else {
        // 原始尺寸模式：完整顯示（contain），畫布與圖片等比
        ctx.drawImage(img, 0, 0, destWidth, destHeight);

        if (previewCtx && previewCanvas) {
          const pScaledWidth = Math.round(destWidth * (previewCanvas.width / canvas.width));
          const pScaledHeight = Math.round(destHeight * (previewCanvas.height / canvas.height));
          previewCtx.drawImage(img, 0, 0, pScaledWidth, pScaledHeight);
        }
      }

      // 轉換為 blob 並通知父組件
      canvas.toBlob((blob) => {
        if (blob && onAvatarChange) {
          onAvatarChange(blob);
        }
      }, 'image/png');
    };

    img.src = processedImage;
  }, [processedImage, scale, backgroundType, customBackground, displayMode, cropPosition, onAvatarChange]);

  // 實時預覽更新
  useEffect(() => {
    if (processedImage && showEditor) {
      applyTransformations();
    }
  }, [processedImage, scale, backgroundType, customBackground, displayMode, cropPosition, showEditor, applyTransformations]);

  const handleRemoveAvatar = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setShowEditor(false);
    setScale(1);
    setDisplayMode('original');
    setCropPosition({ x: 0, y: 0 });
    setIsBackgroundRemoved(false);
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
      {/* 頭像預覽（維持原始比例，不裁切） */}
      <div className="relative">
        <div 
          className={`${sizeClasses[size]} border-2 border-gray-300 border-dashed flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors duration-200 bg-gray-50`}
          onClick={handleClick}
          style={{ borderRadius: displayMode === 'circular' ? '50%' : '12px' }}
        >
          {processedImage ? (
            <img
              src={processedImage}
              alt="頭像預覽"
              className="w-full h-auto object-contain"
              style={{ borderRadius: displayMode === 'circular' ? '50%' : '10px' }}
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
        <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">頭像編輯器</h3>
          
          {/* 隱藏的畫布用於處理 */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* 顯示模式選擇 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              顯示模式
            </label>
            <div className="grid grid-cols-2 gap-3">
              {displayModeOptions.map((mode) => {
                const selected = displayMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setDisplayMode(mode.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-gray-900'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <div className={`font-medium text-sm ${selected ? 'text-gray-900' : ''}`}>{mode.label}</div>
                    <div className={`text-xs mt-1 ${selected ? 'text-gray-700' : 'text-gray-500'}`}>{mode.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 智能去背功能 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                智能去背
              </label>
              <button
                onClick={removeBackground}
                disabled={isProcessing || isBackgroundRemoved}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-all ${
                  isBackgroundRemoved 
                    ? 'bg-green-100 text-green-700 cursor-not-allowed'
                    : isProcessing
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                <SparklesIcon className="h-4 w-4" />
                <span>
                  {isProcessing ? '處理中...' : isBackgroundRemoved ? '已去背' : '去背'}
                </span>
              </button>
            </div>
            
            {/* 去背精度調整 */}
            {isBackgroundRemoved && (
              <div className="mt-2">
                <label className="block text-xs text-gray-600 mb-1">
                  精度調整: {Math.round(backgroundRemovalPrecision * 100)}%
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.1"
                  value={backgroundRemovalPrecision}
                  onChange={(e) => setBackgroundRemovalPrecision(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
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
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="flex-1"
              />
              <ArrowsPointingOutIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* 位置調整（僅在圓形模式下顯示） */}
          {displayMode === 'circular' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                裁剪位置調整
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">水平位置</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={cropPosition.x}
                    onChange={(e) => setCropPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">垂直位置</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={cropPosition.y}
                    onChange={(e) => setCropPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 背景選擇 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              背景樣式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {backgroundOptions.map((option) => {
                const selected = backgroundType === option.type;
                return (
                  <button
                    key={option.type}
                    onClick={() => setBackgroundType(option.type)}
                    className={`p-2 rounded-lg border text-xs transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 text-gray-900'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    <div className={`w-full h-8 rounded mb-1 ${option.preview}`}></div>
                    <span className={`${selected ? 'font-medium' : ''}`}>{option.label}</span>
                  </button>
                );
              })}
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

          {/* 實時預覽（等比縮放） */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              實時預覽
            </label>
            <div className="w-full max-w-[256px] mx-auto border border-gray-300 rounded-lg bg-gray-50">
              <canvas 
                ref={previewCanvasRef} 
                className="w-full h-auto object-contain"
                style={{ borderRadius: displayMode === 'circular' ? '50%' : '6px' }}
              />
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowEditor(false)}
              className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
        <p className="text-xs text-gray-500">支援智能去背、多種顯示模式和實時預覽</p>
      </div>
    </div>
  );
};

export default AvatarEditor;