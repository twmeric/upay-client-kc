/**
 * 深度检测脚本 - 验证筛选逻辑真正生效
 * 不只是检查API是否存在，而是验证业务逻辑是否正确
 */

const https = require('https');

const API_BASE = 'https://payment-api.jimsbond007.workers.dev';

function log(msg, level = 'INFO') {
  const colors = {
    'INFO': '\x1b[36m',
    'SUCCESS': '\x1b[32m',
    'ERROR': '\x1b[31m',
    'WARN': '\x1b[33m',
    'RESET': '\x1b[0m'
  };
  console.log(`${colors[level] || ''}[${level}] ${msg}${colors.RESET}`);
}

function fetch(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'Authorization': 'Bearer admin' },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: 'Invalid JSON', raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

// ============ 深度测试 ============

async function testPayTypeFilterDeep() {
  log('\n========== 深度测试: 支付方式筛选 ==========', 'INFO');
  
  // 1. 先获取所有数据
  log('1. 获取所有交易...');
  const allData = await fetch('/api/transactions?page=1&limit=100');
  
  if (!allData.data || allData.data.length === 0) {
    log('没有交易数据，无法测试', 'ERROR');
    return false;
  }
  
  const totalCount = allData.total;
  log(`   总数: ${totalCount} 条`);
  
  // 统计各支付方式数量
  const payTypeCounts = {};
  allData.data.forEach(t => {
    payTypeCounts[t.payType] = (payTypeCounts[t.payType] || 0) + 1;
  });
  log('   分布: ' + JSON.stringify(payTypeCounts));
  
  // 2. 测试每个支付方式的筛选
  const payTypes = ['UP_OP', 'WX_H5', 'ALI_H5'];
  let allPassed = true;
  
  for (const payType of payTypes) {
    log(`\n2. 测试筛选: ${payType}...`);
    const filtered = await fetch(`/api/transactions?page=1&limit=100&payType=${payType}`);
    
    if (!filtered.data) {
      log(`   返回数据异常`, 'ERROR');
      allPassed = false;
      continue;
    }
    
    // 验证1: 所有返回的数据都是该支付方式
    const allMatch = filtered.data.every(t => t.payType === payType);
    
    // 验证2: 返回数量应该小于等于总数
    const countValid = filtered.total <= totalCount;
    
    // 验证3: 如果该支付方式存在，返回数量应该等于统计数量
    const expectedCount = payTypeCounts[payType] || 0;
    const countCorrect = filtered.total === expectedCount;
    
    log(`   返回: ${filtered.total} 条`);
    log(`   全部匹配 ${payType}: ${allMatch ? '✓' : '✗'}`, allMatch ? 'SUCCESS' : 'ERROR');
    log(`   数量合理: ${countValid ? '✓' : '✗'}`, countValid ? 'SUCCESS' : 'ERROR');
    log(`   数量准确: ${countCorrect ? '✓' : '✗'} (${filtered.total}/${expectedCount})`, countCorrect ? 'SUCCESS' : 'WARN');
    
    if (!allMatch || !countValid) {
      allPassed = false;
      log(`   ❌ 筛选未生效！示例数据:`, 'ERROR');
      filtered.data.slice(0, 3).forEach(t => {
        log(`      - ${t.orderNo}: ${t.payType}`, 'ERROR');
      });
    }
  }
  
  return allPassed;
}

async function testStatusFilterDeep() {
  log('\n========== 深度测试: 状态筛选 ==========', 'INFO');
  
  const allData = await fetch('/api/transactions?page=1&limit=100');
  const totalCount = allData.total;
  
  // 测试每个状态
  const statuses = [0, 1, 2, 3]; // 待支付, 支付中, 成功, 失败
  let allPassed = true;
  
  for (const status of statuses) {
    log(`测试状态 ${status}...`);
    const filtered = await fetch(`/api/transactions?page=1&limit=100&status=${status}`);
    
    if (!filtered.data) continue;
    
    const allMatch = filtered.data.every(t => t.status === status);
    log(`   返回: ${filtered.total} 条, 全部匹配: ${allMatch ? '✓' : '✗'}`, allMatch ? 'SUCCESS' : 'ERROR');
    
    if (!allMatch) allPassed = false;
  }
  
  return allPassed;
}

async function testCombinedFilters() {
  log('\n========== 深度测试: 组合筛选 ==========', 'INFO');
  
  // 测试同时筛选支付方式+状态
  const result = await fetch('/api/transactions?page=1&limit=100&payType=WX_H5&status=1');
  
  if (!result.data) {
    log('返回数据异常', 'ERROR');
    return false;
  }
  
  const allMatchWX = result.data.every(t => t.payType === 'WX_H5');
  const allMatchStatus = result.data.every(t => t.status === 1);
  
  log(`组合筛选 (WX_H5 + status=1):`);
  log(`   返回: ${result.total} 条`);
  log(`   支付方式正确: ${allMatchWX ? '✓' : '✗'}`, allMatchWX ? 'SUCCESS' : 'ERROR');
  log(`   状态正确: ${allMatchStatus ? '✓' : '✗'}`, allMatchStatus ? 'SUCCESS' : 'ERROR');
  
  return allMatchWX && allMatchStatus;
}

async function testBossConfigPut() {
  log('\n========== 测试: Boss Config PUT ==========', 'INFO');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'payment-api.jimsbond007.workers.dev',
      path: '/api/boss/config',
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer admin',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      log(`PUT /api/boss/config: HTTP ${res.statusCode}`);
      
      if (res.statusCode === 501) {
        log('❌ 后端缺少PUT方法实现', 'ERROR');
        resolve(false);
      } else if (res.statusCode === 200) {
        log('✓ PUT方法正常', 'SUCCESS');
        resolve(true);
      } else {
        log(`? 意外状态码: ${res.statusCode}`, 'WARN');
        resolve(false);
      }
    });

    req.on('error', (err) => {
      log(`请求错误: ${err.message}`, 'ERROR');
      resolve(false);
    });

    req.write(JSON.stringify({ enabled: true, time: '22:00' }));
    req.end();
  });
}

async function testParameterVariations() {
  log('\n========== 测试: 参数名变体 ==========', 'INFO');
  
  // 测试前端可能使用的不同参数名
  const variations = [
    { name: 'payType (大写)', url: '/api/transactions?page=1&limit=5&payType=WX_H5' },
    { name: 'paytype (小写)', url: '/api/transactions?page=1&limit=5&paytype=WX_H5' },
    { name: 'pay_type (下划线)', url: '/api/transactions?page=1&limit=5&pay_type=WX_H5' },
    { name: 'type (简写)', url: '/api/transactions?page=1&limit=5&type=WX_H5' },
  ];
  
  for (const v of variations) {
    const result = await fetch(v.url);
    const works = result.data && result.data.every(t => t.payType === 'WX_H5');
    log(`${v.name}: ${works ? '✓ 有效' : '✗ 无效'}`, works ? 'SUCCESS' : 'WARN');
  }
}

// ============ 主程序 ============

async function main() {
  log('========================================', 'INFO');
  log('King-Chicken 深度检测', 'INFO');
  log('验证业务逻辑，不只是API存在性', 'INFO');
  log('========================================', 'INFO');
  
  const results = {
    payTypeFilter: await testPayTypeFilterDeep(),
    statusFilter: await testStatusFilterDeep(),
    combinedFilters: await testCombinedFilters(),
    bossConfigPut: await testBossConfigPut(),
    parameterVariations: await testParameterVariations()
  };
  
  log('\n========================================', 'INFO');
  log('检测结果汇总', 'INFO');
  log('========================================', 'INFO');
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✓ 通过' : '✗ 失败';
    const color = passed ? 'SUCCESS' : 'ERROR';
    log(`${name}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(r => r === true);
  
  log('\n========================================', 'INFO');
  if (allPassed) {
    log('✓ 所有深度测试通过', 'SUCCESS');
  } else {
    log('✗ 发现严重问题！', 'ERROR');
    log('', 'INFO');
    log('问题分析:', 'WARN');
    if (!results.payTypeFilter) log('- 支付方式筛选不生效', 'ERROR');
    if (!results.bossConfigPut) log('- Boss配置PUT方法缺失', 'ERROR');
    log('', 'INFO');
    log('这些API层面的问题会导致前端筛选失效！', 'ERROR');
  }
  log('========================================', 'INFO');
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  log(`执行错误: ${err.message}`, 'ERROR');
  process.exit(1);
});
