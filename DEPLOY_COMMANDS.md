# EasyLink Payment Platform v2 - 部署命令

## 快速部署

直接執行 `deploy.bat` 或按以下步驟手動部署：

## 手動部署步驟

### 1. 推送代碼到 GitHub
```bash
git push origin master
```

### 2. 進入 Worker 目錄
```bash
cd apps/worker
```

### 3. 創建 D1 數據庫
```bash
wrangler d1 create easylink-db-v2
```
**記錄輸出的 `database_id`**

### 4. 更新 wrangler.toml
編輯 `apps/worker/wrangler.toml`，填入上一步的 `database_id`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "easylink-db-v2"
database_id = "your-actual-database-id-here"
```

### 5. 執行數據庫遷移
```bash
# 創建表結構
wrangler d1 execute easylink-db-v2 --file=../../packages/database/migrations/001_saas_schema.sql

# 添加退款表
wrangler d1 execute easylink-db-v2 --file=../../packages/database/migrations/002_add_refund_table.sql
```

### 6. 設置 King-Chicken 的 EasyLink 憑證
```bash
# 更新 KC 的 EasyLink 配置
wrangler d1 execute easylink-db-v2 --command="UPDATE merchants SET easylink_app_id='YOUR_APP_ID', easylink_app_secret='YOUR_APP_SECRET' WHERE code='KC';"
```

### 7. 部署 Worker
```bash
wrangler deploy
```

**記錄部署後的 Worker URL**，例如：
`https://easylink-api-v2.your-account.workers.dev`

### 8. 更新前端 API 地址
編輯以下文件，將 `API_BASE` 改為實際的 Worker URL：
- `apps/web/payment/index.html`
- `apps/web/admin/index.html`

```javascript
const API_BASE = 'https://easylink-api-v2.your-account.workers.dev';
```

### 9. 部署前端到 Pages
```bash
# 返回根目錄
cd ../..

# 部署到 Pages
npx wrangler pages deploy . --project-name=easylink-v2
```

如果項目還不存在，需要先創建：
```bash
npx wrangler pages project create easylink-v2
```

### 10. 配置 GitHub Actions Secrets (可選)
在 GitHub 倉庫設置中添加：
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 驗證部署

### 測試 Worker
```bash
curl https://easylink-api-v2.your-account.workers.dev/health
```

應返回：
```json
{"status":"ok","version":"2.1.0-easylink"}
```

### 測試前端
訪問：
- 支付頁面: `https://easylink-v2.pages.dev/payment/?merchant=KC`
- 管理後台: `https://easylink-v2.pages.dev/admin/`

## 故障排除

### "database_id not found"
- 確保已在 `wrangler.toml` 中填入正確的 `database_id`

### "Secrets not found"
- 確保已執行 `wrangler secret put` 設置必要 secrets

### "Cannot connect to database"
- 檢查 D1 數據庫是否已創建
- 檢查 `database_id` 是否正確

## 域名切換 (部署後)

當新系統測試完成後：

1. 在 Cloudflare Pages 設置自定義域名
2. 將 `king-chicken.jkdcoding.com` 指向 `easylink-v2.pages.dev`
3. 更新 DNS 記錄
