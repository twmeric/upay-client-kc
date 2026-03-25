# King-Chicken v2 - 系統架構

## 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │   Cloudflare Pages  │      │    Cloudflare Worker    │  │
│  │                     │      │                         │  │
│  │  ┌───────────────┐  │      │  ┌───────────────────┐  │  │
│  │  │   /payment    │  │◄────►│  │  Payment API      │  │  │
│  │  │   (支付頁面)   │  │      │  │  - Create Order   │  │  │
│  │  └───────────────┘  │      │  │  - Query List     │  │  │
│  │                     │      │  │  - Statistics     │  │  │
│  │  ┌───────────────┐  │      │  │  - Webhook        │  │  │
│  │  │   /admin      │  │◄────►│  │                   │  │  │
│  │  │   (管理後台)   │  │      │  └───────────────────┘  │  │
│  │  └───────────────┘  │      │           │               │  │
│  │                     │      │           ▼               │  │
│  │  ┌───────────────┐  │      │  ┌───────────────────┐  │  │
│  │  │   /login      │  │      │  │  Cloudflare D1    │  │  │
│  │  │   (登入頁面)   │  │      │  │  Database         │  │  │
│  │  └───────────────┘  │      │  │  - Transactions   │  │  │
│  │                     │      │  │  - Recipients     │  │  │
│  └─────────────────────┘      │  └───────────────────┘  │  │
│                               └─────────────────────────┘  │
│                                         │                  │
│                                         ▼                  │
│                             ┌───────────────────┐         │
│                             │   EasyLink API    │         │
│                             │   (Payment GW)    │         │
│                             └───────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 技術選型理由

### 1. Cloudflare Worker (後端)

**優點:**
- 邊緣計算，全球低延遲
- 與 D1 數據庫原生集成
- 無服務器，自動擴展
- 免費額度充足

**替代方案比較:**
| 方案 | 優點 | 缺點 |
|------|------|------|
| AWS Lambda | 生態豐富 | 冷啟動延遲，配置複雜 |
| Vercel Functions | 部署簡單 | 綁定 Next.js 生態 |
| Supabase | 數據庫一體 | 成本較高 |

### 2. D1 Database (SQLite)

**優點:**
- 零配置，Serverless
- 熟悉 SQL 語法
- 與 Worker 同區域，延遲極低

**數據結構:**
```sql
transactions
├── id (PK)
├── order_no (唯一索引)
├── pay_order_id (索引)
├── amount, currency, pay_type
├── status, remark
├── created_at, updated_at (索引)
```

### 3. 純 HTML/JS (前端)

**優點:**
- 零構建時間
- 零依賴，長期維護簡單
- 體積小，加載快

## API 設計

### RESTful 端點

```
GET  /health                 - 健康檢查
POST /api/payment/create    - 創建支付
GET  /api/admin/transactions - 查詢交易列表
GET  /api/admin/statistics   - 獲取統計數據
POST /api/admin/remark      - 更新備註
POST /webhook/easylink      - EasyLink 回調
```

### 響應格式

```typescript
// 成功響應
{
  "success": true,
  "data": { ... }
}

// 錯誤響應
{
  "success": false,
  "error": "錯誤信息"
}
```

## 數據流

### 支付流程

```
1. 用戶選擇金額和支付方式
   ↓
2. 前端調用 POST /api/payment/create
   ↓
3. Worker 生成訂單號，寫入 D1 (status=pending)
   ↓
4. Worker 調用 EasyLink unifiedOrder API
   ↓
5. EasyLink 返回 payUrl
   ↓
6. Worker 更新訂單 (pay_order_id)
   ↓
7. 前端跳轉到 payUrl
   ↓
8. 用戶完成支付
   ↓
9. EasyLink 調用 webhook
   ↓
10. Worker 更新訂單狀態 (status=success)
```

### 交易查詢流程

```
1. 管理員打開管理後台
   ↓
2. 前端調用 GET /api/admin/statistics
   ↓
3. Worker 查詢 D1，計算今日/30天數據
   ↓
4. 前端調用 GET /api/admin/transactions
   ↓
5. Worker 查詢 D1，支持過濾和分頁
   ↓
6. 前端渲染表格
```

## 安全設計

### 1. 認證

- 管理後台: 簡單 Token + LocalStorage
- API: Bearer Token 驗證

### 2. 數據驗證

- 所有輸入參數類型檢查
- SQL 注入防護 (參數化查詢)
- XSS 防護 (純前端渲染)

### 3. CORS

- 嚴格的 Origin 白名單
- 僅允許必要的方法

### 4. 簽名驗證

- EasyLink API 調用使用 SHA-256 簽名
- Webhook 接收簡單驗證

## 擴展性

### 添加新支付方式

1. 在 `PAY_TYPE_NAMES` 添加名稱映射
2. 在前端添加新的支付方式 UI
3. 無需修改後端 (EasyLink 統一接口)

### 添加新報告類型

1. 在 Worker 添加新的 API 端點
2. 添加相應的數據庫查詢
3. 在前端報告頁面添加顯示

### 多商戶支持

當前設計已預留:
- `order_no` 包含前綴 (KC)
- 可通過 merchant_id 區分

## 監控與日誌

### Worker Logs

```bash
wrangler tail
```

### 關鍵指標

- 支付成功率
- API 響應時間
- 錯誤率

## 成本估算

| 組件 | 免費額度 | 預計用量 |
|------|---------|---------|
| Worker | 100k requests/day | ~1k/day |
| D1 | 5M rows read/day | ~10k/day |
| Pages | Unlimited | - |

**結論: 免費額度完全足夠**
