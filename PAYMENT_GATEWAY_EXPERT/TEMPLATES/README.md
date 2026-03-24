# 📦 可復用模板

## 目錄結構

```
TEMPLATES/
├── worker/           # Worker 後端模板
│   ├── index.js      # 主代碼
│   ├── schema.sql    # D1 數據庫結構
│   └── wrangler.toml # 配置模板
├── frontend/         # 前端模板
│   └── (從現有專案複製)
└── README.md         # 本文件
```

## 使用方法

### 1. 複製模板

```powershell
# 創建新客戶專案
mkdir new-client-payment
cd new-client-payment

# 複製模板
copy ..\PAYMENT_GATEWAY_EXPERT\TEMPLATES\worker\* .\
```

### 2. 修改配置

編輯 `wrangler.toml`:
- 更新 `name` (Worker 名稱)
- 更新 `database_id` (創建 D1 後填入)

### 3. 設置 Secrets

```powershell
wrangler secret put EASYLINK_MCH_NO
wrangler secret put EASYLINK_APP_ID
wrangler secret put EASYLINK_APP_SECRET
```

### 4. 部署

```powershell
wrangler deploy
```

## 自定義

### 添加新支付方式

編輯 `index.js` 中的 `PAYMENT_METHODS` 數組。

### 修改業務邏輯

在 `createPayment` 函數中添加自定義邏輯。

### 擴展數據庫

編輯 `schema.sql` 添加新表或字段。

---

**模板已準備好！開始為客戶對接吧！** 🚀
