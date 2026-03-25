# King-Chicken Payment System v2 - SaaS Platform

支持多租戶的支付平台系統，基於 Cloudflare Worker + D1。

## 架構特點

### 多租戶設計

```
單一 Worker 實例服務多個商戶

商戶A (KC)        商戶B (CLIENT2)     商戶C (CLIENT3)
   │                   │                   │
   └───────────────────┼───────────────────┘
                       ▼
            ┌─────────────────────┐
            │   Cloudflare Worker │
            │   /api/v1/:merchant │
            └─────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │   D1 Database       │
            │   merchants 表      │
            │   transactions 表   │
            └─────────────────────┘
```

### API 路由設計

```
/api/v1/:merchantCode/              - 獲取商戶配置
/api/v1/:merchantCode/payment/create - 創建支付
/api/v1/:merchantCode/admin/transactions - 查詢交易
/api/v1/:merchantCode/admin/statistics   - 統計數據
/api/v1/:merchantCode/admin/remark       - 更新備註
/webhook/easylink                        - 支付回調
```

### 商戶配置存儲

每個商戶獨立的配置存儲在 `merchants` 表中：

```sql
merchants
├── id
├── code (KC, CLIENT2...)
├── name
├── easylink_mch_no
├── easylink_app_id
├── easylink_app_secret
├── config (JSON: theme, logo, currency)
└── admin credentials
```

## 前端 URL 格式

### 支付頁面

```
/payment/?merchant=KC
/payment/?merchant=CLIENT2
```

### 管理後台

```
/admin/  (商戶選擇器切換)
```

## 部署步驟

### 1. 創建 D1 數據庫

```bash
cd apps/worker
npx wrangler d1 create kingchicken-db-v2
```

更新 `wrangler.toml` 中的 `database_id`。

### 2. 執行遷移

```bash
npx wrangler d1 execute kingchicken-db-v2 --file=../../packages/database/migrations/001_saas_schema.sql
```

### 3. 更新 King-Chicken 配置

```bash
# 設置 EasyLink App ID 和 Secret
npx wrangler d1 execute kingchicken-db-v2 --command="UPDATE merchants SET easylink_app_id='YOUR_APP_ID', easylink_app_secret='YOUR_APP_SECRET' WHERE code='KC';"
```

### 4. 部署 Worker

```bash
npx wrangler deploy
```

### 5. 部署前端

```bash
# 根據你的實際 Worker URL 更新前端配置
cd ../../apps/web
# 編輯各個 index.html 中的 API_BASE

# 部署到 Pages
npx wrangler pages deploy . --project-name=kingchicken-v2
```

### 6. 配置 GitHub Actions (可選)

設置 Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 添加新商戶

```sql
INSERT INTO merchants (code, name, status, easylink_mch_no, easylink_app_id, easylink_app_secret, config, admin_username, admin_password, created_at, updated_at)
VALUES (
    'CLIENT2',
    'New Client',
    'active',
    '30105',
    'new_app_id',
    'new_app_secret',
    '{"theme":"blue","logo":"🏪"}',
    'admin',
    'password',
    strftime('%s', 'now'),
    strftime('%s', 'now')
);
```

## 與舊系統對比

| 特性 | 舊系統 | v2 SaaS |
|------|--------|---------|
| 架構 | 單一商戶硬編碼 | 多租戶動態配置 |
| 商戶切換 | 需重新部署 | URL 參數切換 |
| 數據隔離 | 無 | 數據庫級別隔離 |
| 擴展性 | 每商戶需新 Worker | 單一 Worker 支持無限商戶 |

## 域名切換計劃

1. 部署 v2 到 `kingchicken-v2.pages.dev`
2. 測試所有功能正常
3. 更新 DNS 將 `king-chicken.jkdcoding.com` 指向新 Pages
4. 舊系統保持運行作為備份

## 成本估算

- **Worker**: 免費額度 100k requests/day
- **D1**: 免費額度 5M rows read/day
- **Pages**: 免費

**支持 100+ 商戶完全在免費額度內**
