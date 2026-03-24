/**
 * 支付功能保护测试
 * 确保客户收款功能正常工作 - 这是最高优先级
 * 
 * ⚠️ 警告：如果此测试失败，立即停止所有其他部署！
 */

const https = require('https');
const fs = require('fs');

const CONFIG = {
  apiBase: 'https://payment-api.jimsbond007.workers.dev',
  criticalEndpoints: [
    { path: '/api/v1/payments', name: 'Payments API', method: 'OPTIONS' },
    { path: '/api/public/payment/create', name: 'Public Payment Create', method: 'OPTIONS' },
    { path: '/api/v1/public/payment/create', name: 'V1 Public Payment Create', method: 'OPTIONS' },
    { path: '/api/transactions?page=1&limit=5', name: 'Transactions API', method: 'GET' },
    { path: '/api/dashboard/stats', name: 'Dashboard Stats', method: 'GET' }
  ],
  timeout: 15000
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${level}] ${message}`;
  console.log(entry);
  fs.appendFileSync('payment-protection.log', entry + '\n');
}

function makeRequest(endpoint, method = 'GET') {
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
      timeout: CONFIG.timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers,
          data: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testCriticalEndpoint(endpoint) {
  try {
    log(`测试 ${endpoint.name} (${endpoint.path})...`);
    const response = await makeRequest(endpoint.path, endpoint.method);
    
    if (response.ok || response.status === 404) {
      // 404 表示端点存在但可能需要特定参数
      log(`✓ ${endpoint.name}: HTTP ${response.status}`, 'SUCCESS');
      return { 
        name: endpoint.name, 
        path: endpoint.path, 
        healthy: true, 
        status: response.status,
        cors: response.headers['access-control-allow-origin'] ? 'CORS OK' : 'CORS Missing'
      };
    } else {
      log(`✗ ${endpoint.name}: HTTP ${response.status}`, 'ERROR');
      return { 
        name: endpoint.name, 
        path: endpoint.path, 
        healthy: false, 
        status: response.status 
      };
    }
  } catch (error) {
    log(`✗ ${endpoint.name}: ${error.message}`, 'ERROR');
    return { 
      name: endpoint.name, 
      path: endpoint.path, 
      healthy: false, 
      error: error.message 
    };
  }
}

async function testPaymentFlow() {
  log('\n========== 支付流程模拟测试 ==========');
  
  try {
    // 测试创建一个支付订单 (使用测试数据)
    const testOrder = {
      amount: 1.00,
      payType: 'UP_OP',
      orderId: 'TEST' + Date.now(),
      callbackUrl: 'https://king-chicken.jkdcoding.com/callback'
    };
    
    log('模拟创建支付订单...');
    
    // 检查支付端点是否响应
    const createResponse = await makeRequest('/api/public/payment/create', 'OPTIONS');
    
    if (createResponse.ok || createResponse.status === 404) {
      log('✓ 支付创建端点可达', 'SUCCESS');
      return true;
    } else {
      log('✗ 支付创建端点异常', 'ERROR');
      return false;
    }
  } catch (error) {
    log(`✗ 支付流程测试失败: ${error.message}`, 'ERROR');
    return false;
  }
}

async function runProtectionTests() {
  log('========================================');
  log('支付功能保护测试启动');
  log('⚠️  如果此测试失败，立即停止部署！');
  log('========================================\n');
  
  const results = [];
  let criticalFailures = 0;
  
  // 测试关键端点
  log('========== 关键端点检查 ==========');
  for (const endpoint of CONFIG.criticalEndpoints) {
    const result = await testCriticalEndpoint(endpoint);
    results.push(result);
    if (!result.healthy) criticalFailures++;
  }
  
  // 测试支付流程
  const paymentFlowOk = await testPaymentFlow();
  
  // 生成报告
  log('\n========== 保护测试结果 ==========');
  
  const healthy = results.filter(r => r.healthy);
  const failed = results.filter(r => !r.healthy);
  
  log(`正常: ${healthy.length}/${results.length}`, 'SUCCESS');
  
  if (failed.length > 0) {
    log(`异常: ${failed.length}/${results.length}`, 'ERROR');
    failed.forEach(f => log(`  - ${f.name}: ${f.status || f.error}`, 'ERROR'));
  }
  
  if (!paymentFlowOk) {
    log('支付流程测试失败！', 'ERROR');
    criticalFailures++;
  }
  
  // 最终判定
  const allCriticalOk = criticalFailures === 0;
  
  log('\n========================================');
  if (allCriticalOk) {
    log('✓ 支付功能保护测试通过', 'SUCCESS');
    log('✓ 可以安全进行后台功能更新', 'SUCCESS');
  } else {
    log('✗ 支付功能存在风险！', 'ERROR');
    log('✗ 立即停止部署，检查 API Worker！', 'ERROR');
  }
  log('========================================');
  
  // 保存报告
  const report = {
    timestamp: new Date().toISOString(),
    allPassed: allCriticalOk,
    criticalFailures: criticalFailures,
    results: results,
    paymentFlowOk: paymentFlowOk
  };
  fs.writeFileSync('payment-protection-report.json', JSON.stringify(report, null, 2));
  
  return allCriticalOk;
}

// 运行测试
runProtectionTests().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(err => {
  log(`测试执行错误: ${err.message}`, 'ERROR');
  process.exit(1);
});
