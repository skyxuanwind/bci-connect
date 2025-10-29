# Firebase 設定指南

本指南將協助您設定 Firebase Realtime Database，以啟用即時資料同步功能。

適用本專案重點：
- 前端使用 `client/src/services/firebaseClient.js` 讀寫 Realtime Database。
- 同步路徑以使用者 ID 為鍵，格式為 `cards/{userId}`（在名片展示頁另有 `cards/{memberId}/editor` 讀取）。
- 若未設定 Firebase，系統會回退至瀏覽器 `localStorage`（僅本機，不跨裝置）。

## 1. 建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「建立專案」或「Add project」
3. 輸入專案名稱（例如：gbc-connect-sync）
4. 選擇是否啟用 Google Analytics（可選）
5. 點擊「建立專案」

## 2. 設定 Realtime Database

1. 在 Firebase Console 中，選擇您的專案
2. 在左側選單中點擊「Realtime Database」
3. 點擊「建立資料庫」
4. 選擇資料庫位置（建議選擇離您最近的區域）
5. 選擇安全規則模式：
   - **測試模式**：允許所有讀寫（僅用於開發）
   - **鎖定模式**：拒絕所有讀寫（需要自訂規則）

## 3. 設定安全規則

在 Realtime Database 的「規則」標籤中，設定以下規則：

```json
{
  "rules": {
    "cards": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

這些規則確保：
- 只有已驗證的使用者可以存取資料
- 使用者只能存取自己的資料

開發期暫時規則（僅測試用，請勿用於正式環境）：
```json
{
  "rules": {
    "cards": {
      "$uid": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```
此規則開放所有讀寫，僅用於確認連線與資料結構，完成驗證後請立即改回前述的「需驗證 + UID 相等」規則。

## 4. 取得 Firebase 配置

1. 在 Firebase Console 中，點擊專案設定（齒輪圖示）
2. 在「一般」標籤中，向下捲動到「您的應用程式」區域
3. 點擊「</> Web」圖示來新增 Web 應用程式
4. 輸入應用程式暱稱（例如：GBC Connect Web）
5. 複製 Firebase 配置物件

配置物件看起來像這樣：
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com/",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

## 5. 設定環境變數

將 Firebase 配置添加到您的環境變數檔案中：

### 開發環境 (.env.development)
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_DB_URL=https://your-project-id-default-rtdb.firebaseio.com/
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

### 生產環境
在您的部署平台（如 Render、Railway 等）中設定相同的環境變數。

Render 設定建議使用 Secrets：
- `render.yaml` 已加入下列前端環境鍵，可改用 `fromSecret` 映射：
  - `REACT_APP_FIREBASE_API_KEY`
  - `REACT_APP_FIREBASE_AUTH_DOMAIN`
  - `REACT_APP_FIREBASE_DB_URL`
  - `REACT_APP_FIREBASE_PROJECT_ID`
  - `REACT_APP_FIREBASE_STORAGE_BUCKET`
  - `REACT_APP_FIREBASE_SENDER_ID`
  - `REACT_APP_FIREBASE_APP_ID`
- 在 Render 服務的 Environment 介面建立對應 Secrets，名稱例如：
  - `firebase_api_key`, `firebase_auth_domain`, `firebase_db_url`, `firebase_project_id`, `firebase_storage_bucket`, `firebase_sender_id`, `firebase_app_id`
- 儲存後重新部署即可生效。

## 6. 啟用 Authentication（可選但建議）

如果您需要使用者驗證：

1. 在 Firebase Console 中點擊「Authentication」
2. 點擊「開始使用」
3. 在「Sign-in method」標籤中啟用所需的登入方式：
   - Email/Password
   - Google
   - 其他社交登入

本專案最佳實踐（整合既有使用者系統）：
- 建議使用「自訂 Token（Custom Token）」讓既有後端使用者登入 Firebase。
- 作法：後端使用 Firebase Admin SDK 以 `user.id` 簽發自訂 Token，前端以該 Token 呼叫 `signInWithCustomToken` 登入。

後端（Node.js）範例（僅示意，請放在受保護路由）：
```js
// services/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON && JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceJson),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}
exports.createCustomToken = async (uid) => admin.auth().createCustomToken(uid);

// routes/firebase.js（需確保 req.user 已由現有認證機制設定）
const express = require('express');
const router = express.Router();
const { createCustomToken } = require('../services/firebaseAdmin');
router.post('/api/firebase/token', async (req, res) => {
  try {
    const uid = String(req.user.id);
    const token = await createCustomToken(uid);
    res.json({ token });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create Firebase token' });
  }
});
module.exports = router;
```

前端（React）示意：
```js
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { initFirebase } from '../services/firebaseClient';
import axios from '../config/axios';

export async function ensureFirebaseLogin() {
  const db = initFirebase();
  if (!db) return; // 未配置則略過
  const auth = getAuth();
  if (auth.currentUser) return; // 已登入
  const { data } = await axios.post('/api/firebase/token');
  await signInWithCustomToken(auth, data.token);
}
```

完成後，安全規則 `auth.uid == $uid` 即可與您系統的 `user.id` 一致。

## 7. 測試連線

設定完成後，重新啟動您的開發伺服器：

```bash
npm start
```

檢查瀏覽器控制台是否有任何 Firebase 連線錯誤。如果一切正常，您應該會看到同步功能開始運作。

本專案驗證要點：
- 進入「CardStudioPro」頁面，登入後應建立/讀取 `cards/{userId}` 路徑資料。
- 若啟用自訂 Token，`SyncStatusToolbar` 應顯示連線正常（connected/synced）。
- 在另一台裝置或瀏覽器開同帳號，編輯變更應即時同步。

## 8. 監控和除錯

### 檢查 Firebase Console
- 在 Realtime Database 中查看資料是否正確儲存
- 檢查「使用情況」標籤以監控讀寫次數

### 常見問題
1. **權限被拒絕**：檢查安全規則和使用者驗證狀態
2. **連線失敗**：確認環境變數設定正確
3. **資料未同步**：檢查網路連線和 Firebase 規則

## 9. 成本考量
Firebase 提供免費（Spark）方案，適合開發與低量使用；超出免費額度時採用按量計費（Blaze）。各項配額與價格以官方最新文件為準，建議先以免費方案上線並觀察流量再決定升級。

## 10. 安全最佳實踐

1. **永遠不要在客戶端程式碼中暴露敏感資訊**
2. **使用適當的安全規則**限制資料存取
3. **定期檢查和更新**安全規則
4. **監控異常活動**和使用情況
5. **在生產環境中使用 HTTPS**

附註：若暫不啟用 Firebase，系統會回退到 `localStorage`，功能可運作但不具備跨裝置同步與協作能力；正式環境建議儘速導入 Firebase（或自建同步機制）。

完成這些步驟後，您的即時同步功能就會完全啟用！