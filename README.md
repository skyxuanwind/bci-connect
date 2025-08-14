# BCI商務菁英會 - Business Elite Club Platform

一個專為商務菁英打造的會員管理平台，提供會員註冊、審核、分級管理和社交網絡功能。

## 🚀 功能特色

### 會員功能
- **會員註冊與審核**：新會員註冊後需管理員審核
- **三級會員制度**：金級、銀級、銅級會員，享有不同權限
- **個人資料管理**：完整的個人和職業資訊管理
- **會員目錄**：根據會員等級查看其他會員資訊
- **分會系統**：支援多個地區分會管理

### 管理功能
- **用戶管理**：管理員可管理所有會員狀態
- **會員審核**：審核待加入會員並分配會員等級
- **分會管理**：創建、編輯、刪除分會
- **統計報告**：會員數據統計和分析

### 技術特色
- **響應式設計**：支援桌面和移動設備
- **安全認證**：JWT token 認證和權限控制
- **現代化 UI**：使用 Tailwind CSS 打造優雅界面
- **RESTful API**：標準化的後端 API 設計

## 🛠 技術棧

### 前端
- **React 18**：現代化前端框架
- **React Router**：單頁應用路由
- **Tailwind CSS**：實用優先的 CSS 框架
- **Heroicons**：精美的 SVG 圖標庫
- **React Hook Form**：高效的表單處理
- **React Hot Toast**：優雅的通知提示
- **Axios**：HTTP 客戶端

### 後端
- **Node.js**：JavaScript 運行環境
- **Express.js**：Web 應用框架
- **PostgreSQL**：關聯式資料庫
- **JWT**：JSON Web Token 認證
- **bcryptjs**：密碼加密
- **Helmet**：安全中間件
- **CORS**：跨域資源共享

## 📋 系統需求

- Node.js 16.0 或更高版本
- PostgreSQL 12.0 或更高版本
- npm 或 yarn 包管理器

## 🚀 快速開始

### 1. 克隆項目
```bash
git clone <repository-url>
cd BCI\ Connect
```

### 2. 安裝依賴

#### 安裝後端依賴
```bash
npm install
```

#### 安裝前端依賴
```bash
cd client
npm install
cd ..
```

### 3. 資料庫設置

1. 創建 PostgreSQL 資料庫：
```sql
CREATE DATABASE bci_business_club;
```

2. 執行資料庫初始化腳本（需要創建）：
```bash
psql -d bci_business_club -f database/init.sql
```

### 4. 環境配置

複製 `.env.example` 到 `.env` 並配置：
```bash
cp .env.example .env
```

編輯 `.env` 文件，設置以下變數：
```env
# 資料庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bci_business_club
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT 配置
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# 服務器配置
PORT=5001
NODE_ENV=development

# 前端 URL
CLIENT_URL=http://localhost:3000
```

### 5. 啟動應用

#### 開發模式（推薦）

在項目根目錄開啟兩個終端：

**終端 1 - 啟動後端：**
```bash
npm run dev
```

**終端 2 - 啟動前端：**
```bash
cd client
npm start
```

#### 生產模式
```bash
# 構建前端
cd client
npm run build
cd ..

# 啟動後端
npm start
```

### 6. 訪問應用

- **前端應用**：http://localhost:3000
- **後端 API**：http://localhost:5001

## 👤 默認管理員帳號

首次啟動後，系統會創建默認管理員帳號：
- **Email**：admin@bciclub.com
- **Password**：admin123456

⚠️ **重要**：請在生產環境中立即更改默認密碼！

## 📁 項目結構

```
BCI Connect/
├── client/                 # 前端 React 應用
│   ├── public/            # 靜態文件
│   ├── src/
│   │   ├── components/    # 可重用組件
│   │   ├── contexts/      # React Context
│   │   ├── pages/         # 頁面組件
│   │   └── ...
│   └── package.json
├── config/                # 配置文件
├── middleware/            # Express 中間件
├── routes/                # API 路由
├── server.js              # 後端入口文件
├── package.json           # 後端依賴
└── README.md
```

## 🔐 API 端點

### 認證相關
- `POST /api/auth/register` - 用戶註冊
- `POST /api/auth/login` - 用戶登入
- `POST /api/auth/logout` - 用戶登出
- `GET /api/auth/me` - 獲取當前用戶資訊

### 用戶管理
- `GET /api/users` - 獲取用戶列表
- `GET /api/users/:id` - 獲取特定用戶
- `PUT /api/users/profile` - 更新個人資料
- `PUT /api/users/password` - 修改密碼

### 管理員功能
- `GET /api/admin/dashboard` - 管理員儀表板數據
- `GET /api/admin/users` - 管理用戶
- `PUT /api/admin/users/:id/status` - 更新用戶狀態
- `GET /api/admin/pending-users` - 獲取待審核用戶
- `PUT /api/admin/users/:id/approve` - 審核用戶

### 分會管理
- `GET /api/chapters` - 獲取分會列表
- `POST /api/chapters` - 創建分會
- `PUT /api/chapters/:id` - 更新分會
- `DELETE /api/chapters/:id` - 刪除分會

## 🎨 會員等級說明

### 🥇 金級會員 (Level 1)
- 查看所有會員完整資訊
- 參與所有活動
- 優先預訂服務
- 專屬客服支援

### 🥈 銀級會員 (Level 2)
- 查看同級及以下會員資訊
- 參與大部分活動
- 標準預訂服務

### 🥉 銅級會員 (Level 3)
- 查看基本會員資訊
- 參與基礎活動
- 基本服務權限

## 🔧 開發指南

### 代碼規範
- 使用 ES6+ 語法
- 組件使用函數式組件和 Hooks
- 遵循 RESTful API 設計原則
- 使用有意義的變數和函數命名

### 提交規範
- feat: 新功能
- fix: 修復 bug
- docs: 文檔更新
- style: 代碼格式調整
- refactor: 代碼重構
- test: 測試相關

## 🚀 部署

### 環境變數配置
生產環境需要設置以下環境變數：
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_PASSWORD=your_secure_db_password
JWT_SECRET=your_super_secure_jwt_secret
CLIENT_URL=https://your-domain.com
```

### Docker 部署（可選）
```bash
# 構建鏡像
docker build -t bci-club .

# 運行容器
docker run -p 5001:5001 --env-file .env bci-club
```

## 🤝 貢獻指南

1. Fork 項目
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 許可證

本項目採用 MIT 許可證 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 📞 支援

如有問題或建議，請聯繫：
- Email: support@bciclub.com
- 項目 Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 致謝

感謝所有為這個項目做出貢獻的開發者和設計師。

---

**BCI商務菁英會** - 連接商務精英，創造無限可能 🚀