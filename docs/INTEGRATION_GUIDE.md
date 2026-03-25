# EasyLink 資產整合指南

## 資產來源對照表

| 新位置 | 來源位置 | 說明 |
|--------|----------|------|
| `docs/legacy/PAYMENT_API.md` | `/Easylink/docs/api/` | API 規格文檔 |
| `docs/legacy/TRANSACTION_FLOW.md` | `/Easylink/docs/` | 交易流程說明 |
| `docs/legacy/DATABASE_SCHEMA_GUIDE.md` | `/Easylink/` | Schema 管理指南 |
| `templates/client-template.js` | `/UpayClient/_Template/config.js` | 商戶配置模板 |
| `config/merchants/kc.js` | `/UpayClient/King-Chicken/config.js` | KC 專屬配置 |

## 架構對齊確認

### 多商戶 Schema 對齊

已有的 `upay-client-kc/payment-worker/schema-v2-multi-merchant.sql` 與新設計完全兼容：

```sql
-- 已有的設計（來源）
merchants (merchant_no, api_key, api_secret, easylink_mch_no...)
payments (merchant_id, merchant_order_id...)

-- 新設計（目標）
merchants (code, name, easylink_mch_no...)  
transactions (merchant_id, order_no...)

-- 對應關係
merchant_no → code
merchant_order_id → order_no  
payments → transactions
```

### API 路由對齊

已有的 API 設計與新設計兼容：

```
已有的: /api/v1/client/:clientCode/...
新的:   /api/v1/:merchantCode/...

實際相同，只是參數名不同
```

## 配置繼承

King-Chicken 的配置已完整遷移：

```javascript
// 來源: UpayClient/King-Chicken/config.js
// 目標: config/merchants/kc.js + 數據庫 merchants 表

CLIENT_CODE: 'KC' → merchants.code
CLIENT_NAME: 'King-Chicken' → merchants.name  
THEME.orange → merchants.config.theme
USERS → merchants.admin_username/password
```

## 清理的多餘檔案

以下檔案/目錄已被新架構取代：

| 位置 | 原因 | 處理方式 |
|------|------|----------|
| `/Easylink/staging/` | 使用 v2 統一 staging | 保留參考 |
| `/Easylink/production/` | 使用 v2 結構 | 保留參考 |
| `/upay-client-kc/` | 整合到 v2 | 保留歷史 |
| `/UpayClient/King-Chicken/` | 配置已遷移 | 保留歷史 |

## 下一步操作

1. 部署 v2 系統
2. 將 KC 配置導入數據庫
3. 驗證功能一致性
4. 域名切換
