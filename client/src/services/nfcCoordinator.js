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
    this.isPaused = false; // 暫停狀態
    // 調整最近掃描有效時間窗（預設 60 秒，可由環境變數覆寫）
    this.recentWindowMs = Number(process.env.REACT_APP_NFC_RECENT_WINDOW_MS) || 60000;
    // 啟動後的短暫抑制時間點（毫秒時間戳）。在此之前不派發事件，用於避免立即吃到舊掃描。
    this.suppressUntil = 0;
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
    this.isPaused = false;
    this.suppressUntil = 0;

    // 先嘗試同步啟動基線，避免第一輪就把舊的最近掃描當成新事件
    (async () => {
      try {
        const status = await this.getGatewayStatus();
        if (status) {
          this.lastCardUid = status.lastCardUid || null;
          this.lastScanTime = status.lastScanTime || null;
          console.log('🧭 輪詢啟動基線已同步', {
            baselineLastCardUid: this.lastCardUid,
            baselineLastScanTime: this.lastScanTime,
            activeSystem: this.activeSystem
          });
        } else {
          // 若無法取得狀態，設置短暫抑制期，並在抑制期內僅同步狀態不派發
          this.suppressUntil = Date.now() + 1500;
          console.warn('⚠️ 無法取得 Gateway 狀態，將短暫抑制派發以避免誤觸發');
        }
      } catch (e) {
        this.suppressUntil = Date.now() + 1500;
        console.warn('⚠️ 同步啟動基線失敗，將短暫抑制派發以避免誤觸發:', e);
      }
    })();
    
    this.pollingInterval = setInterval(async () => {
      // 如果暫停，跳過此次輪詢
      if (this.isPaused) {
        return;
      }
      
      try {
        const response = await fetch(`${this.gatewayUrl}/api/nfc-checkin/status`);
        const data = await response.json();

        // 在抑制期內：只同步內部快照，不派發事件
        if (Date.now() < this.suppressUntil) {
          this.lastCardUid = data.lastCardUid;
          this.lastScanTime = data.lastScanTime;
          console.log('⏳ 啟動冷卻期內，同步快照但不派發事件');
          return;
        }
        
        // 檢查是否有新的卡片檢測
        const hasNewCard = data.lastCardUid && data.lastCardUid !== this.lastCardUid;
        const hasNewScanTime = data.lastScanTime && data.lastScanTime !== this.lastScanTime;
        const diffMs = data.lastScanTime ? (Date.now() - new Date(data.lastScanTime).getTime()) : null;
        const isRecentScan = !!data.lastScanTime && diffMs < this.recentWindowMs; // 在有效時間窗內才算有效
        
        // 輪詢快照診斷
        console.log('🧪 NFC 輪詢快照', {
          gatewayLastCardUid: data.lastCardUid,
          gatewayLastScanTime: data.lastScanTime,
          diffMs,
          recentWindowMs: this.recentWindowMs,
          hasNewCard,
          hasNewScanTime,
          isRecentScan,
          prevLastCardUid: this.lastCardUid,
          prevLastScanTime: this.lastScanTime,
          activeSystem: this.activeSystem,
          isPaused: this.isPaused
        });
        
        if (data.lastCardUid && (hasNewCard || hasNewScanTime) && isRecentScan) {
          // 檢測到新的 NFC 卡片
          console.log('🆔 檢測到新的 NFC 卡片:', {
            cardUid: data.lastCardUid,
            scanTime: data.lastScanTime,
            activeSystem: this.activeSystem,
            isPaused: this.isPaused
          });
          
          this.lastCardUid = data.lastCardUid;
          this.lastScanTime = data.lastScanTime;
          
          // 通知活躍系統
          if (this.activeSystem) {
            const system = this.systems.get(this.activeSystem);
            if (system && system.onCardDetected) {
              console.log(`📨 派發卡片事件給系統: ${this.activeSystem}`);
              system.onCardDetected(data);
            }
          }
        } else if ((hasNewCard || hasNewScanTime) && !isRecentScan) {
          // 有新值但超出有效時間窗，提示以利除錯，並同步內部狀態避免重複視為新卡
          console.warn('⏱️ 偵測到卡片資訊變化，但因超出有效時間窗而忽略', {
            gatewayLastCardUid: data.lastCardUid,
            gatewayLastScanTime: data.lastScanTime,
            diffMs,
            recentWindowMs: this.recentWindowMs
          });
          // 將外部狀態同步到內部，避免每次輪詢都觸發 hasNewCard=true
          this.lastCardUid = data.lastCardUid;
          this.lastScanTime = data.lastScanTime;
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
      this.isPaused = false;
      this.suppressUntil = 0;
      console.log('⏹️ NFC 輪詢已停止');
    }
  }

  /**
   * 暫停 NFC 輪詢（不停止輪詢間隔，只是跳過處理）
   */
  pausePolling() {
    this.isPaused = true;
    console.log('⏸️ NFC 輪詢已暫停');
  }

  /**
   * 恢復 NFC 輪詢
   */
  resumePolling() {
    this.isPaused = false;
    console.log('▶️ NFC 輪詢已恢復');
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
      
      if (data.success) {
        // 先設定啟動時的基準快照：避免啟動後立刻因既有最近掃描而派發
        let baselineOK = false;
        try {
          const status = await this.getGatewayStatus();
          if (status) {
            this.lastCardUid = status.lastCardUid || null;
            this.lastScanTime = status.lastScanTime || null;
            baselineOK = true;
            console.log('🧭 已設定啟動基準快照（避免立即派發舊事件）', {
              baselineLastCardUid: this.lastCardUid,
              baselineLastScanTime: this.lastScanTime,
              activeSystem: this.activeSystem
            });
          }
        } catch (baselineErr) {
          console.warn('設置啟動基準快照失敗（將使用短暫抑制避免誤觸發）:', baselineErr);
        }

        if (!baselineOK) {
          // 若基準不同步，設置短暫抑制期
          this.suppressUntil = Date.now() + 1500;
        }

        // 最後再恢復輪詢（如果之前被暫停）
        this.resumePolling();
      }
      
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
      
      if (data.success) {
        // 暫停輪詢而不是完全停止
        this.pausePolling();
      }
      
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