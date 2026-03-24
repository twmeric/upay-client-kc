# King-Chicken 自动化测试与自我修复指南

## 快速开始

### 1. 运行健康检查 (推荐首次使用)
```powershell
# 双击运行
run-health-check.bat

# 或命令行
./run-health-check.bat --once    # 单次检查
./run-health-check.bat --watch   # 持续监控
```

### 2. 支付功能保护测试 (每次部署前必做)
```bash
node payment-protection-test.js
```
如果此测试失败，**立即停止部署**！

### 3. 安全部署 (带自动验证)
```powershell
./safe-deploy.ps1
```

## 自动化监控系统

### 启动持续监控
```bash
node self-healing-monitor.js --fix
```

功能：
- 每5分钟自动检查所有API
- 发现问题自动尝试修复
- 记录详细日志到 `self-healing.log`
- 生成 `health-report.json` 状态报告

### 作为 Windows 服务运行
创建计划任务 (以管理员运行 PowerShell):
```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "self-healing-monitor.js --fix --silent" -WorkingDirectory (Get-Location)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName "KingChicken-HealthMonitor" -Action $action -Trigger $trigger
```

## 测试套件说明

### 1. payment-protection-test.js
**用途**: 保护客户收款功能  
**何时运行**: 每次部署前  
**失败处理**: 立即停止部署

检查项：
- 支付创建端点
- 交易查询API
- CORS 配置
- 关键API可用性

### 2. self-healing-monitor.js
**用途**: 持续监控系统健康  
**何时运行**: 生产环境常驻  
**修复能力**: 自动尝试修复常见问题

检查项：
- Dashboard 统计
- 支付方式筛选
- 状态筛选
- 老板配置API
- 老板报告API
- 生成报告功能
- 前端可访问性

### 3. safe-deploy.ps1
**用途**: 安全的部署流程  
**何时运行**: 需要更新代码时  
**安全特性**: 部署前验证支付功能

流程：
1. 支付保护测试
2. 后台API测试
3. 前端构建检查
4. 确认部署
5. 部署Worker
6. 部署前端
7. 部署后验证
8. 生成报告

## 自我修复能力

### 当前支持的自动修复
- ✅ API 端点健康检查
- ✅ CORS 配置检测
- ✅ 字段映射验证
- ✅ 数据库连接检测

### 需要手动修复的问题
- ⚠️ 数据库字段变更 (需要 wrangler d1 execute)
- ⚠️ Worker 代码错误 (需要重新部署)
- ⚠️ 环境变量配置 (需要 Cloudflare Dashboard)
- ⚠️ 前端构建错误 (需要修复代码)

## 常见问题处理

### 问题: 支付筛选不工作
**检测**: self-healing-monitor 会报告
**自动修复**: 尝试重启监控
**手动修复**: 
```bash
# 检查 payType 参数传递
curl "$API/api/transactions?payType=UP_OP"
```

### 问题: 老板报告字段缺失
**检测**: 健康检查失败
**自动修复**: 无 (需手动更新代码)
**手动修复**: 确保 Worker 返回 `total_amount`, `count`, `success` 字段

### 问题: 配置无法保存
**检测**: Boss Config API 测试失败
**自动修复**: 无
**手动修复**: 检查 `boss_config` 表结构

## 监控告警

当连续3次检查失败时，系统会记录严重错误。建议配置外部告警：

### 邮件告警 (扩展)
在 self-healing-monitor.js 中添加:
```javascript
if (state.consecutiveFailures >= 3) {
  sendEmailAlert('King-Chicken系统连续失败');
}
```

### Slack 告警 (扩展)
```javascript
const webhook = 'YOUR_SLACK_WEBHOOK';
fetch(webhook, {
  method: 'POST',
  body: JSON.stringify({ text: 'King-Chicken告警: ' + message })
});
```

## 日志文件

| 文件 | 内容 | 保留时间 |
|-----|------|---------|
| self-healing.log | 持续监控日志 | 7天 |
| payment-protection.log | 支付测试日志 | 30天 |
| health-report.json | 最新健康状态 | 覆盖 |
| payment-protection-report.json | 支付测试报告 | 覆盖 |
| deploy-report.json | 部署报告 | 保留10个 |

## 最佳实践

1. **部署前**: 总是运行 `node payment-protection-test.js`
2. **日常**: 运行 `run-health-check.bat --watch` 持续监控
3. **问题排查**: 查看 `self-healing.log` 和 `health-report.json`
4. **安全**: 使用 `./safe-deploy.ps1` 替代手动部署

## 紧急回滚

如果部署后出现问题:
```bash
# 查看部署历史
wrangler deployments list

# 回滚到上一版本
wrangler rollback

# 验证回滚
node payment-protection-test.js
```
