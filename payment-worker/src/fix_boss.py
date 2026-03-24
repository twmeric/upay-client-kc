import re

import os
script_dir = os.path.dirname(os.path.abspath(__file__))
index_path = os.path.join(script_dir, 'index.js')
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the getBossReports function
old_func = '''async function getBossReports(request, env) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    
    // 模拟报告数据 - 金额除以100，成功率正确格式化
    const allReports = [
      {
        id: 1,
        date: '2026-03-20',
        totalAmount: 12580,
        orderCount: 48,
        successCount: 46,
        successRate: '96.5',
        status: 'sent',
        sentAt: '2026-03-20 22:00',
        recipients: 2,
        message: '每日報告已發送'
      },
      {
        id: 2,
        date: '2026-03-19',
        totalAmount: 13000,
        orderCount: 46,
        successCount: 44,
        successRate: '95.7',
        status: 'sent',
        sentAt: '2026-03-19 22:00',
        recipients: 2,
        message: '每日報告已發送'
      },
      {
        id: 3,
        date: '2026-03-18',
        totalAmount: 14200,
        orderCount: 50,
        successCount: 48,
        successRate: '96.0',
        status: 'sent',
        sentAt: '2026-03-18 22:00',
        recipients: 2,
        message: '每日報告已發送'
      },
      {
        id: 4,
        date: '2026-03-17',
        totalAmount: 12800,
        orderCount: 45,
        successCount: 43,
        successRate: '95.6',
        status: 'sent',
        sentAt: '2026-03-17 22:00',
        recipients: 2,
        message: '每日報告已發送'
      },
      {
        id: 5,
        date: '2026-03-16',
        totalAmount: 10500,
        orderCount: 38,
        successCount: 36,
        successRate: '94.7',
        status: 'sent',
        sentAt: '2026-03-16 22:00',
        recipients: 2,
        message: '每日報告已發送'
      }
    ];
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedReports = allReports.slice(start, end);
    
    // 映射字段名以匹配前端期望的格式
    // 前端期望: amount (cents), count, success (percentage string)
    const formattedReports = paginatedReports.map(report => ({
      id: report.id,
      date: report.date,
      amount: report.totalAmount * 100,  // 转换为分 (cents)，前端会除以100显示
      count: report.orderCount,           // 订单数量
      successCount: report.successCount,  // 成功数量
      success: report.successRate + '%',  // 成功率百分比格式
      status: report.status,
      sentAt: report.sentAt,
      recipients: report.recipients,
      message: report.message
    }));
    
    return jsonResponse({
      data: formattedReports,
      total: allReports.length,
      page: page,
      limit: limit
    });
  } catch (error) {
    console.error('[BossReports] Error:', error);
    // 返回空数据但格式正确
    return jsonResponse({
      data: [],
      total: 0,
      page: 1,
      limit: 10
    });
  }
}'''

new_func = '''// 获取Boss报告列表 - 基于真实交易数据动态生成
async function getBossReports(request, env) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    
    // 从数据库获取每日交易统计（最近30天）
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
    
    const dailyStats = await env.DB.prepare(`
      SELECT 
        date(createdAt, 'unixepoch', 'localtime') as date,
        COUNT(*) as orderCount,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
      FROM transactions 
      WHERE createdAt >= ?
      GROUP BY date(createdAt, 'unixepoch', 'localtime')
      ORDER BY date DESC
    `).bind(thirtyDaysAgo).all();
    
    // 获取已配置的收件人数量
    const recipientsResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM boss_recipients WHERE isEnabled = 1
    `).first();
    const activeRecipients = recipientsResult?.count || 0;
    
    // 将统计数据转换为报告格式
    const allReports = (dailyStats.results || []).map((stat, index) => {
      const orderCount = stat.orderCount || 0;
      const successCount = stat.successCount || 0;
      const successRate = orderCount > 0 ? ((successCount / orderCount) * 100).toFixed(1) : '0.0';
      
      // 金额从分转换为元（用于显示）
      const amountInYuan = Math.round((stat.totalAmount || 0) / 100);
      
      return {
        id: index + 1,
        date: stat.date,
        amount: amountInYuan * 100,  // 转换为分，前端会除以100显示
        count: orderCount,
        successCount: successCount,
        success: successRate + '%',
        status: 'sent',
        sentAt: stat.date + ' 22:00',
        recipients: activeRecipients,
        message: `每日報告：${orderCount}筆交易，成功率${successRate}%`
      };
    });
    
    // 分页
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedReports = allReports.slice(start, end);
    
    return jsonResponse({
      data: paginatedReports,
      total: allReports.length,
      page: page,
      limit: limit
    });
  } catch (error) {
    console.error('[BossReports] Error:', error);
    return jsonResponse({
      data: [],
      total: 0,
      page: 1,
      limit: 10
    });
  }
}'''

if old_func in content:
    content = content.replace(old_func, new_func)
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced getBossReports function")
else:
    print("Old function not found")
    # Debug: find the function
    idx = content.find('async function getBossReports')
    if idx >= 0:
        print(f"Found at index {idx}")
        print(content[idx:idx+500])
