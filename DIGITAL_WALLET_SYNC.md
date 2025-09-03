# 數位名片夾雲端同步功能

## 功能概述

數位名片夾現在支援雲端同步功能，解決了電腦端和手機端名片內容不一致的問題。用戶登入後，名片資料會自動同步到雲端，確保在不同設備上都能看到相同的名片內容。

## 主要特性

### 1. 自動雲端同步
- **登入用戶**：名片資料自動同步到雲端資料庫
- **未登入用戶**：使用本地存儲（localStorage），提示需要登入才能同步
- **混合模式**：本地存儲作為備份，雲端作為主要數據源

### 2. 跨設備一致性
- 電腦端和手機端的名片內容保持一致
- 新增、刪除、編輯名片時自動同步
- 支援離線操作，上線後自動同步

### 3. 數據安全
- 使用 JWT 認證確保數據安全
- 本地存儲作為備份，防止數據丟失
- 支援數據恢復和同步衝突處理

## 技術實現

### 後端 API 路由

#### 1. 獲取用戶名片夾
```
GET /api/digital-wallet/cards
```
- 需要認證
- 返回用戶收藏的所有名片

#### 2. 添加名片到收藏
```
POST /api/digital-wallet/cards
```
- 需要認證
- 參數：card_id, notes, tags, folder_name

#### 3. 更新名片收藏信息
```
PUT /api/digital-wallet/cards/:collectionId
```
- 需要認證
- 更新筆記、標籤、收藏狀態等

#### 4. 刪除名片收藏
```
DELETE /api/digital-wallet/cards/:collectionId
```
- 需要認證
- 從收藏夾中移除名片

#### 5. 同步本地數據到雲端
```
POST /api/digital-wallet/sync
```
- 需要認證
- 批量同步本地名片到雲端

#### 6. 獲取統計信息
```
GET /api/digital-wallet/stats
```
- 需要認證
- 返回收藏統計、標籤統計等

### 資料庫結構

#### nfc_card_collections 表
```sql
CREATE TABLE nfc_card_collections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  card_id INTEGER NOT NULL REFERENCES nfc_cards(id),
  notes TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  folder_name VARCHAR(100),
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, card_id)
);
```

### 前端實現

#### 1. 自動載入策略
```javascript
const loadSavedCards = async () => {
  // 1. 優先從雲端載入
  // 2. 雲端失敗時從本地載入
  // 3. 有登入時自動同步到雲端
};
```

#### 2. 操作同步策略
```javascript
const updateCard = async (cardId, updates) => {
  // 1. 更新雲端數據
  // 2. 更新本地數據
  // 3. 錯誤處理和回滾
};
```

#### 3. 同步狀態顯示
- 顯示本地和雲端名片數量
- 提供手動同步按鈕
- 顯示同步狀態和錯誤信息

## 使用方法

### 1. 登入用戶
1. 登入系統後，數位名片夾會自動從雲端載入數據
2. 所有操作（新增、刪除、編輯）會自動同步到雲端
3. 在不同設備上登入相同帳號，會看到相同的名片內容

### 2. 未登入用戶
1. 使用本地存儲，數據僅保存在當前設備
2. 頁面會顯示提示，建議登入以使用雲端同步
3. 登入後可以選擇同步本地數據到雲端

### 3. 同步狀態監控
1. 數位名片夾頁面顯示同步狀態組件
2. 可以查看本地和雲端的名片數量
3. 提供手動同步按鈕，用於強制同步

## 故障排除

### 1. 同步失敗
- 檢查網路連接
- 確認登入狀態
- 嘗試手動同步

### 2. 數據不一致
- 使用手動同步功能
- 檢查本地和雲端數據差異
- 必要時清除本地數據重新載入

### 3. 登入問題
- 確認 JWT Token 有效性
- 重新登入系統
- 檢查認證中間件配置

## 未來改進

1. **即時同步**：使用 WebSocket 實現即時數據同步
2. **衝突解決**：更智能的數據衝突處理機制
3. **離線支援**：更完善的離線操作和同步機制
4. **數據備份**：定期數據備份和恢復功能
5. **多設備管理**：顯示和管理已同步的設備列表

## 注意事項

1. 首次使用雲端同步時，建議先備份本地數據
2. 在網路不穩定的環境下，可能出現同步延遲
3. 大量數據同步時可能需要較長時間
4. 建議定期檢查同步狀態，確保數據一致性