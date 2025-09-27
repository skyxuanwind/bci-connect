/**
 * NFC 系統協調器
 * 管理多個 NFC 系統間的衝突，確保只有一個系統在使用 NFC Gateway
 */

class NFCCoordinator {
  constructor() {
    this.activeSystem = null; // 當前活躍的 NFC 系統
    this.systems = new Map(); // 註冊的 NFC 系統
    this.gatewayUrl = process.env.REACT_APP_NFC_GATEWAY_URL || 'http://localhost:3002';
    this.pollingInterval = null;
    this.lastCardUid = null;
    this.lastScanTime = null;
    this.listeners = new Set(); // 事件監聽器
  }

  /**
   * 註冊 NFC 系統
   * @param {string} systemId - 系統 ID
   * @param {Object} config - 系統配置
   */
  registerSystem(systemId, config = {}) {
    this.systems.set(systemId, {
      id: systemId,
      priority: config.priority || 0, // 優先級，數字越大優先級越高
      onCardDetected: config.onCardDetected || (() => {}),
      onStatusChange: config.onStatusChange || (() => {}),
      active: false,
      ...config
    });
    
    console.log(`📡 NFC 系統已註冊: ${systemId}`, config);
  }

  /**
   * 取消註冊 NFC 系統
   * @param {string} systemId - 系統 ID
   */
  unregisterSystem(systemId) {
    if (this.activeSystem === systemId) {
      this.releaseControl(systemId);
    }
    this.systems.delete(systemId);
    console.log(`📡 NFC 系統已取消註冊: ${systemId}`);
  }

  /**
   * 請求 NFC 控制權
   * @param {string} systemId - 系統 ID
   * @returns {boolean} - 是否成功獲得控制權
   */
  async requestControl(systemId) {
    const system = this.systems.get(systemId);
    if (!system) {
      console.warn(`❌ 未知的 NFC 系統: ${systemId}`);
      return false;
    }

    // 檢查是否已經有活躍系統
    if (this.activeSystem && this.activeSystem !== systemId) {
      const activeSystem = this.systems.get(this.activeSystem);
      const requestingSystem = this.systems.get(systemId);
      
      // 比較優先級
      if (requestingSystem.priority <= activeSystem.priority) {
        console.log(`⚠️ NFC 控制權被拒絕: ${systemId} (優先級不足)`);
        return false;
      }
      
      // 釋放當前系統的控制權
      await this.releaseControl(this.activeSystem);
    }

    // 獲得控制權
    this.activeSystem = systemId;
    system.active = true;
    
    console.log(`✅ NFC 控制權已授予: ${systemId}`);
    
    // 啟動輪詢
    this.startPolling();
    
    // 通知系統狀態變化
    this.notifyStatusChange(systemId, true);
    
    return true;
  }

  /**
   * 釋放 NFC 控制權
   * @param {string} systemId - 系統 ID
   */
  async releaseControl(systemId) {
    if (this.activeSystem !== systemId) {
      return;
    }

    const system = this.systems.get(systemId);
    if (system) {
      system.active = false;
    }

    this.activeSystem = null;
    this.stopPolling();
    
    console.log(`🔓 NFC 控制權已釋放: ${systemId}`);
    
    // 通知系統狀態變化
    this.notifyStatusChange(systemId, false);
  }

  /**
   * 檢查系統是否有控制權
   * @param {string} systemId - 系統 ID
   * @returns {boolean}
   */
  hasControl(systemId) {
    return this.activeSystem === systemId;
  }

  /**
   * 獲取當前活躍系統
   * @returns {string|null}
   */
  getActiveSystem() {
    return this.activeSystem;
  }

  /**
   * 啟動 NFC 輪詢
   */
  startPolling() {
    if (this.pollingInterval) {
      return;
    }

    console.log('🔄 開始 NFC 輪詢...');
    
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.gatewayUrl}/api/nfc-checkin/status`);
        const data = await response.json();
        
        // 檢查是否有新的卡片檢測
        const hasNewCard = data.lastCardUid && data.lastCardUid !== this.lastCardUid;
        const hasNewScanTime = data.lastScanTime && data.lastScanTime !== this.lastScanTime;
        const isRecentScan = data.lastScanTime && 
          (new Date() - new Date(data.lastScanTime)) < 5000; // 5秒內的掃描才算有效
        
        if (data.lastCardUid && (hasNewCard || hasNewScanTime) && isRecentScan) {
          // 檢測到新的 NFC 卡片
          console.log('🆔 檢測到新的 NFC 卡片:', {
            cardUid: data.lastCardUid,
            scanTime: data.lastScanTime,
            activeSystem: this.activeSystem
          });
          
          this.lastCardUid = data.lastCardUid;
          this.lastScanTime = data.lastScanTime;
          
          // 通知活躍系統
          if (this.activeSystem) {
            const system = this.systems.get(this.activeSystem);
            if (system && system.onCardDetected) {
              system.onCardDetected(data);
            }
          }
        }
        
      } catch (error) {
        console.error('NFC 輪詢錯誤:', error);
      }
    }, 1000); // 每秒檢查一次
  }

  /**
   * 停止 NFC 輪詢
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.lastCardUid = null;
      this.lastScanTime = null;
      console.log('⏹️ NFC 輪詢已停止');
    }
  }

  /**
   * 通知系統狀態變化
   * @param {string} systemId - 系統 ID
   * @param {boolean} active - 是否活躍
   */
  notifyStatusChange(systemId, active) {
    const system = this.systems.get(systemId);
    if (system && system.onStatusChange) {
      system.onStatusChange(active);
    }
  }

  /**
   * 獲取 Gateway 狀態
   * @returns {Promise<Object>}
   */
  async getGatewayStatus() {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/nfc-checkin/status`);
      return await response.json();
    } catch (error) {
      console.error('獲取 Gateway 狀態失敗:', error);
      return null;
    }
  }

  /**
   * 啟動 NFC 讀卡器
   * @param {string} systemId - 系統 ID
   * @returns {Promise<boolean>}
   */
  async startReader(systemId) {
    if (!this.hasControl(systemId)) {
      console.warn(`❌ 系統 ${systemId} 沒有 NFC 控制權`);
      return false;
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/api/nfc-checkin/start-reader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('啟動 NFC 讀卡器失敗:', error);
      return false;
    }
  }

  /**
   * 停止 NFC 讀卡器
   * @param {string} systemId - 系統 ID
   * @returns {Promise<boolean>}
   */
  async stopReader(systemId) {
    if (!this.hasControl(systemId)) {
      console.warn(`❌ 系統 ${systemId} 沒有 NFC 控制權`);
      return false;
    }

    try {
      const response = await fetch(`${this.gatewayUrl}/api/nfc-checkin/stop-reader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('停止 NFC 讀卡器失敗:', error);
      return false;
    }
  }
}

// 創建全局單例
const nfcCoordinator = new NFCCoordinator();

export default nfcCoordinator;