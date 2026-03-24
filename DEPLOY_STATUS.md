# Payment Portal 部署狀態

## 📊 當前狀態

### ✅ 已完成的準備工作

| 項目 | 狀態 | 說明 |
|------|------|------|
| 前端代碼構建 | ✅ 完成 | `dist/` 文件夾準備就緒 |
| 部署包壓縮 | ✅ 完成 | `payment-portal-deploy.zip` (0.88 MB) |
| Wrangler 配置 | ✅ 完成 | `wrangler.toml` 已配置 |
| API 環境配置 | ✅ 完成 | 支持多環境自動切換 |

### ⚠️ 遇到的問題

**API Token 權限不足**
- 錯誤代碼：`10001` / `9106`
- 原因：現有 Token 缺少 `Cloudflare Pages:Edit` 權限
- 影響：無法使用 CLI 自動部署

**解決方案：手動上傳（推薦）**

---

## 🚀 手動部署步驟（5分鐘完成）

### 步驟 1：前往 Cloudflare Dashboard
```
網址：https://dash.cloudflare.com
帳戶 ID：dfbee5c2a5706a81bc04675499c933d4
```

### 步驟 2：創建 Pages 專案
1. 點擊左側菜單 **"Workers & Pages"**
2. 點擊 **"Create application"** 按鈕
3. 選擇 **"Pages"** 標籤
4. 點擊 **"Upload assets"**

### 步驟 3：設置專案
- **專案名稱**：`payment-portal`
- **生產分支**：`main`

### 步驟 4：上傳文件
- 拖放上傳 ZIP 文件：
```
C:\Users\Owner\cloudflare\kingchicken\payment-portal-deploy.zip
```

### 步驟 5：完成部署
- 點擊 **"Deploy site"**
- 等待 30-60 秒
- 記下部署的網址

---

## 🌐 部署後信息

### 網站地址
```
https://payment-portal.pages.dev
```

### 後端 API 地址（已配置）
```
https://staging--55cdi3nfi9dh4f92yskx.youbase.cloud
```

---

## 📁 生成的文件清單

| 文件 | 位置 | 用途 |
|------|------|------|
| `payment-portal-deploy.zip` | `C:\Users\Owner\cloudflare\kingchicken\` | 部署包 |
| `DEPLOY_GUIDE.md` | 同上 | 詳細部署指南 |
| `QUICK_DEPLOY.html` | 同上 | 可視化部署指南（雙擊打開）|
| `deploy_pages.ps1` | 同上 | PowerShell 部署腳本 |

---

## 🔧 如果需要更新 Token 權限

1. 前往 https://dash.cloudflare.com/profile/api-tokens
2. 創建新的 Token：
   - **Account**: Cloudflare Pages:Edit
   - **Account**: Account:Read
3. 更新 `.env` 文件：
```bash
CF_API_TOKEN=新的_token
```

---

## ✅ 部署後檢查清單

- [ ] 網站可以正常訪問
- [ ] 付款頁面顯示正常
- [ ] 可以選擇金額和付款方式
- [ ] 點擊"立即支付"能創建訂單
- [ ] 能正確跳轉到付款頁面

---

## 🆘 需要幫助？

如果部署過程中遇到問題，請檢查：
1. ZIP 文件是否完整（應該包含 index.html 和 assets/）
2. Cloudflare 帳戶是否正常
3. 瀏覽器控制台是否有錯誤信息

---

**準備好了！請打開瀏覽器訪問 https://dash.cloudflare.com 開始部署 🚀**
