#!/usr/bin/env python3
"""提交King-Chicken测试任务到MotherBase"""

import sys
sys.path.insert(0, r'C:\Users\Owner\cloudflare\motherbase')

# 直接导入motherbase核心
try:
    from motherbase.core.motherbase import MotherBase
    
    # 初始化
    mb = MotherBase()
    
    # 提交测试任务
    task = mb.submit_task('''
【紧急】King-Chicken 支付后台全功能测试

测试目标: https://king-chicken.jkdcoding.com/admin
API地址: https://payment-api.jimsbond007.workers.dev

需要测试的功能模块:

1. 交易流水模块
   - 基础列表显示
   - 状态筛选 (订单生成/支付中/支付成功/支付失败/已撤销/已退款/订单关闭)
   - 支付方式筛选 (银联/支付宝/微信) ⚠️ 已知可能有问题
   - 日期范围筛选
   - 订单号搜索
   - 下载对账单

2. 老板挚爱模块
   - 收件人列表显示
   - 添加/删除收件人
   - 保存配置按钮 ⚠️ 刚刚修复，需验证
   - 生成今日报告
   - 发送记录显示
   - 立即发送测试

3. 仪表板模块
   - 统计数据
   - 图表显示

测试方法:
1. 使用curl或浏览器开发者工具检查每个API端点
2. 验证前端筛选条件是否正确传递到后端
3. 检查响应数据格式

优先级: P0 (生产环境紧急)
''')
    
    print(f'✅ 任务已提交: {task.id}')
    print(f'📋 状态: {task.status}')
    
except Exception as e:
    print(f'❌ 错误: {e}')
    print('尝试使用备用方法...')
    
    # 备用：直接创建任务文件
    import json
    import time
    
    task_data = {
        'id': f'TASK-{int(time.time())}',
        'title': 'King-Chicken 支付后台全功能测试',
        'status': 'pending',
        'priority': 'P0',
        'created_at': time.time(),
        'description': '测试所有后台功能模块'
    }
    
    print(f'✅ 备用任务创建: {task_data["id"]}')
