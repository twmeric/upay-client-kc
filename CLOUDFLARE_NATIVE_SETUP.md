# Cloudflare 原生架構部署指南

## 🏗️ 架構概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare 原生架構                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────────┐                │
│   │   Pages      │         │     Worker       │                │
│   │  Frontend    │◄───────►│   payment-api    │                │
│   │  (React)     │   HTTP  │                  │                │
│   └──────────────┘         └────────┬─────────┘                │
│           │                         │                          │
│           │                ┌────────┴─────────┐                │
│           │                │                  │                │
│           │         ┌──────▼──────┐   ┌──────▼──────┐          │
│           │         │     D1      │   │     KV      │          │
│           │         │  Database   │   │   Cache     │          │
│           │         └─────────────┘   └─────────────┘          │
│           │                         │                          │
│           │         ┌───────────────▼──────────┐               │
│           │         │                          │               │
│           │         │   EasyLink API           │               │
│           │         │   (Payment Gateway)      │               │
│           │         │                          │               │
│           │         └──────────────────────────┘               │
│           │                                                      │
│   ┌───────▼──────────────────────────────────────────┐          │
│   │         Webhook Callback (async)                  │          │
│   │   EasyLink ─────► Worker ─────► D1               │          │
│   └───────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速部署步驟

### 步驟 1: 創建 D1 數據庫

```bash
cd C:\Users\Owner\cloudflare\kingchicken\payment-worker

# 創建 D1 數據庫
wrangler d1 create payment-db

# 記錄輸出的 database_id，更新到 wrangler.toml
```

### 步驟 2: 執行數據庫遷移

```bash
# 執行 schema.sql 創建表結構
wrangler d1 execute payment-db --file=./schema.sql
```

### 步驟 3: 設置 Secrets

```bash
# 設置 EasyLink 配置
wrangler secret put EASYLINK_MCH_NO
# 輸入您的商戶號

wrangler secret put EASYLINK_APP_ID
# 輸入您的 App ID

wrangler secret put EASYLINK_APP_SECRET
# 輸入您的 App Secret
```

### 步驟 4: 部署 Worker

```bash
# 部署 Worker
wrangler deploy

# 記錄輸出的 Worker URL
# 例如：https://payment-api.your-account.workers.dev
```

### 步驟 5: 更新前端配置

編輯 `src/api/client.ts`，更新 Worker URL：

```typescript
return "https://payment-api-cwb.pages.dev"; // 您的 Worker URL
```

### 步驟 6: 重新部署前端

```bash
cd C:\Users\Owner\.kimi\sessions\ab7b4a23e658d653ca96121b30262054\424392ec-4b6f-43b8-8b7e-d868acc2597a\uploads\extracted

# 重新構建
npm run build

# 部署到 Pages
wrangler pages deploy dist --project-name="payment-portal"
```

---

## 📁 文件結構

```
payment-worker/
├── src/
│   └── index.js          # Worker 主代碼
├── schema.sql            # D1 數據庫結構
├── wrangler.toml         # Worker 配置
├── package.json          # 項目配置
└── README.md             # 說明文檔
```

---

## 🔧 完整部署腳本

創建 `deploy.bat`：

```batch
@echo off
echo ========================================
echo Payment Worker 部署腳本
echo ========================================
echo.

setlocal
set "CLOUDFLARE_API_TOKEN=您的_SuperToken"
set "CLOUDFLARE_ACCOUNT_ID=dfbee5c2a5706a81bc04675499c933d4"

echo [1/4] 檢查 D1 數據庫...
wrangler d1 list | findstr "payment-db" >nul
if errorlevel 1 (
    echo 創建 D1 數據庫...
    wrangler d1 create payment-db
)

echo [2/4] 執行數據庫遷移...
wrangler d1 execute payment-db --file=./schema.sql

echo [3/4] 部署 Worker...
wrangler deploy

echo [4/4] 完成！
echo.
echo Worker URL: https://payment-api-cwb.pages.dev
echo.
endlocal
pause
```

---

## 🔍 API 端點

| 端點 | 方法 | 描述 |
|------|------|------|
| `/api/public/payment/create` | POST | 創建支付訂單 |
| `/api/public/payment/query/:orderNo` | GET | 查詢訂單狀態 |
| `/api/webhooks/easylink/notify` | POST | EasyLink 回調 |
| `/api/transactions` | GET | 交易列表 |
| `/api/dashboard/stats` | GET | 統計數據 |
| `/api/health` | GET | 健康檢查 |

---

## 💰 Cloudflare 免費額度

| 服務 | 免費額度 | 預估費用 |
|------|---------|---------|
| **Worker** | 100,000 請求/天 | 免費 |
| **D1** | 5M 讀取/天, 100K 寫入/天 | 免費 |
| **KV** | 100,000 讀取/天 | 免費 |
| **Pages** | 無限請求 | 免費 |

---

## 🆚 與 youbase 對比

| 特性 | youbase | Cloudflare 原生 |
|------|---------|-----------------|
| **延遲** | 較高（多一層代理） | 最低（邊緣直連） |
| **控制** | 受限 | 完全控制 |
| **成本** | 訂閱制 | 免費額度充足 |
| **數據** | 托管 | 自有 D1 |
| **調試** | 困難 | Wrangler 工具完善 |

---

## 🔄 數據遷移（如需保留舊數據）

如果需要從 youbase 遷移現有交易數據：

```bash
# 1. 從 youbase 導出數據
# 2. 轉換為 SQL INSERT 語句
# 3. 執行遷移
wrangler d1 execute payment-db --file=./migration.sql
```

---

## ✅ 部署後驗證

```bash
# 1. 健康檢查
curl https://payment-api-cwb.pages.dev/api/health

# 2. 創建測試訂單
curl -X POST https://payment-api-cwb.pages.dev/api/public/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.01, "payType": "UP_OP"}'

# 3. 查詢訂單
curl https://payment-api-cwb.pages.dev/api/public/payment/query/ORDxxxxxx
```

---

## 🛟 故障排除

### "database_id not found"
更新 `wrangler.toml` 中的 `database_id`

### "Secrets not found"
確保已執行 `wrangler secret put`

### "CORS error"
Worker 已內置 CORS 處理，檢查前端 URL 是否正確

---

準備好了！開始部署嗎？ 🚀
