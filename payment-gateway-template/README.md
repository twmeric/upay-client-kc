# Payment Gateway 標準模板

## 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Gateway                         │
│                   標準 API 模板 v1.0                          │
├─────────────────────────────────────────────────────────────┤
│  Cloudflare Workers (API)  +  D1 Database  +  Pages (前端)   │
└─────────────────────────────────────────────────────────────┘
```

## 快速開始

### 1. 一鍵部署
```bash
# 複製模板
git clone https://github.com/your-org/payment-gateway-template.git
cd payment-gateway-template

# 安裝依賴
npm install

# 配置環境變量
cp wrangler.example.toml wrangler.toml
# 編輯 wrangler.toml，填入您的配置

# 部署
npm run deploy
```

### 2. 配置說明
```toml
# wrangler.toml
[vars]
ENVIRONMENT = "production"
EASYLINK_BASE_URL = "https://api-pay.gnete.com.hk"
CURRENCY = "HKD"
MERCHANT_NAME = "您的商戶名稱"
MERCHANT_NAME_EN = "Your Merchant Name"

# Secrets (使用 wrangler secret put 設置)
# - EASYLINK_MCH_NO: 您的商戶號
# - EASYLINK_APP_ID: 您的 App ID
# - EASYLINK_APP_SECRET: 您的 App Secret
# - CLOUDWAPI_KEY: WhatsApp API Key (可選)
```

## API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/payment/create` | POST | 創建支付訂單 |
| `/api/payment/query/:orderNo` | GET | 查詢訂單狀態 |
| `/api/webhooks/notify` | POST | 支付通知 Webhook |
| `/api/dashboard/stats` | GET | 獲取統計數據 |
| `/api/transactions` | GET | 獲取交易列表 |

## 目錄結構

```
payment-gateway-template/
├── worker/                 # Cloudflare Worker API
│   ├── src/
│   │   └── index.js       # 主入口
│   ├── wrangler.toml      # Worker 配置
│   └── schema.sql         # 數據庫結構
├── frontend/              # 前端管理後台
│   ├── src/
│   │   ├── pages/        # 頁面
│   │   └── components/   # 組件
│   └── package.json
├── docs/                  # API 文檔
│   ├── API-REFERENCE.md  # API 參考
│   └── INTEGRATION.md    # 集成指南
└── deploy.sh             # 一鍵部署腳本
```

## 商戶對接流程

1. **申請商戶號**：聯繫管理員獲取商戶號、App ID、App Secret
2. **部署系統**：使用此模板部署到您的 Cloudflare 賬號
3. **配置密鑰**：設置 EASYLINK 相關密鑰
4. **測試對接**：使用測試金額進行支付測試
5. **上線運營**：配置域名，正式上線

## 技術支持

如有問題，請聯繫：
- 技術支持：support@your-domain.com
- 文檔：https://docs.your-domain.com
