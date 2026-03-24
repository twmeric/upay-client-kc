# 生产事故复盘 - 教训与守则

## 📋 事故概述

**时间**: 2026-03-20  
**影响**: king-chicken.jkdcoding.com (客户生产环境)  
**原因**: 部署操作错误覆盖了生产版本  
**修复时间**: ~2小时  

---

## 🚨 根本原因

### 1. 项目混淆错误
```bash
# ❌ 错误操作
wrangler pages deploy . --project-name=payment-portal
# 意外覆盖了客户的 production 环境

# ✅ 正确操作
wrangler pages deploy . --project-name=easylink-landing
# 应该创建独立的新项目
```

### 2. API 路径假设错误
- **假设**: 旧版使用 `/payment/create` 或 `/api/payment/create`
- **实际**: 使用的是 `/api/public/payment/create`
- **教训**: 永远不要猜测 API 路径，必须查看实际代码

### 3. 响应格式不匹配
- **新版返回**: `{success: true, data: {payUrl: ...}}`
- **旧版期望**: `{success: true, payUrl: ...}`
- **教训**: 前后端契约必须保持一致

---

## 🛡️ 母机守则 - 生产环境操作规范

### 守则 1: 生产隔离原则
```
操作任何生产环境前必须：
1. 列出所有现有项目
2. 确认目标项目名称
3. 绝不使用生产项目名称进行测试/开发
```

### 守则 2: API 路径确认原则
```
修改 API 前必须：
1. 查看前端页面源码中的实际调用
2. 使用浏览器 DevTools 确认请求路径
3. 记录所有旧版路径作为兼容参考
```

### 守则 3: 响应格式兼容原则
```
修改 API 响应格式时：
1. 保持向后兼容或提供版本切换
2. 使用中间层转换格式而非直接修改
3. 记录新旧格式的映射关系
```

### 守则 4: 部署前检查清单
```
部署前必须检查：
□ 项目名称是否正确
□ 是否会影响其他环境
□ 是否有回滚计划
□ 当前生产版本 ID 是否已记录
```

---

## 📚 技术债务记录

### 当前兼容层代码位置
`payment-worker/src/index.js` 中的 `legacyPaths` 数组：

```javascript
const legacyPaths = [
  '/payment/create',
  '/api/payment/create', 
  '/api/public/payment/create',  // King-Chicken 实际使用
  '/api/v1/public/payment/create'
];
```

### 响应格式转换逻辑
```javascript
// 新版 → 旧版格式转换
if (responseBody.success && responseBody.data) {
  legacyBody = {
    success: true,
    ...responseBody.data  // 展平到根级别
  };
}
```

---

## 🔧 快速恢复流程

### 如果再次发生版本被覆盖：

1. **立即停止所有部署操作**

2. **查找正确版本 ID**:
```bash
# 使用 Wrangler OAuth Token
GET /accounts/{account_id}/pages/projects/{project_name}/deployments
# 按时间倒序查看，找到上一个已知良好的版本
```

3. **恢复 DNS 指向**:
```bash
# 更新 CNAME 记录指向正确版本
PATCH /zones/{zone_id}/dns_records/{record_id}
# body: {content: "{正确版本ID}.pages.dev"}
```

4. **验证恢复**:
```bash
# 检查页面标题和内容
curl -s https://域名 | grep "<title>"
```

---

## 📝 检查清单模板

### 创建新项目时：
```markdown
- [ ] 确认项目名称不与现有项目冲突
- [ ] 检查 wrangler.toml 中的 name 字段
- [ ] 确认部署命令使用正确的 --project-name
- [ ] 部署后验证新域名，不触碰现有域名
```

### 修改现有 API 时：
```markdown
- [ ] 使用浏览器 DevTools 确认实际调用路径
- [ ] 记录所有需要兼容的旧版路径
- [ ] 测试新旧路径都能正常工作
- [ ] 确认响应格式与前端期望一致
- [ ] 验证 CORS 头正确设置
```

---

## 🎯 关键记忆点

1. **king-chicken.jkdcoding.com** 使用 `/api/public/payment/create`
2. **期望响应格式**: `{success, payUrl, orderNo...}` (扁平结构)
3. **生产版本 ID**: a699b835 (作为回滚备份)
4. **DNS 记录 ID**: 34216d2aa60e635b6dc4ed483de0fcf1

---

## 💡 架构建议

### 推荐的部署流程:
```
1. 开发 → 临时域名测试
2. 预览 → 客户确认
3. 灰度 → 部分流量
4. 全量 → 监控指标
5. 回滚计划 → 随时待命
```

### 多项目命名规范:
```
payment-portal      → king-chicken 生产 (不触碰)
payment-portal-dev  → 开发测试
easylink-landing    → 推广页面 (新项目)
easylink-admin      → 后台管理 (新项目)
```

---

**记录时间**: 2026-03-20  
**记录人**: Kimi Code CLI  
**优先级**: 高 (生产安全)
