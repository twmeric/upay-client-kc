# 🔧 故障排除手冊

> Payment Gateway 接駁專家 - 快速問題診斷與修復

---

## 🚨 嚴重問題 (P0)

### 1. 簽名驗證失敗 (errorCode: 9999)

**症狀**: 
```json
{"code":9999,"msg":"验签失败"}
```

**診斷步驟**:

1. **檢查 URL 構建** (最常見原因)
```javascript
// 錯誤
`${url.protocol}//${url.host}`  // https:://host ❌

// 正確
`https://${url.host}`  // https://host ✅
```

2. **驗證 AppSecret**
```javascript
// 檢查長度
console.log(secret.length); // 應該是 128

// 檢查內容 (使用調試端點)
POST /api/debug/sign
{"amount": 1, "payType": "UP_OP"}
```

3. **驗證參數排序**
```javascript
// 必須按 ASCII 排序
// 正確順序: amount, appId, body, currency, mchNo...
```

4. **驗證環境**
- Test 帳戶 → `https://ts-api-pay.gnete.com.hk`
- Production 帳戶 → `https://api-pay.gnete.com.hk`
- 不匹配會導致簽名失敗

**修復**:
```javascript
// 修復 URL 構建
const url = new URL(request.url);
const host = url.host;
const notifyUrl = `https://${host}/api/webhooks/easylink/notify`;
```

---

### 2. Worker 部署失敗

**症狀**: `wrangler deploy` 失敗

**診斷**:
```bash
# 檢查登入狀態
wrangler whoami

# 檢查 account_id
wrangler config list
```

**修復**:
```bash
# 重新登入
wrangler login

# 確認 wrangler.toml 中的 account_id
```

---

## ⚠️ 中等問題 (P1)

### 3. D1 數據庫連接失敗

**症狀**: 
```
Error: D1_ERROR: no such table: transactions
```

**診斷**:
```bash
# 檢查數據庫是否存在
wrangler d1 list

# 檢查 database_id 是否正確
cat wrangler.toml | grep database_id
```

**修復**:
```bash
# 重新執行遷移
wrangler d1 execute payment-db --file=./schema.sql --remote

# 或重新創建數據庫
wrangler d1 create payment-db
# 更新 wrangler.toml 中的 database_id
```

---

### 4. Secrets 未生效

**症狀**: `env.EASYLINK_MCH_NO` 為 undefined

**診斷**:
```bash
# 檢查 Secrets 列表
wrangler secret list
```

**修復**:
```bash
# 重新設置
wrangler secret put EASYLINK_MCH_NO

# 重新部署 (Secrets 更新後需要重新部署)
wrangler deploy
```

---

### 5. CORS 錯誤

**症狀**: 前端報錯 `CORS policy: No 'Access-Control-Allow-Origin' header`

**修復**:
```javascript
// 在 Worker 中添加 CORS 處理
function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

---

## 💡 輕微問題 (P2)

### 6. 前端無法連接 API

**診斷**:
```bash
# 檢查 API URL 配置
cat frontend/src/api/client.ts | grep WORKER_URL

# 測試 API
curl https://payment-api-xxx.workers.dev/api/health
```

**修復**:
```typescript
// 更新前端配置
const WORKER_URL = "https://payment-api-xxx.workers.dev";
```

---

### 7. Webhook 回調失敗

**診斷**:
- 檢查 EasyLink 後台配置的 notifyUrl
- 檢查 Worker 日誌

**修復**:
```bash
# 查看 Worker 日誌
wrangler tail

# 確認 Webhook 路由
POST /api/webhooks/easylink/notify
```

---

## 📊 常用調試命令

```bash
# 查看 Worker 日誌
wrangler tail

# 測試 API
curl https://payment-api-xxx.workers.dev/api/health

# 查詢 D1 數據
curl -X POST https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{db_id}/query \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sql": "SELECT * FROM transactions ORDER BY createdAt DESC LIMIT 5"}'

# 本地開發測試
wrangler dev --local
```

---

## 🆘 緊急聯繫

| 問題 | 聯繫對象 | 方式 |
|------|---------|------|
| EasyLink API | 好易聯技術支持 | 郵件/電話 |
| Cloudflare | Community/Discord | 網絡 |
| 模板問題 | 母機顧問團隊 | 內部系統 |

---

**記住：調試時保持冷靜，按步驟排查！** 🧘
