# King-Chicken 手动部署指南

由于 API Token 权限限制，请使用以下方法手动部署：

## 方法 1: 使用 Wrangler 登录部署（推荐）

```powershell
# 1. 登录 Cloudflare
npx wrangler login

# 2. 部署 Worker
cd payment-worker
npx wrangler deploy

# 3. 部署数据库（如尚未创建表）
npx wrangler d1 execute payment-db --file=./schema.sql

# 4. 部署 Pages
cd ../UpayClient/_KC
npx wrangler pages deploy . --project-name=upay-client-kc
```

## 方法 2: Cloudflare Dashboard 上传

### 部署 Worker

1. 访问 https://dash.cloudflare.com
2. 登录账号
3. 左侧菜单 → **Workers & Pages**
4. 点击 **Create**
5. 选择 **Upload** 方式
6. 上传 `payment-worker/src/index.js`
7. 设置名称：`payment-api`
8. 配置环境变量：
   - `EASYLINK_MCH_NO` = `80403445499539`
   - `EASYLINK_APP_ID` = `6763e0a175249c805471328d`
   - `EASYLINK_APP_SECRET` = (从 EasyLink 后台获取)
   - `CLOUDWAPI_KEY` = `fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D`

### 部署 Pages

1. Dashboard → **Workers & Pages** → **Create**
2. 选择 **Pages** → **Upload assets**
3. 项目名称：`upay-client-kc`
4. 上传 `UpayClient/_KC` 文件夹中的所有文件
5. 部署完成后访问：https://upay-client-kc.pages.dev

### 绑定 D1 数据库

1. Worker 设置 → **Settings** → **Variables**
2. 添加 D1 Database Binding：
   - Variable name: `DB`
   - Database: `payment-db`

## 方法 3: 快速上传文件

已为你准备好部署文件：

### Worker 部署文件
```
payment-worker/src/index.js  (46KB - 完整 API 代码)
```

### Pages 部署文件
```
UpayClient/_KC/
├── index.html    (15KB - 支付页面)
├── login.html    (7KB  - 登录页面)
└── admin.html    (39KB - 管理后台)
```

### 直接复制粘贴部署

如果上传不方便，可以直接复制粘贴代码：

1. 创建新的 Worker
2. 将 `payment-worker/src/index.js` 的内容全部复制粘贴到编辑器
3. 保存并部署

4. 创建新的 Pages 项目
5. 创建以下文件并粘贴对应内容：
   - `index.html` - 支付页面
   - `login.html` - 登录页面  
   - `admin.html` - 管理后台

## 部署后验证

### 1. 测试 API
```bash
curl https://payment-api.jimsbond007.workers.dev/health
```

### 2. 测试支付
```bash
curl -X POST https://payment-api.jimsbond007.workers.dev/api/v1/client/KC/payment/create \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"payType":"UP_OP"}'
```

### 3. 访问页面
- 支付页面：https://upay-client-kc.pages.dev
- 登录页面：https://upay-client-kc.pages.dev/login.html

## 需要设置的环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| EASYLINK_MCH_NO | 80403445499539 | EasyLink 商户号 |
| EASYLINK_APP_ID | 6763e0a175249c805471328d | EasyLink App ID |
| EASYLINK_APP_SECRET | (从后台获取) | EasyLink 密钥 |
| CLOUDWAPI_KEY | fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D | WhatsApp API Key |

## 数据库初始化

如果使用 D1 数据库，执行以下 SQL：
```bash
npx wrangler d1 execute payment-db --file=./payment-worker/schema.sql
```

或在 Dashboard 中手动执行 `payment-worker/schema.sql` 的内容。
