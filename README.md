# 台股實驗預測及模擬倉

台股即時分析與模擬交易平台 — 結合 15 大訊號加權評分系統與 AI 智慧分析，提供多時間維度的走勢預測及全功能模擬交易環境。

**線上 Demo**：[https://scorpioliu0953.github.io/tw-stock-prediction/](https://scorpioliu0953.github.io/tw-stock-prediction/)

## 功能特色

- **15 大訊號分析**：涵蓋技術面（RSI、MACD、KD 等 9 項）、籌碼面、量價結構、大盤連動、均線系統、波動率、時間因子
- **AI 智慧分析**：整合 Google Gemini API，綜合技術面、籌碼面、基本面與新聞，生成專業中文分析摘要
- **自適應 AI 權重**：當訊號一致性高時降低 AI 權重（0.30）；訊號衝突時提高 AI 權重（0.55），讓 AI 判斷發揮更大作用
- **多時間維度預測**：支援 1 日、3 日、1 週、2 週、1 個月五種預測區間
- **模擬交易**：完整的買賣下單、持倉管理、損益追蹤，手續費率與證交稅模擬真實交易環境
- **即時報價**：WebSocket 即時推送股價更新
- **預測驗證**：62 秒驗證機制，追蹤預測準確率
- **基本面數據**：PE、PB、EPS、殖利率、52 週區間等關鍵指標
- **新聞整合**：自動抓取近期相關新聞標題
- **深色模式**：支援淺色/深色/跟隨系統三種主題

## 使用方式

### 1. 設定 Gemini API Key

1. 前往 [Google AI Studio](https://aistudio.google.com/apikey) 申請免費 API Key
2. 在應用的「設定」頁面填入 API Key
3. API Key 僅儲存在您的瀏覽器 localStorage 中，不會傳送至任何伺服器

### 2. 選擇股票

- 使用頂部搜尋列搜尋股票（按 `Cmd+K` 快速開啟）
- 或從預設的常用股票列表中選擇

### 3. 查看分析

- 儀表板顯示 15 大訊號評分、AI 分析、K 線圖
- 切換不同時間維度查看不同區間的預測
- AI 分析直接從您的瀏覽器呼叫 Gemini API

## 本地開發

### 前端

```bash
# 安裝依賴
npm install

# 開發伺服器
npm run dev

# 建置靜態網站
npm run build
```

### 後端

```bash
cd backend

# 建立虛擬環境
python -m venv venv
source venv/bin/activate  # macOS/Linux

# 安裝依賴
pip install -r requirements.txt

# 啟動伺服器
python main.py
```

### 環境變數

前端（`.env.local`）：
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 技術架構

### 前端
- **框架**：Next.js 14（App Router）+ React 18 + TypeScript
- **狀態管理**：Zustand（本地狀態）+ TanStack React Query（伺服器狀態）
- **UI**：Tailwind CSS + Radix UI
- **圖表**：Lightweight Charts（K 線）+ ECharts（雷達圖、圓餅圖）
- **AI 整合**：Google Generative AI SDK（前端直接呼叫）

### 後端
- **框架**：FastAPI（Python async）
- **資料庫**：SQLAlchemy 2.0 + SQLite（WAL mode）
- **即時更新**：WebSocket
- **排程**：APScheduler

### 部署
- **前端**：GitHub Pages（靜態匯出）
- **後端**：可部署至 Render / Railway 等平台

## 免責聲明

本系統僅供學術研究與技術實驗使用，所有分析結果不構成投資建議。股市有風險，投資需謹慎。AI 生成的分析內容可能存在誤差，請勿作為實際交易依據。
