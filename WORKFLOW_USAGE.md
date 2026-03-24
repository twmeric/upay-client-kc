# GitHub Actions Workflow 使用指南

## 📁 文件位置

Workflow 文件已保存到：
```
Desktop\deploy.yml
```

---

## 🚀 使用方法

### 步驟 1: 創建文件夾

在你的 GitHub 倉庫中創建以下目錄結構：
```
.github/
└── workflows/
    └── deploy.yml
```

操作：
1. 打開 https://github.com/twmeric/upay-client-kc
2. 點擊 "Add file" → "Create new file"
3. 輸入路徑：`.github/workflows/deploy.yml`

### 步驟 2: 複制 Workflow 內容

1. 打開 `Desktop\deploy.yml`
2. 複制全部內容
3. 粘貼到 GitHub 的文件編輯器中
4. 點擊 "Commit new file"

### 步驟 3: 設置 Secrets

前往：
```
https://github.com/twmeric/upay-client-kc/settings/secrets/actions
```

點擊 "New repository secret"，添加以下兩個：

| 名稱 | 值 |
|------|-----|
| `CLOUDFLARE_API_TOKEN` | `cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca` |
| `CLOUDFLARE_ACCOUNT_ID` | `dfbee5c2a5706a81bc04675499c933d4` |

⚠️ **重要**：必須選擊 **Repository secrets**，不是 Environment secrets！

### 步驟 4: 觸發部署

**方法 A: 自動觸發**
```bash
# 本地推送代碼
git add .
git commit -m "Update files"
git push origin master
```

**方法 B: 手動觸發**
1. 前往 https://github.com/twmeric/upay-client-kc/actions
2. 點擊 "Deploy to Cloudflare Pages"
3. 點擊 "Run workflow" → "Run workflow"

---

## ✅ 驗證部署

部署成功後，訪問：
```
https://upay-client-kc.pages.dev
```

查看部署狀態：
```
https://github.com/twmeric/upay-client-kc/actions
```

---

## 🔧 故障排查

### 問題 1: "Authentication error"
**原因**: Secrets 未正確設置
**解決**: 檢查 CLOUDFLARE_API_TOKEN 和 CLOUDFLARE_ACCOUNT_ID

### 問題 2: "Project not found"
**原因**: Cloudflare Pages 項目不存在
**解決**: 在 Cloudflare Dashboard 創建 upay-client-kc 項目

### 問題 3: 部署成功但網站未更新
**原因**: CDN 緩存
**解決**: 等待 1-2 分鈡，或強制刷新 (Ctrl+F5)

---

## 📋 Workflow 功能

✅ **自動觸發**: Push 到 main/master 分支時自動部署  
✅ **手動觸發**: 可在 Actions 頁面手動運行  
✅ **文件驗證**: 部署前檢查文件是否存在  
✅ **錯誤提示**: 部署失敗時顯示詳細錯誤信息  

---

## 🎯 直接複製使用

如果你不想手動創建，可以直接複制以下內容到 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

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
