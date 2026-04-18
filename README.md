# 台股實驗預測及模擬倉

台股即時分析與模擬交易平台 — 結合 15 大訊號加權評分系統與 AI 智慧分析，提供多時間維度的走勢預測及全功能模擬交易環境。

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
- **資料本地化**：模擬倉、AI 設定皆存於瀏覽器 localStorage，每位使用者獨立互不干擾

---

## 部署教學（Fork → Netlify + Render）

Fork 本專案後，按照以下步驟即可免費架設屬於自己的台股分析平台。

### 架構總覽

```
┌─────────────────────┐       ┌─────────────────────┐
│      Netlify         │       │       Render         │
│   （前端靜態網站）    │──────▶│   （後端 API 伺服器） │
│   Next.js 匯出       │ fetch │   FastAPI + SQLite   │
│   免費方案           │       │   免費方案            │
└─────────────────────┘       └─────────────────────┘
        │                              │
        ▼                              ▼
  使用者瀏覽器                    TWSE / 證交所
  ├─ localStorage（模擬倉）       ├─ 即時報價
  ├─ localStorage（AI 設定）      ├─ 歷史 K 線
  └─ 直接呼叫 Gemini API         ├─ 基本面數據
                                  └─ 新聞資料
```

| 元件 | 平台 | 用途 | 費用 |
|------|------|------|------|
| 前端 | [Netlify](https://www.netlify.com) | 靜態網站（Next.js 匯出） | 免費 |
| 後端 | [Render](https://render.com) | API 伺服器（股票數據、訊號計算） | 免費 |
| AI | [Google AI Studio](https://aistudio.google.com) | Gemini API（使用者自備 Key） | 免費額度 |

---

### Step 1：Fork 專案

1. 點擊本 GitHub 頁面右上角的 **Fork** 按鈕
2. 將專案複製到你自己的 GitHub 帳號下

---

### Step 2：部署後端到 Render

1. 前往 [render.com](https://render.com)，使用 **GitHub 帳號**登入
2. 點擊 **New +** → **Web Service**
3. 選擇 **Build and deploy from a Git repository** → **Next**
4. 找到你 Fork 的 `tw-stock-prediction` repo，點擊 **Connect**
5. 填寫設定：

   | 欄位 | 值 |
   |------|------|
   | **Name** | 自訂，例如 `my-tw-stock-api` |
   | **Region** | 選離你最近的（如 Singapore） |
   | **Root Directory** | `backend` |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | **Free** |

6. 點擊 **Create Web Service**
7. 等待部署完成（約 2-5 分鐘），完成後會顯示你的後端 URL

   > 記下這個 URL，格式如：`https://my-tw-stock-api.onrender.com`

---

### Step 3：部署前端到 Netlify

1. 前往 [app.netlify.com](https://app.netlify.com)，使用 **GitHub 帳號**登入
2. 點擊 **Add new site** → **Import an existing project**
3. 選擇 **GitHub**，授權並找到你 Fork 的 `tw-stock-prediction` repo
4. 建置設定會自動從 `netlify.toml` 讀取，確認：

   | 欄位 | 值 |
   |------|------|
   | **Build command** | `npm run build` |
   | **Publish directory** | `out` |

5. 展開 **Advanced build settings**（或 **Environment variables**），新增環境變數：

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://你的render服務名.onrender.com/api/v1` |

   > **範例**：如果你的 Render 服務名是 `my-tw-stock-api`，則填入：
   > `https://my-tw-stock-api.onrender.com/api/v1`

6. 點擊 **Deploy site**
7. 等待建置完成（約 1-2 分鐘），完成後 Netlify 會給你一個網址

---

### Step 4：設定 Gemini API Key

1. 開啟你部署好的 Netlify 網站
2. 點擊左側選單的 **⚙️ 設定**
3. 在「AI 分析設定」區塊填入你的 Gemini API Key
   - 前往 [Google AI Studio](https://aistudio.google.com/apikey) 可免費申請
4. API Key **僅儲存在你的瀏覽器**中，不會傳送至任何伺服器

---

### Step 5：開始使用

1. 使用頂部搜尋列搜尋股票（按 `Cmd+K` 或 `Ctrl+K` 快速開啟）
2. 儀表板會顯示 15 大訊號評分、AI 分析摘要、K 線圖
3. 切換不同時間維度查看不同區間的預測
4. 在「模擬交易」頁面進行買賣操作

---

### 部署後注意事項

- **Render 免費方案**會在 15 分鐘無流量後自動休眠，首次訪問需等約 30-50 秒喚醒
- **Netlify 免費方案**每月 100GB 流量、300 分鐘建置時間，個人使用綽綽有餘
- **自動部署**：push 到 `main` 分支後，Render 和 Netlify 都會自動重新部署
- **模擬倉資料**存在瀏覽器 localStorage，清除瀏覽器資料會重置（初始資金 NT$10,000,000）
- **更新同步**：如果原始 repo 有更新，可在你的 Fork 頁面點擊 **Sync fork** 拉取最新程式碼

---

### 常見問題

**Q：前端顯示「無法連線」或資料載入失敗？**
> 確認 Netlify 的環境變數 `NEXT_PUBLIC_API_URL` 是否正確設定。格式必須是 `https://xxx.onrender.com/api/v1`，結尾有 `/api/v1`。如果剛修改環境變數，需要在 Netlify 後台重新觸發部署（Deploys → Trigger deploy）。

**Q：後端 API 回應很慢？**
> Render 免費方案休眠後首次啟動約需 30-50 秒，之後會恢復正常速度。

**Q：AI 分析沒有結果？**
> 確認已在「設定」頁面填入有效的 Gemini API Key。可以在 [Google AI Studio](https://aistudio.google.com/apikey) 免費申請。

**Q：模擬倉資料不見了？**
> 模擬倉資料存在瀏覽器 localStorage，換瀏覽器或清除瀏覽資料會重置。可在設定頁面手動重置模擬倉。

---

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
- **狀態管理**：Zustand + persist（localStorage）+ TanStack React Query
- **UI**：Tailwind CSS + Radix UI
- **圖表**：Lightweight Charts（K 線）+ ECharts（雷達圖、圓餅圖）
- **AI 整合**：Google Generative AI SDK（前端直接呼叫 Gemini）

### 後端
- **框架**：FastAPI（Python async）
- **資料庫**：SQLAlchemy 2.0 + SQLite（WAL mode）
- **即時更新**：WebSocket
- **排程**：APScheduler

### 部署
- **前端**：Netlify（靜態匯出）
- **後端**：Render（免費方案）

## 免責聲明

本系統僅供學術研究與技術實驗使用，所有分析結果不構成投資建議。股市有風險，投資需謹慎。AI 生成的分析內容可能存在誤差，請勿作為實際交易依據。
