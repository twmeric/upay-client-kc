# King-Chicken Payment System v2

全新架構的 King-Chicken 支付系統，設計目標是簡潔、可靠、易於維護。

## 架構概覽

```
king-chicken-v2/
├── apps/
│   ├── worker/          # Cloudflare Worker (API 後端)
│   └── web/             # Cloudflare Pages (前端)
│       ├── admin/       # 管理後台
│       ├── payment/     # 支付頁面
│       └── login/       # 登入頁面
├── packages/
│   ├── shared/          # 共享類型定義
│   └── database/        # 數據庫 Schema
└── scripts/             # 部署腳本
```

## 技術棧

- **後端**: Cloudflare Worker + D1 Database
- **前端**: 純 HTML + JavaScript (無框架依賴)
- **支付閘道**: EasyLink API
- **部署**: Cloudflare Native (Wrangler + Pages)

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 配置環境變量
cp .env.example .env
# 編輯 .env 填入你的 Cloudflare API Token

# 3. 部署
npm run deploy
```

## 環境變量

| 變數 | 說明 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

## 數據庫 Schema

詳見 `packages/database/schema.sql`
