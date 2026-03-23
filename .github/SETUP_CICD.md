# CI/CD 自動化設置指南

## 🚀 快速啟動

### 1. 在 GitHub 倉庫設置 Secrets

前往 `Settings > Secrets and variables > Actions`，添加以下 Secrets：

| Secret Name | Value | 說明 |
|------------|-------|------|
| `CLOUDFLARE_API_TOKEN` | `cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | `dfbee5c2a5706a81bc04675499c933d4` | Cloudflare 賬戶 ID |

### 2. 啟用 GitHub Actions

推送 `.github/workflows/` 文件夾到倉庫後，Actions 會自動啟用。

```bash
git add .github/workflows/
git commit -m "Add CI/CD workflows"
git push origin main
```

---

## 📋 Workflows 說明

### 1. `deploy-frontend.yml` - 前端自動部署
**觸發條件:**
- Push 到 `main` 分支且修改了 `UpayClient/_KC/**`
- 手動觸發 (workflow_dispatch)

**功能:**
- 自動部署到 Cloudflare Pages (upay-client-kc)
- 創建 CORS headers

### 2. `deploy-backend.yml` - 後端自動部署
**觸發條件:**
- Push 到 `main` 分支且修改了 `payment-worker/**`
- 手動觸發 (可選 D1 遷移)

**功能:**
- 部署 Worker (payment-api)
- 健康檢查
- 可選 D1 數據庫遷移

### 3. `deploy-all.yml` - 一鍵全量部署
**觸發條件:**
- 僅手動觸發

**功能:**
- 同時部署前後端
- 自動同步 API_BASE

### 4. `ci-check.yml` - PR 檢查
**觸發條件:**
- Pull Request
- Push 到 main

**功能:**
- 檢查 HTML 語法
- 驗證 Worker 配置
- 測試 API 連通性

---

## 🔧 本地測試

### 測試前端
```bash
cd UpayClient/_KC
npx serve .
```

### 測試後端
```bash
cd payment-worker
npx wrangler dev
```

---

## ⚠️ 重要提醒

1. **不要**將 API Token 提交到代碼庫
2. **定期輪換** Token (建議 90 天)
3. **保護** `main` 分支，需要 PR Review
4. **監控** Actions 執行狀態

---

## 🆘 故障排查

### 部署失敗?
1. 檢查 Secrets 是否正確設置
2. 確認 Cloudflare 項目已創建
3. 查看 Actions 日誌獲取詳細錯誤

### API 連接失敗?
1. 確認 Worker URL 正確
2. 檢查 CORS 配置
3. 驗證 API endpoint 存在
