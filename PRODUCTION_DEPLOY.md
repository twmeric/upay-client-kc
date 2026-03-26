# King Chicken v2 生產環境部署指南

## 📁 文件系統結構澄清

### 為什麼是 `clients\kingchicken`？

```
king-chicken-v2/                    # 這是商戶項目根目錄
├── apps/
│   └── worker/                      # 【共享API】所有商戶共用同一個 Worker
│       └── src/index.js             # 處理 KC, 商戶B, 商戶C 的請求
│
├── clients/                         # 【客戶端實例】每個商戶獨立部署
│   └── kingchicken/                 # King Chicken 專屬客戶端
│       ├── index.html               # 支付頁面
│       ├── login.html               # 管理登入
│       ├── admin.html               # 交易記錄 (三TAB導航)
│       ├── boss-report.html         # 管理者報告 (WhatsApp通報)
│       └── drivers.html             # 司機管理
│
└── config/                          # 配置文件
    └── database-migrations/         # 數據庫遷移腳本
```

**關鍵理解：**
- `clients` = 商戶客戶端實例（Merchant Client Instance）
- 每個商戶有自己的 `clients\{商戶名稱}` 文件夾
- 這些文件夾獨立部署到 Cloudflare Pages

---

## 🚀 生產環境部署步驟

### Step 1: 更新數據庫（如需要）

```bash
cd C:\Users\Owner\Cloudflare\king-chicken-v2

# 執行司機追蹤遷移
wrangler d1 execute easylink-db-v2 --file=config\database-migrations\003_add_driver_tracking.sql
```

### Step 2: 部署 Worker API

```bash
cd C:\Users\Owner\Cloudflare\king-chicken-v2\apps\worker

# 部署到生產環境
wrangler deploy
```

**確認 Worker URL：**
- Production: `https://easylink-api-v2.jimsbond007.workers.dev`

### Step 3: 部署 King Chicken 客戶端

```bash
cd C:\Users\Owner\Cloudflare\king-chicken-v2\clients\kingchicken

# 部署到 Cloudflare Pages
wrangler pages deploy . --project-name=easylink-client-kingchicken
```

**確認 Pages URL：**
- Production: `https://easylink-client-kingchicken.pages.dev`

---

## 📱 生產環境網址

| 功能 | 生產環境網址 |
|------|-------------|
| **支付頁面** | `https://easylink-client-kingchicken.pages.dev/` |
| **管理登入** | `https://easylink-client-kingchicken.pages.dev/login.html` |
| **交易記錄** | `https://easylink-client-kingchicken.pages.dev/admin.html` |
| **管理者報告** | `https://easylink-client-kingchicken.pages.dev/boss-report.html` |
| **司機管理** | `https://easylink-client-kingchicken.pages.dev/drivers.html` |

### 司機專屬支付鏈接

| 司機 | 專屬鏈接 |
|------|----------|
| 張師傅 (KC001) | `https://easylink-client-kingchicken.pages.dev/?driver=KC001` |
| 李師傅 (KC002) | `https://easylink-client-kingchicken.pages.dev/?driver=KC002` |
| 王師傅 (KC003) | `https://easylink-client-kingchicken.pages.dev/?driver=KC003` |

---

## ✅ 部署前檢查清單

### 代碼檢查
- [ ] `C:\Users\Owner\Cloudflare\king-chicken-v2\clients\kingchicken\index.html` 
  - 管理後台鏈接改為 `./login.html`
  - 包含司機選擇功能
  
- [ ] `C:\Users\Owner\Cloudflare\king-chicken-v2\clients\kingchicken\admin.html`
  - 三個 TAB 導航（交易記錄、管理者報告、司機管理）
  - 司機篩選功能
  
- [ ] `C:\Users\Owner\Cloudflare\king-chicken-v2\clients\kingchicken\boss-report.html`
  - WhatsApp 自動通報功能
  - 今日業務概覽
  - 報告預覽和發送
  
- [ ] `C:\Users\Owner\Cloudflare\king-chicken-v2\clients\kingchicken\drivers.html`
  - 司機列表與業績
  - 二維碼生成
  - 統計卡片

- [ ] `C:\Users\Owner\Cloudflare\king-chicken-v2\apps\worker\src\index.js`
  - 支持 `driverCode` 存儲和篩選

### 測試項目
- [ ] 支付流程測試
- [ ] 司機選擇測試
- [ ] 管理後台登入測試
- [ ] 交易記錄查看測試
- [ ] 管理者報告生成測試
- [ ] WhatsApp 測試發送測試
- [ ] 司機管理頁面測試
- [ ] 二維碼生成測試

---

## 🔧 常見問題

### 1. 部署後頁面顯示 404
**解決方案：**
```bash
# 確認所有文件都在 kingchicken 文件夾內
ls C:\Users\Owner\Cloudflare\king-chicken-v2\clients\kingchicken\

# 重新部署
wrangler pages deploy . --project-name=easylink-client-kingchicken
```

### 2. 司機數據不顯示
**解決方案：**
```bash
# 檢查數據庫字段
wrangler d1 execute easylink-db-v2 --command="PRAGMA table_info(transactions);"

# 如果缺少 driverCode 字段，執行遷移
wrangler d1 execute easylink-db-v2 --file=config\database-migrations\003_add_driver_tracking.sql
```

### 3. WhatsApp 發送失敗
**解決方案：**
- WhatsApp 發送是通過 `https://wa.me/{phone}?text={message}` 實現
- 需要在新窗口打開
- 確保電話號碼格式正確（例如：85298113210）

---

## 📊 後續擴展計劃

### Phase 1: KC 穩定運行（當前）
- ✅ 司機收款系統
- ✅ WhatsApp 報告
- ✅ 三 TAB 管理後台

### Phase 2: 創建 Dummy 模板
- 創建 `clients\_dummy` 作為新商戶模板
- 提取可配置變量（顏色、Logo、名稱）

### Phase 3: 一鍵開通腳本
- 開發「新商戶開通」自動化腳本
- 輸入商戶信息 → 自動生成客戶端 → 部署

### Phase 4: 全面 Rollout
- 將 KC 的成功經驗推廣到 100 個商戶
- 每個商戶獨立域名、獨立品牌
- 共享同一個 Worker API

---

## 📞 聯繫支持

如有問題，請檢查：
1. Worker 日誌：`wrangler tail`
2. 瀏覽器 Console 錯誤
3. 數據庫連接狀態
