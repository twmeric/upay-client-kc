# Payment Gateway 部署指南

## 前置要求

- Cloudflare 賬號
- Node.js 18+
- EasyLink 商戶號（mchNo, appId, appSecret）

## 一鍵部署步驟

### 1. 克隆模板

```bash
git clone https://github.com/your-org/payment-gateway-template.git
cd payment-gateway-template
```

### 2. 安裝依賴

```bash
# Worker
cd worker
npm install

# Frontend
cd ../frontend
npm install
```

### 3. 配置環境

#### 3.1 創建 D1 數據庫

```bash
cd worker
npx wrangler d1 create payment-db
```

記下返回的 `database_id`。

#### 3.2 配置 wrangler.toml

```toml
name = "your-merchant-payment"
# ...
[[d1_databases]]
binding = "DB"
database_name = "payment-db"
database_id = "YOUR_DATABASE_ID_HERE"  # 填入上一步獲取的 ID
```

#### 3.3 初始化數據庫

```bash
npx wrangler d1 execute payment-db --file=./schema.sql
```

#### 3.4 設置密鑰

```bash
# EasyLink 配置
npx wrangler secret put EASYLINK_MCH_NO
# 輸入您的商戶號

npx wrangler secret put EASYLINK_APP_ID
# 輸入您的 App ID

npx wrangler secret put EASYLINK_APP_SECRET
# 輸入您的 App Secret
```

### 4. 部署

```bash
# 部署 Worker
npx wrangler deploy

# 部署 Frontend (可選)
cd ../frontend
npm run build
npx wrangler pages deploy dist
```

### 5. 驗證部署

訪問 `https://your-worker.your-subdomain.workers.dev/api/health` 應返回：

```json
{
  "status": "ok",
  "version": "1.0"
}
```

## 商戶對接流程

### 提供給客戶的信息

當有新客戶申請時，請提供：

1. **API Base URL**: `https://your-worker.workers.dev`
2. **商戶號** (mchNo): 分配給客戶的唯一標識
3. **App ID** & **App Secret**: 身份驗證密鑰
4. **Webhook URL**: `https://your-worker.workers.dev/api/webhooks/notify`

### 客戶集成步驟

1. **閱讀 API 文檔**: 參考 `API-REFERENCE.md`
2. **配置 Webhook**: 在 EasyLink 後台設置通知地址
3. **測試環境**: 使用測試金額（如 HK$0.01）進行支付測試
4. **上線運營**: 配置生產環境，正式接收支付

## 常見問題

### Q: 如何查看交易記錄？
A: 訪問 `/api/transactions` 或使用管理後台。

### Q: 如何修改支付頁面樣式？
A: 編輯 `frontend/src/pages/PaymentPage.tsx`，修改顏色和佈局。

### Q: 支持哪些支付方式？
A: 銀聯（UP_OP）、支付寶（ALI_H5）、微信支付（WX_H5）。

### Q: 如何處理支付通知？
A: 系統已自動處理 EasyLink Webhook，更新訂單狀態。

## 技術支持

如有問題，請聯繫技術支持團隊。
