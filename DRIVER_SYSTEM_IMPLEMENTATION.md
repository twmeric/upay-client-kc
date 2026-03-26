# King Chicken 司機收款系統實現方案

## 核心功能

### 1. 司機專屬支付鏈接
每位司機擁有獨立的支付鏈接：
```
https://easylink-client-kingchicken.pages.dev/?driver=KC001
https://easylink-client-kingchicken.pages.dev/?driver=KC002
```

### 2. 司機選擇功能
支付頁面顯示司機選擇下拉框（可選填）

### 3. 後台統計
管理後台可查看每位司機的收款明細

---

## 實現步驟

### Step 1: 數據庫更新

```sql
-- 添加司機表
CREATE TABLE drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driverCode TEXT NOT NULL UNIQUE,  -- KC001, KC002...
    name TEXT NOT NULL,                -- 司機姓名
    phone TEXT,
    status TEXT DEFAULT 'active',
    createdAt INTEGER NOT NULL
);

-- 交易表添加司機字段
ALTER TABLE transactions ADD COLUMN driverCode TEXT;
ALTER TABLE transactions ADD COLUMN driverName TEXT;

-- 添加司機數據
INSERT INTO drivers (driverCode, name, phone, status, createdAt) VALUES
('KC001', '張師傅', '9123-4567', 'active', strftime('%s', 'now')),
('KC002', '李師傅', '9234-5678', 'active', strftime('%s', 'now')),
('KC003', '王師傅', '9345-6789', 'active', strftime('%s', 'now'));
```

### Step 2: 更新 Worker API

修改支付創建接口，接受 `driverCode` 參數：

```javascript
// 在 handleCreatePayment 中添加
const { amount, payType, driverCode, description } = body;

// 保存到數據庫時包含司機信息
await createTransaction(env, merchantMchNo, {
    orderNo,
    amount: Math.round(amount * 100),
    currency: CONFIG.CURRENCY,
    payType,
    driverCode,  // 新增
    description
});
```

### Step 3: 更新支付頁面

添加司機選擇功能（URL 參數或下拉框）

### Step 4: 更新管理後台

添加司機篩選和統計功能

---

## 使用流程

### 司機視角：
1. 每位司機獲得專屬二維碼（含 driver=KC001 參數）
2. 客戶掃碼後自動關聯該司機
3. 司機可在手機查看自己的收款記錄

### 客戶視角：
1. 掃描司機提供的二維碼
2. 進入支付頁面（已自動選擇司機）
3. 輸入金額並支付

### 管理員視角：
1. 後台查看所有交易
2. 按司機篩選交易記錄
3. 導出司機對賬報表

---

## 擴展功能（可選）

### 1. 司機專屬後台
每位司機可登入查看自己的業績：
- 今日收款
- 本月收款
- 交易明細

### 2. 提成計算
根據收款金額自動計算司機提成

### 3. 二維碼生成器
管理後台生成帶司機編號的二維碼

### 4. 實時通知
收款成功後通知對應司機（WhatsApp/Email）
