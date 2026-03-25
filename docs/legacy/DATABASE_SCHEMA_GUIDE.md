# EasyLink 數據庫 Schema 管理指南

## 問題總結

目前系統存在的字段命名不一致問題：
- `created_at` (snake_case) vs `createdAt` (camelCase)
- `mchNo` vs `merchant_id` vs `merchantId`
- 不同表的命名風格不統一

## 解決方案

### 1. 命名規範（立即執行）

| 層級 | 命名風格 | 示例 | 適用場景 |
|------|---------|------|---------|
| **數據庫字段** | snake_case | `created_at`, `merchant_id` | 所有表結構 |
| **JavaScript 變量** | camelCase | `createdAt`, `merchantId` | 代碼中的對象屬性 |
| **API 響應** | camelCase | `merchantId` | JSON 響應體 |

### 2. 數據庫 Schema 文檔（必須維護）

每個項目必須有 `schema.sql` 文件，並且是 **唯一真相源**。

```sql
-- ============================================
-- transactions 表 - 交易記錄
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,        -- 訂單編號
    mch_no TEXT NOT NULL,                  -- 商戶編號 (EasyLink)
    amount INTEGER NOT NULL,               -- 金額（分）
    currency TEXT DEFAULT 'HKD',           -- 貨幣
    pay_type TEXT,                         -- 支付方式
    status TEXT DEFAULT 'pending',         -- 狀態
    pay_order_id TEXT,                     -- EasyLink 支付訂單號
    raw_response TEXT,                     -- 原始響應
    created_at INTEGER NOT NULL,           -- 創建時間（Unix 時間戳）
    updated_at INTEGER DEFAULT 0,          -- 更新時間
    paid_at INTEGER                        -- 支付完成時間
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_mch_no ON transactions(mch_no);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
```

### 3. 數據庫版本遷移（Migration）系統

創建 `migrations/` 目錄，所有結構變更必須通過遷移文件執行：

```
migrations/
├── 001_initial_schema.sql          -- 初始結構
├── 002_add_boss_report_tables.sql  -- 添加報表表
├── 003_fix_column_names.sql        -- 修復字段名
└── 004_add_transaction_indexes.sql -- 添加索引
```

每個遷移文件格式：

```sql
-- Migration: 003_fix_column_names
-- Date: 2026-03-24
-- Author: developer
-- Description: 統一字段命名為 snake_case

-- 檢查並修復 transactions 表
ALTER TABLE transactions RENAME COLUMN createdAt TO created_at;
ALTER TABLE transactions RENAME COLUMN updatedAt TO updated_at;
ALTER TABLE transactions RENAME COLUMN payOrderId TO pay_order_id;

-- 記錄遷移
INSERT INTO schema_migrations (version, applied_at) VALUES (3, strftime('%s', 'now'));
```

### 4. 數據庫 Schema 檢查腳本

```javascript
// scripts/verify-schema.js
async function verifyDatabaseSchema(env) {
  const expectedSchema = {
    transactions: {
      order_no: 'TEXT',
      mch_no: 'TEXT',
      amount: 'INTEGER',
      created_at: 'INTEGER',
      // ...
    }
  };
  
  // 獲取實際表結構
  const actualSchema = await env.DB.prepare(`
    SELECT name, type FROM pragma_table_info('transactions')
  `).all();
  
  // 比較並報告差異
  // ...
}
```

### 5. 開發流程規範

#### 新增字段流程

1. **創建遷移文件**：`migrations/005_add_new_column.sql`
2. **更新 schema.sql**：同步更新主 schema 文件
3. **更新代碼中的映射**：確保查詢使用正確的字段名
4. **測試**：在本地和 staging 環境測試
5. **部署**：執行遷移到生產環境

#### 代碼審查檢查表

- [ ] 數據庫查詢使用正確的字段名
- [ ] 新增字段已在 schema.sql 中記錄
- [ ] 有對應的遷移文件
- [ ] API 響應使用 camelCase
- [ ] 已更新相關文檔

### 6. 現有問題修復計劃

#### 步驟 1：統一 transactions 表
```sql
-- 檢查當前列名
PRAGMA table_info(transactions);

-- 如果存在 camelCase 列，重命名為 snake_case
ALTER TABLE transactions RENAME COLUMN createdAt TO created_at;
ALTER TABLE transactions RENAME COLUMN updatedAt TO updated_at;
ALTER TABLE transactions RENAME COLUMN payOrderId TO pay_order_id;
ALTER TABLE transactions RENAME COLUMN channelOrderNo TO channel_order_no;
ALTER TABLE transactions RENAME COLUMN mchOrderNo TO mch_order_no;
```

#### 步驟 2：統一 boss_configs 表
```sql
ALTER TABLE boss_configs RENAME COLUMN isEnabled TO is_enabled;
ALTER TABLE boss_configs RENAME COLUMN sendTime TO send_time;
ALTER TABLE boss_configs RENAME COLUMN createdAt TO created_at;
ALTER TABLE boss_configs RENAME COLUMN updatedAt TO updated_at;
```

#### 步驟 3：更新所有代碼中的查詢
- 將 `createdAt` 改為 `created_at`
- 將 `updatedAt` 改為 `updated_at`
- 將 `mchNo` 改為 `mch_no`

### 7. 自動化工具

#### GitHub Action 檢查
```yaml
name: Schema Verification
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Verify Schema Consistency
        run: |
          # 檢查 schema.sql 和代碼中的字段名是否一致
          node scripts/verify-schema-consistency.js
```

#### 字段映射工具
```javascript
// utils/dbMapper.js
const fieldMapping = {
  // JavaScript camelCase -> Database snake_case
  orderNo: 'order_no',
  mchNo: 'mch_no',
  merchantId: 'mch_no',
  payOrderId: 'pay_order_id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paidAt: 'paid_at',
  channelOrderNo: 'channel_order_no',
};

function toDbField(jsField) {
  return fieldMapping[jsField] || jsField;
}

function toJsField(dbField) {
  const reverse = Object.entries(fieldMapping).find(([k, v]) => v === dbField);
  return reverse ? reverse[0] : dbField;
}

module.exports = { toDbField, toJsField };
```

## 立即行動事項

1. ✅ **已修復**：將所有代碼中的 `created_at` 改為 `createdAt` 以匹配現有數據庫
2. 🔄 **待執行**：創建 `migrations/` 目錄和遷移文件
3. 🔄 **待執行**：統一 schema.sql 文檔
4. 🔄 **待執行**：添加 schema 驗證腳本
5. 🔄 **待執行**：建立開發流程規範

## 建議的項目結構

```
project/
├── src/
│   ├── index.js
│   └── utils/
│       └── dbMapper.js          # 字段映射工具
├── migrations/                   # 數據庫遷移文件
│   ├── 001_initial.sql
│   ├── 002_add_boss_tables.sql
│   └── 003_fix_column_names.sql
├── schema.sql                    # 當前 schema（唯一真相源）
├── scripts/
│   └── verify-schema.js         # Schema 驗證腳本
└── .github/
    └── workflows/
        ├── deploy.yml
        └── verify-schema.yml    # Schema 驗證 CI
```
