# Payment Gateway API 參考文檔

## 基礎信息

| 項目 | 內容 |
|------|------|
| **API Base URL** | `https://your-worker.your-subdomain.workers.dev` |
| **Protocol** | HTTPS only |
| **Content-Type** | `application/json` |
| **Character Encoding** | UTF-8 |

---

## 1. 創建支付訂單

創建新的支付訂單，返回支付跳轉鏈接。

### Endpoint
```
POST /api/payment/create
```

### Request Body
```json
{
  "amount": 100.00,
  "payType": "UP_OP",
  "subject": "商品名稱",
  "body": "商品描述",
  "returnUrl": "https://your-site.com/payment/success"
}
```

### Parameters
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `amount` | number | ✅ | 支付金額（港幣） |
| `payType` | string | ✅ | `UP_OP`（銀聯）、`ALI_H5`（支付寶）、`WX_H5`（微信） |
| `subject` | string | ❌ | 訂單標題 |
| `body` | string | ❌ | 訂單描述 |
| `returnUrl` | string | ❌ | 支付完成後跳轉地址 |

### Response
```json
{
  "success": true,
  "orderNo": "ORD2024032010302512345678",
  "payUrl": "https://payment.easylink.com/pay/...",
  "amount": 10000
}
```

---

## 2. 查詢訂單狀態

### Endpoint
```
GET /api/payment/query/{orderNo}
```

### Response
```json
{
  "orderNo": "ORD2024032010302512345678",
  "amount": 10000,
  "status": 2,
  "statusText": "支付成功",
  "payType": "UP_OP",
  "createdAt": 1710912625,
  "paidAt": 1710912650
}
```

### Status Codes
| 狀態碼 | 說明 |
|--------|------|
| `0` | 訂單生成 |
| `1` | 支付中 |
| `2` | 支付成功 |
| `3` | 支付失敗 |

---

## 3. 支付通知 Webhook

```
POST /api/webhooks/notify
```

通知內容包含簽名，需驗證後返回 `success`。

---

## 4. 獲取交易列表

```
GET /api/transactions?page=1&limit=20&status=2&dateFrom=2024-03-01
```

---

## 示例代碼

### JavaScript
```javascript
const response = await fetch('https://api.example.com/api/payment/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100.00,
    payType: 'UP_OP',
    subject: '商品測試'
  })
});
```

### PHP
```php
$data = ['amount' => 100.00, 'payType' => 'UP_OP'];
$ch = curl_init('https://api.example.com/api/payment/create');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
```

### Python
```python
import requests
response = requests.post('https://api.example.com/api/payment/create', json={
    'amount': 100.00,
    'payType': 'UP_OP'
})
```
