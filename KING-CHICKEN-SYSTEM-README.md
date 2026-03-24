# King-Chicken Payment System

完整的商户支付系统，集成 EasyLink 支付网关和 CloudWAPI WhatsApp 通知。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Cloudflare Pages)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Payment     │  │    Login     │  │    Admin     │          │
│  │  (index.html)│  │  (login.html)│  │  (admin.html)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API (Cloudflare Worker)                      │
│                     payment-api.jimsbond007.workers.dev          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /client/KC/  │  │ /client/KC/  │  │ /client/KC/  │          │
│  │   payment/   │  │ transactions │  │  boss-config │          │
│  │   create     │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   D1 Database   │    │  EasyLink API   │
│   payment-db    │    │ api-pay.gnete.  │
└─────────────────┘    │    com.hk       │
                       └─────────────────┘
```

## 文件结构

```
kingchicken/
├── payment-worker/           # Cloudflare Worker (Backend)
│   ├── src/
│   │   └── index.js         # Main Worker code
│   ├── schema.sql           # Database schema
│   └── wrangler.toml        # Worker config
│
├── UpayClient/_KC/          # Frontend Pages
│   ├── index.html           # Payment page
│   ├── login.html           # Admin login
│   └── admin.html           # Admin dashboard
│
└── deploy-kc-system.ps1     # Deployment script
```

## 页面说明

### 1. 支付页面 (index.html)
- **功能**: 金额选择、支付方式选择、创建订单
- **支付方式**: 银联在线 (UP_OP)、支付宝 (ALI_H5)、微信支付 (WX_H5)
- **金额选项**: HK$100、HK$500、HK$1000、HK$2000、自定义金额
- **流程**: 选择金额 → 选择支付方式 → 跳转 EasyLink 收银台

### 2. 登录页面 (login.html)
- **功能**: 管理员登录
- **凭证**:
  - 用户名: `admin` / 密码: `kingchicken123`
  - 用户名: `mimichu` / 密码: `98113210`
- **认证**: LocalStorage 存储登录状态

### 3. 管理后台 (admin.html)
- **仪表板**: 今日统计、7日趋势图、支付方式分布
- **交易记录**: 列表、筛选、导出 CSV
  - 筛选条件: 状态、支付方式、日期范围、金额范围、订单号
  - 显示字段: 时间、EL 订单号、商家订单号、支付方式、金额、状态
- **Boss 日报**: 
  - 启用/停用自动报告
  - 设置发送时间
  - 管理收件人列表
  - 测试发送
  - 发送历史

## API 端点

### Client API (King-Chicken 专用)

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/client/KC/payment/create` | POST | 创建支付订单 |
| `/api/v1/client/KC/transactions` | GET | 获取交易列表 |
| `/api/v1/client/KC/dashboard` | GET | 获取仪表板统计 |
| `/api/v1/client/KC/boss-config` | GET | 获取 Boss 配置 |
| `/api/v1/client/KC/boss-config` | POST | 更新 Boss 配置 |
| `/api/v1/client/KC/boss-config/test` | POST | 发送测试报告 |
| `/api/v1/client/KC/boss-report-history` | GET | 获取发送历史 |
| `/api/v1/client/KC/whatsapp/send` | POST | 发送 WhatsApp 消息 |

### Webhook

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/webhooks/easylink` | POST | EasyLink 支付通知 |

## 数据库表

### transactions
- 存储所有交易记录
- 字段: order_no, merchant_id, amount, currency, pay_type, status, raw_response, created_at

### boss_configs
- Boss 日报配置
- 字段: merchant_id, is_enabled, send_time

### boss_recipients
- 报告收件人列表
- 字段: tenant_id, phone, name, is_enabled

### boss_report_history
- 报告发送历史
- 字段: tenant_id, report_date, report_content, recipients_count, status, sent_at

### daily_reports
- 每日统计数据
- 字段: report_date, total_amount, total_orders, success_orders, report_content

### users / sessions
- 管理员登录会话

## 配置

### EasyLink 商户配置
- **商户号 (mchNo)**: `80403445499539`
- **应用 ID (appId)**: `6763e0a175249c805471328d`
- **应用密钥**: 存储在 Worker Secrets (EASYLINK_APP_SECRET)

### WhatsApp 配置 (CloudWAPI)
- **API Key**: `fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D`
- **发送号码**: `85262322466`
- **API 地址**: `https://unofficial.cloudwapi.in/api/send`

## 部署

### 1. 部署 Worker
```powershell
cd payment-worker
wrangler deploy
```

### 2. 设置 Secrets
```bash
wrangler secret put EASYLINK_MCH_NO       # 80403445499539
wrangler secret put EASYLINK_APP_ID       # 6763e0a175249c805471328d
wrangler secret put EASYLINK_APP_SECRET   # 从 EasyLink 获取
wrangler secret put CLOUDWAPI_KEY         # fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D
```

### 3. 部署数据库
```bash
wrangler d1 execute payment-db --file=./schema.sql
```

### 4. 部署 Pages
```bash
wrangler pages deploy UpayClient/_KC --project-name=upay-client-kc
```

### 或使用一键部署脚本
```powershell
.\deploy-kc-system.ps1
```

## 域名配置

### Pages 自定义域名
1. Cloudflare Dashboard → Pages → upay-client-kc
2. Custom domains → Add custom domain
3. 添加: `king-chicken.jkdcoding.com`

### Worker 路由 (可选)
如需使用自定义域名访问 API:
1. Worker Settings → Triggers
2. 添加 Custom Domain: `api.king-chicken.jkdcoding.com`

## 测试

### 1. 支付流程测试
1. 访问 `https://king-chicken.jkdcoding.com`
2. 选择金额 HK$100
3. 选择"银联在线支付"
4. 点击"确认支付"
5. 应跳转到 EasyLink 收银台

### 2. 管理后台测试
1. 访问 `https://king-chicken.jkdcoding.com/login.html`
2. 使用 admin/kingchicken123 登录
3. 检查仪表板数据
4. 查看交易记录
5. 测试 Boss 日报发送

### 3. API 测试
```bash
# 创建支付
curl -X POST https://payment-api.jimsbond007.workers.dev/api/v1/client/KC/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"payType":"UP_OP","subject":"Test"}'

# 获取交易列表
curl "https://payment-api.jimsbond007.workers.dev/api/v1/client/KC/transactions?page=1"
```

## 故障排查

### 支付创建失败
- 检查 EASYLINK_APP_SECRET 是否正确设置
- 检查 EasyLink 商户配置是否正确
- 查看 Worker Logs: `wrangler tail`

### WhatsApp 发送失败
- CloudWAPI 需要发送号码已注册 WhatsApp
- 检查 API Key 是否有效
- 查看响应日志

### 数据不显示
- 检查 D1 数据库连接
- 确认表结构正确
- 检查 transactions 表中 merchant_id 是否为 'KC'

## 注意事项

1. **安全问题**: 当前登录使用 LocalStorage，生产环境应考虑更强的认证方式
2. **API Key**: 请定期更换 EasyLink 和 CloudWAPI 的密钥
3. **Webhook**: 确保 EasyLink 后台配置的 notifyUrl 正确指向 Worker
4. **Cron Job**: Boss 日报每天 UTC 02:30 (香港时间 10:30) 自动执行

## 联系

如有问题，请检查:
- Worker Logs: `wrangler tail`
- Pages 部署状态
- D1 数据库查询日志
