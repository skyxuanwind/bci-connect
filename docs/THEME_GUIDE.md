# 全局主題切換樣式指南（黑金 / 亮白）

本指南說明主題架構、CSS 規則、變數與整合方式，協助在開發中保持兩種主題的視覺一致性與可維護性。

## 架構

- Provider：`client/src/contexts/ThemeContext.js`
  - 狀態：`theme`（`dark` / `light`）
  - 方法：`toggleTheme()`、`setTheme()`
  - 儲存：`localStorage('gbc-theme')`
  - 掛載：於 `App.js` 以 `<ThemeProvider>` 包裹整站，並在 `html` 根元素增減 `theme-dark` / `theme-light` 類名。

- 切換按鈕：`client/src/components/ThemeToggle.jsx`
  - 太陽/月亮圖示，位於 `Layout` 頂欄右側。
  - 可即時切換主題，無需刷新頁面。

- 視覺覆蓋：`client/src/index.css`
  - `html.theme-light` 區塊提供亮白主題的類別覆蓋。
  - 覆蓋常用 Tailwind 類（`bg-primary-*`、`border-*`、`text-gold-*`、`bg-white` 等）以確保整體一致性。

## 色彩規範

- 黑金（預設）：
  - 背景：`#121212`（漸層至 `#1e1e1e`）
  - 主色：金色系（`#D4AF37` / `#B8860B`）
  - 文字：金色階（`gold-*`）

- 亮白：
  - 背景：`#FFFFFF`
  - 主按鈕：深藍 `#0A2463`，文字白 `#FFFFFF`
  - 次按鈕：深灰 `#2E2E2E`，文字白 `#FFFFFF`
  - 邊框：淺灰 `#E5E7EB`（或 `#D1D5DB`）
  - 文字：深灰 `#111827`、`#1F2937`、`#374151`

## 常見組件策略

- 導覽（`.nav-link`）：亮白下改為深灰文字與淺灰 hover 背景。
- 卡片（`.card`）：亮白下為純白背景，淺陰影、淺灰邊框。
- 表單（`.form-input` / `.input`）：亮白下白底深灰字，淺灰邊框。
- 表格（`.table-header` / `.table-row`）：亮白下白/淺灰搭配深色文字與灰邊。
- Tailwind 常用類覆蓋：`bg-primary-*`、`border-primary-*`、`border-gold-*`、`text-gold-*` 於亮白主題映射至白/灰與深色文字。

## 使用建議

- 新增組件時優先使用語義化樣式（`.card`、`.nav-link`、`.btn-*`、`.form-input`）可獲得完整的雙主題支援。
- 若需要使用 Tailwind 類名指定深色（如 `bg-primary-900`），在亮白主題下已透過 CSS 進行覆蓋為白底，保持一致性。

## 可存取性（WCAG AA）

- 文字與背景對比：亮白主題採用深色文字（`#111827` 等）保證對比度達標。
- 按鈕：深藍/深灰背景搭配白字，hover 略增亮度，維持對比度。
- 鍵盤可操作性：切換按鈕具 `focus-ring`，符合可存取要求。

## 性能與平滑切換

- 全局 `transition` 已啟用常見屬性切換的平滑過渡，避免閃爍。
- 切換僅改根元素類名，避免不必要的重排；覆蓋選擇器具體且集中，保持渲染穩定。

---

## 亮白主題文字顯示規範（Typography & Contrast）

以下規範已在 `client/src/index.css` 中以 `html.theme-light` 覆蓋並落地，滿足 WCAG 2.1 AA（對比 ≥ 4.5:1）。

- 顏色變數（用於一致性）：
  - `--light-text` = `#111827`（主文案）
  - `--light-text-2` = `#1F2937`（次文案）
  - `--light-text-3` = `#374151`（輔助說明）
  - `--light-bg` = `#FFFFFF`、`--light-bg-muted` = `#F9FAFB`
  - `--light-border` = `#E5E7EB`、`--light-border-strong` = `#D1D5DB`
  - `--light-link` = `#0A2463`（高可讀深藍）

- 對比原則：
  - 主文案：`#111827` 在白底對比 ≈ 12.6:1
  - 次文案/說明：`#1F2937` / `#374151` 皆 ≥ 7:1
  - 互動按鈕：深藍 `#0A2463` / 深灰 `#2E2E2E` 搭配白字，皆 ≥ 7:1
  - placeholder 與輔助字：`#9CA3AF`（灰 400），相對主文案形成清晰層次

- 字級與字重（mobile-first，已以 clamp 控制）：
  - 標題：
    - `h1` 700，`line-height: 1.35`
    - `h2` 700，`line-height: 1.4`
    - `h3` 600，`line-height: 1.45`
    - `h4` 600，`line-height: 1.5`
  - 正文/列表：`line-height: 1.7`，字距 `letter-spacing: 0.01em`
  - 小字（註解/表格輔助）：`small` 使用 `#6B7280`（灰 500）

- 類別映射（避免低對比）：
  - `text-gold-50..900` → 映射為深灰文字（亮白主題下）
  - `bg-primary-*` 深色底 → 映射為白底或淺灰底
  - `text-white` → 在亮白主題預設為深灰，保留 `.btn-*` 的白字例外

- 組件規範：
  - 導覽（active）：深藍底白字（`#0A2463` + `#FFFFFF`），陰影適度
  - 卡片：白底、淺灰邊、淡陰影；標題使用主文案色
  - 表單：白底、深灰字、淺灰邊；placeholder 使用灰 400
  - 表格：表頭 `#F9FAFB` + 深字、列白底 + 灰邊

- 文字陰影：亮白主題停用（`text-shadow`/`text-shadow-gold` → `none`），避免降低清晰度。

## 測試清單（建議）

- 主要內容、導覽、按鈕、表格、列表均以亮白主題檢視，使用色彩檢測工具確認對比 ≥ 4.5:1。
- 常見頁面：`/dashboard`、`/members`、`/events`、`/profile`、`/business-media`。
- 裝置寬度：360、768、1024、1440，檢查標題斷行與行距舒適度。