# 電子名片模板設計規格（5 款風格）

本文檔定義 5 款不同風格的電子名片模板之視覺規格、元資料、CSS 變數、可編輯的圖標庫與分格線樣式，並提供響應式行動顯示要求與實作要點。可直接作為前端樣式與後端模板資料的依據。

## 通用規格
- 元件結構：`Header(標題/副標題) + Avatar(可選) + ContentBlocks(連結/文字/圖片/影片/地址/聊天) + Footer(可選)`
- 響應式斷點：`sm: 360–767`, `md: 768–1023`, `lg: 1024+`
- CSS 變數（每款模板均提供）：
  - `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-muted`
  - `--font-title`, `--font-body`
  - `--divider-style`（線型類型）、`--divider-opacity`
- 圖標庫：每款模板皆有對應的 `iconPack`（僅風格限定，內容可由使用者挑選）
- 分格線：每款模板提供至少 2 種樣式（可在編輯器中切換）。
- 可編輯內容：`card_title`、`card_subtitle`、`content_blocks`（遵循既有 `content_type` 與 `content_data` 結構）。
- 無障礙：字體對比度 AA(≥4.5:1)；鍵盤可達性；焦點狀態清晰。

---

## 1) 質感商務感（Business Elegant）
- 調色盤：深藍 `#0B1F3A` / 灰黑 `#121212` / 金屬金 `#C8A962` / 淺灰 `#E5E7EB`
- 字體：`--font-title: "Inter", "Noto Sans TC", sans-serif`；`--font-body: "Inter", sans-serif`
- 排版：嚴謹網格（12 欄）；固定邊距與間距（`lg` 24px / `md` 20px / `sm` 16px）。
- 紋理：金屬質感邊框（1–2px 外框，內陰影）、低頻率斜紋底紋（可開關）。
- 圖標庫 `${icon}`：商務圖標集（檔案、合約、名片、郵件、電話、地圖、LinkedIn、公司樓層）。
- 分格線 `${分格線}`：直線（實線/細實線）、網格（淡金網格，5–8% 不透明）。
- JSON 模板定義：
  ```json
  {
    "id": 101,
    "name": "質感商務感",
    "slug": "business-elegant",
    "description": "沉穩色系與專業排版，金屬質感點綴。",
    "preview_image_url": "/nfc-templates/business-elegant-preview.jpg",
    "iconPack": ["briefcase", "contract", "mail", "phone", "map", "linkedin"],
    "dividerOptions": ["solid-thin", "grid-gold"],
    "css": {
      "--color-bg": "#0B1F3A",
      "--color-surface": "#121212",
      "--color-text": "#E5E7EB",
      "--color-accent": "#C8A962",
      "--color-muted": "#9CA3AF",
      "--font-title": "Inter, Noto Sans TC, sans-serif",
      "--font-body": "Inter, sans-serif"
    }
  }
  ```

---

## 2) Cyberpunk 風格（Cyberpunk Neon）
- 調色盤：霓虹紫 `#9D4EDD` / 電光藍 `#00C2FF` / 粉紅 `#FF3CAC` / 深夜黑 `#0A0A0A`
- 字體：`--font-title: "Orbitron", "Quantico", sans-serif`；`--font-body: "Inter", sans-serif`
- 紋理：電路板紋理、全息漸層（角度 35–45°）、發光描邊。
- 圖標庫 `${icon}`：科技感圖標集（CPU、電路、雲、AR、終端、GitHub、Twitter）。
- 分格線 `${分格線}`：發光線條（藍/紫/粉 三色可選，強度 0.6–1.0）。
- 動效：霓虹脈動（`opacity` 微振幅 0.05–0.1）、懸停外光暈。
- JSON 模板定義：
  ```json
  {
    "id": 102,
    "name": "Cyberpunk風格",
    "slug": "cyberpunk-neon",
    "description": "霓虹色系與未來科技感，全息電路質感。",
    "preview_image_url": "/nfc-templates/cyberpunk-neon-preview.jpg",
    "iconPack": ["cpu", "circuit", "cloud", "terminal", "github", "twitter"],
    "dividerOptions": ["neon-blue", "neon-purple", "neon-pink"],
    "css": {
      "--color-bg": "#0A0A0A",
      "--color-surface": "#141414",
      "--color-text": "#E6E6E6",
      "--color-accent": "#00C2FF",
      "--color-muted": "#A855F7",
      "--font-title": "Orbitron, Quantico, sans-serif",
      "--font-body": "Inter, sans-serif"
    }
  }
  ```

---

## 3) 簡約日系風（Japanese Minimal）
- 調色盤：米白 `#F7F5EF` / 茶褐 `#8E735B` / 墨黑 `#1C1C1C` / 森綠 `#5D7052`
- 字體：`--font-title: "Zen Maru Gothic", "Noto Sans TC", sans-serif`；`--font-body: "Noto Sans TC", sans-serif`
- 紋理：和紙紋理（細粒度、10–20% 不透明），大面留白。
- 圖標庫 `${icon}`：極簡圖標集（郵件、電話、地點、網站、IG、照片）。
- 分格線 `${分格線}`：細虛線（1px、間隔 2–3px），顏色取自 `--color-muted`。
- 互動：淡入淡出、低速移動；無強烈陰影。
- JSON 模板定義：
  ```json
  {
    "id": 103,
    "name": "簡約日系風",
    "slug": "japanese-minimal",
    "description": "留白與和紙質感，清新手寫風格。",
    "preview_image_url": "/nfc-templates/japanese-minimal-preview.jpg",
    "iconPack": ["mail", "phone", "map", "globe", "instagram", "photo"],
    "dividerOptions": ["dashed-thin", "dotted-thin"],
    "css": {
      "--color-bg": "#F7F5EF",
      "--color-surface": "#FFFFFF",
      "--color-text": "#1C1C1C",
      "--color-accent": "#8E735B",
      "--color-muted": "#5D7052",
      "--font-title": "Zen Maru Gothic, Noto Sans TC, sans-serif",
      "--font-body": "Noto Sans TC, sans-serif"
    }
  }
  ```

---

## 4) 創意行銷風格（Creative Marketing）
- 調色盤：亮黃 `#FACC15` / 鮮紅 `#EF4444` / 深藍 `#1E3A8A` / 雪白 `#FFFFFF`
- 字體：`--font-title: "Bebas Neue", "Noto Sans TC", sans-serif`；`--font-body: "Inter", sans-serif`
- 版面：非對稱、強對比色塊；標語框可插入短句 CTA。
- 圖標庫 `${icon}`：行銷圖標集（喇叭、目標、圖表、A/B、影片、TikTok、YouTube）。
- 分格線 `${分格線}`：波浪/曲線（SVG Path，可選振幅與顏色）。
- 動效：色塊滑入、CTA 脈動（輕微）。
- JSON 模板定義：
  ```json
  {
    "id": 104,
    "name": "創意行銷風格",
    "slug": "creative-marketing",
    "description": "鮮明對比與非對稱版面，適合品牌推廣。",
    "preview_image_url": "/nfc-templates/creative-marketing-preview.jpg",
    "iconPack": ["megaphone", "target", "chart", "ab-test", "tiktok", "youtube"],
    "dividerOptions": ["wave-soft", "curve-strong"],
    "css": {
      "--color-bg": "#FFFFFF",
      "--color-surface": "#F3F4F6",
      "--color-text": "#111827",
      "--color-accent": "#FACC15",
      "--color-muted": "#1E3A8A",
      "--font-title": "Bebas Neue, Noto Sans TC, sans-serif",
      "--font-body": "Inter, sans-serif"
    }
  }
  ```

---

## 5) 塗鴉可愛風（Doodle Cute）
- 調色盤：糖果粉 `#FF8AD4` / 薄荷綠 `#67E8F9` / 檸檬黃 `#FDE047` / 牛奶白 `#FFF7ED`
- 字體：`--font-title: "Fredoka", "Baloo 2", sans-serif`；`--font-body: "Fredoka", sans-serif`
- 插圖：手繪圖形、貼紙元素、對話框（圓角 16–24px）。
- 圖標庫 `${icon}`：手繪圖標集（星星、笑臉、心、筆記、照相機）。
- 分格線 `${分格線}`：點線/不規則線條（手繪 Path、抖動 1–2px）。
- 動效：彈性緩動（spring 12–18）、輕微搖擺。
- JSON 模板定義：
  ```json
  {
    "id": 105,
    "name": "塗鴉可愛風",
    "slug": "doodle-cute",
    "description": "手繪插圖與糖果配色，俏皮友善。",
    "preview_image_url": "/nfc-templates/doodle-cute-preview.jpg",
    "iconPack": ["star", "smile", "heart", "note", "camera"],
    "dividerOptions": ["dotted-cute", "handdrawn-jitter"],
    "css": {
      "--color-bg": "#FFF7ED",
      "--color-surface": "#FFFFFF",
      "--color-text": "#3F3F46",
      "--color-accent": "#FF8AD4",
      "--color-muted": "#67E8F9",
      "--font-title": "Fredoka, Baloo 2, sans-serif",
      "--font-body": "Fredoka, sans-serif"
    }
  }
  ```

---

## 響應式與版面細節
- `Header`：
  - `lg`：標題 28–32px、副標題 18–20px；`md`：24/16；`sm`：20/14。
  - 換行策略：長字串在 `sm` 以 `word-break: break-word` 處理。
- `ContentBlocks`：
  - 卡片高度自適應；`lg` 每列 2–3 欄，`md` 2 欄，`sm` 1 欄。
  - 圖標與文字對齊：`icon 20–24px + label 14–16px`。
  - 影片/圖片區塊：維持 16:9 或 4:3 比例，使用 `object-fit: cover`。
- 分格線實作：
  - `solid-thin`: `border-top: 1px solid var(--color-muted)`
  - `grid-gold`: 背景覆蓋 `linear-gradient` + `background-size`
  - `neon-*`: 外發光 `filter: drop-shadow(0 0 6px var(--color-accent))`
  - `dashed-thin/dotted-thin`: `border-style: dashed/dotted; opacity: var(--divider-opacity)`
  - `wave/curve`: SVG Path，顏色取自 `--color-accent`，提供 2 檔振幅。

## 實作建議
- 後端：在 `nfc_card_templates` 表插入上述 5 筆模板資料，`css_config` 欄位存放 `css` JSON。
- 前端：
  - 編輯器載入 `iconPack` 與 `dividerOptions` 作為選單；`card_title`、`card_subtitle` 可編輯並保存。
  - 依 `slug` 切換對應的樣式表或 CSS 變數集合。
  - 預覽圖片放置於 `client/public/nfc-templates/`（可先使用佔位圖）。
- 測試：
  - `sm/md/lg` 三檔斷點檢視，確保內容不截斷。
  - 亮/暗背景對比檢測；鍵盤導覽順序合理。