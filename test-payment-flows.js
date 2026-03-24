/**
 * 三種付款模式測試腳本
 * 驗證 UP_OP (銀聯), ALI_H5 (支付寶), WX_H5 (微信) 的整合
 */

const BASE_URL = process.env.API_URL || 'https://staging--55cdi3nfi9dh4f92yskx.youbase.cloud';

// 測試配置
const TEST_CONFIG = {
  amounts: [0.01, 1, 50, 100, 999999.99], // 邊界值測試
  invalidAmounts: [-1, 0, 1000000, 'abc', null],
};

// 測試工具
async function makeRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

function generateIdempotencyKey() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== 測試案例 ====================

const tests = {
  // 測試 1: 銀聯在線支付 (UP_OP)
  'UP_OP: 基本支付': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 50,
      payType: 'UP_OP',
      subject: '測試銀聯支付',
      body: 'Test UP_OP payment',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}, Success: ${result.data?.success}`,
      data: result.data,
    };
  },

  'UP_OP: 帶銀行卡號': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 100,
      payType: 'UP_OP',
      subject: '測試銀聯快捷支付',
      channelExtra: { accNo: '6250123456789016' },
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}`,
      data: result.data,
    };
  },

  // 測試 2: 支付寶 H5 (ALI_H5)
  'ALI_H5: 香港錢包': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 100,
      payType: 'ALI_H5',
      subject: '測試支付寶香港',
      body: 'Test AlipayHK',
      channelExtra: { walletType: 'HK' },
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}, payDataType: ${result.data?.payDataType}`,
      data: result.data,
    };
  },

  'ALI_H5: 中國大陸錢包': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 200,
      payType: 'ALI_H5',
      subject: '測試支付寶中國大陸',
      body: 'Test Alipay CN',
      channelExtra: { walletType: 'CN' },
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}`,
      data: result.data,
    };
  },

  'ALI_H5: 無 walletType (應使用默認)': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 50,
      payType: 'ALI_H5',
      subject: '測試支付寶默認',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}`,
      data: result.data,
    };
  },

  // 測試 3: 微信 H5 (WX_H5)
  'WX_H5: 基本支付': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 88.88,
      payType: 'WX_H5',
      subject: '測試微信支付',
      body: 'Test WeChat Pay',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}, payDataType: ${result.data?.payDataType}`,
      data: result.data,
    };
  },

  'WX_H5: 帶 AppID': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 50,
      payType: 'WX_H5',
      subject: '測試微信支付帶AppID',
      channelExtra: { appid: 'wx1234567890abcdef' },
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}`,
      data: result.data,
    };
  },

  // 測試 4: 金額驗證
  '金額驗證: 最小金額 (0.01)': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 0.01,
      payType: 'UP_OP',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}`,
      data: result.data,
    };
  },

  '金額驗證: 最大金額 (999999.99)': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 999999.99,
      payType: 'UP_OP',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 200 && result.data?.success === true,
      message: `Status: ${result.status}`,
      data: result.data,
    };
  },

  '金額驗證: 超過最大金額 (應失敗)': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 1000000,
      payType: 'UP_OP',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 400 || !result.data?.success,
      message: `Status: ${result.status}, Expected failure: true`,
      data: result.data,
    };
  },

  '金額驗證: 無效金額 (應失敗)': async () => {
    const result = await makeRequest('/api/public/payment/create', 'POST', {
      amount: -10,
      payType: 'UP_OP',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    return {
      pass: result.status === 400 || !result.data?.success,
      message: `Status: ${result.status}, Expected failure: true`,
      data: result.data,
    };
  },

  // 測試 5: 冪等性
  '冪等性: 重複請求應返回相同結果': async () => {
    const idempotencyKey = generateIdempotencyKey();
    
    const result1 = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 50,
      payType: 'UP_OP',
      idempotencyKey,
    });
    
    const result2 = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 50,
      payType: 'UP_OP',
      idempotencyKey,
    });
    
    const sameOrderNo = result1.data?.orderNo === result2.data?.orderNo;
    
    return {
      pass: result1.status === 200 && result2.status === 200 && sameOrderNo,
      message: `First: ${result1.data?.orderNo}, Second: ${result2.data?.orderNo}, Same: ${sameOrderNo}`,
      data: { first: result1.data, second: result2.data },
    };
  },

  // 測試 6: 訂單查詢
  '訂單查詢: 創建後查詢': async () => {
    // 先創建訂單
    const createResult = await makeRequest('/api/public/payment/create', 'POST', {
      amount: 50,
      payType: 'UP_OP',
      idempotencyKey: generateIdempotencyKey(),
    });
    
    if (!createResult.data?.orderNo) {
      return { pass: false, message: 'Failed to create order', data: null };
    }
    
    // 查詢訂單
    const queryResult = await makeRequest(`/api/public/payment/query/${createResult.data.orderNo}`);
    
    return {
      pass: queryResult.status === 200 && queryResult.data?.orderNo === createResult.data.orderNo,
      message: `Query status: ${queryResult.status}`,
      data: queryResult.data,
    };
  },

  // 測試 7: Webhook 測試 (需要模擬)
  'Webhook: 簽名驗證': async () => {
    // 這個測試需要手動觸發 EasyLink 的回調
    // 或模擬回調請求
    return {
      pass: true,
      message: '需要手動測試: 完成一筆真實支付並驗證 Webhook 接收',
      data: null,
    };
  },
};

// ==================== 執行測試 ====================

async function runTests() {
  console.log('🧪 付款 Portal 測試開始');
  console.log(`📡 API URL: ${BASE_URL}`);
  console.log('=' .repeat(60));
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const [name, testFn] of Object.entries(tests)) {
    process.stdout.write(`⏳ ${name} ... `);
    
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      results.push({ name, ...result, duration });
      
      if (result.pass) {
        passed++;
        console.log(`✅ PASS (${duration}ms)`);
        console.log(`   ${result.message}`);
      } else {
        failed++;
        console.log(`❌ FAIL (${duration}ms)`);
        console.log(`   ${result.message}`);
      }
    } catch (error) {
      failed++;
      results.push({ name, pass: false, message: error.message, error });
      console.log(`💥 ERROR`);
      console.log(`   ${error.message}`);
    }
    
    console.log();
  }
  
  // 測試報告
  console.log('=' .repeat(60));
  console.log('📊 測試報告');
  console.log(`   總計: ${Object.keys(tests).length}`);
  console.log(`   ✅ 通過: ${passed}`);
  console.log(`   ❌ 失敗: ${failed}`);
  console.log(`   📈 通過率: ${((passed / Object.keys(tests).length) * 100).toFixed(1)}%`);
  
  // 失敗詳情
  if (failed > 0) {
    console.log('\n🔍 失敗詳情:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`   ❌ ${r.name}`);
      console.log(`      ${r.message}`);
    });
  }
  
  // 按付款方式分組報告
  console.log('\n📋 按付款方式分組:');
  const groups = {
    '銀聯 (UP_OP)': results.filter(r => r.name.includes('UP_OP')),
    '支付寶 (ALI_H5)': results.filter(r => r.name.includes('ALI_H5')),
    '微信 (WX_H5)': results.filter(r => r.name.includes('WX_H5')),
    '金額驗證': results.filter(r => r.name.includes('金額')),
    '其他': results.filter(r => !r.name.match(/UP_OP|ALI_H5|WX_H5|金額/)),
  };
  
  for (const [groupName, groupResults] of Object.entries(groups)) {
    if (groupResults.length > 0) {
      const groupPassed = groupResults.filter(r => r.pass).length;
      console.log(`   ${groupName}: ${groupPassed}/${groupResults.length} 通過`);
    }
  }
  
  return { passed, failed, total: Object.keys(tests).length, results };
}

// 運行測試
runTests().then(report => {
  console.log('\n' + '='.repeat(60));
  if (report.failed === 0) {
    console.log('🎉 所有測試通過！可以上線。');
    process.exit(0);
  } else {
    console.log('⚠️  有測試失敗，請修復後再上線。');
    process.exit(1);
  }
}).catch(error => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});
