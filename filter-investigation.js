/**
 * Filter功能深度调查
 * 测试前端可能使用的各种参数格式
 */

const https = require('https');

const tests = [
  { name: '标准参数-payType=WX_H5', url: '/api/transactions?page=1&limit=10&payType=WX_H5' },
  { name: '中文参数-微信', url: '/api/transactions?page=1&limit=10&payType=微信' },
  { name: '中文参数-支付宝', url: '/api/transactions?page=1&limit=10&payType=支付宝' },
  { name: '中文参数-银联', url: '/api/transactions?page=1&limit=10&payType=银联' },
  { name: '小写参数-paytype', url: '/api/transactions?page=1&limit=10&paytype=WX_H5' },
  { name: '无筛选', url: '/api/transactions?page=1&limit=10' }
];

function fetch(url) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'payment-api.jimsbond007.workers.dev',
      path: encodeURI(url),
      method: 'GET',
      headers: { 'Authorization': 'Bearer admin' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, total: json.total, data: json.data || [] });
        } catch {
          resolve({ status: res.statusCode, error: 'Invalid JSON', raw: data.substring(0, 200) });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.setTimeout(10000, () => resolve({ error: 'Timeout' }));
    req.end();
  });
}

async function run() {
  console.log('========== Filter参数格式调查 ==========\n');
  
  for (const test of tests) {
    const result = await fetch(test.url);
    
    // 验证数据是否匹配筛选条件
    let expectedPayType = null;
    if (test.url.includes('payType=WX_H5')) expectedPayType = 'WX_H5';
    else if (test.url.includes('payType=微信')) expectedPayType = 'WX_H5';
    else if (test.url.includes('payType=支付宝')) expectedPayType = 'ALI_H5';
    else if (test.url.includes('payType=银联')) expectedPayType = 'UP_OP';
    else if (test.url.includes('paytype=WX_H5')) expectedPayType = 'WX_H5';
    
    const allMatch = expectedPayType && result.data 
      ? result.data.every(t => t.payType === expectedPayType)
      : true;
    
    console.log(`${test.name}:`);
    console.log(`  URL: ${test.url}`);
    console.log(`  状态: ${result.status || result.error}, 返回: ${result.total || 0} 条`);
    
    if (expectedPayType) {
      console.log(`  期望类型: ${expectedPayType}`);
      console.log(`  数据匹配: ${allMatch ? '✓' : '✗'}`);
    }
    
    if (result.data && result.data.length > 0) {
      const firstItem = result.data[0];
      console.log(`  首条记录: ${firstItem.orderNo} (${firstItem.payType})`);
    }
    
    console.log('');
  }
}

run().catch(console.error);
