# EasyLink 多租户矩阵架构

## 🌐 域名矩阵

### 商户端（每个商户独立）
| 商户 | 支付页面 | 管理后台 |
|------|---------|---------|
| King-Chicken | king-chicken.jkdcoding.com | king-chicken.jkdcoding.com/admin |
| Merchant B | merchant-b.jkdcoding.com | merchant-b.jkdcoding.com/admin |
| Merchant C | merchant-c.jkdcoding.com | merchant-c.jkdcoding.com/admin |
| ... | ... | ... |

### 平台端
| 用途 | 域名 | 说明 |
|------|------|------|
| 推广页 | easylink.jkdcoding.com | 对外推广 EasyLink 服务 |
| 平台控制台 | admin.jkdcoding.com | 平台方管理所有商户 |

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Infrastructure                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Platform Layer (admin.jkdcoding.com)               │   │
│  │  • 平台控制台                                        │   │
│  │  • 商户管理                                          │   │
│  │  • 全局数据视图                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────┼─────────────────────────────┐   │
│  │                       │                             │   │
│  ▼                       ▼                             ▼   │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐    │   │
│  │Merchant A   │   │Merchant B   │   │Merchant C   │    │   │
│  │(King-Chicken│   │             │   │             │    │   │
│  ├─────────────┤   ├─────────────┤   ├─────────────┤    │   │
│  │Payment Page │   │Payment Page │   │Payment Page │    │   │
│  │/admin       │   │/admin       │   │/admin       │    │   │
│  └─────────────┘   └─────────────┘   └─────────────┘    │   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Landing Page (easylink.jkdcoding.com)              │   │
│  │  • 推广页                                            │   │
│  │  • 商户入驻申请                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Shared Backend:
  • Cloudflare Worker (payment-api)
  • D1 Database (多租户数据隔离)
  • EasyLink API 集成
```

## 📊 数据隔离模型

### 平台方视角（admin.jkdcoding.com）
```sql
-- 可以查看所有商户数据
SELECT * FROM transactions;  -- 所有商户交易
SELECT * FROM merchants;     -- 所有商户列表
```

### 商户视角（xxx.jkdcoding.com/admin）
```sql
-- 只能查看自己的数据
SELECT * FROM transactions WHERE merchant_id = 'KC001';
```

## 🔐 权限矩阵

| 角色 | 访问范围 | 权限 |
|------|---------|------|
| 平台管理员 | admin.jkdcoding.com | 管理所有商户 |
| King-Chicken 员工 | king-chicken.jkdcoding.com/admin | 仅管理自己数据 |
| Merchant B 员工 | merchant-b.jkdcoding.com/admin | 仅管理自己数据 |
| 普通用户 | king-chicken.jkdcoding.com | 仅支付，无管理权限 |

## ✅ 矩阵完整性检查

| 功能 | 已覆盖 | 状态 |
|------|--------|------|
| 商户支付页 | ✅ | king-chicken.jkdcoding.com |
| 商户后台 | ⏳ | 需新增 king-chicken.jkdcoding.com/admin |
| 平台推广页 | ✅ | easylink.jkdcoding.com |
| 平台控制台 | ⏳ | 需重构 admin.jkdcoding.com |
| 多租户数据隔离 | ⏳ | 需后端支持 |

## 🚀 实施计划

### Phase 1: 平台控制台（今天）
- [ ] 重构 admin.jkdcoding.com 为平台级
- [ ] 商户列表管理
- [ ] 平台数据聚合

### Phase 2: 商户后台（明天）
- [ ] 创建 king-chicken.jkdcoding.com/admin
- [ ] 商户独立登录
- [ ] 数据隔离

### Phase 3: 自动化部署（后天）
- [ ] 新商户自动创建子域名
- [ ] 自动配置 DNS
- [ ] 自动化部署流程
