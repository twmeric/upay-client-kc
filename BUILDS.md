# King-Chicken Payment Platform - Build Artifacts
# 历史构建产物

## 目录结构

```
builds/
├── v1.0.0/                    # 版本1.0.0构建产物
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── logo.png
│   └── build-info.json
├── v1.1.0/                    # 版本1.1.0构建产物 (预留)
└── current -> v1.0.0/         # 软链接指向当前版本
```

## 构建信息

每个版本包含 `build-info.json`:

```json
{
  "version": "1.0.0",
  "buildTime": "2026-03-20T14:30:00Z",
  "gitCommit": "6eb5442",
  "gitBranch": "main",
  "deployedBy": "Kimi CLI",
  "environment": "production",
  "deploymentId": "a46d7406"
}
```

## 版本保留策略

- 保留最近 **10个** 版本
- 保留所有 **生产版本**
- 保留最近 **30天** 的预发布版本

## 快速回滚

```powershell
# 回滚到指定版本
cd builds\v1.0.0
wrangler pages deploy . --project-name=payment-portal-prod --branch=main

# 或复制到部署目录后部署
Copy-Item -Path "builds\v1.0.0\*" -Destination "deploy\" -Recurse -Force
cd deploy
wrangler pages deploy .
```

## 当前版本

- **版本**: v1.0.0
- **路径**: builds/v1.0.0/
- **部署时间**: 2026-03-20
- **状态**: 生产中

## 版本历史

| 版本 | 时间 | 状态 | 说明 |
|------|------|------|------|
| v1.0.0 | 2026-03-20 | 生产中 | 初始版本 |
