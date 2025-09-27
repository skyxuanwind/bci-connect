import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const CeremonyVideoManagement = ({ userRole }) => {
  // 狀態管理
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 上傳相關狀態
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    is_default: false
  });
  
  const fileInputRef = useRef(null);

  // 載入數據
  useEffect(() => {
    loadVideos();
  }, [currentPage, searchTerm]);

  // API 調用函數
  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  };

  // 載入影片列表
  const loadVideos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 8,
        search: searchTerm
      });
      
      const result = await apiCall(`/api/video-management/videos?${params}`);
      
      if (result.success) {
        setVideos(result.data.videos || []);
        setTotalPages(result.data.pagination?.total_pages || 1);
      }
    } catch (error) {
      console.error('載入影片失敗:', error);
      toast.error('載入影片失敗');
    } finally {
      setLoading(false);
    }
  };

  // 文件選擇處理
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 檢查文件類型
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm', 'video/mkv'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('請選擇有效的影片格式 (MP4, AVI, MOV, WMV, WebM, MKV)');
      return;
    }

    // 檢查文件大小 (500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('影片文件大小不能超過 500MB');
      return;
    }

    setUploadFile(file);
  };

  // 上傳影片
  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('請選擇要上傳的影片檔案！');
      return;
    }
    
    if (!uploadData.title.trim()) {
      toast.error('請輸入影片標題！');
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('video', uploadFile);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
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
            toast.success('影片上傳成功！');
            setShowUploadModal(false);
            resetUploadForm();
            loadVideos();
          } else {
            toast.error(`上傳失敗: ${result.message}`);
          }
        } else {
          toast.error('上傳失敗，請重試！');
        }
        setLoading(false);
        setUploadProgress(0);
      });
      
      xhr.addEventListener('error', () => {
        toast.error('上傳過程中發生錯誤！');
        setLoading(false);
        setUploadProgress(0);
      });
      
      const token = localStorage.getItem('token');
      xhr.open('POST', '/api/video-management/videos/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
      
    } catch (error) {
      console.error('上傳失敗:', error);
      toast.error('上傳失敗，請重試！');
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
      is_default: false
    });
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 設置默認影片
  const setDefaultVideo = async (videoId) => {
    if (userRole !== 'admin') {
      toast.error('只有管理員可以設置默認影片');
      return;
    }

    try {
      setLoading(true);
      const result = await apiCall(`/api/video-management/videos/${videoId}/set-default`, {
        method: 'POST'
      });
      
      if (result.success) {
        toast.success('預設影片設定成功');
        loadVideos();
      } else {
        toast.error(result.message || '設置失敗');
      }
    } catch (error) {
      console.error('設置預設影片失敗:', error);
      toast.error('設置預設影片失敗');
    } finally {
      setLoading(false);
    }
  };

  // 刪除影片
  const deleteVideo = async (videoId) => {
    if (userRole !== 'admin') {
      toast.error('只有管理員可以刪除影片');
      return;
    }

    if (!window.confirm('確定要刪除這個影片嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      setLoading(true);
      const result = await apiCall(`/api/video-management/videos/${videoId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('影片刪除成功');
        loadVideos();
      } else {
        toast.error(result.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除影片失敗:', error);
      toast.error('刪除影片失敗');
    } finally {
      setLoading(false);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化時長
  const formatDuration = (seconds) => {
    if (!seconds) return '未知';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">儀式影片管理</h2>
        <div className="flex items-center space-x-4">
          {userRole !== 'admin' && (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              僅限查看
            </span>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              上傳影片
            </button>
          )}
        </div>
      </div>

      {/* 搜索欄 */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="搜索影片標題..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
      </div>

      {/* 影片列表 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">暫無影片</div>
          <p className="text-gray-500">
            {userRole === 'admin' ? '點擊上方「上傳影片」按鈕開始添加影片' : '管理員尚未上傳任何影片'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map(video => (
            <div key={video.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="relative">
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                </div>
                {video.is_default && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
                    預設
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                  {formatDuration(video.duration)}
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-2 truncate">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                )}
                <div className="text-xs text-gray-500 mb-3">
                  大小: {formatFileSize(video.file_size)}
                </div>
                
                {userRole === 'admin' && (
                  <div className="flex space-x-2">
                    {!video.is_default && (
                      <button
                        onClick={() => setDefaultVideo(video.id)}
                        className="flex-1 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                      >
                        設為預設
                      </button>
                    )}
                    <button
                      onClick={() => deleteVideo(video.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一頁
          </button>
          <span className="px-4 py-2 text-gray-600">
            第 {currentPage} 頁，共 {totalPages} 頁
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一頁
          </button>
        </div>
      )}

      {/* 上傳模態框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">上傳影片</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* 文件選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">選擇影片文件</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-yellow-500 transition-colors"
                >
                  {!uploadFile ? (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">點擊選擇影片檔案</p>
                      <p className="text-xs text-gray-500">支持 MP4、MOV、AVI、MKV 格式，最大 500MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(uploadFile.size)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 上傳進度 */}
              {uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>上傳進度</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* 影片標題 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">影片標題 *</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="請輸入影片標題"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {/* 影片描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">影片描述</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="請輸入影片描述（可選）"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {/* 設為預設 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={uploadData.is_default}
                  onChange={(e) => setUploadData(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500"
                />
                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                  設為預設影片
                </label>
              </div>

              {/* 按鈕 */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={loading || !uploadFile || !uploadData.title.trim()}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '上傳中...' : '開始上傳'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {userRole !== 'admin' && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ 只有管理員可以上傳、設置和刪除影片。
          </p>
        </div>
      )}
    </div>
  );
};

export default CeremonyVideoManagement;