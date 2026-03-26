# King Chicken 司機收款系統部署指南

## 功能概述

本系統實現了**司機級別的支付追蹤**，可以：
1. 為每位司機生成專屬支付二維碼/鏈接
2. 自動關聯訂單與司機
3. 後台按司機篩選和統計收款

---

## 部署步驟

### Step 1: 更新數據庫

執行數據庫遷移腳本：

```bash
# 使用 Wrangler CLI 執行 SQL
wrangler d1 execute easylink-db-v2 --file=config/database-migrations/003_add_driver_tracking.sql
```

### Step 2: 部署 Worker

```bash
cd apps/worker
wrangler deploy
```

### Step 3: 部署支付頁面

```bash
cd clients/kingchicken
wrangler pages deploy . --project-name=easylink-client-kingchicken
```

---

## 司機專屬鏈接格式

| 司機 | 鏈接 |
|------|------|
| 張師傅 (KC001) | `https://easylink-client-kingchicken.pages.dev/?driver=KC001` |
| 李師傅 (KC002) | `https://easylink-client-kingchicken.pages.dev/?driver=KC002` |
| 王師傅 (KC003) | `https://easylink-client-kingchicken.pages.dev/?driver=KC003` |

### 生成二維碼

使用任意二維碼生成器，輸入上述鏈接即可為每位司機生成專屬二維碼。

---

## 使用流程

### 司機角度：
1. 每位司機獲得一個專屬二維碼
2. 送貨時讓客戶掃描自己的二維碼
3. 客戶支付後，系統自動記錄該筆訂單屬於此司機

### 客戶角度：
1. 掃描司機提供的二維碼
2. 進入支付頁面，頂部顯示司機名稱
3. 輸入金額並支付

### 管理員角度：
1. 登入管理後台
2. 查看交易記錄，可按司機篩選
3. 查看統計卡片，了解每位司機的今日收款
4. 導出 CSV 報表進行對賬

---

## API 更新

### 創建支付 (POST /api/v1/KC/payment/create)

**請求體：**
```json
{
  "amount": 100,
  "payType": "UP_OP",
  "subject": "King-Chicken Payment",
  "driverCode": "KC001",
  "description": "Driver: KC001"
}
```

### 查詢交易 (GET /api/v1/KC/admin/transactions)

**查詢參數：**
- `startDate`: 開始日期 (YYYY-MM-DD)
- `endDate`: 結束日期 (YYYY-MM-DD)
- `status`: 狀態 (success/pending/failed)
- `payType`: 支付方式 (UP_OP/ALI_H5/WX_H5)
- `driverCode`: **新增** - 司機編號 (KC001/KC002/KC003)
- `orderNo`: 訂單號搜索

**響應示例：**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "orderNo": "KCORDXXXXXXX",
        "amount": 100,
        "payType": "UP_OP",
        "status": "success",
        "driverCode": "KC001",
        "driverName": "張師傅",
        "createdAt": "2024/01/15 14:30:00"
      }
    ]
  }
}
```

### 統計數據 (GET /api/v1/KC/admin/statistics)

**響應示例：**
```json
{
  "success": true,
  "data": {
    "todayRevenue": 5000,
    "todayOrders": 25,
    "successRate": 98.5,
    "driverRevenue": {
      "KC001": 2000,
      "KC002": 1800,
      "KC003": 1200
    }
  }
}
```

---

## 後台功能

### 1. 司機篩選
在交易記錄頁面，可以通過下拉框篩選特定司機的交易。

### 2. 司機統計卡片
首頁顯示每位司機的今日收款金額。

### 3. CSV 導出
導出的 CSV 包含司機信息列，方便進行對賬。

---

## 擴展建議

### 1. 司機管理模塊
在管理後台添加「司機管理」頁面：
- 添加/編輯/刪除司機
- 查看司機詳情和業績
- 重置司機二維碼

### 2. 司機登入系統
讓司機能夠登入查看自己的收款記錄：
```
https://easylink-client-kingchicken.pages.dev/driver-login
```

### 3. 提成計算
根據司機收款金額自動計算提成：
```javascript
// 示例：5% 提成
const commission = driverRevenue * 0.05;
```

### 4. 實時通知
收款成功後發送通知給對應司機（WhatsApp/Telegram/Email）。

---

## 常見問題

### Q: 如果司機沒有專屬二維碼怎麼辦？
A: 支付頁面會顯示司機選擇下拉框，客戶可以手動選擇。

### Q: 可以修改已關聯的司機嗎？
A: 目前不支持，需要在數據庫手動修改 `driverCode` 字段。

### Q: 如何添加更多司機？
A: 修改 `clients/kingchicken/index.html` 中的司機列表，然後重新部署。

---

## 文件修改摘要

| 文件 | 修改內容 |
|------|----------|
| `apps/worker/src/index.js` | 支持 driverCode 字段的存儲和篩選 |
| `clients/kingchicken/index.html` | 添加司機選擇功能 |
| `clients/kingchicken/admin.html` | 添加司機篩選和統計 |
| `config/database-migrations/003_add_driver_tracking.sql` | 數據庫遷移腳本 |
