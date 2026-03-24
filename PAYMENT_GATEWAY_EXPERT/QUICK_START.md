# 🚀 30 分鐘快速對接指南

> 母機顧問團隊專用 - 標準網店支付對接流程

---

## 📋 前置準備

### 從客戶收集
- [ ] 商戶號 (Merchant ID)
- [ ] AppId
- [ ] AppSecret (128 字符)
- [ ] 帳戶類型 (Test/Production)

### 確認需求
- [ ] 需要的支付方式 (銀聯/支付寶/微信)
- [ ] 收款金額範圍
- [ ] 是否需要管理後台

---

## ⚡ 快速部署 (30 分鐘)

### 第 1 步: 準備環境 (5 分鐘)

```powershell
# 創建專案目錄
$CLIENT_NAME = "client-name"
mkdir "C:\Users\Owner\cloudflare\$CLIENT_NAME-payment"
cd "C:\Users\Owner\cloudflare\$CLIENT_NAME-payment"

# 複製模板
Copy-Item -Path "..\PAYMENT_GATEWAY_EXPERT\TEMPLATES\*" -Destination ".\" -Recurse -Force

# 安裝依賴
cd frontend
npm install
cd ..
```

---

### 第 2 步: 配置 Worker (10 分鐘)

```powershell
cd "C:\Users\Owner\cloudflare\$CLIENT_NAME-payment\worker"

# 1. 創建 D1 數據庫
$env:CLOUDFLARE_API_TOKEN = $env:SUPERTOKEN_API_TOKEN
wrangler d1 create "payment-db-$CLIENT_NAME"
# 記錄 database_id

# 2. 更新 wrangler.toml
# 編輯 wrangler.toml，填入 database_id

# 3. 執行數據庫遷移
wrangler d1 execute "payment-db-$CLIENT_NAME" --file=./schema.sql --remote

# 4. 設置 Secrets
wrangler secret put EASYLINK_MCH_NO      # 輸入商戶號
wrangler secret put EASYLINK_APP_ID      # 輸入 AppId
wrangler secret put EASYLINK_APP_SECRET  # 輸入 AppSecret

# 5. 更新 API URL (Test/Production)
# Test:    https://ts-api-pay.gnete.com.hk
# Production: https://api-pay.gnete.com.hk
```

---

### 第 3 步: 部署 (5 分鐘)

```powershell
# 部署 Worker
wrangler deploy
# 記錄 Worker URL: https://payment-api-xxx.workers.dev
```

---

### 第 4 步: 配置並部署前端 (10 分鐘)

```powershell
cd "..\frontend\src\api"

# 編輯 client.ts，更新 Worker URL
# const WORKER_URL = "https://payment-api-xxx.workers.dev"

cd ..
npm run build

# 部署到 Pages
wrangler pages deploy dist --project-name="$CLIENT_NAME-payment"
```

---

## ✅ 部署後驗證

### 測試清單

```powershell
# 1. 健康檢查
curl https://payment-api-xxx.workers.dev/api/health
# 預期: {"status":"ok"}

# 2. 創建測試訂單
curl -X POST https://payment-api-xxx.workers.dev/api/public/payment/create `
  -H "Content-Type: application/json" `
  -d '{"amount": 0.01, "payType": "UP_OP", "subject": "Test", "body": "Test"}'
# 預期: {"success": true, "payUrl": "..."}

# 3. 查詢訂單
curl https://payment-api-xxx.workers.dev/api/public/payment/query/{訂單號}
# 預期: 訂單詳情
```

---

## 📁 交付清單

### 給客戶
- [ ] 前端網址: `https://{client}-payment.pages.dev`
- [ ] API 網址: `https://payment-api-xxx.workers.dev`
- [ ] 管理後台登入方式
- [ ] 簡易使用說明

### 內部存檔
- [ ] 客戶資料 (加密保存)
- [ ] wrangler.toml 配置
- [ ] 部署記錄

---

## 🆘 常見問題

### Q1: 簽名驗證失敗
**解決**: 檢查 URL 構建，確保沒有 `https:://` (雙冒號)

### Q2: D1 數據庫連接失敗
**解決**: 確認 wrangler.toml 中的 `database_id` 正確

### Q3: Secrets 未生效
**解決**: 重新部署 Worker，`wrangler deploy`

### Q4: 前端無法連接 API
**解決**: 檢查 CORS 配置，確認 API URL 正確

---

## 🎯 進階配置

### 添加更多支付方式
編輯 `frontend/src/types/payment.ts`:
```typescript
export const PAYMENT_METHODS = [
  { wayCode: 'UP_OP', label: '銀聯在線', icon: 'unionpay' },
  { wayCode: 'ALI_H5', label: '支付寶', icon: 'alipay' },
  { wayCode: 'WX_H5', label: '微信支付', icon: 'wechat' },
  { wayCode: 'ALI_APP', label: '支付寶 App', icon: 'alipay' },  // 新增
];
```

### 自定義域名
```powershell
# 在 Cloudflare Dashboard 中添加自定義域名
# Pages 專案 → Custom domains → Set up
```

---

**30 分鐘計時開始！準備好就開始吧！** ⏱️
