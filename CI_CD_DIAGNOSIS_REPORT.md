# CI/CD 自動部署問題診斷報告

## 🔍 發現的問題

### 問題 1: GitHub Actions 觸發條件限制

**文件**: `.github/workflows/deploy-frontend.yml`

```yaml
on:
  push:
    branches: [main, master]
    paths:                    # ⚠️ 這裡限制了觸發條件！
      - 'UpayClient/_KC/**'
      - '.github/workflows/deploy-frontend.yml'
```

**問題**: 只有當 `UpayClient/_KC/` 目錄下的文件**變更**時，才會觸發部署。

**當前狀態**:
```
有修改但未提交的文件:
  M UpayClient/_KC/index.html  ✅ 這個變更會觸發部署
  M easylink-admin/src/App.tsx ❌ 這個不會觸發前端部署
```

---

### 問題 2: GitHub Secrets 配置位置

從用戶之前的截圖看到：

```
Environment secrets (Cloudflare)
├── CLOUDFLARE_ACCOUNT_ID
└── CLOUDFLARE_API_TOKEN
```

**問題**: Secrets 設置在 **Environment** 級別，而不是 **Repository** 級別！

**影響**: GitHub Actions workflow 無法讀取 Environment secrets，除非指定 environment。

---

### 問題 3: Cloudflare Pages 項目配置

**當前狀態**:
- 項目名稱: `upay-client-kc`
- 創建方式: Direct Upload（通過 API）
- Git 集成: ❌ 未配置

**問題**: 項目最初是通過 Direct Upload 創建的，沒有正確的 Git 集成配置。

---

### 問題 4: Workflow 使用錯誤的 Action

**當前配置**:
```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
```

**問題**: `cloudflare/pages-action@v1` 是為 Git 集成設計的，對於 Direct Upload 項目可能不兼容。

---

## ✅ 解決方案

### 方案 1: 修復 Secrets 配置（推薦）

**步驟**:
1. 前往 `https://github.com/twmeric/upay-client-kc/settings/secrets/actions`
2. 點擊 "New repository secret"（不是 Environment secret）
3. 添加以下 Repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. 刪除或保留 Environment secrets 作為備用

---

### 方案 2: 修復 Workflow 配置

**修改 `.github/workflows/deploy-frontend.yml`**:

```yaml
name: Deploy Frontend to Pages

on:
  push:
    branches: [main, master]
    # 移除 paths 限制，任何推送到 main/master 都觸發部署
  workflow_dispatch:  # 保留手動觸發

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # 直接使用 Wrangler CLI 部署
      - name: Deploy via Wrangler
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          npm install -g wrangler@3
          cd UpayClient/_KC
          wrangler pages deploy . --project-name=upay-client-kc --branch=main
```

---

### 方案 3: 重建 Pages 項目（最徹底）

**步驟**:
1. 刪除現有的 `upay-client-kc` Pages 項目
2. 在 Cloudflare Dashboard 中重新創建，選擊 "Connect to Git"
3. 選擊 GitHub 倉庫 `twmeric/upay-client-kc`
4. 配置構建设置：
   - Build command: （留空，因為是靜態文件）
   - Build output directory: `UpayClient/_KC`

---

## 🚀 立即測試

### 測試 1: 手動觸發 GitHub Actions

前往：
```
https://github.com/twmeric/upay-client-kc/actions/workflows/deploy-frontend.yml
```

點擊 "Run workflow" 按鈕，查看是否成功。

### 測試 2: 本地推送觸發

```bash
cd C:\Users\Owner\Cloudflare\kingchicken
git add UpayClient/_KC/
git commit -m "Test: Trigger CI/CD deployment"
git push origin master
```

然後查看：
```
https://github.com/twmeric/upay-client-kc/actions
```

---

## 📝 建議的最終配置

### 1. Repository Secrets（必須）

在 `Settings > Secrets and variables > Actions` 中設置：

| Secret Name | Value |
|-------------|-------|
| `CLOUDFLARE_API_TOKEN` | `cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca` |
| `CLOUDFLARE_ACCOUNT_ID` | `dfbee5c2a5706a81bc04675499c933d4` |

### 2. 簡化 Workflow

使用 Wrangler CLI 直接部署（更可靠）：

```yaml
name: Deploy to Pages

on:
  push:
    branches: [main, master]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Wrangler
        run: npm install -g wrangler@3
      
      - name: Deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          cd UpayClient/_KC
          wrangler pages deploy . --project-name=upay-client-kc --branch=main
```

---

## 🎯 總結

| 問題 | 嚴重程度 | 解決方案 |
|------|---------|---------|
| Secrets 在 Environment 級別 | 🔴 高 | 移到 Repository 級別 |
| Workflow paths 限制 | 🟡 中 | 移除 paths 限制 |
| 使用 pages-action | 🟡 中 | 改用 Wrangler CLI |
| Pages 項目無 Git 集成 | 🟡 中 | 重建項目或繼續用 Direct Upload |

**最可能的原因**: Secrets 設置在 Environment 而不是 Repository 級別！
