import React, { useState, useEffect, useRef } from 'react';
import './VideoManagement.css';

const VideoManagement = () => {
    // 狀態管理
    const [videos, setVideos] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    
    // 上傳相關狀態
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        category_id: '',
        tags: [],
        is_default: false
    });
    
    const fileInputRef = useRef(null);
    const videoPreviewRef = useRef(null);

    // 載入數據
    useEffect(() => {
        loadVideos();
        loadCategories();
        loadTags();
    }, [currentPage, searchTerm, selectedCategory, sortBy, sortOrder]);

    // API 調用函數
    const apiCall = async (url, options = {}) => {
        try {
            const response = await fetch(`/api/video-management${url}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API調用失敗:', error);
            throw error;
        }
    };

    // 載入影片列表
    const loadVideos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: 12,
                search: searchTerm,
                category_id: selectedCategory,
                sort_by: sortBy,
                sort_order: sortOrder
            });
            
            const result = await apiCall(`/videos?${params}`);
            
            if (result.success) {
                setVideos(result.data.videos);
                setTotalPages(result.data.pagination.total_pages);
            }
        } catch (error) {
            console.error('載入影片失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    // 載入分類
    const loadCategories = async () => {
        try {
            const result = await apiCall('/categories');
            if (result.success) {
                setCategories(result.data);
            }
        } catch (error) {
            console.error('載入分類失敗:', error);
        }
    };

    // 載入標籤
    const loadTags = async () => {
        try {
            const result = await apiCall('/tags');
            if (result.success) {
                setTags(result.data);
            }
        } catch (error) {
            console.error('載入標籤失敗:', error);
        }
    };

    // 檔案選擇處理
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            // 檢查檔案類型
            const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/quicktime'];
            if (!allowedTypes.includes(file.type)) {
                alert('不支持的影片格式！請選擇 MP4、MOV、AVI 或 MKV 格式的檔案。');
                return;
            }
            
            // 檢查檔案大小 (500MB)
            if (file.size > 500 * 1024 * 1024) {
                alert('檔案大小不能超過 500MB！');
                return;
            }
            
            setUploadFile(file);
            setUploadData(prev => ({
                ...prev,
                title: prev.title || file.name.replace(/\.[^/.]+$/, "")
            }));
            
            // 預覽影片
            if (videoPreviewRef.current) {
                videoPreviewRef.current.src = URL.createObjectURL(file);
            }
        }
    };

    // 上傳影片
    const handleUpload = async () => {
        if (!uploadFile) {
            alert('請選擇要上傳的影片檔案！');
            return;
        }
        
        if (!uploadData.title.trim()) {
            alert('請輸入影片標題！');
            return;
        }
        
        setLoading(true);
        setUploadProgress(0);
        
        try {
            const formData = new FormData();
            formData.append('video', uploadFile);
            formData.append('title', uploadData.title);
            formData.append('description', uploadData.description);
            formData.append('category_id', uploadData.category_id);
            formData.append('tags', JSON.stringify(uploadData.tags));
            formData.append('is_default', uploadData.is_default);
            
            const xhr = new XMLHttpRequest();
            
            // 上傳進度監聽
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(progress);
                }
            });
            
            // 上傳完成處理
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        alert('影片上傳成功！');
                        setShowUploadModal(false);
                        resetUploadForm();
                        loadVideos();
                    } else {
                        alert(`上傳失敗: ${result.message}`);
                    }
                } else {
                    alert('上傳失敗，請重試！');
                }
                setLoading(false);
                setUploadProgress(0);
            });
            
            xhr.addEventListener('error', () => {
                alert('上傳過程中發生錯誤！');
                setLoading(false);
                setUploadProgress(0);
            });
            
            xhr.open('POST', '/api/video-management/videos/upload');
            xhr.send(formData);
            
        } catch (error) {
            console.error('上傳失敗:', error);
            alert('上傳失敗，請重試！');
            setLoading(false);
            setUploadProgress(0);
        }
    };

    // 重置上傳表單
    const resetUploadForm = () => {
        setUploadFile(null);
        setUploadData({
            title: '',
            description: '',
            category_id: '',
            tags: [],
            is_default: false
        });
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (videoPreviewRef.current) {
            videoPreviewRef.current.src = '';
        }
    };

    // 設定預設影片
    const setDefaultVideo = async (videoId) => {
        try {
            const result = await apiCall(`/videos/${videoId}/set-default`, {
                method: 'POST'
            });
            
            if (result.success) {
                alert('預設影片設定成功！');
                loadVideos();
            } else {
                alert(`設定失敗: ${result.message}`);
            }
        } catch (error) {
            console.error('設定預設影片失敗:', error);
            alert('設定失敗，請重試！');
        }
    };

    // 刪除影片
    const deleteVideo = async (videoId) => {
        if (!window.confirm('確定要刪除這個影片嗎？此操作無法撤銷！')) {
            return;
        }
        
        try {
            const result = await apiCall(`/videos/${videoId}`, {
                method: 'DELETE'
            });
            
            if (result.success) {
                alert('影片刪除成功！');
                loadVideos();
            } else {
                alert(`刪除失敗: ${result.message}`);
            }
        } catch (error) {
            console.error('刪除影片失敗:', error);
            alert('刪除失敗，請重試！');
        }
    };

    // 格式化檔案大小
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 格式化時長
    const formatDuration = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-management">
            <div className="video-management-header">
                <h1>影片管理系統</h1>
                <div className="header-actions">
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowUploadModal(true)}
                    >
                        <i className="fas fa-upload"></i>
                        上傳影片
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={() => setShowRulesModal(true)}
                    >
                        <i className="fas fa-cogs"></i>
                        播放規則
                    </button>
                </div>
            </div>

            {/* 搜索和篩選 */}
            <div className="filters-section">
                <div className="search-box">
                    <i className="fas fa-search"></i>
                    <input
                        type="text"
                        placeholder="搜索影片標題或描述..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="filter-controls">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="">所有分類</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    
                    <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortBy(field);
                            setSortOrder(order);
                        }}
                    >
                        <option value="created_at-DESC">最新上傳</option>
                        <option value="created_at-ASC">最早上傳</option>
                        <option value="title-ASC">標題 A-Z</option>
                        <option value="title-DESC">標題 Z-A</option>
                        <option value="view_count-DESC">播放次數</option>
                        <option value="duration-DESC">時長（長到短）</option>
                        <option value="duration-ASC">時長（短到長）</option>
                    </select>
                </div>
            </div>

            {/* 影片網格 */}
            <div className="videos-grid">
                {loading ? (
                    <div className="loading-spinner">
                        <i className="fas fa-spinner fa-spin"></i>
                        <p>載入中...</p>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="empty-state">
                        <i className="fas fa-video"></i>
                        <h3>暫無影片</h3>
                        <p>點擊上方「上傳影片」按鈕開始添加影片</p>
                    </div>
                ) : (
                    videos.map(video => (
                        <div key={video.id} className="video-card">
                            <div className="video-thumbnail">
                                <img 
                                    src={video.thumbnail_url || '/images/default-video-thumb.jpg'} 
                                    alt={video.title}
                                    onError={(e) => {
                                        e.target.src = '/images/default-video-thumb.jpg';
                                    }}
                                />
                                <div className="video-duration">
                                    {formatDuration(video.duration)}
                                </div>
                                {video.is_default && (
                                    <div className="default-badge">
                                        <i className="fas fa-star"></i>
                                        預設
                                    </div>
                                )}
                                <div className="video-overlay">
                                    <button 
                                        className="btn-play"
                                        onClick={() => setSelectedVideo(video)}
                                    >
                                        <i className="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="video-info">
                                <h3 className="video-title">{video.title}</h3>
                                <p className="video-description">
                                    {video.description || '無描述'}
                                </p>
                                
                                <div className="video-meta">
                                    <span className="category" style={{backgroundColor: video.category_color}}>
                                        {video.category_name || '未分類'}
                                    </span>
                                    <span className="resolution">{video.resolution}</span>
                                    <span className="file-size">{formatFileSize(video.file_size)}</span>
                                </div>
                                
                                {video.tags && (
                                    <div className="video-tags">
                                        {video.tags.split(',').map((tag, index) => (
                                            <span key={index} className="tag">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="video-stats">
                                    <span><i className="fas fa-eye"></i> {video.view_count} 次播放</span>
                                    <span><i className="fas fa-calendar"></i> {new Date(video.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            
                            <div className="video-actions">
                                {!video.is_default && (
                                    <button 
                                        className="btn btn-sm btn-outline"
                                        onClick={() => setDefaultVideo(video.id)}
                                        title="設為預設影片"
                                    >
                                        <i className="fas fa-star"></i>
                                    </button>
                                )}
                                <button 
                                    className="btn btn-sm btn-outline"
                                    onClick={() => {/* 編輯功能 */}}
                                    title="編輯影片"
                                >
                                    <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                    className="btn btn-sm btn-danger"
                                    onClick={() => deleteVideo(video.id)}
                                    title="刪除影片"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 分頁 */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button 
                        className="btn btn-outline"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        <i className="fas fa-chevron-left"></i>
                        上一頁
                    </button>
                    
                    <div className="page-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`btn ${page === currentPage ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    
                    <button 
                        className="btn btn-outline"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        下一頁
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            )}

            {/* 上傳模態框 */}
            {showUploadModal && (
                <div className="modal-overlay">
                    <div className="modal upload-modal">
                        <div className="modal-header">
                            <h2>上傳新影片</h2>
                            <button 
                                className="btn-close"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    resetUploadForm();
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="upload-section">
                                <div className="file-upload-area">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="video/*"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    
                                    {!uploadFile ? (
                                        <div 
                                            className="upload-placeholder"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <i className="fas fa-cloud-upload-alt"></i>
                                            <p>點擊選擇影片檔案</p>
                                            <small>支持 MP4、MOV、AVI、MKV 格式，最大 500MB</small>
                                        </div>
                                    ) : (
                                        <div className="file-preview">
                                            <video
                                                ref={videoPreviewRef}
                                                controls
                                                style={{ width: '100%', maxHeight: '200px' }}
                                            />
                                            <div className="file-info">
                                                <p><strong>檔案名:</strong> {uploadFile.name}</p>
                                                <p><strong>大小:</strong> {formatFileSize(uploadFile.size)}</p>
                                                <p><strong>類型:</strong> {uploadFile.type}</p>
                                            </div>
                                            <button 
                                                className="btn btn-outline btn-sm"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                重新選擇
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {uploadProgress > 0 && (
                                    <div className="upload-progress">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="form-section">
                                <div className="form-group">
                                    <label>影片標題 *</label>
                                    <input
                                        type="text"
                                        value={uploadData.title}
                                        onChange={(e) => setUploadData(prev => ({
                                            ...prev,
                                            title: e.target.value
                                        }))}
                                        placeholder="請輸入影片標題"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>影片描述</label>
                                    <textarea
                                        value={uploadData.description}
                                        onChange={(e) => setUploadData(prev => ({
                                            ...prev,
                                            description: e.target.value
                                        }))}
                                        placeholder="請輸入影片描述"
                                        rows="3"
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>分類</label>
                                        <select
                                            value={uploadData.category_id}
                                            onChange={(e) => setUploadData(prev => ({
                                                ...prev,
                                                category_id: e.target.value
                                            }))}
                                        >
                                            <option value="">選擇分類</option>
                                            {categories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={uploadData.is_default}
                                                onChange={(e) => setUploadData(prev => ({
                                                    ...prev,
                                                    is_default: e.target.checked
                                                }))}
                                            />
                                            設為預設影片
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                className="btn btn-outline"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    resetUploadForm();
                                }}
                                disabled={loading}
                            >
                                取消
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={loading || !uploadFile}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        上傳中...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-upload"></i>
                                        開始上傳
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 影片預覽模態框 */}
            {selectedVideo && (
                <div className="modal-overlay">
                    <div className="modal video-preview-modal">
                        <div className="modal-header">
                            <h2>{selectedVideo.title}</h2>
                            <button 
                                className="btn-close"
                                onClick={() => setSelectedVideo(null)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <video
                                controls
                                autoPlay
                                style={{ width: '100%', maxHeight: '70vh' }}
                                src={selectedVideo.file_url}
                            />
                            
                            <div className="video-details">
                                <p><strong>描述:</strong> {selectedVideo.description || '無描述'}</p>
                                <p><strong>分類:</strong> {selectedVideo.category_name || '未分類'}</p>
                                <p><strong>時長:</strong> {formatDuration(selectedVideo.duration)}</p>
                                <p><strong>解析度:</strong> {selectedVideo.resolution}</p>
                                <p><strong>檔案大小:</strong> {formatFileSize(selectedVideo.file_size)}</p>
                                <p><strong>播放次數:</strong> {selectedVideo.view_count}</p>
                                <p><strong>上傳時間:</strong> {new Date(selectedVideo.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoManagement;