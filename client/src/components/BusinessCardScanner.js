import React, { useState, useRef } from 'react';
import './BusinessCardScanner.css';
import Cookies from 'js-cookie';

const BusinessCardScanner = ({ onScanComplete, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [previewImage, setPreviewImage] = useState(null);

  // 處理文件選擇
  const handleFileSelect = (file) => {
    if (!file) return;
    
    // 檢查文件類型
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片文件');
      return;
    }
    
    // 檢查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      setError('圖片文件不能超過10MB');
      return;
    }
    
    // 顯示預覽
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target.result);
    };
    reader.readAsDataURL(file);
    
    // 開始掃描
    scanBusinessCard(file);
  };

  // 掃描名片
  const scanBusinessCard = async (file) => {
    setIsScanning(true);
    setError('');
    setScanResult(null);
    
    try {
      const formData = new FormData();
      formData.append('cardImage', file);
      
      const token = Cookies.get('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch('/api/ocr/scan-business-card', {
        method: 'POST',
        body: formData,
        headers
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScanResult(data.data);
      } else {
        setError(data.message || '掃描失敗，請稍後再試');
      }
    } catch (error) {
      console.error('掃描錯誤:', error);
      setError('網路錯誤，請檢查連線後再試');
    } finally {
      setIsScanning(false);
    }
  };

  // 拖拽處理
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragleave') {
      setDragActive(e.type === 'dragenter');
    } else if (e.type === 'dragover') {
      setDragActive(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // 確認掃描結果
  const handleConfirm = () => {
    if (scanResult && onScanComplete) {
      onScanComplete(scanResult.extractedInfo);
    }
  };

  // 重新掃描
  const handleRescan = () => {
    setScanResult(null);
    setPreviewImage(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 手動編輯結果
  const handleEdit = (field, value) => {
    setScanResult(prev => ({
      ...prev,
      extractedInfo: {
        ...prev.extractedInfo,
        [field]: value
      }
    }));
  };

  return (
    <div className="business-card-scanner-overlay">
      <div className="business-card-scanner">
        <div className="scanner-header">
          <h3>掃描紙本名片</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {!scanResult && (
          <div className="scanner-content">
            {!previewImage ? (
              <div 
                className={`upload-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon">📷</div>
                <p>點擊上傳或拖拽名片圖片到此處</p>
                <p className="upload-hint">支援 JPG、PNG 格式，最大 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="preview-area">
                <img src={previewImage} alt="名片預覽" className="card-preview" />
                {isScanning && (
                  <div className="scanning-overlay">
                    <div className="spinner"></div>
                    <p>正在掃描識別中...</p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
          </div>
        )}

        {scanResult && (
          <div className="scan-result">
            <div className="result-header">
              <h4>掃描結果</h4>
              <div className="confidence-badge">
                信心度: {Math.round(scanResult.confidence * 100)}%
              </div>
            </div>

            <div className="extracted-info">
              <div className="info-grid">
                <div className="info-field">
                  <label>姓名</label>
                  <input
                    type="text"
                    value={scanResult.extractedInfo.name || ''}
                    onChange={(e) => handleEdit('name', e.target.value)}
                    placeholder="請輸入姓名"
                  />
                </div>
                
                <div className="info-field">
                  <label>職稱</label>
                  <input
                    type="text"
                    value={scanResult.extractedInfo.title || ''}
                    onChange={(e) => handleEdit('title', e.target.value)}
                    placeholder="請輸入職稱"
                  />
                </div>
                
                <div className="info-field">
                  <label>公司</label>
                  <input
                    type="text"
                    value={scanResult.extractedInfo.company || ''}
                    onChange={(e) => handleEdit('company', e.target.value)}
                    placeholder="請輸入公司名稱"
                  />
                </div>
                
                <div className="info-field">
                  <label>電話</label>
                  <input
                    type="text"
                    value={scanResult.extractedInfo.phone || ''}
                    onChange={(e) => handleEdit('phone', e.target.value)}
                    placeholder="請輸入電話"
                  />
                </div>

                {/* 其餘內容保持不變 */}
              </div>
            </div>

            <div className="actions">
              <button className="confirm-btn" onClick={handleConfirm}>確認加入名片夾</button>
              <button className="rescan-btn" onClick={handleRescan}>重新掃描</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessCardScanner;