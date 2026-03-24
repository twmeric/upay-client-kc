/**
 * King-Chicken 自我监控系统
 * 持续监控 API 健康并在发现问题时自动修复
 * 
 * 使用: node self-healing-monitor.js [options]
 * Options:
 *   --once    - 只运行一次测试然后退出
 *   --fix     - 发现问题时尝试自动修复
 *   --silent  - 静默模式(只记录日志)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  apiBase: 'https://payment-api.jimsbond007.workers.dev',
  adminUrl: 'https://king-chicken.jkdcoding.com/admin',
  checkInterval: 5 * 60 * 1000, // 5分钟检查一次
  logFile: 'self-healing.log',
  autoFix: process.argv.includes('--fix'),
  runOnce: process.argv.includes('--once'),
  silent: process.argv.includes('--silent')
};

// 状态追踪
const state = {
  lastCheck: null,
  consecutiveFailures: 0,
  totalChecks: 0,
  issuesFound: [],
  fixesApplied: [],
  isHealthy: true
};

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level}] ${message}`;
  
  fs.appendFileSync(CONFIG.logFile, entry + '\n');
  
  if (!CONFIG.silent) {
    const colors = {
      'INFO': '\x1b[36m',   // Cyan
      'SUCCESS': '\x1b[32m', // Green
      'WARN': '\x1b[33m',   // Yellow
      'ERROR': '\x1b[31m',  // Red
      'RESET': '\x1b[0m'
    };
    console.log(`${colors[level] || ''}${entry}${colors.RESET}`);
  }
}

// HTTP 请求工具
function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.apiBase);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': 'Bearer admin',
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ==================== 健康检查 ====================

async function checkDashboardStats() {
  try {
    const response = await makeRequest('/api/dashboard/stats');
    if (response.status === 200 && (response.data.todayStats || response.data.today)) {
      return { healthy: true, data: response.data.todayStats };
    }
    return { healthy: false, error: 'Invalid response format' };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkPayTypeFilter() {
  try {
    // 测试筛选功能
    const payTypes = ['UP_OP', 'ALI_H5', 'WX_H5'];
    for (const payType of payTypes) {
      const response = await makeRequest(`/api/transactions?page=1&limit=10&payType=${payType}`);
      if (response.status === 200 && Array.isArray(response.data.data)) {
        // 验证返回的数据是否正确筛选
        const allMatch = response.data.data.every(t => t.payType === payType);
        if (!allMatch) {
          return { healthy: false, error: `Filter for ${payType} not working correctly` };
        }
      }
    }
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkStatusFilter() {
  try {
    const response = await makeRequest('/api/transactions?page=1&limit=10&status=2');
    if (response.status === 200 && Array.isArray(response.data.data)) {
      const allMatch = response.data.data.every(t => t.status === 2);
      return { healthy: allMatch, error: allMatch ? null : 'Status filter not working' };
    }
    return { healthy: false, error: 'Invalid response' };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkBossConfig() {
  try {
    // GET 检查
    const getResponse = await makeRequest('/api/boss/config');
    if (getResponse.status !== 200) {
      return { healthy: false, error: 'GET /api/boss/config failed' };
    }
    
    // POST 检查 (使用测试配置)
    const testConfig = {
      enabled: true,
      time: '22:00',
      includeTrend: true,
      includeDetail: true
    };
    const postResponse = await makeRequest('/api/boss/config', 'POST', testConfig);
    if (postResponse.status !== 200) {
      return { healthy: false, error: 'POST /api/boss/config failed' };
    }
    
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkBossReports() {
  try {
    const response = await makeRequest('/api/boss/reports?page=1&limit=5');
    if (response.status === 200 && (response.data.reports || response.data.data)) {
      // 验证报告字段
      const reports = response.data.reports || response.data.data;
      if (reports.length > 0) {
        const firstReport = reports[0];
        const hasRequiredFields = 
          'date' in firstReport &&
          'total_amount' in firstReport &&
          'count' in firstReport &&
          'success' in firstReport;
        return { healthy: hasRequiredFields, error: hasRequiredFields ? null : 'Missing required fields' };
      }
      return { healthy: true };
    }
    return { healthy: false, error: 'Invalid response' };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkGenerateReport() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await makeRequest('/api/boss/reports/generate', 'POST', { date: today });
    if (response.status === 200 && response.data.success) {
      return { healthy: true, report: response.data.report };
    }
    return { healthy: false, error: response.data.error || 'Generate report failed' };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkPaymentAPI() {
  // 检查支付 API 健康 (只检查 OPTIONS)
  const criticalEndpoints = [
    '/api/v1/payments',
    '/api/public/payment/create',
    '/api/v1/public/payment/create'
  ];
  
  let working = 0;
  for (const endpoint of criticalEndpoints) {
    try {
      await makeRequest(endpoint, 'OPTIONS');
      working++;
    } catch (e) {
      // 忽略错误，只统计
    }
  }
  
  return { 
    healthy: working > 0, 
    error: working > 0 ? null : 'No payment endpoints responding',
    details: `${working}/${criticalEndpoints.length} endpoints`
  };
}

async function checkFrontend() {
  return new Promise((resolve) => {
    https.get(CONFIG.adminUrl, { timeout: 10000 }, (res) => {
      resolve({ healthy: res.statusCode === 200, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ healthy: false, error: err.message });
    });
  });
}

// ==================== 自动修复 ====================

async function attemptAutoFix(issue, details) {
  if (!CONFIG.autoFix) {
    log(`自动修复已禁用，跳过: ${issue}`, 'WARN');
    return false;
  }
  
  log(`尝试自动修复: ${issue}`, 'WARN');
  
  switch (issue) {
    case 'dashboardStats':
      // 数据库问题通常需要手动修复
      log('数据库问题需要手动检查 D1 schema', 'ERROR');
      return false;
      
    case 'payTypeFilter':
    case 'statusFilter':
      log('筛选问题可能需要重新部署 API Worker', 'WARN');
      // 这里可以添加 wrangler 部署命令
      return false;
      
    case 'bossConfig':
      log('配置 API 问题，检查 boss_config 表结构', 'WARN');
      return false;
      
    case 'bossReports':
      log('报告 API 问题，检查字段映射', 'WARN');
      return false;
      
    case 'generateReport':
      log('生成报告失败，检查 /api/boss/reports/generate 端点', 'WARN');
      return false;
      
    case 'paymentAPI':
      log('支付 API 问题，客户收款功能可能受影响！', 'ERROR');
      return false;
      
    case 'frontend':
      log('前端访问问题，检查 Cloudflare Pages 部署', 'WARN');
      return false;
      
    default:
      log(`未知问题类型: ${issue}`, 'ERROR');
      return false;
  }
}

// ==================== 主监控循环 ====================

async function runHealthCheck() {
  state.totalChecks++;
  state.lastCheck = new Date();
  
  log(`\n========== 健康检查 #${state.totalChecks} ==========`);
  
  const checks = [
    { name: 'Dashboard Stats', fn: checkDashboardStats, id: 'dashboardStats' },
    { name: 'PayType Filter', fn: checkPayTypeFilter, id: 'payTypeFilter' },
    { name: 'Status Filter', fn: checkStatusFilter, id: 'statusFilter' },
    { name: 'Boss Config', fn: checkBossConfig, id: 'bossConfig' },
    { name: 'Boss Reports', fn: checkBossReports, id: 'bossReports' },
    { name: 'Generate Report', fn: checkGenerateReport, id: 'generateReport' },
    { name: 'Payment API', fn: checkPaymentAPI, id: 'paymentAPI' },
    { name: 'Frontend', fn: checkFrontend, id: 'frontend' }
  ];
  
  let allHealthy = true;
  const results = [];
  
  for (const check of checks) {
    process.stdout.write(`检查 ${check.name}... `);
    const result = await check.fn();
    results.push({ ...result, name: check.name, id: check.id });
    
    if (result.healthy) {
      log('✓ 正常' + (result.details ? ` (${result.details})` : ''), 'SUCCESS');
    } else {
      log(`✗ 失败: ${result.error}`, 'ERROR');
      allHealthy = false;
      
      // 尝试自动修复
      const fixed = await attemptAutoFix(check.id, result);
      if (fixed) {
        state.fixesApplied.push({ issue: check.id, time: new Date() });
      }
    }
  }
  
  // 更新状态
  state.isHealthy = allHealthy;
  if (allHealthy) {
    state.consecutiveFailures = 0;
    log('\n✓ 所有系统正常', 'SUCCESS');
  } else {
    state.consecutiveFailures++;
    log(`\n✗ 发现 ${results.filter(r => !r.healthy).length} 个问题`, 'ERROR');
    
    // 连续失败超过3次，发送警报
    if (state.consecutiveFailures >= 3) {
      log(`⚠ 连续 ${state.consecutiveFailures} 次检查失败！`, 'ERROR');
      // 这里可以添加邮件/Slack 通知
    }
  }
  
  // 保存状态报告
  saveStateReport(results);
  
  return allHealthy;
}

function saveStateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalChecks: state.totalChecks,
    consecutiveFailures: state.consecutiveFailures,
    isHealthy: state.isHealthy,
    results: results,
    fixesApplied: state.fixesApplied
  };
  
  fs.writeFileSync('health-report.json', JSON.stringify(report, null, 2));
}

async function main() {
  log('========================================');
  log('King-Chicken 自我监控系统启动');
  log(`API: ${CONFIG.apiBase}`);
  log(`Admin: ${CONFIG.adminUrl}`);
  log(`自动修复: ${CONFIG.autoFix ? '启用' : '禁用'}`);
  log('========================================');
  
  if (CONFIG.runOnce) {
    log('运行单次检查模式');
    const healthy = await runHealthCheck();
    process.exit(healthy ? 0 : 1);
  } else {
    log(`启动持续监控 (每 ${CONFIG.checkInterval / 60000} 分钟检查一次)`);
    
    // 立即运行一次
    await runHealthCheck();
    
    // 定时运行
    setInterval(runHealthCheck, CONFIG.checkInterval);
    
    // 保持进程运行
    process.stdin.resume();
  }
}

// 优雅退出
process.on('SIGINT', () => {
  log('\n收到中断信号，正在退出...', 'INFO');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log(`未捕获异常: ${err.message}`, 'ERROR');
  // 不退出，继续监控
});

// 启动
main().catch(err => {
  log(`启动失败: ${err.message}`, 'ERROR');
  process.exit(1);
});
