# 🚀 Cloudflare Pages 部署指南

## 當前狀態

✅ **已完成**
- 前端代碼構建成功 (`dist/` 文件夾已準備就緒)
- `wrangler.toml` 配置完成
- 環境變量設置正確

⚠️ **需要處理**
- API Token 需要更新權限

---

## 方案 A：手動上傳（最快，5分鐘）

### 步驟：

1. **打開 Cloudflare Dashboard**
   - 前往 https://dash.cloudflare.com
   - 登入您的帳戶

2. **創建 Pages 專案**
   - 點擊左側菜單 **"Workers & Pages"**
   - 點擊 **"Create application"**
   - 選擇 **"Pages"** 標籤
   - 點擊 **"Upload assets"**

3. **上傳文件**
   - 專案名稱：`payment-portal`
   - 將 `dist` 文件夾內的所有文件壓縮成 ZIP
   - 拖放上傳或選擇文件

4. **完成部署**
   - 點擊 **"Deploy site"**
   - 記下部署的 URL（例如：`https://payment-portal-xxx.pages.dev`）

---

## 方案 B：Wrangler CLI 部署（推薦，需要更新 Token）

### 步驟 1：創建新的 API Token

1. 前往 https://dash.cloudflare.com/profile/api-tokens
2. 點擊 **"Create Token"**
3. 使用模板 **"Edit Cloudflare Workers"** 或自定義：

| 權限 | 設置 |
|------|------|
| Account | Cloudflare Pages:Edit |
| Account | Account:Read |
| Zone | Zone:Read (可選，如果需要自定義域名) |

4. **Account Resources**:
   - Include: YOUR_ACCOUNT (dfbee5c2a5706a81bc04675499c933d4)

5. 點擊 **"Continue to summary"** → **"Create Token"**
6. **複製 Token**（只顯示一次！）

### 步驟 2：設置環境變量

在 PowerShell 中執行：

```powershell
$env:CLOUDFLARE_API_TOKEN = "您的新Token"
$env:CLOUDFLARE_ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
```

### 步驟 3：部署

```powershell
cd "C:\Users\Owner\.kimi\sessions\ab7b4a23e658d653ca96121b30262054\424392ec-4b6f-43b8-8b7e-d868acc2597a\uploads\extracted"
wrangler pages deploy dist --project-name="payment-portal"
```

---

## 方案 C：Git 整合（長期推薦）

### 步驟 1：推送代碼到 GitHub

```bash
# 初始化 Git（如果還沒有）
git init
git add .
git commit -m "Initial commit"

# 創建 GitHub 倉庫並推送
git remote add origin https://github.com/YOUR_USERNAME/payment-portal.git
git push -u origin main
```

### 步驟 2：連接 Cloudflare Pages

1. 前往 https://dash.cloudflare.com
2. **Workers & Pages** → **Create application**
3. 選擇 **"Connect to Git"**
4. 選擇 GitHub 並授權
5. 選擇 `payment-portal` 倉庫
6. 構建設置：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
7. 點擊 **"Save and Deploy"**

---

## 🔧 部署後配置

### 1. 設置自定義域名（可選）

1. 在 Pages 專案頁面，點擊 **"Custom domains"**
2. 點擊 **"Set up a custom domain"**
3. 輸入您的域名（例如：`pay.yourdomain.com`）
4. 按照指示添加 DNS 記錄

### 2. 更新 API URL（如果需要）

如果後端 Worker URL 改變，更新 `src/api/client.ts`：

```typescript
const WORKER_URL = "https://您的-worker-url.workers.dev";
```

然後重新構建和部署。

---

## ✅ 部署檢查清單

- [ ] 網站可以正常訪問
- [ ] 付款頁面顯示正常
- [ ] 可以創建訂單（測試金額 $0.01）
- [ ] 能正確跳轉到付款頁面
- [ ] Webhook 回調正常

---

## 🆘 常見問題

### "Unable to authenticate request"
API Token 權限不足，請重新創建 Token 並確保有 Pages:Edit 權限。

### "Build failed"
檢查 `dist` 文件夾是否存在，且包含 `index.html`。

### "404 Not Found"
SPA 路由問題，確保已創建 `_routes.json` 文件（已包含在項目中）。

### "Cannot connect to API"
檢查 Worker URL 是否正確，且 Worker 正在運行。

---

## 📁 構建輸出位置

```
C:\Users\Owner\.kimi\sessions\ab7b4a23e658d653ca96121b30262054\424392ec-4b6f-43b8-8b7e-d868acc2597a\uploads\extracted\dist\
```

包含文件：
- `index.html` - 主頁面
- `assets/` - JS/CSS 資源
- `_routes.json` - SPA 路由配置

---

## 🎯 推薦方案

| 情況 | 推薦方案 | 時間 |
|------|---------|------|
| 快速測試 | 方案 A (手動上傳) | 5分鐘 |
| 長期使用 | 方案 B (Wrangler CLI) | 15分鐘 |
| 團隊協作 | 方案 C (Git 整合) | 20分鐘 |

---

**需要我幫您準備任何其他東西嗎？** 🚀
