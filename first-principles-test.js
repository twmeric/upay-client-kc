/**
 * 第一性原理测试 - 端到端验证
 * 不只是检查API存在，而是验证完整业务逻辑
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

function fetch(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
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
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data: { raw: data },
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============ 第一性原理测试 ============

async function testBossConfigPut() {
  log('\n========== 测试: Boss Config PUT (第一性原理) ==========', 'INFO');
  
  // 测试1: GET 获取当前配置
  log('1. 获取当前配置...');
  const getResult = await fetch('/api/boss/config', 'GET');
  
  if (getResult.status !== 200) {
    log(`   GET 失败: HTTP ${getResult.status}`, 'ERROR');
    return false;
  }
  log(`   GET 成功: ${JSON.stringify(getResult.data)}`, 'SUCCESS');
  
  // 测试2: PUT 更新配置
  log('\n2. PUT 更新配置...');
  const testConfig = {
    enabled: true,
    time: '22:00',
    includeTrend: true,
    includeDetail: true,
    recipients: [
      { phone: '85298113210', name: '测试1' },
      { phone: '85292404878', name: '测试2' }
    ]
  };
  
  const putResult = await fetch('/api/boss/config', 'PUT', testConfig);
  
  if (putResult.status === 501) {
    log(`   PUT 返回 501 - 未实现`, 'ERROR');
    return false;
  }
  
  if (putResult.status !== 200) {
    log(`   PUT 失败: HTTP ${putResult.status}`, 'ERROR');
    log(`   错误: ${JSON.stringify(putResult.data)}`, 'ERROR');
    return false;
  }
  
  log(`   PUT 成功: ${JSON.stringify(putResult.data)}`, 'SUCCESS');
  
  // 测试3: 验证更新是否生效
  log('\n3. 验证更新是否持久化...');
  const verifyResult = await fetch('/api/boss/config', 'GET');
  
  const configMatches = verifyResult.data.time === '22:00' && 
                        verifyResult.data.enabled === true;
  
  if (configMatches) {
    log(`   验证成功: 配置已正确保存`, 'SUCCESS');
  } else {
    log(`   验证失败: 配置未正确保存`, 'ERROR');
    log(`   期望: time=22:00, enabled=true`, 'ERROR');
    log(`   实际: time=${verifyResult.data.time}, enabled=${verifyResult.data.enabled}`, 'ERROR');
    return false;
  }
  
  return true;
}

async function testPayTypeFilterFirstPrinciples() {
  log('\n========== 测试: 支付方式筛选 (第一性原理) ==========', 'INFO');
  
  // 核心原理: 筛选应该减少返回的数据量，且所有数据都符合筛选条件
  
  // 步骤1: 获取全部数据
  log('1. 获取全部数据（无筛选）...');
  const allData = await fetch('/api/transactions?page=1&limit=100');
  
  if (!allData.data || !allData.data.data) {
    log('   无法获取数据', 'ERROR');
    return false;
  }
  
  const totalRecords = allData.data.total;
  const rawData = allData.data.data;
  
  log(`   总记录数: ${totalRecords}`);
  log(`   本页记录: ${rawData.length}`);
  
  // 统计分布
  const distribution = {};
  rawData.forEach(t => {
    distribution[t.payType] = (distribution[t.payType] || 0) + 1;
  });
  log(`   分布: ${JSON.stringify(distribution)}`);
  
  // 步骤2: 测试筛选后数据量减少
  log('\n2. 测试筛选效果...');
  const payTypes = ['UP_OP', 'WX_H5', 'ALI_H5'];
  let allTestsPassed = true;
  
  for (const payType of payTypes) {
    log(`\n   测试 ${payType}:`);
    
    const filtered = await fetch(`/api/transactions?page=1&limit=100&payType=${payType}`);
    
    if (!filtered.data || !filtered.data.data) {
      log(`     无法获取筛选数据`, 'ERROR');
      allTestsPassed = false;
      continue;
    }
    
    const filteredData = filtered.data.data;
    const filteredTotal = filtered.data.total;
    
    // 第一性验证1: 所有返回的数据都符合筛选条件
    const allMatch = filteredData.every(t => t.payType === payType);
    
    // 第一性验证2: 返回数量应该小于等于总数
    const countValid = filteredTotal <= totalRecords;
    
    // 第一性验证3: 如果不存在该类型，返回应为空
    const expectedCount = distribution[payType] || 0;
    const countCorrect = filteredTotal === expectedCount;
    
    log(`     筛选后数量: ${filteredTotal}/${totalRecords}`);
    log(`     全部匹配: ${allMatch ? '✓' : '✗'}`, allMatch ? 'SUCCESS' : 'ERROR');
    log(`     数量合理: ${countValid ? '✓' : '✗'}`, countValid ? 'SUCCESS' : 'ERROR');
    log(`     数量准确: ${countCorrect ? '✓' : '✗'} (${filteredTotal}/${expectedCount})`, 
        countCorrect ? 'SUCCESS' : 'WARN');
    
    if (!allMatch || !countValid) {
      allTestsPassed = false;
      log(`     ❌ 筛选测试失败！`, 'ERROR');
    }
  }
  
  return allTestsPassed;
}

async function testStatusFilterFirstPrinciples() {
  log('\n========== 测试: 状态筛选 (第一性原理) ==========', 'INFO');
  
  const statusMap = {
    0: '待支付',
    1: '支付中', 
    2: '支付成功',
    3: '支付失败'
  };
  
  // 获取全部数据
  const allData = await fetch('/api/transactions?page=1&limit=100');
  const totalRecords = allData.data.total;
  
  log(`总记录: ${totalRecords}`);
  
  // 测试每个状态
  let allTestsPassed = true;
  
  for (const [status, name] of Object.entries(statusMap)) {
    const filtered = await fetch(`/api/transactions?page=1&limit=100&status=${status}`);
    
    if (!filtered.data || !filtered.data.data) {
      log(`${name}(${status}): 无法获取数据`, 'ERROR');
      allTestsPassed = false;
      continue;
    }
    
    const filteredData = filtered.data.data;
    const allMatch = filteredData.every(t => t.status === parseInt(status));
    
    log(`${name}(${status}): ${filtered.data.total} 条, 全部匹配: ${allMatch ? '✓' : '✗'}`, 
        allMatch ? 'SUCCESS' : 'ERROR');
    
    if (!allMatch) allTestsPassed = false;
  }
  
  return allTestsPassed;
}

async function testCombinedFilters() {
  log('\n========== 测试: 组合筛选 (第一性原理) ==========', 'INFO');
  
  // 同时应用多个筛选条件
  const result = await fetch('/api/transactions?page=1&limit=100&payType=WX_H5&status=1');
  
  if (!result.data || !result.data.data) {
    log('无法获取数据', 'ERROR');
    return false;
  }
  
  const data = result.data.data;
  
  // 验证同时满足两个条件
  const allMatchWX = data.every(t => t.payType === 'WX_H5');
  const allMatchStatus = data.every(t => t.status === 1);
  
  log(`组合筛选 (WX_H5 + status=1):`);
  log(`  返回: ${result.data.total} 条`);
  log(`  支付方式正确: ${allMatchWX ? '✓' : '✗'}`, allMatchWX ? 'SUCCESS' : 'ERROR');
  log(`  状态正确: ${allMatchStatus ? '✓' : '✗'}`, allMatchStatus ? 'SUCCESS' : 'ERROR');
  
  return allMatchWX && allMatchStatus;
}

async function testGenerateReport() {
  log('\n========== 测试: 生成报告 ==========', 'INFO');
  
  const today = new Date().toISOString().split('T')[0];
  const result = await fetch('/api/boss/reports/generate', 'POST', { date: today });
  
  log(`状态: ${result.status}`);
  
  if (result.status === 200 && result.data.success) {
    log(`报告生成成功`, 'SUCCESS');
    const reportPreview = typeof result.data.report === 'string' 
      ? result.data.report.substring(0, 100) 
      : JSON.stringify(result.data.report).substring(0, 100);
    log(`内容预览: ${reportPreview}...`);
    return true;
  } else {
    log(`报告生成失败: ${result.data.error || 'Unknown'}`, 'ERROR');
    return false;
  }
}

// ============ 主程序 ============

async function main() {
  log('╔═══════════════════════════════════════════════════════════════╗', 'INFO');
  log('║     第一性原理测试 - 端到端业务逻辑验证                      ║', 'INFO');
  log('║     不只是API存在性，而是验证功能正确性                      ║', 'INFO');
  log('╚═══════════════════════════════════════════════════════════════╝', 'INFO');
  
  const results = {
    bossConfigPut: await testBossConfigPut(),
    payTypeFilter: await testPayTypeFilterFirstPrinciples(),
    statusFilter: await testStatusFilterFirstPrinciples(),
    combinedFilters: await testCombinedFilters(),
    generateReport: await testGenerateReport()
  };
  
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'INFO');
  log('║                       测试结果汇总                            ║', 'INFO');
  log('╚═══════════════════════════════════════════════════════════════╝', 'INFO');
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✓ 通过' : '✗ 失败';
    const color = passed ? 'SUCCESS' : 'ERROR';
    log(`  ${name}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(r => r === true);
  
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'INFO');
  if (allPassed) {
    log('║              ✓ 所有第一性原理测试通过！                      ║', 'SUCCESS');
    log('║                   进化成功！                                 ║', 'SUCCESS');
  } else {
    log('║              ✗ 部分测试失败                                  ║', 'ERROR');
    log('║              需要进一步修复                                  ║', 'ERROR');
  }
  log('╚═══════════════════════════════════════════════════════════════╝', 'INFO');
  
  // 返回结果用于自动化
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  log(`执行错误: ${err.message}`, 'ERROR');
  process.exit(1);
});
