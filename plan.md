# TextForge 文字工作台實作計畫

## 產品範圍
TextForge 是一個 React + Vite 單頁文字工作台。主畫面預設載入 20 個可編輯文字項目；每個項目可直接輸入，也可點擊進入放大編輯模式。使用者可以新增或刪除文字項目，並將目前內容匯出為 TXT 或 Excel。寄信面板可輸入收件 Gmail 與寄件密碼，在後端以 Gmail SMTP 寄出 TXT 附件；密碼只在該次請求暫存於記憶體，不進 localStorage、不寫入前端 bundle、不寫入原始碼。

## 技術與結構
- 前端：React 19 + TypeScript + Vite，使用原生 CSS 與少量 inline SVG icon，不依賴大型 UI 套件。
- 後端：Express 5 + Nodemailer；開發時由同一個 Node 入口以 Vite middleware 提供前端，生產時提供 `dist` 靜態檔案。
- Excel：前端使用 `xlsx` 產生工作表與下載檔案，寄信則只附加 TXT，避免不必要的附件大小。
- 暫存：草稿以瀏覽器 localStorage 自動保存；寄件密碼明確排除在保存範圍外。
- 路由：目前只有 `/`，並提供 `public/manus-routes.json`。

## 專案結構
- `src/App.tsx`：文字項目狀態、匯出、放大編輯與寄信操作。
- `src/main.tsx`：React 入口。
- `src/styles.css`：工作台的視覺系統、響應式版面與 modal。
- `server/index.ts`：Vite/Express 開發與生產伺服器，以及 `/api/send-text` 寄信 API。
- `public/manus-routes.json`：網站路由清單。
- `app.config.ts`：平台 logo metadata。

## 設計方案
候選風格：
1. **編輯室工具感**（機率 0.06）：米白紙張、墨色文字、螢光薄荷色重點，像一張可整理的工作桌。
2. **冷靜 SaaS 儀表板**（機率 0.05）：藍灰背景、卡片網格與嚴謹表格語言。
3. **深色終端工作台**（機率 0.04）：深炭底、等寬字與高對比狀態色。

選擇 **編輯室工具感**。

### Design Movement
數位編輯室（digital editorial desk）：將零散文字視為可排列、可放大的紙片，而不是一般表單。

### Core Principles
1. 內容優先：文字占據視覺主體，控制項維持安靜。
2. 可掃描：序號、字數、狀態與動作固定在一致位置。
3. 可逆操作：刪除前確認、匯出後顯示結果、放大編輯可快速返回。
4. 不打擾：自動保存與寄件安全提示不遮蔽主要寫作流程。

### Color Philosophy
以柔和紙張色作為工作背景，深墨色建立閱讀穩定性，薄荷綠作為品牌識別色並表示「已保存／可執行」，琥珀色只用於寄件安全提醒，避免讓錯誤與一般提示混淆。

### Layout Paradigm
採用左側固定的窄型導覽脊柱，右側為寬闊工作畫布；上方用一條工具列維持全域動作，文字項目以不過度對稱的兩欄紙片排列。放大編輯時改成沉浸式遮罩，不跳轉頁面。

### Signature Elements
- 左上角的「TF」折頁字標，搭配細線與小圓點，像紙張索引。
- 每張文字紙片都有編號標籤與右上角放大控制，建立編輯室索引感。
- 寄件區使用琥珀色安全註記，提醒 Gmail 應用程式密碼，不把敏感資訊藏在介面細節裡。

### Interaction Philosophy
直接點擊文字就能編輯；放大是同一份內容的延伸，不複製、不丟失焦點。新增項目放在末尾並自動滾動到視窗可見處；刪除採確認式操作；匯出與寄信以短暫狀態回饋讓使用者知道結果。

### Animation
只使用 160–220ms 的淡入、上移與縮放；卡片進場有輕微錯落但不循環。modal 以 opacity + translateY 開啟，關閉時快速收束。`prefers-reduced-motion` 下停用位移與延遲。

### Typography System
標題採 `Fraunces` 優先、`Noto Serif TC` 備援，讓工作台有編輯感；介面與內文採 `Plus Jakarta Sans`、`Noto Sans TC`，以清楚的數字與中文閱讀性為主。標題 48/1.02，區段標題 18/1.25，正文 14–16/1.6。

### Brand Essence
「把散落的句子，整理成可交付的文字。」個性：清楚、可靠、從容。

### Brand Voice
- 標題例句：「今天的文字，先放在這裡。」
- CTA 例句：「整理成檔案」而非「提交」。

### Wordmark & Logo
以 `TF` 兩個字母做成向右折起的紙角標記，搭配小型 `TEXTFORGE` 字樣，不使用預設字型直接當 logo。

### Signature Brand Color
`#70d6b0` 薄荷綠：代表內容被整理好、可以繼續流動到檔案或信件。

## 安全與寄信決策
- 不採用使用者提供的一般 Gmail 密碼作為硬編碼預設值，也不把密碼寫入檔案、localStorage、URL 或日誌。
- 介面使用 password 欄位，送出後端 API 時才傳送；服務端只用於 Nodemailer 本次 SMTP 認證，請求完成後由執行環境回收。
- 介面明確推薦 Gmail 兩步驟驗證後建立應用程式密碼；若帳號政策不允許 SMTP，顯示服務端返回的錯誤。
- `/api/send-text` 限制 JSON 大小、驗證 email、限制 TXT 內容大小，並在回應中不回傳任何憑證。
