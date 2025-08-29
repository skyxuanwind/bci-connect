# 🔍 Render API Debug 完整指南

## 概述
針對 `/api/nfc-checkin/records` 路由的 500 Internal Server Error 排查流程。

---

## 1. 📡 API 測試方法

### 使用 Postman 測試

#### 基本設定
```
Method: GET
URL: https://your-app-name.onrender.com/api/nfc-checkin/records
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json
```

#### 測試步驟
1. **獲取 JWT Token**
   ```
   POST https://your-app-name.onrender.com/api/auth/login
   Body (JSON):
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```

2. **測試 Records API**
   - 複製登入回應中的 `token`
   - 在 Authorization header 中加入 `Bearer {token}`
   - 發送 GET 請求到 records 端點

#### 測試參數
```
# 基本查詢
GET /api/nfc-checkin/records

# 帶參數查詢
GET /api/nfc-checkin/records?page=1&limit=10&cardUid=12345678

# 日期範圍查詢
GET /api/nfc-checkin/records?startDate=2025-01-01&endDate=2025-12-31
```

### 使用 curl 測試

#### 1. 獲取 Token
```bash
curl -X POST https://your-app-name.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

#### 2. 測試 API
```bash
# 基本測試
curl -X GET https://your-app-name.onrender.com/api/nfc-checkin/records \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# 詳細錯誤輸出
curl -X GET https://your-app-name.onrender.com/api/nfc-checkin/records \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

---

## 2. 🛠️ Node.js 錯誤處理改進

### 當前路由改進版本

```javascript
// routes/nfc-checkin.js
router.get('/records', authenticateToken, async (req, res) => {
  console.log('🔍 [DEBUG] Records API 被呼叫');
  console.log('🔍 [DEBUG] Query 參數:', req.query);
  console.log('🔍 [DEBUG] 用戶資訊:', req.user);
  
  try {
    const { page = 1, limit = 50, cardUid, startDate, endDate } = req.query;
    console.log('🔍 [DEBUG] 解析參數:', { page, limit, cardUid, startDate, endDate });
    
    // 檢查 MongoDB 連接狀態
    const mongoose = require('mongoose');
    console.log('🔍 [DEBUG] MongoDB 連接狀態:', mongoose.connection.readyState);
    
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ [ERROR] MongoDB 未連接');
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable',
        error: 'MongoDB not connected'
      });
    }
    
    // 建立查詢條件
    let filter = {};
    console.log('🔍 [DEBUG] 初始 filter:', filter);
    
    if (cardUid) {
      filter.cardUid = cardUid.toUpperCase();
      console.log('🔍 [DEBUG] 加入 cardUid filter:', filter.cardUid);
    }
    
    if (startDate || endDate) {
      filter.checkinTime = {};
      if (startDate) {
        filter.checkinTime.$gte = new Date(startDate);
        console.log('🔍 [DEBUG] 加入 startDate:', filter.checkinTime.$gte);
      }
      if (endDate) {
        filter.checkinTime.$lte = new Date(endDate);
        console.log('🔍 [DEBUG] 加入 endDate:', filter.checkinTime.$lte);
      }
    }
    
    console.log('🔍 [DEBUG] 最終 filter:', JSON.stringify(filter, null, 2));
    
    // 執行查詢
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('🔍 [DEBUG] Skip:', skip, 'Limit:', parseInt(limit));
    
    console.log('🔍 [DEBUG] 開始查詢 records...');
    const records = await NFCCheckin.findActive(filter)
      .sort({ checkinTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log('🔍 [DEBUG] 查詢到的 records 數量:', records.length);
    
    console.log('🔍 [DEBUG] 開始計算總數...');
    const total = await NFCCheckin.countCheckins(filter);
    console.log('🔍 [DEBUG] 總數:', total);
    
    // 格式化回應資料
    console.log('🔍 [DEBUG] 開始格式化資料...');
    const formattedRecords = records.map((record, index) => {
      console.log(`🔍 [DEBUG] 格式化第 ${index + 1} 筆記錄:`, record._id);
      return {
        id: record._id,
        cardUid: record.cardUid,
        checkinTime: record.getFormattedTime(),
        source: record.source,
        notes: record.notes,
        createdAt: record.createdAt
      };
    });
    
    console.log('✅ [SUCCESS] API 執行成功，回傳資料');
    res.json({
      success: true,
      data: formattedRecords,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ [ERROR] 查詢報到紀錄失敗:');
    console.error('❌ [ERROR] Error name:', error.name);
    console.error('❌ [ERROR] Error message:', error.message);
    console.error('❌ [ERROR] Error stack:', error.stack);
    
    // 特定錯誤類型處理
    if (error.name === 'MongooseError') {
      console.error('❌ [ERROR] Mongoose 相關錯誤');
    } else if (error.name === 'ValidationError') {
      console.error('❌ [ERROR] 資料驗證錯誤');
    } else if (error.name === 'CastError') {
      console.error('❌ [ERROR] 資料類型轉換錯誤');
    }
    
    res.status(500).json({
      success: false,
      message: '查詢報到紀錄失敗',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });
  }
});
```

### 全域錯誤處理中間件

```javascript
// server.js 中加入
app.use((error, req, res, next) => {
  console.error('🚨 [GLOBAL ERROR]:', error);
  console.error('🚨 [GLOBAL ERROR] Stack:', error.stack);
  console.error('🚨 [GLOBAL ERROR] Request URL:', req.url);
  console.error('🚨 [GLOBAL ERROR] Request Method:', req.method);
  console.error('🚨 [GLOBAL ERROR] Request Headers:', req.headers);
  
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});
```

---

## 3. 📊 Render Logs 查看方法

### 訪問 Logs
1. 登入 [Render Dashboard](https://dashboard.render.com)
2. 選擇您的服務
3. 點擊 **"Logs"** 標籤
4. 選擇時間範圍查看日誌

### 實時監控
```bash
# 使用 Render CLI (需先安裝)
npm install -g @render/cli
render login
render logs --service-id YOUR_SERVICE_ID --follow
```

### 關鍵日誌搜尋
在 Render Logs 中搜尋以下關鍵字：
- `ERROR`
- `500`
- `MongoDB`
- `NFCCheckin`
- `records`
- `查詢報到紀錄失敗`

### 日誌分析步驟
1. **查看啟動日誌**
   - 確認服務是否正常啟動
   - 檢查資料庫連接狀態

2. **查看請求日誌**
   - 搜尋 API 請求時間點
   - 查看錯誤發生的具體時間

3. **分析錯誤堆疊**
   - 找到錯誤的具體行數
   - 確認是哪個函數拋出錯誤

---

## 4. 🗄️ 資料庫連線排查

### MongoDB 連接檢查

#### 1. 環境變數檢查
在 Render Dashboard → Environment 中確認：
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

#### 2. 連接測試路由
```javascript
// 加入測試路由
router.get('/db-test', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    console.log('🔍 [DB-TEST] MongoDB 連接狀態:', mongoose.connection.readyState);
    console.log('🔍 [DB-TEST] 連接字串:', process.env.MONGODB_URI ? '已設定' : '未設定');
    
    // 測試簡單查詢
    const testCount = await NFCCheckin.countDocuments();
    console.log('🔍 [DB-TEST] 文檔總數:', testCount);
    
    res.json({
      success: true,
      connectionState: mongoose.connection.readyState,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not Set',
      documentCount: testCount,
      message: 'Database connection test successful'
    });
    
  } catch (error) {
    console.error('❌ [DB-TEST] 資料庫測試失敗:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      connectionState: mongoose.connection.readyState
    });
  }
});
```

#### 3. 連接狀態說明
```
0 = disconnected
1 = connected
2 = connecting
3 = disconnecting
```

### 常見資料庫問題

#### 1. 連接字串錯誤
```javascript
// 檢查連接字串格式
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI 環境變數未設定');
}
if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
  console.error('❌ MONGODB_URI 格式錯誤');
}
```

#### 2. 網路連接問題
```javascript
// 加入連接超時處理
const mongoOptions = {
  serverSelectionTimeoutMS: 10000, // 10 秒超時
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority'
};
```

#### 3. 認證問題
- 檢查 MongoDB Atlas 用戶權限
- 確認 IP 白名單設定 (Render 使用動態 IP)
- 建議設定 `0.0.0.0/0` 允許所有 IP

---

## 5. 🔧 完整排查流程

### Step 1: 檢查前端 API 配置
**常見問題**: 前端 API URL 配置錯誤導致 500 錯誤

```bash
# 1. 檢查前端環境變數
cat client/.env.production

# 應該包含:
# REACT_APP_API_URL=https://bci-connect.onrender.com
```

**修復方法**:
1. 確保 `client/.env.production` 存在且配置正確
2. 前端代碼已更新使用環境變數
3. 重新建置和部署前端

### Step 2: 本地測試
```bash
# 2. 確認本地環境正常
npm start
curl http://localhost:8000/api/nfc-checkin/records
```

### Step 3: 生產環境測試
```bash
# 3. 測試生產環境 API
curl https://your-app.onrender.com/api/nfc-checkin/db-test
curl https://your-app.onrender.com/api/nfc-checkin/records
```

### Step 3: 日誌分析
1. 查看 Render Logs
2. 搜尋錯誤關鍵字
3. 分析錯誤堆疊

### Step 4: 環境變數檢查
1. 確認 `MONGODB_URI` 設定
2. 檢查 `JWT_SECRET` 設定
3. 驗證其他必要環境變數

### Step 5: 資料庫連接測試
1. 使用 `/db-test` 路由測試
2. 檢查 MongoDB Atlas 設定
3. 確認網路連接

---

## 6. 🚨 緊急修復方案

### 快速修復 Checklist

#### 1. 環境變數修復
```bash
# 在 Render Dashboard 設定
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

#### 2. 程式碼修復
```javascript
// 加入防護性程式設計
router.get('/records', authenticateToken, async (req, res) => {
  try {
    // 檢查必要服務
    if (!mongoose.connection.readyState) {
      throw new Error('Database not connected');
    }
    
    // 原有邏輯...
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Service temporarily unavailable',
      timestamp: new Date().toISOString()
    });
  }
});
```

#### 3. 重新部署
```bash
git add .
git commit -m "Fix: Add error handling and debugging"
git push origin main
```

---

## 7. 📞 支援資源

- **Render 文檔**: [render.com/docs](https://render.com/docs)
- **MongoDB Atlas 支援**: [mongodb.com/support](https://mongodb.com/support)
- **Node.js 除錯指南**: [nodejs.org/en/docs/guides/debugging-getting-started](https://nodejs.org/en/docs/guides/debugging-getting-started)

---

**記住**: 詳細的日誌是排查問題的關鍵！加入足夠的 console.log 來追蹤程式執行流程。