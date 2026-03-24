# Cloudflare Pages + 自定义域名 标准部署流程

> 记录时间: 2026-03-20  
> 重要提示: 生产环境操作前必须阅读 LESSONS_LEARNED.md

## 🚨 生产安全守则 (必须遵守)

### 守则 1: 项目隔离
```
操作生产环境前必须确认:
1. 当前操作的项目名称
2. 是否会影响其他运行中的服务
3. 备份当前生产版本 ID
```

### 守则 2: API 兼容性
```
修改 API 时必须:
1. 查看实际调用路径 (使用 DevTools)
2. 保持向后兼容或添加转换层
3. 记录新旧格式映射
```

### 守则 3: 部署检查清单
```
□ 项目名称确认无误
□ DNS 配置已规划
□ 回滚方案已准备
□ 不影响其他客户
```

---

## 🎯 快速判断流程

```
是否需要自定义域名?
├── 否 → 直接用 wrangler pages deploy
└── 是 → 继续以下流程
    ├── 步骤 1: 创建 Pages 项目
    ├── 步骤 2: 部署网站
    ├── 步骤 3: 获取 Zone ID
    ├── 步骤 4: 创建 DNS CNAME
    └── 步骤 5: 绑定 Pages 自定义域名
```

## 📋 标准执行步骤

### 前置检查

```powershell
# 1. 验证 API Token 有效性和权限
$token = "YOUR_API_TOKEN"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/user/tokens/verify" -Headers $headers

# 2. 获取所有 Zone 列表（找到正确的 Zone ID）
$response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones" -Headers $headers
$response.result | Select-Object name, id, permissions

# ⚠️ 关键: 确认 Zone ID 正确！
# 不同域名有不同 Zone ID，不要硬编码
```

> ⚠️ **关键教训**: Zone ID 必须正确！不同域名有不同 Zone ID

### 步骤 1: 创建 Pages 项目

```bash
# 如果项目不存在，先创建
cd <project-folder>
wrangler pages project create <project-name> --production-branch=main
```

> ⚠️ **生产安全**: 确认 project-name 不会覆盖现有项目！

### 步骤 2: 部署网站

```bash
cd <project-folder>
wrangler pages deploy . --project-name=<project-name> --branch=main --commit-dirty=true
```

> 记录返回的临时 URL: `https://<hash>.<project-name>.pages.dev`

### 步骤 3: 获取正确的 Zone ID

```powershell
$headers = @{ "Authorization" = "Bearer $token" }
$zones = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones" -Headers $headers
# 找到目标域名对应的 Zone ID
$zoneId = ($zones.result | Where-Object { $_.name -eq "jkdcoding.com" }).id
```

### 步骤 4: 创建 DNS CNAME 记录

```powershell
$headers = @{ 
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    type = "CNAME"
    name = "<subdomain>"              # 如: easylink
    content = "<pages-url>"           # 如: 48282120.easylink-landing.pages.dev
    ttl = 1
    proxied = $true                   # 开启 Cloudflare Proxy
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod `
    -Uri "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records" `
    -Method POST -Headers $headers -Body $body

# 记录返回的 DNS Record ID
$dnsRecordId = $response.result.id
```

### 步骤 5: 绑定 Pages 自定义域名

> ⚠️ **关键发现**: 普通 API Token 通常只有 Zone 权限，无法访问 Pages API
> **解决方案**: 使用 Wrangler 的 OAuth Token！

```powershell
# 1. 读取 Wrangler 的 OAuth Token
$configPath = "$env:USERPROFILE\AppData\Roaming\xdg.config\.wrangler\config\default.toml"
$config = Get-Content $configPath -Raw
if ($config -match 'oauth_token\s*=\s*"([^"]+)"') {
    $oauthToken = $matches[1]
}

# 2. 使用 OAuth Token 绑定域名
$headers = @{ 
    "Authorization" = "Bearer $oauthToken"
    "Content-Type" = "application/json"
}

$body = '{"name":"<full-domain>"}'   # 如: easylink.jkdcoding.com

$response = Invoke-RestMethod `
    -Uri "https://api.cloudflare.com/client/v4/accounts/<account-id>/pages/projects/<project-name>/domains" `
    -Method POST -Headers $headers -Body $body

# 成功返回:
# - domain_id
# - name
# - status: initializing
# - validation_data.status: pending
```

## 🔑 权限对照表

| 操作 | 需要的权限 | Token 类型 |
|------|-----------|-----------|
| DNS 记录管理 | Zone:Edit, DNS:Edit | API Token ✅ |
| Pages 项目创建 | Cloudflare Pages:Edit | API Token ✅ |
| Pages 域名绑定 | Account Pages:Edit | OAuth Token ✅ |
| 查看项目详情 | Cloudflare Pages:Read | API Token ❌ (通常不够) |

## 🛠️ 常见错误与解决

### 错误 1: Authentication error (10000)
- **原因**: Token 没有足够权限
- **解决**: 换用 Wrangler OAuth Token

### 错误 2: Request body is invalid (9207)
- **原因**: JSON 格式错误或缺少必填字段
- **解决**: 使用 `ConvertTo-Json -Compress` 确保格式正确

### 错误 3: Zone not found
- **原因**: Zone ID 错误
- **解决**: 先调用 `/zones` API 获取正确 ID

## 📁 项目模板结构

```
project-name/
├── index.html          # 主页面
├── wrangler.toml       # 可选配置
├── DEPLOYMENT.md       # 部署记录
└── deploy.ps1          # 一键部署脚本 (可选)
```

## 🚀 一键部署脚本模板

```powershell
# deploy.ps1
param(
    [string]$ProjectName = "my-project",
    [string]$Domain = "subdomain.jkdcoding.com",
    [string]$ZoneId = "c2013122cb3dd4fcd30f1c11a5e1e08f",
    [string]$AccountId = "dfbee5c2a5706a81bc04675499c933d4"
)

# ⚠️ 安全检查: 确认项目名称不会覆盖生产环境
Write-Host "将要部署到项目: $ProjectName" -ForegroundColor Yellow
$confirm = Read-Host "确认项目名称正确? (y/n)"
if ($confirm -ne 'y') { exit }

# 1. 创建项目
wrangler pages project create $ProjectName --production-branch=main

# 2. 部署
cd $ProjectName
wrangler pages deploy . --project-name=$ProjectName --branch=main

# 3. 获取部署 URL (手动或从输出解析)
$pagesUrl = Read-Host "Enter the deployed Pages URL"

# 4. 创建 DNS
# ... (使用上述标准代码)

# 5. 绑定域名
# ... (使用 OAuth Token)
```

## 📝 检查清单

部署完成後验证:

- [ ] Pages 项目创建成功
- [ ] 网站可通过临时 URL 访问
- [ ] DNS CNAME 记录创建成功
- [ ] 自定义域名在 Pages 项目内显示
- [ ] 网站可通过自定义域名访问
- [ ] SSL 证书自动配置 (HTTPS)

## 🛑 事故预防

### 如果涉及现有生产环境:

1. **永远不要直接部署到生产项目名**
   ```bash
   # ❌ 危险！可能覆盖生产环境
   wrangler pages deploy . --project-name=production-project
   
   # ✅ 安全！创建新项目
   wrangler pages deploy . --project-name=new-project
   ```

2. **备份当前生产版本**
   ```bash
   # 记录当前生产版本 ID
   wrangler pages deployment list --project-name=<production>
   ```

3. **使用临时域名测试**
   ```bash
   # 先部署到临时分支/项目测试
   wrangler pages deploy . --branch=preview
   ```

---

## 💡 关键经验

1. **Zone ID 必须正确**: 不同域名不同 ID，不要硬编码
2. **API Token vs OAuth Token**: Pages 域名绑定需要 OAuth
3. **DNS 先于域名绑定**: 必须先有 CNAME 记录
4. **Proxy 必须开启**: `proxied: true` 才能自动 SSL

---

## 📚 相关文档

- [生产事故复盘 - LESSONS_LEARNED.md](./LESSONS_LEARNED.md)
- [EasyLink 推广页设计](./EASYLINK_ADMIN_DESIGN.md)

---

**参考案例**: easylink-landing (2026-03-20)  
**更新记录**: 添加了生产安全守则
