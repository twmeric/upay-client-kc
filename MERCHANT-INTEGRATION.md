# 商戶集成指南

## 快速開始

### 1. 獲取 API 憑證

聯繫我們開通商戶賬號後，您將獲得：

```
API Base URL: https://api.king-chicken.com
API Key:      pk_live_xxxxxxxxxxxxxxxx
API Secret:   sk_live_xxxxxxxxxxxxxxxx（服務器端使用）
```

---

## 2. 創建支付

### 請求
```http
POST https://api.king-chicken.com/v1/payments
Content-Type: application/json
X-API-Key: pk_live_xxxxxxxxxxxxxxxx

{
  "amount": 100.00,
  "currency": "HKD",
  "pay_type": "UP_OP",
  "order_id": "YOUR_ORDER_123",
  "description": "商品購買",
  "return_url": "https://your-site.com/payment/success",
  "notify_url": "https://your-site.com/webhook/payment",
  "customer": {
    "name": "張先生",
    "email": "customer@example.com",
    "phone": "85291234567"
  },
  "metadata": {
    "product_id": "PROD_001",
    "source": "website"
  }
}
```

### 參數說明

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `amount` | number | ✅ | 支付金額 |
| `currency` | string | ❌ | 貨幣，默認 HKD |
| `pay_type` | string | ✅ | UP_OP（銀聯）、ALI_H5（支付寶）、WX_H5（微信） |
| `order_id` | string | ✅ | 您的訂單號（唯一） |
| `description` | string | ❌ | 訂單描述 |
| `return_url` | string | ❌ | 支付完成後跳轉地址 |
| `notify_url` | string | ❌ | 支付結果通知地址 |
| `customer` | object | ❌ | 客戶信息 |
| `metadata` | object | ❌ | 自定義元數據 |

### 響應
```json
{
  "id": "PAYABC123XYZ",
  "status": "pending",
  "amount": 100.00,
  "currency": "HKD",
  "pay_type": "UP_OP",
  "payment_url": "https://pay.easylink.com/...",
  "expires_at": "2024-03-20T11:30:00Z",
  "merchant_order_id": "YOUR_ORDER_123"
}
```

### 前端集成
```javascript
// 創建支付
const createPayment = async () => {
  const response = await fetch('https://api.king-chicken.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'pk_live_xxxxxxxxxxxxxxxx'
    },
    body: JSON.stringify({
      amount: 100.00,
      pay_type: 'UP_OP',
      order_id: 'ORDER_' + Date.now(),
      description: '商品購買',
      return_url: 'https://your-site.com/success',
      notify_url: 'https://your-site.com/webhook'
    })
  });

  const result = await response.json();
  
  if (result.payment_url) {
    // 跳轉到支付頁面
    window.location.href = result.payment_url;
  }
};
```

---

## 3. 處理 Webhook 通知

### Webhook Payload
```json
{
  "event": "payment.completed",
  "data": {
    "id": "PAYABC123XYZ",
    "merchant_order_id": "YOUR_ORDER_123",
    "amount": 100.00,
    "currency": "HKD",
    "status": "completed",
    "pay_type": "UP_OP",
    "paid_at": "2024-03-20T10:30:00Z"
  },
  "signature": "sha256=xxxxxxxx"
}
```

### Webhook 驗證
```javascript
const crypto = require('crypto');

const verifyWebhook = (payload, signature, secret) => {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expected}`;
};

// Express 示例
app.post('/webhook/payment', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.parse(req.body);
  
  if (verifyWebhook(payload.data, signature, 'sk_live_xxxxxxxx')) {
    // 驗證通過，更新訂單
    if (payload.event === 'payment.completed') {
      updateOrder(payload.data.merchant_order_id, 'paid');
    }
    res.send('OK');
  } else {
    res.status(400).send('Invalid signature');
  }
});
```

---

## 4. 查詢支付狀態

```http
GET https://api.king-chicken.com/v1/payments/PAYABC123XYZ
X-API-Key: pk_live_xxxxxxxxxxxxxxxx
```

```json
{
  "id": "PAYABC123XYZ",
  "merchant_order_id": "YOUR_ORDER_123",
  "amount": 100.00,
  "currency": "HKD",
  "status": "completed",
  "pay_type": "UP_OP",
  "description": "商品購買",
  "created_at": "2024-03-20T10:00:00Z",
  "paid_at": "2024-03-20T10:30:00Z"
}
```

---

## 5. 平台特定集成

### Shopify
1. 在 Shopify 後台 → Settings → Payments
2. 選擇 "Manual Payment Method"
3. 名稱填寫 "銀行卡/支付寶/微信支付"
4. 客戶下單後，調用我們的 API 創建支付
5. 將支付鏈接發送給客戶

### WooCommerce（WordPress）
```php
// 在您的插件中
add_action('woocommerce_checkout_order_processed', function($order_id) {
    $order = wc_get_order($order_id);
    
    $response = wp_remote_post('https://api.king-chicken.com/v1/payments', [
        'headers' => [
            'Content-Type' => 'application/json',
            'X-API-Key' => 'pk_live_xxxxxxxx'
        ],
        'body' => json_encode([
            'amount' => $order->get_total(),
            'pay_type' => 'UP_OP',
            'order_id' => 'WC_' . $order_id,
            'return_url' => $order->get_checkout_order_received_url()
        ])
    ]);
    
    $result = json_decode(wp_remote_retrieve_body($response), true);
    
    if ($result['payment_url']) {
        wp_redirect($result['payment_url']);
        exit;
    }
});
```

### Laravel
```php
use Illuminate\Support\Facades\Http;

class PaymentController extends Controller
{
    public function create(Request $request)
    {
        $response = Http::withHeaders([
            'X-API-Key' => config('payment.api_key')
        ])->post('https://api.king-chicken.com/v1/payments', [
            'amount' => $request->amount,
            'pay_type' => $request->pay_type,
            'order_id' => 'ORDER_' . uniqid(),
            'return_url' => route('payment.success'),
            'notify_url' => route('payment.webhook')
        ]);

        return redirect($response->json('payment_url'));
    }
}
```

---

## 6. SDK（可選）

### JavaScript SDK
```html
<script src="https://cdn.king-chicken.com/sdk/v1/payment.js"></script>
<script>
  const payment = new KingChickenPayment('pk_live_xxxxxxxx');
  
  payment.create({
    amount: 100,
    payType: 'UP_OP',
    orderId: 'ORDER_123',
    onSuccess: (result) => {
      console.log('支付成功', result);
    },
    onError: (error) => {
      console.log('支付失敗', error);
    }
  });
</script>
```

### PHP SDK
```php
require_once 'king-chicken-sdk.php';

$client = new KingChicken\Client('pk_live_xxxxxxxx');

$payment = $client->payments->create([
    'amount' => 100.00,
    'pay_type' => 'UP_OP',
    'order_id' => 'ORDER_123'
]);

header('Location: ' . $payment->payment_url);
```

---

## 錯誤處理

| HTTP 狀態碼 | 錯誤碼 | 說明 |
|-------------|--------|------|
| 400 | INVALID_AMOUNT | 金額無效 |
| 400 | MISSING_ORDER_ID | 缺少訂單號 |
| 401 | UNAUTHORIZED | API Key 無效 |
| 403 | MERCHANT_DISABLED | 商戶已停用 |
| 404 | PAYMENT_NOT_FOUND | 支付不存在 |
| 409 | DUPLICATE_ORDER | 訂單號重複 |
| 429 | RATE_LIMITED | 請求過於頻繁 |
| 500 | INTERNAL_ERROR | 服務器錯誤 |

---

## 測試環境

測試 API Key: `pk_test_xxxxxxxxxxxxxxxx`
測試 URL: `https://api-sandbox.king-chicken.com`

測試支付不會真正扣款，可用於開發調試。

---

## 技術支持

如有問題，請聯繫：
- 技術郵箱：tech@king-chicken.com
- 在線文檔：https://docs.king-chicken.com
