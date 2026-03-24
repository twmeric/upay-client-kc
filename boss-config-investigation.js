/**
 * Boss Config Reset问题调查
 * 完整流程：获取->修改->保存->验证持久化
 */

const https = require('https');

function fetch(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'payment-api.jimsbond007.workers.dev',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer admin',
        'Content-Type': 'application/json'
      }
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

async function run() {
  console.log('========== Boss Config Reset问题调查 ==========\n');
  
  // 步骤1: 获取当前配置
  console.log('步骤1: 获取当前配置...');
  const original = await fetch('/api/boss/config');
  console.log(`  状态: ${original.status}`);
  console.log(`  原始配置: ${JSON.stringify(original.data, null, 2)}\n`);
  
  // 步骤2: PUT修改配置（模拟前端保存）
  console.log('步骤2: PUT修改配置...');
  const newConfig = {
    enabled: !original.data.enabled, // 切换状态
    time: original.data.time === '22:00' ? '20:00' : '22:00', // 改变时间
    includeTrend: !original.data.includeTrend,
    includeDetail: !original.data.includeDetail
  };
  console.log(`  新配置: ${JSON.stringify(newConfig)}`);
  
  const putResult = await fetch('/api/boss/config', 'PUT', newConfig);
  console.log(`  PUT状态: ${putResult.status}`);
  console.log(`  PUT响应: ${JSON.stringify(putResult.data, null, 2)}\n`);
  
  // 步骤3: 立即重新获取验证
  console.log('步骤3: 重新获取配置验证持久化...');
  const verify = await fetch('/api/boss/config');
  console.log(`  状态: ${verify.status}`);
  console.log(`  获取到的配置: ${JSON.stringify(verify.data, null, 2)}\n`);
  
  // 步骤4: 对比验证
  console.log('步骤4: 验证结果...');
  const matches = {
    enabled: verify.data.enabled === newConfig.enabled,
    time: verify.data.time === newConfig.time,
    includeTrend: verify.data.includeTrend === newConfig.includeTrend,
    includeDetail: verify.data.includeDetail === newConfig.includeDetail
  };
  
  let allMatch = true;
  for (const [key, match] of Object.entries(matches)) {
    console.log(`  ${key}: ${match ? '✓ 匹配' : '✗ 不匹配'}`);
    console.log(`    期望: ${newConfig[key]}`);
    console.log(`    实际: ${verify.data[key]}`);
    if (!match) allMatch = false;
  }
  
  console.log('\n结论:');
  if (allMatch) {
    console.log('  ✓ 配置保存并持久化成功');
  } else {
    console.log('  ✗ 配置未正确持久化 - 发现Reset问题！');
  }
  
  // 步骤5: POST测试（前端可能用POST）
  console.log('\n步骤5: 测试POST方法...');
  const postResult = await fetch('/api/boss/config', 'POST', original.data);
  console.log(`  POST状态: ${postResult.status}`);
  console.log(`  POST响应: ${JSON.stringify(postResult.data, null, 2)}`);
}

run().catch(console.error);
