# King-Chicken v2 - 項目結構

## 資產整合說明

本項目整合了以下歷史資產：
- `/Easylink/docs/` - API 文檔和流程說明
- `/UpayClient/_Template/` - 商戶配置模板
- `/UpayClient/King-Chicken/` - KC 專屬配置
- `/upay-client-kc/payment-worker/schema-v2-multi-merchant.sql` - 多商戶 Schema 設計

## 目錄結構

```
king-chicken-v2/
├── README.md                      # 項目主文檔
├── PROJECT_STRUCTURE.md           # 本文件
├── package.json                   # 根配置
├── .env.example                   # 環境變數模板
├── .gitignore
│
├── .github/
│   └── workflows/
│       └── deploy.yml             # CI/CD 配置
│
├── apps/
│   ├── worker/                    # Cloudflare Worker 後端
│   │   ├── src/
│   │   │   └── index.js          # 統一 API 入口
│   │   ├── wrangler.toml         # Worker 配置
│   │   └── package.json
│   │
│   └── web/                       # Cloudflare Pages 前端
│       ├── payment/
│       │   └── index.html        # 支付頁面 (多商戶動態)
│       ├── admin/
│       │   └── index.html        # 管理後台 (商戶選擇器)
│       └── login/
│           └── index.html        # 統一登入
│
├── packages/
│   ├── shared/
│   │   └── types.js              # 共享類型定義
│   │
│   └── database/
│       ├── schema.sql            # 完整 Schema
│       ├── schema-saas.sql       # SaaS 版本
│       └── migrations/
│           └── 001_saas_schema.sql
│
├── templates/                     # 商戶模板 (來自 UpayClient/_Template)
│   └── client-template.js
│
├── config/                        # 商戶配置
│   └── merchants/
│       └── kc.js                 # King-Chicken 配置
│
├── docs/                          # 文檔
│   ├── ARCHITECTURE.md           # 架構設計
│   ├── DEPLOYMENT.md             # 部署指南
│   ├── INTEGRATION_GUIDE.md      # 資產整合說明
│   └── legacy/                   # 歷史文檔 (來自 Easylink)
│       ├── PAYMENT_API.md
│       ├── TRANSACTION_FLOW.md
│       └── DATABASE_SCHEMA_GUIDE.md
│
└── scripts/
    └── deploy.js                 # 部署腳本
```

## 關鍵設計決策

### 1. 統一 API 設計
```
/api/v1/:merchantCode/...
```
- 支持無限商戶
- 單一 Worker 實例
- 數據庫級隔離

### 2. 與舊設計的兼容性
- 與 `schema-v2-multi-merchant.sql` 完全對齊
- 商戶配置格式繼承自 `_Template/config.js`
- KC 配置從 `King-Chicken/config.js` 遷移

### 3. 文檔策略
- `/Easylink/` - 僅保留 Stakeholder 演示和清理指南
- `/king-chicken-v2/docs/` - 技術文檔唯一來源
- `/king-chicken-v2/docs/legacy/` - 歷史文檔歸檔

## 後續維護

### 禁止
- 不要在 `/upay-client-kc/` 開發
- 不要在 `/UpayClient/` 開發
- 不要在 `/Easylink/` 添加新技術文檔

### 允許
- 只在 `/king-chicken-v2/` 進行開發
- 更新 `/Easylink/saas-platform-overview.html` (演示)
