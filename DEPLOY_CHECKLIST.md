# King-Chicken 系统部署检查清单

## ✅ 已完成项目

### 1. 后端 (Worker)
- [x] `payment-worker/src/index.js` - 完整 API 实现
  - [x] `/api/v1/client/KC/payment/create` - 创建支付
  - [x] `/api/v1/client/KC/transactions` - 交易列表（含筛选）
  - [x] `/api/v1/client/KC/dashboard` - 仪表板统计
  - [x] `/api/v1/client/KC/boss-config` - Boss 配置管理
  - [x] `/api/v1/client/KC/boss-config/test` - 测试发送
  - [x] `/api/v1/client/KC/boss-report-history` - 发送历史
  - [x] `/api/v1/webhooks/easylink` - EasyLink 回调
- [x] `payment-worker/schema.sql` - 完整数据库结构
  - [x] transactions 表
  - [x] boss_configs 表
  - [x] boss_recipients 表
  - [x] boss_report_history 表
  - [x] daily_reports 表
  - [x] users/sessions 表
- [x] `payment-worker/wrangler.toml` - Worker 配置

### 2. 前端 (Pages)
- [x] `UpayClient/_KC/index.html` - 支付页面
  - [x] 金额选择 (100/500/1000/2000 + 自定义)
  - [x] 支付方式选择 (银联/支付宝/微信)
  - [x] 订单摘要
  - [x] 创建订单 API 调用
- [x] `UpayClient/_KC/login.html` - 登录页面
  - [x] 用户认证 (admin/mimichu)
  - [x] LocalStorage 会话管理
- [x] `UpayClient/_KC/admin.html` - 管理后台
  - [x] 三标签页导航
  - [x] 仪表板 (今日统计 + 7日趋势图 + 支付方式分布)
  - [x] 交易记录 (表格 + 多维度筛选 + 导出 CSV)
  - [x] Boss 日报 (配置 + 收件人管理 + 测试发送 + 历史)

### 3. 配置
- [x] EasyLink 商户配置 (80403445499539)
- [x] CloudWAPI WhatsApp 配置
- [x] 数据库表结构
- [x] Cron 定时任务 (每天 10:30 HK 时间)

### 4. 部署脚本
- [x] `deploy-kc-system.ps1` - 一键部署脚本

---

## 📋 部署前检查

### 必需的环境变量/Secrets
```bash
# 在 payment-worker 目录下执行
wrangler secret put EASYLINK_MCH_NO       # 值: 80403445499539
wrangler secret put EASYLINK_APP_ID       # 值: 6763e0a175249c805471328d
wrangler secret put EASYLINK_APP_SECRET   # 值: 从 EasyLink 后台获取
wrangler secret put CLOUDWAPI_KEY         # 值: fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D
```

### 部署步骤
```powershell
# 1. 部署 Worker
cd payment-worker
wrangler deploy

# 2. 部署数据库 (如尚未执行)
wrangler d1 execute payment-db --file=./schema.sql

# 3. 部署 Pages
wrangler pages deploy ../UpayClient/_KC --project-name=upay-client-kc

# 或使用一键脚本
cd ..
.\deploy-kc-system.ps1
```

---

## 🔍 部署后验证

### 1. API 测试
```bash
# 健康检查
curl https://payment-api.jimsbond007.workers.dev/health

# 创建测试订单
curl -X POST https://payment-api.jimsbond007.workers.dev/api/v1/client/KC/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"payType":"UP_OP","subject":"Test"}'

# 获取交易列表
curl "https://payment-api.jimsbond007.workers.dev/api/v1/client/KC/transactions?page=1&pageSize=10"

# 获取仪表板
curl "https://payment-api.jimsbond007.workers.dev/api/v1/client/KC/dashboard"
```

### 2. 前端测试
- [ ] 访问 `https://upay-client-kc.pages.dev`
- [ ] 选择金额，点击支付，确认跳转到 EasyLink
- [ ] 访问登录页面，使用 admin/kingchicken123 登录
- [ ] 检查仪表板数据加载
- [ ] 检查交易记录列表
- [ ] 测试 Boss 日报发送功能

### 3. 数据验证
- [ ] 数据库中有交易记录
- [ ] EL Order ID 正确显示
- [ ] 金额显示正确 (已转换为 HKD)

---

## 🔧 可能的问题

### WhatsApp 发送失败
**症状**: "Failed to send message!"
**原因**: 
- 发送号码 85262322466 未在 CloudWAPI 注册
- API Key 已过期
**解决**: 
- 注册 WhatsApp Business API
- 或更换有效的 API Key 和发送号码

### 支付创建失败
**症状**: "Payment creation failed"
**原因**: EASYLINK_APP_SECRET 不正确
**解决**: 从 EasyLink 后台获取正确的密钥并设置

### 数据不显示
**症状**: 交易列表为空
**原因**: 
- 表结构不正确
- merchant_id 不匹配
**解决**: 检查数据库表结构和数据

---

## 📊 系统信息

| 项目 | 值 |
|------|-----|
| Worker 名称 | payment-api |
| Worker URL | https://payment-api.jimsbond007.workers.dev |
| Pages 项目 | upay-client-kc |
| Pages URL | https://upay-client-kc.pages.dev |
| 数据库 | payment-db |
| EasyLink 商户 | 80403445499539 |

---

## 🚀 上线检查

- [ ] Worker 部署成功
- [ ] Pages 部署成功
- [ ] 数据库表创建成功
- [ ] Secrets 设置完成
- [ ] 支付流程测试通过
- [ ] 登录功能测试通过
- [ ] 交易数据显示正常
- [ ] Boss 日报测试发送成功
- [ ] (可选) 自定义域名配置完成
