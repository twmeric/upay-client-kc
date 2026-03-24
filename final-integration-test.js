/**
 * 前后端协调最终验证测试
 * 验证修复后的完整功能
 */

const https = require('https');

const API_BASE = 'https://payment-api.jimsbond007.workers.dev';
const FRONTEND_URL = 'https://king-chicken.jkdcoding.com';

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

function apiFetch(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'payment-api.jimsbond007.workers.dev',
      path: path,
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
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(10000, () => resolve({ error: 'Timeout' }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFilterWithAllPayTypes() {
  log('\n========== 测试: 所有支付方式筛选协调 ==========', 'INFO');
  
  const payTypes = [
    { code: 'UP_OP', label: '銀聯' },
    { code: 'WX_H5', label: '微信支付' },
    { code: 'ALI_H5', label: '支付寶' }
  ];
  
  let allPassed = true;
  
  for (const type of payTypes) {
    // 测试API返回
    const result = await apiFetch(`/api/transactions?page=1&limit=10&payType=${type.code}`);
    
    if (!result.data || !result.data.data) {
      log(`${type.label}(${type.code}): API错误`, 'ERROR');
      allPassed = false;
      continue;
    }
    
    const allMatch = result.data.data.every(t => t.payType === type.code);
    const count = result.data.total;
    
    log(`${type.label}(${type.code}): ${count}条, 全部匹配: ${allMatch ? '✓' : '✗'}`, 
        allMatch ? 'SUCCESS' : 'ERROR');
    
    if (!allMatch) allPassed = false;
  }
  
  return allPassed;
}

async function testBossConfigFullFlow() {
  log('\n========== 测试: Boss Config 完整流程协调 ==========', 'INFO');
  
  // 1. 获取当前配置
  log('1. 获取当前配置...');
  const original = await apiFetch('/api/boss/config');
  log(`   当前: enabled=${original.data.enabled}, time=${original.data.time}`);
  
  // 2. 修改配置（与前端一致的数据结构）
  log('\n2. PUT修改配置（模拟前端保存）...');
  const newConfig = {
    enabled: !original.data.enabled,
    time: original.data.time === '22:00' ? '20:00' : '22:00',
    includeTrend: true,
    includeDetail: true,
    recipients: [
      { phone: '85298113210', name: '咪咪姐' },
      { phone: '85292404878', name: 'Michelle' }
    ]
  };
  
  const putResult = await apiFetch('/api/boss/config', 'PUT', newConfig);
  
  if (putResult.status !== 200 || !putResult.data.success) {
    log(`   PUT失败: ${putResult.data?.error || 'Unknown'}`, 'ERROR');
    return false;
  }
  log('   PUT成功', 'SUCCESS');
  
  // 3. 验证持久化
  log('\n3. 验证持久化...');
  const verify = await apiFetch('/api/boss/config');
  
  const checks = [
    { field: 'enabled', expected: newConfig.enabled, actual: verify.data.enabled },
    { field: 'time', expected: newConfig.time, actual: verify.data.time },
    { field: 'includeTrend', expected: newConfig.includeTrend, actual: verify.data.includeTrend },
    { field: 'includeDetail', expected: newConfig.includeDetail, actual: verify.data.includeDetail }
  ];
  
  let allMatch = true;
  for (const check of checks) {
    const match = check.expected === check.actual;
    log(`   ${check.field}: ${match ? '✓' : '✗'} (期望:${check.expected}, 实际:${check.actual})`, 
        match ? 'SUCCESS' : 'ERROR');
    if (!match) allMatch = false;
  }
  
  // 4. 恢复原始配置
  log('\n4. 恢复原始配置...');
  await apiFetch('/api/boss/config', 'PUT', original.data);
  
  return allMatch;
}

async function testCombinedFilters() {
  log('\n========== 测试: 组合筛选协调 ==========', 'INFO');
  
  // 同时筛选状态+支付方式
  const result = await apiFetch('/api/transactions?page=1&limit=10&status=1&payType=WX_H5');
  
  if (!result.data || !result.data.data) {
    log('API错误', 'ERROR');
    return false;
  }
  
  const allMatchStatus = result.data.data.every(t => t.status === 1);
  const allMatchPayType = result.data.data.every(t => t.payType === 'WX_H5');
  
  log(`组合筛选 (status=1 + payType=WX_H5):`);
  log(`  返回: ${result.data.total} 条`);
  log(`  状态匹配: ${allMatchStatus ? '✓' : '✗'}`, allMatchStatus ? 'SUCCESS' : 'ERROR');
  log(`  支付方式匹配: ${allMatchPayType ? '✓' : '✗'}`, allMatchPayType ? 'SUCCESS' : 'ERROR');
  
  return allMatchStatus && allMatchPayType;
}

async function main() {
  log('╔═══════════════════════════════════════════════════════════════╗');
  log('║     前后端协调最终验证测试                                    ║');
  log('║     第一性原理: 定义目的 → 修复 → 验证                       ║');
  log('╚═══════════════════════════════════════════════════════════════╝');
  
  const results = {
    filterPayTypes: await testFilterWithAllPayTypes(),
    bossConfig: await testBossConfigFullFlow(),
    combinedFilters: await testCombinedFilters()
  };
  
  log('\n╔═══════════════════════════════════════════════════════════════╗');
  log('║                       最终验证结果                            ║');
  log('╚═══════════════════════════════════════════════════════════════╝');
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✓ 通过' : '✗ 失败';
    const color = passed ? 'SUCCESS' : 'ERROR';
    log(`  ${name}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(r => r === true);
  
  log('\n╔═══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    log('║              ✓ 前后端协调成功！系统完整修复                  ║', 'SUCCESS');
    log('║                   第一性原理验证通过                         ║', 'SUCCESS');
  } else {
    log('║              ✗ 部分功能仍需修复                              ║', 'ERROR');
  }
  log('╚═══════════════════════════════════════════════════════════════╝');
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  log(`执行错误: ${err.message}`, 'ERROR');
  process.exit(1);
});
