/**
 * 自我修复监控系统 v2 - 第一性原理版本
 * 验证业务逻辑正确性，不只是API存在性
 */

const https = require('https');
const fs = require('fs');

const CONFIG = {
  apiBase: 'https://payment-api.jimsbond007.workers.dev',
  checkInterval: 5 * 60 * 1000,
  logFile: 'self-healing-v2.log',
  autoFix: process.argv.includes('--fix'),
  runOnce: process.argv.includes('--once'),
  silent: process.argv.includes('--silent')
};

const state = {
  lastCheck: null,
  consecutiveFailures: 0,
  totalChecks: 0,
  isHealthy: true
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level}] ${message}`;
  fs.appendFileSync(CONFIG.logFile, entry + '\n');
  if (!CONFIG.silent) {
    const colors = {
      'INFO': '\x1b[36m',
      'SUCCESS': '\x1b[32m',
      'WARN': '\x1b[33m',
      'ERROR': '\x1b[31m',
      'RESET': '\x1b[0m'
    };
    console.log(`${colors[level] || ''}${entry}${colors.RESET}`);
  }
}

function fetch(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.apiBase);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': 'Bearer admin',
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============ 第一性原理健康检查 ============

async function checkBossConfig() {
  log('检查 Boss Config (第一性原理)...');
  
  try {
    // 1. GET 获取配置
    const getResult = await fetch('/api/boss/config');
    if (getResult.status !== 200) {
      return { healthy: false, error: `GET failed: ${getResult.status}` };
    }
    
    // 2. PUT 更新配置
    const testConfig = { enabled: true, time: '22:00', includeTrend: true, includeDetail: true };
    const putResult = await fetch('/api/boss/config', 'PUT', testConfig);
    
    if (putResult.status === 501) {
      return { healthy: false, error: 'PUT not implemented (501)' };
    }
    if (putResult.status !== 200) {
      return { healthy: false, error: `PUT failed: ${putResult.status}` };
    }
    
    // 3. 验证持久化
    const verifyResult = await fetch('/api/boss/config');
    const persisted = verifyResult.data.time === '22:00';
    
    if (!persisted) {
      return { healthy: false, error: 'Config not persisted' };
    }
    
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkPayTypeFilter() {
  log('检查支付方式筛选 (第一性原理)...');
  
  try {
    // 1. 获取全部数据
    const allData = await fetch('/api/transactions?page=1&limit=100');
    if (!allData.data || !allData.data.data) {
      return { healthy: false, error: 'Cannot fetch data' };
    }
    
    const totalRecords = allData.data.total;
    
    // 2. 测试每个支付方式
    const payTypes = ['UP_OP', 'WX_H5', 'ALI_H5'];
    
    for (const payType of payTypes) {
      const filtered = await fetch(`/api/transactions?page=1&limit=100&payType=${payType}`);
      
      if (!filtered.data || !filtered.data.data) {
        return { healthy: false, error: `Cannot fetch ${payType} data` };
      }
      
      // 第一性验证: 所有数据都匹配
      const allMatch = filtered.data.data.every(t => t.payType === payType);
      if (!allMatch) {
        const wrongItems = filtered.data.data.filter(t => t.payType !== payType);
        return { 
          healthy: false, 
          error: `${payType} filter broken. Found ${wrongItems[0]?.payType} in results` 
        };
      }
      
      // 第一性验证: 数量合理
      if (filtered.data.total > totalRecords) {
        return { healthy: false, error: `${payType} filter returned more than total` };
      }
    }
    
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkStatusFilter() {
  log('检查状态筛选 (第一性原理)...');
  
  try {
    const statuses = [0, 1, 2];
    
    for (const status of statuses) {
      const filtered = await fetch(`/api/transactions?page=1&limit=100&status=${status}`);
      
      if (!filtered.data || !filtered.data.data) continue;
      
      const allMatch = filtered.data.data.every(t => t.status === status);
      if (!allMatch) {
        return { healthy: false, error: `Status ${status} filter broken` };
      }
    }
    
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkCombinedFilters() {
  log('检查组合筛选...');
  
  try {
    const result = await fetch('/api/transactions?page=1&limit=100&payType=WX_H5&status=1');
    
    if (!result.data || !result.data.data) {
      return { healthy: false, error: 'Cannot fetch combined filter data' };
    }
    
    const allMatchWX = result.data.data.every(t => t.payType === 'WX_H5');
    const allMatchStatus = result.data.data.every(t => t.status === 1);
    
    if (!allMatchWX || !allMatchStatus) {
      return { healthy: false, error: 'Combined filter not working correctly' };
    }
    
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

async function checkGenerateReport() {
  log('检查生成报告...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await fetch('/api/boss/reports/generate', 'POST', { date: today });
    
    if (result.status !== 200 || !result.data.success) {
      return { healthy: false, error: result.data.error || 'Generate report failed' };
    }
    
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

// ============ 主监控循环 ============

async function runHealthCheck() {
  state.totalChecks++;
  state.lastCheck = new Date();
  
  log(`\n========== 第一性原理健康检查 #${state.totalChecks} ==========`);
  
  const checks = [
    { name: 'Boss Config', fn: checkBossConfig },
    { name: 'PayType Filter', fn: checkPayTypeFilter },
    { name: 'Status Filter', fn: checkStatusFilter },
    { name: 'Combined Filters', fn: checkCombinedFilters },
    { name: 'Generate Report', fn: checkGenerateReport }
  ];
  
  let allHealthy = true;
  const results = [];
  
  for (const check of checks) {
    process.stdout.write(`检查 ${check.name}... `);
    const result = await check.fn();
    results.push({ name: check.name, ...result });
    
    if (result.healthy) {
      log('✓ 正常', 'SUCCESS');
    } else {
      log(`✗ 失败: ${result.error}`, 'ERROR');
      allHealthy = false;
    }
  }
  
  // 更新状态
  state.isHealthy = allHealthy;
  if (allHealthy) {
    state.consecutiveFailures = 0;
    log('\n✓ 所有检查通过 - 系统健康', 'SUCCESS');
  } else {
    state.consecutiveFailures++;
    log(`\n✗ 发现 ${results.filter(r => !r.healthy).length} 个问题`, 'ERROR');
    
    if (state.consecutiveFailures >= 3) {
      log(`⚠ 连续 ${state.consecutiveFailures} 次检查失败！`, 'ERROR');
    }
  }
  
  // 保存报告
  saveReport(results);
  
  return allHealthy;
}

function saveReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    totalChecks: state.totalChecks,
    consecutiveFailures: state.consecutiveFailures,
    isHealthy: state.isHealthy,
    results: results
  };
  fs.writeFileSync('health-report-v2.json', JSON.stringify(report, null, 2));
}

async function main() {
  log('╔═══════════════════════════════════════════════════════════════╗');
  log('║     自我修复监控系统 v2 - 第一性原理版本                      ║');
  log('║     验证业务逻辑，不只是API存在性                            ║');
  log('╚═══════════════════════════════════════════════════════════════╝');
  
  if (CONFIG.runOnce) {
    log('运行单次检查模式');
    const healthy = await runHealthCheck();
    process.exit(healthy ? 0 : 1);
  } else {
    log(`启动持续监控 (每 ${CONFIG.checkInterval / 60000} 分钟)`);
    await runHealthCheck();
    setInterval(runHealthCheck, CONFIG.checkInterval);
    process.stdin.resume();
  }
}

process.on('SIGINT', () => {
  log('\n收到中断信号，正在退出...');
  process.exit(0);
});

main().catch(err => {
  log(`启动失败: ${err.message}`, 'ERROR');
  process.exit(1);
});
