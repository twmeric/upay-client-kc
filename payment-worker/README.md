# Payment Worker - Cloudflare 原生支付網關

純 Cloudflare 架構的 EasyLink 支付整合方案，使用 Workers + D1。

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install -g wrangler
```

### 2. 登入 Cloudflare

```bash
wrangler login
```

### 3. 創建 D1 數據庫

```bash
wrangler d1 create payment-db
```

複製輸出的 `database_id`，更新 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "payment-db"
database_id = "your-actual-database-id"
```

### 4. 執行數據庫遷移

```bash
wrangler d1 execute payment-db --file=./schema.sql
```

### 5. 設置 Secrets

```bash
wrangler secret put EASYLINK_MCH_NO
wrangler secret put EASYLINK_APP_ID
wrangler secret put EASYLINK_APP_SECRET
```

### 6. 部署

```bash
wrangler deploy
```

或者使用 PowerShell 腳本：

```powershell
.\deploy.ps1
```

---

## 📡 API 端點

| 端點 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 健康檢查 |
| `/api/public/payment/create` | POST | 創建支付訂單 |
| `/api/public/payment/query/:orderNo` | GET | 查詢訂單狀態 |
| `/api/webhooks/easylink/notify` | POST | EasyLink 回調 |
| `/api/transactions` | GET | 交易列表 |
| `/api/dashboard/stats` | GET | Dashboard 統計 |

---

## 🧪 測試

```bash
# 健康檢查
curl https://payment-api-cwb.pages.dev/api/health

# 創建訂單
curl -X POST https://payment-api-cwb.pages.dev/api/public/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.01, "payType": "UP_OP"}'

# 查詢訂單
curl https://payment-api-cwb.pages.dev/api/public/payment/query/ORD20240319120000ABC123
```

---

## 📊 架構

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Pages     │─────►│   Worker    │─────►│     D1      │
│  Frontend   │      │   payment   │      │  Database   │
└─────────────┘      │    -api     │      └─────────────┘
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │  EasyLink   │
                     │     API     │
                     └─────────────┘
```

---

## 🔧 配置

### wrangler.toml

| 變量 | 說明 |
|------|------|
| `database_id` | D1 數據庫 ID |
| `ENVIRONMENT` | 環境標識 |
| `EASYLINK_BASE_URL` | EasyLink API 地址 |

### Secrets

| Secret | 來源 |
|--------|------|
| `EASYLINK_MCH_NO` | EasyLink 商戶號 |
| `EASYLINK_APP_ID` | EasyLink App ID |
| `EASYLINK_APP_SECRET` | EasyLink App Secret |

---

## 📁 文件結構

```
├── src/
│   └── index.js          # Worker 主代碼
├── schema.sql            # D1 數據庫結構
├── wrangler.toml         # Worker 配置
├── package.json          # 項目配置
├── deploy.ps1            # 部署腳本
└── README.md             # 說明文檔
```

---

## 💰 成本

全部使用 Cloudflare 免費額度：

- **Workers**: 100,000 請求/天
- **D1**: 5M 讀取/天, 100K 寫入/天
- **Pages**: 無限請求

---

## 🆚 與 youbase 對比

| 特性 | youbase | Cloudflare 原生 |
|------|---------|-----------------|
| 延遲 | 較高 | 最低 |
| 控制 | 受限 | 完全控制 |
| 成本 | 訂閱 | 免費 |
| 數據 | 托管 | 自有 |

---

## 🛟 故障排除

### "database_id not found"
更新 `wrangler.toml` 中的 `database_id`

### "Secrets not found"
確保已執行 `wrangler secret put`

### "Cannot connect to database"
檢查 D1 數據庫是否已創建並在正確的 account 下

---

**準備好了！開始部署吧！** 🚀
