import React, { useState, useRef } from 'react';
import './BusinessCardScanner.css';

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
      
      const response = await fetch('/api/ocr/scan-business-card', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
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
                    placeholder="請輸入電話號碼"
                  />
                </div>
                
                <div className="info-field">
                  <label>手機</label>
                  <input
                    type="text"
                    value={scanResult.extractedInfo.mobile || ''}
                    onChange={(e) => handleEdit('mobile', e.target.value)}
                    placeholder="請輸入手機號碼"
                  />
                </div>
                
                <div className="info-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={scanResult.extractedInfo.email || ''}
                    onChange={(e) => handleEdit('email', e.target.value)}
                    placeholder="請輸入電子郵件"
                  />
                </div>
                
                <div className="info-field full-width">
                  <label>網站</label>
                  <input
                    type="url"
                    value={scanResult.extractedInfo.website || ''}
                    onChange={(e) => handleEdit('website', e.target.value)}
                    placeholder="請輸入網站網址"
                  />
                </div>
                
                <div className="info-field full-width">
                  <label>地址</label>
                  <textarea
                    value={scanResult.extractedInfo.address || ''}
                    onChange={(e) => handleEdit('address', e.target.value)}
                    placeholder="請輸入地址"
                    rows="2"
                  />
                </div>
                
                <div className="info-field full-width">
                  <label>標籤</label>
                  <input
                    type="text"
                    value={scanResult.extractedInfo.tags ? scanResult.extractedInfo.tags.join(', ') : ''}
                    onChange={(e) => handleEdit('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                    placeholder="請輸入標籤，用逗號分隔"
                  />
                </div>
              </div>
            </div>

            {scanResult.rawText && (
              <div className="raw-text">
                <h5>原始識別文字</h5>
                <textarea
                  value={scanResult.rawText}
                  readOnly
                  rows="4"
                  className="raw-text-area"
                />
              </div>
            )}

            <div className="result-actions">
              <button className="btn-secondary" onClick={handleRescan}>
                重新掃描
              </button>
              <button className="btn-primary" onClick={handleConfirm}>
                確認並保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessCardScanner;