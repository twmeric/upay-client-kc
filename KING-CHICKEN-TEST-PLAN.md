# King-Chicken 后台功能测试计划

## 测试执行指令

### 一、API端点直接测试 (PowerShell)

```powershell
# 1. 测试配置保存功能
$body = '{"enabled":true,"time":"20:00","includeTrend":true,"includeDetail":true}'
Invoke-RestMethod -Uri "https://payment-api.jimsbond007.workers.dev/api/boss/config" -Method POST -Headers @{ "Authorization"="Bearer admin"; "Content-Type"="application/json" } -Body $body

# 2. 验证配置已保存
Invoke-RestMethod -Uri "https://payment-api.jimsbond007.workers.dev/api/boss/config" -Headers @{ "Authorization"="Bearer admin" }

# 3. 测试支付方式筛选 - 银联
curl.exe -s "https://payment-api.jimsbond007.workers.dev/api/transactions?page=1&limit=5&payType=UP_OP" -H "Authorization: Bearer admin"

# 4. 测试支付方式筛选 - 微信 (URL编码)
curl.exe -s "https://payment-api.jimsbond007.workers.dev/api/transactions?page=1&limit=5&payType=%e5%be%ae%e4%bf%a1" -H "Authorization: Bearer admin"

# 5. 测试状态筛选 - 支付成功
curl.exe -s "https://payment-api.jimsbond007.workers.dev/api/transactions?page=1&limit=5&status=2" -H "Authorization: Bearer admin"

# 6. 测试生成报告
curl.exe -s -X POST "https://payment-api.jimsbond007.workers.dev/api/boss/reports/generate" -H "Authorization: Bearer admin" -H "Content-Type: application/json" -d "{\"date\":\"2026-03-21\"}"

# 7. 获取发送记录
curl.exe -s "https://payment-api.jimsbond007.workers.dev/api/boss/reports?page=1&limit=10" -H "Authorization: Bearer admin"
```

---

## 二、浏览器端测试步骤

### 测试环境
- URL: https://king-chicken.jkdcoding.com/admin
- 账号: mimichu / 98113210

### 测试步骤

#### 步骤1: 交易流水筛选测试
1. 打开浏览器开发者工具 (F12) -> Network 标签
2. 进入"交易流水"页面
3. 点击"微信"支付方式筛选按钮
4. 检查Network中发出的请求URL是否包含 `payType=` 参数
5. 检查返回的数据是否只包含 WX_H5 类型的交易

**预期结果**: 
- 请求URL: `/api/transactions?...&payType=微信`
- 返回结果: 4条 WX_H5 记录

**如果失败**: 截图Network面板的请求和响应

#### 步骤2: 老板配置保存测试
1. 进入"老板挚爱"页面
2. 修改发送时间为 "21:00"
3. 取消勾选"包含本週對比趨勢"
4. 点击"保存配置"按钮
5. 刷新页面，检查设置是否保留

**预期结果**: 刷新后时间显示为21:00，复选框保持未勾选状态

#### 步骤3: 生成报告测试
1. 在"老板挚爱"页面
2. 点击"生成今日報告"按钮
3. 检查是否有成功提示

**预期结果**: 显示"报告生成成功"，发送记录列表新增一条

---

## 三、已知问题清单

| 问题 | 状态 | 备注 |
|-----|------|------|
| 支付方式筛选可能失效 | 待验证 | 可能是前端URL编码问题 |
| 85251164453记录不存在 | 已确认 | 数据库中无此记录，需确认是否曾经添加 |
| 发送记录显示不全 | 待验证 | 目前只显示有数据的日期 |

---

## 四、数据库参考数据

### 现有交易数据
```
UP_OP (银联):  17笔
ALI_H5 (支付宝): 2笔  
WX_H5 (微信):  4笔
```

### 现有收件人
```
咪咪姐:    85298113210
Michelle: 85292404878
```

### 现有发送记录 (daily_reports表)
```
2026-03-20: HK$ 0,    0笔
2026-03-19: HK$ 100, 18笔
```

---

## 五、测试报告模板

测试完成后请填写:

```
测试日期: ___
测试人员: ___

功能测试结果:
□ 交易流水 - 状态筛选: 通过/失败
□ 交易流水 - 支付方式筛选: 通过/失败  
□ 交易流水 - 日期筛选: 通过/失败
□ 老板挚爱 - 保存配置: 通过/失败
□ 老板挚爱 - 生成报告: 通过/失败
□ 老板挚爱 - 发送记录: 通过/失败
□ 仪表板 - 数据显示: 通过/失败

发现问题:
1. ___
2. ___

截图附件: ___
```
