# King-Chicken v2 - 部署指南

## 前置要求

1. **Cloudflare 帳號**
2. **Node.js 20+**
3. **GitHub 帳號** (用於 CI/CD)

## 第一步: 創建 Cloudflare 資源

### 1. 創建 D1 數據庫

```bash
cd apps/worker
npx wrangler d1 create kingchicken-db-v2
```

記錄返回的 `database_id`，更新 `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "kingchicken-db-v2"
database_id = "your-database-id-here"
```

### 2. 執行數據庫遷移

```bash
npx wrangler d1 execute kingchicken-db-v2 --file=../../packages/database/migrations/001_initial.sql
```

### 3. 設置 Secrets

```bash
# EasyLink 憑證
npx wrangler secret put EASYLINK_APP_ID
npx wrangler secret put EASYLINK_APP_SECRET
```

## 第二步: 配置 GitHub Secrets

在 GitHub 倉庫設置中添加:

| Secret Name | 說明 |
|-------------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

### 創建 API Token

1. 訪問 https://dash.cloudflare.com/profile/api-tokens
2. 點擊 "Create Token"
3. 使用 "Custom token" 模板
4. 權限設置:
   - Cloudflare Pages: Edit
   - Workers Scripts: Edit
   - D1: Edit
   - Account: Read

## 第三步: 部署

### 手動部署

```bash
# 部署 Worker
npm run deploy:worker

# 部署前端
npm run deploy:web

# 或一次性部署全部
npm run deploy
```

### 自動部署 (GitHub Actions)

推送到 main 分支即可自動觸發部署:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

## 第四步: 驗證

### 檢查 Worker

```bash
curl https://kingchicken-api-v2.YOUR_ACCOUNT.workers.dev/health
```

應返回:
```json
{"status":"ok","version":"2.0.0"}
```

### 檢查前端

訪問:
- 支付頁面: `https://kingchicken-v2.pages.dev/payment/`
- 管理後台: `https://kingchicken-v2.pages.dev/admin/`
- 登入頁面: `https://kingchicken-v2.pages.dev/login/`

## 故障排除

### Worker 部署失敗

檢查 `wrangler.toml`:
- `database_id` 是否正確
- Account ID 是否正確

### 前端無法訪問 API

檢查 CORS 設置:
- 在 `apps/worker/src/index.js` 中更新 `CORS_ORIGINS`
- 確保包含你的 Pages 域名

### 數據庫錯誤

執行數據庫遷移:
```bash
npm run db:migrate
```

## 自定義域名 (可選)

### 配置 Worker 自定義域名

1. 在 Cloudflare 儀表板選擇 Worker
2. 點擊 "Triggers" → "Custom Domains"
3. 添加你的域名

### 配置 Pages 自定義域名

1. 在 Cloudflare 儀表板選擇 Pages 項目
2. 點擊 "Custom domains"
3. 添加你的域名
