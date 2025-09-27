/**
 * 影片緩存服務
 * 提供影片預加載、本地存儲和漸進式下載功能
 */

class VideoCacheService {
  constructor() {
    this.cache = new Map(); // 內存緩存
    this.downloadQueue = new Map(); // 下載隊列
    this.maxCacheSize = 500 * 1024 * 1024; // 500MB 最大緩存大小
    this.currentCacheSize = 0;
    this.preloadedVideos = new Set(); // 已預加載的影片
    
    // 初始化 IndexedDB
    this.initIndexedDB();
  }

  /**
   * 初始化 IndexedDB 用於持久化存儲
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VideoCacheDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 創建影片存儲對象庫
        if (!db.objectStoreNames.contains('videos')) {
          const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
          videoStore.createIndex('url', 'url', { unique: true });
          videoStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
        
        // 創建緩存元數據存儲
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * 預加載影片
   * @param {string} videoUrl - 影片 URL
   * @param {Object} options - 選項
   */
  async preloadVideo(videoUrl, options = {}) {
    const { chunkSize = 1024 * 1024 } = options;
    
    if (this.preloadedVideos.has(videoUrl)) {
      console.log(`影片已預加載: ${videoUrl}`);
      return this.getVideoFromCache(videoUrl);
    }

    try {
      console.log(`開始預加載影片: ${videoUrl}`);
      
      // 檢查是否已在下載隊列中
      if (this.downloadQueue.has(videoUrl)) {
        return this.downloadQueue.get(videoUrl);
      }

      // 創建下載 Promise
      const downloadPromise = this.downloadVideoWithProgress(videoUrl, chunkSize);
      this.downloadQueue.set(videoUrl, downloadPromise);

      const videoBlob = await downloadPromise;
      
      // 存儲到緩存
      await this.storeVideoInCache(videoUrl, videoBlob);
      this.preloadedVideos.add(videoUrl);
      this.downloadQueue.delete(videoUrl);
      
      console.log(`影片預加載完成: ${videoUrl}`);
      return videoBlob;
      
    } catch (error) {
      console.error(`影片預加載失敗: ${videoUrl}`, error);
      this.downloadQueue.delete(videoUrl);
      throw error;
    }
  }

  /**
   * 漸進式下載影片
   * @param {string} videoUrl - 影片 URL
   * @param {number} chunkSize - 分塊大小
   */
  async downloadVideoWithProgress(videoUrl, chunkSize = 1024 * 1024) {
    try {
      // 首先獲取影片大小
      const headResponse = await fetch(videoUrl, { method: 'HEAD' });
      const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
      
      if (contentLength === 0) {
        // 如果無法獲取大小，直接下載
        const response = await fetch(videoUrl);
        return await response.blob();
      }

      // 檢查緩存空間
      if (contentLength > this.maxCacheSize) {
        console.warn(`影片過大，無法緩存: ${videoUrl}`);
        const response = await fetch(videoUrl);
        return await response.blob();
      }

      // 確保有足夠的緩存空間
      await this.ensureCacheSpace(contentLength);

      const chunks = [];
      let downloadedBytes = 0;

      // 分塊下載
      while (downloadedBytes < contentLength) {
        const start = downloadedBytes;
        const end = Math.min(downloadedBytes + chunkSize - 1, contentLength - 1);
        
        const response = await fetch(videoUrl, {
          headers: {
            'Range': `bytes=${start}-${end}`
          }
        });

        if (!response.ok) {
          throw new Error(`下載失敗: ${response.status}`);
        }

        const chunk = await response.arrayBuffer();
        chunks.push(chunk);
        downloadedBytes += chunk.byteLength;

        // 觸發進度事件
        this.onDownloadProgress?.(downloadedBytes, contentLength, videoUrl);
      }

      // 合併所有分塊
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        mergedArray.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      return new Blob([mergedArray], { type: 'video/mp4' });

    } catch (error) {
      console.error(`漸進式下載失敗: ${videoUrl}`, error);
      // 降級到普通下載
      const response = await fetch(videoUrl);
      return await response.blob();
    }
  }

  /**
   * 從緩存獲取影片
   * @param {string} videoUrl - 影片 URL
   */
  async getVideoFromCache(videoUrl) {
    // 首先檢查內存緩存
    if (this.cache.has(videoUrl)) {
      console.log(`從內存緩存獲取影片: ${videoUrl}`);
      return this.cache.get(videoUrl);
    }

    // 檢查 IndexedDB
    try {
      const videoData = await this.getVideoFromIndexedDB(videoUrl);
      if (videoData) {
        console.log(`從 IndexedDB 獲取影片: ${videoUrl}`);
        // 更新訪問時間
        await this.updateLastAccessed(videoUrl);
        // 加載到內存緩存
        this.cache.set(videoUrl, videoData.blob);
        return videoData.blob;
      }
    } catch (error) {
      console.error(`從 IndexedDB 獲取影片失敗: ${videoUrl}`, error);
    }

    return null;
  }

  /**
   * 存儲影片到緩存
   * @param {string} videoUrl - 影片 URL
   * @param {Blob} videoBlob - 影片 Blob
   */
  async storeVideoInCache(videoUrl, videoBlob) {
    const videoSize = videoBlob.size;
    
    // 確保有足夠的緩存空間
    await this.ensureCacheSpace(videoSize);

    // 存儲到內存緩存
    this.cache.set(videoUrl, videoBlob);
    this.currentCacheSize += videoSize;

    // 存儲到 IndexedDB
    try {
      await this.storeVideoInIndexedDB(videoUrl, videoBlob);
    } catch (error) {
      console.error(`存儲影片到 IndexedDB 失敗: ${videoUrl}`, error);
    }
  }

  /**
   * 存儲影片到 IndexedDB
   * @param {string} videoUrl - 影片 URL
   * @param {Blob} videoBlob - 影片 Blob
   */
  async storeVideoInIndexedDB(videoUrl, videoBlob) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      
      const videoData = {
        id: this.generateVideoId(videoUrl),
        url: videoUrl,
        blob: videoBlob,
        size: videoBlob.size,
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      const request = store.put(videoData);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 從 IndexedDB 獲取影片
   * @param {string} videoUrl - 影片 URL
   */
  async getVideoFromIndexedDB(videoUrl) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      const index = store.index('url');
      
      const request = index.get(videoUrl);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新最後訪問時間
   * @param {string} videoUrl - 影片 URL
   */
  async updateLastAccessed(videoUrl) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const index = store.index('url');
      
      const getRequest = index.get(videoUrl);
      
      getRequest.onsuccess = () => {
        const videoData = getRequest.result;
        if (videoData) {
          videoData.lastAccessed = Date.now();
          const putRequest = store.put(videoData);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 確保有足夠的緩存空間
   * @param {number} requiredSize - 需要的空間大小
   */
  async ensureCacheSpace(requiredSize) {
    if (this.currentCacheSize + requiredSize <= this.maxCacheSize) {
      return;
    }

    console.log('緩存空間不足，開始清理舊影片...');
    
    // 獲取所有緩存的影片，按最後訪問時間排序
    const allVideos = await this.getAllCachedVideos();
    allVideos.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // 刪除最舊的影片直到有足夠空間
    for (const video of allVideos) {
      if (this.currentCacheSize + requiredSize <= this.maxCacheSize) {
        break;
      }

      await this.removeVideoFromCache(video.url);
      console.log(`已清理緩存影片: ${video.url}`);
    }
  }

  /**
   * 獲取所有緩存的影片
   */
  async getAllCachedVideos() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['videos'], 'readonly');
      const store = transaction.objectStore('videos');
      
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 從緩存中移除影片
   * @param {string} videoUrl - 影片 URL
   */
  async removeVideoFromCache(videoUrl) {
    // 從內存緩存移除
    if (this.cache.has(videoUrl)) {
      const videoBlob = this.cache.get(videoUrl);
      this.currentCacheSize -= videoBlob.size;
      this.cache.delete(videoUrl);
    }

    // 從預加載列表移除
    this.preloadedVideos.delete(videoUrl);

    // 從 IndexedDB 移除
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      const index = store.index('url');
      
      const getRequest = index.get(videoUrl);
      
      getRequest.onsuccess = () => {
        const videoData = getRequest.result;
        if (videoData) {
          const deleteRequest = store.delete(videoData.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 生成影片 ID
   * @param {string} videoUrl - 影片 URL
   */
  generateVideoId(videoUrl) {
    return btoa(videoUrl).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * 清理所有緩存
   */
  async clearAllCache() {
    // 清理內存緩存
    this.cache.clear();
    this.currentCacheSize = 0;
    this.preloadedVideos.clear();
    this.downloadQueue.clear();

    // 清理 IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['videos'], 'readwrite');
      const store = transaction.objectStore('videos');
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('所有影片緩存已清理');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 獲取緩存統計信息
   */
  async getCacheStats() {
    const allVideos = await this.getAllCachedVideos();
    const totalSize = allVideos.reduce((sum, video) => sum + video.size, 0);
    
    return {
      totalVideos: allVideos.length,
      totalSize: totalSize,
      maxSize: this.maxCacheSize,
      usagePercentage: (totalSize / this.maxCacheSize) * 100,
      memoryCache: this.cache.size,
      preloadedVideos: this.preloadedVideos.size
    };
  }

  /**
   * 設置下載進度回調
   * @param {Function} callback - 進度回調函數
   */
  setDownloadProgressCallback(callback) {
    this.onDownloadProgress = callback;
  }
}

// 創建單例實例
const videoCacheService = new VideoCacheService();

export default videoCacheService;