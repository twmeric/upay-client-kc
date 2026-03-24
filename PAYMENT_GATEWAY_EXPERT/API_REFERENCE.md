# 📚 API 參考手冊

> Payment Gateway 接駁專家 - EasyLink API 完整文檔

---

## 🔗 環境地址

| 環境 | API URL |
|------|---------|
| Test | `https://ts-api-pay.gnete.com.hk` |
| Production | `https://api-pay.gnete.com.hk` |

---

## 🔐 認證方式

所有請求使用 **MD5 簽名** 認證。

### 簽名步驟

1. **收集參數** (排除 `sign` 和空值)
2. **ASCII 排序** 參數名
3. **拼接字符串**: `key1=value1&key2=value2...`
4. **追加密鑰**: `&key=AppSecret`
5. **MD5 加密** 並轉大寫

### JavaScript 實現

```javascript
async function generateSign(params, secret) {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== '' && k !== 'sign')
    .sort();
  const signStr = sorted.map(k => `${k}=${params[k]}`).join('&');
  const signString = signStr + `&key=${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
```

---

## 📡 API 端點

### 1. 創建支付訂單

```http
POST /api/pay/unifiedOrder
```

**請求參數**:

| 參數 | 必填 | 類型 | 說明 |
|------|------|------|------|
| mchNo | 是 | string | 商戶號 |
| appId | 是 | string | 應用 ID |
| mchOrderNo | 是 | string | 商戶訂單號 |
| wayCode | 是 | string | 支付方式 |
| amount | 是 | int | 金額 (分) |
| currency | 是 | string | 貨幣 (HKD) |
| subject | 是 | string | 商品標題 |
| body | 是 | string | 商品描述 |
| notifyUrl | 是 | string | 異步通知 URL |
| returnUrl | 否 | string | 同步跳轉 URL |
| reqTime | 是 | long | 請求時間戳 |
| version | 是 | string | 版本 (1.0) |
| signType | 是 | string | MD5 |
| sign | 是 | string | 簽名 |

**支付方式 (wayCode)**:

| 代碼 | 說明 |
|------|------|
| UP_OP | 銀聯在線支付 |
| ALI_H5 | 支付寶 H5 |
| WX_H5 | 微信 H5 |
| ALI_APP | 支付寶 App |
| WX_APP | 微信 App |

**響應示例**:

```json
{
  "code": 0,
  "msg": "SUCCESS",
  "data": {
    "payOrderId": "P2024031912000000001",
    "mchOrderNo": "ORD20240319120000",
    "orderState": 1,
    "payDataType": "payurl",
    "payData": "https://api-pay.gnete.com.hk/api/unionpay/upop/cashier?orderId=..."
  },
  "sign": "xxx"
}
```

---

### 2. 查詢訂單

```http
POST /api/pay/query
```

**請求參數**:

| 參數 | 必填 | 說明 |
|------|------|------|
| mchNo | 是 | 商戶號 |
| appId | 是 | 應用 ID |
| mchOrderNo | 是 | 商戶訂單號 |
| reqTime | 是 | 時間戳 |
| version | 是 | 1.0 |
| signType | 是 | MD5 |
| sign | 是 | 簽名 |

**響應示例**:

```json
{
  "code": 0,
  "data": {
    "payOrderId": "Pxxx",
    "mchOrderNo": "ORDxxx",
    "state": 2,
    "amount": 100,
    "currency": "HKD",
    "wayCode": "UP_OP"
  }
}
```

---

### 3. 關閉訂單

```http
POST /api/pay/close
```

---

### 4. 撤銷訂單

```http
POST /api/pay/cancel
```

---

## 🔔 Webhook 通知

### 通知參數

當訂單狀態變化時，EasyLink 會發送 POST 請求到 `notifyUrl`。

**參數**:

| 參數 | 說明 |
|------|------|
| payOrderId | 支付訂單號 |
| mchOrderNo | 商戶訂單號 |
| state | 訂單狀態 (2=成功) |
| amount | 金額 |
| wayCode | 支付方式 |
| sign | 簽名 |

**響應要求**:
- 成功: 返回字符串 `success` (小寫)
- 失敗: 返回任意非 `success` 字符串

---

## 📊 訂單狀態

| 狀態碼 | 說明 |
|--------|------|
| 0 | 訂單生成 |
| 1 | 支付中 |
| 2 | 支付成功 |
| 3 | 支付失敗 |
| 4 | 已撤銷 |
| 5 | 已退款 |
| 6 | 訂單關閉 |

---

## ❌ 錯誤碼

| 碼 | 說明 | 解決方案 |
|----|------|---------|
| 0 | 成功 | - |
| 9999 | 簽名驗證失敗 | 檢查簽名邏輯 |
| 10001 | 商戶不存在 | 檢查 mchNo |
| 10002 | 應用不存在 | 檢查 appId |
| 10003 | 支付方式不支持 | 檢查 wayCode |
| 10004 | 訂單已存在 | 使用新的訂單號 |

---

**完整文檔**: https://ts-api-pay.gnete.com.hk/guide/online/payment.html
