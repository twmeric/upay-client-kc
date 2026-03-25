# EasyLink Payment API 規格

## Base URL
```
https://payment-api.jimsbond007.workers.dev/api/v1/client/KC
```

## 認證
所有管理 API 需要 Bearer Token:
```
Authorization: Bearer {token}
```

Token 通過登入 API 獲取。

---

## 1. 創建支付訂單

### Endpoint
```
POST /payment/create
```

### Request Body
```json
{
  "amount": 100.00,
  "payType": "UP_OP",
  "subject": "Payment Description"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "orderNo": "ORDXXXXXXXX",
    "payUrl": "https://...",
    "amount": 100.00,
    "currency": "HKD"
  }
}
```

---

## 2. 管理員登入

### Endpoint
```
POST /admin/login
```

### Request Body
```json
{
  "username": "mimichu",
  "password": "98113210"
}
```

### Response
```json
{
  "success": true,
  "token": "xxx",
  "user": {
    "id": 1,
    "username": "mimichu",
    "name": "咪咪姐",
    "role": "admin"
  }
}
```

---

## 3. 查詢交易記錄

### Endpoint
```
GET /admin/transactions?startDate=2024-01-01&endDate=2024-12-31&status=success&search=ORD
```

### Query Parameters
| 參數 | 類型 | 說明 |
|------|------|------|
| startDate | string | 開始日期 (YYYY-MM-DD) |
| endDate | string | 結束日期 (YYYY-MM-DD) |
| status | string | 狀態篩選 (pending/success/failed) |
| search | string | 搜索訂單號 |

### Response
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "orderId": "ORD-001",
      "payOrderId": "P202403240001",
      "amount": 100.00,
      "currency": "HKD",
      "payType": "UP_OP",
      "status": "success",
      "remark": "",
      "createdAt": "24/3/2026 下午4:55:33"
    }
  ]
}
```

**注意:** 時間已轉換為香港時間 (UTC+8)

---

## 4. 更新交易備註

### Endpoint
```
PUT /admin/transactions
```

### Request Body
```json
{
  "orderId": "ORD-001",
  "remark": "客戶要求退款"
}
```

### Response
```json
{
  "success": true,
  "message": "Remark updated"
}
```

---

## 5. 導出 Excel

### Endpoint
```
GET /admin/transactions/export?startDate=2024-01-01&endDate=2024-12-31&status=success
```

### Response
返回 XLSX 文件下載

---

## 6. 數據庫狀態

### Endpoint
```
GET /admin/db-status
```

### Response
```json
{
  "success": true,
  "dbAvailable": true,
  "clientCode": "KC",
  "transactionCount": 150,
  "todayStats": {
    "count": 5,
    "revenue": 50000,
    "successCount": 4
  }
}
```

---

## 錯誤處理

所有 API 錯誤返回格式:
```json
{
  "success": false,
  "error": "錯誤信息"
}
```

HTTP 狀態碼:
- 200: 成功
- 400: 請求參數錯誤
- 401: 未授權
- 404: 資源不存在
- 500: 服務器內部錯誤
