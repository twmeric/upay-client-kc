# King-Chicken Payment Platform - Environment Configuration
# 环境分离配置

## 环境定义

### Development (开发环境)
- Project: payment-portal-dev
- URL: https://dev.king-chicken.pages.dev
- Branch: develop
- Purpose: 开发测试，功能验证

### Staging (预发布环境)
- Project: payment-portal-staging
- URL: https://staging.king-chicken.pages.dev
- Branch: staging
- Purpose: 集成测试，客户预览

### Production (生产环境)
- Project: payment-portal-prod
- URL: https://king-chicken.jkdcoding.com
- Branch: main
- Purpose: 正式生产环境

## API环境
- Dev API: payment-api-dev.jimsbond007.workers.dev
- Staging API: payment-api-staging.jimsbond007.workers.dev
- Prod API: payment-api.jimsbond007.workers.dev

## 部署命令

```bash
# 开发环境
cd king-chicken-full
wrangler pages deploy . --project-name=payment-portal-dev --branch=develop

# 预发布环境
wrangler pages deploy . --project-name=payment-portal-staging --branch=staging

# 生产环境（需要审核）
wrangler pages deploy . --project-name=payment-portal-prod --branch=main
```

## 分支策略

```
main (生产) ← staging (预发布) ← develop (开发) ← feature/* (功能分支)
```

## 回滚策略

1. 发现问题立即回滚DNS
2. 保留最近5个版本
3. 使用Git标签标记生产版本
