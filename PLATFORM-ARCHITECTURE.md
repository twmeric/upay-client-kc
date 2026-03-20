# Payment Gateway 平台架構

## 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                    King-Chicken Payment                     │
│                      統一支付平台                            │
├─────────────────────────────────────────────────────────────┤
│  我們運營（Cloudflare Workers + D1 + EasyLink）             │
│  客戶只需調用 API，無需關心底層技術                           │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ Shopify │          │ 獨立站   │          │  其他   │
   │ 商店    │          │ Laravel │          │ 平台   │
   └─────────┘          └─────────┘          └─────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    調用 REST API
                    (X-API-Key: xxx)
```

## 對齊理解

| 角色 | 責任 | 技術細節 |
|------|------|----------|
| **我們** | 運營支付平台 | Cloudflare, EasyLink, 數據庫 |
| **客戶** | 調用 API 集成 | 只需知道 API Key 和端點 |

**客戶不需要：**
- ❌ Cloudflare 賬號
- ❌ 自己部署代碼
- ❌ 管理服務器

**客戶只需要：**
- ✅ 我們提供的 API Key
- ✅ 調用 REST API
- ✅ 處理支付結果

## 商戶（客戶）集成流程

### 1. 註冊商戶
- 在我們後台創建商戶賬號
- 系統自動生成：`API Key`、`API Secret`、`商戶號`

### 2. 獲取憑證
```
API Endpoint: https://api.king-chicken.com
API Key:      pk_live_xxxxxxxxxxxx
API Secret:   sk_live_xxxxxxxxxxxx（用於服務器端）
商戶號:       KC000001
```

### 3. 集成方式（三選一）

#### A. REST API 直接調用
```javascript
// 客戶的網站（任何技術棧）
const response = await fetch('https://api.king-chicken.com/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'pk_live_xxxxxxxxxxxx'
  },
  body: JSON.stringify({
    amount: 100.00,
    currency: 'HKD',
    pay_type: 'alipay_hk',
    order_id: 'ORDER_123',
    return_url: 'https://customer-site.com/success',
    notify_url: 'https://customer-site.com/webhook'
  })
});

const result = await response.json();
// 跳轉到支付頁面
window.location.href = result.payment_url;
```

#### B. JavaScript SDK
```html
<script src="https://cdn.king-chicken.com/sdk/v1/payment.js"></script>
<script>
  const payment = new KingChickenPayment('pk_live_xxxxxxxxxxxx');
  
  payment.create({
    amount: 100.00,
    payType: 'alipay_hk',
    onSuccess: (result) => {
      console.log('支付成功', result);
    },
    onError: (error) => {
      console.log('支付失敗', error);
    }
  });
</script>
```

#### C. Shopify App（未來）
- 在 Shopify App Store 安裝我們的 App
- 一鍵配置，無需寫代碼

### 4. 處理 Webhook
客戶提供一個 webhook URL，我們在支付完成時通知他們：

```javascript
// 客戶服務器端
app.post('/webhook/payment', (req, res) => {
  const { order_id, status, signature } = req.body;
  
  // 驗證簽名
  if (verifySignature(req.body, 'sk_live_xxxxxxxxxxxx')) {
    // 更新訂單狀態
    updateOrder(order_id, status);
    res.send('OK');
  }
});
```

## API 端點設計

### 公共端點（客戶調用）

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| POST | `/v1/payments` | 創建支付 | API Key |
| GET | `/v1/payments/:id` | 查詢支付 | API Key |
| POST | `/v1/payments/:id/cancel` | 取消支付 | API Key + Secret |
| POST | `/v1/payments/:id/refund` | 退款 | API Key + Secret |
| GET | `/v1/payments` | 交易列表 | API Key + Secret |

### Webhook 通知

當支付狀態變更時，我們會向客戶提供的 `notify_url` 發送：

```json
{
  "event": "payment.completed",
  "data": {
    "payment_id": "pay_xxxxxxxx",
    "order_id": "ORDER_123",
    "amount": 100.00,
    "currency": "HKD",
    "status": "completed",
    "paid_at": "2024-03-20T10:30:00Z"
  },
  "signature": "sha256=xxxxxxxx"
}
```

## 商戶管理後台（我們用）

### 功能模塊

1. **商戶列表**
   - 查看所有商戶
   - 啟用/停用商戶
   - 查看商戶交易統計

2. **商戶詳情**
   - 基本信息（名稱、聯繫人、郵箱）
   - API Key 管理
   - EasyLink 配置（mchNo, appId, appSecret）
   - 交易記錄

3. **交易監控**
   - 實時交易看板
   - 異常交易告警
   - 退款管理

## 數據隔離

每個商戶的數據完全隔離：
- 交易記錄：關聯商戶 ID
- API Key：唯一標識商戶
- 統計數據：按商戶分組

```sql
-- 商戶表
CREATE TABLE merchants (
  id INTEGER PRIMARY KEY,
  merchant_no TEXT UNIQUE,      -- KC000001
  name TEXT,
  api_key TEXT UNIQUE,          -- pk_live_xxx
  api_secret TEXT,              -- sk_live_xxx
  easylink_mch_no TEXT,
  easylink_app_id TEXT,
  easylink_app_secret TEXT,
  status INTEGER DEFAULT 1,
  created_at INTEGER
);

-- 交易表（關聯商戶）
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  merchant_id INTEGER,          -- 關聯商戶
  order_no TEXT,
  amount INTEGER,
  status INTEGER,
  -- ...
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);
```

## 下一步行動

1. ✅ 對齊理解：客戶只需調用 API，無需部署
2. 🔄 修改 Worker：支持 API Key 識別商戶
3. 🔄 添加商戶管理後台
4. 🔄 提供客戶集成文檔和 SDK

這樣理解正確嗎？🎯
