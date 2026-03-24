// Test EasyLink Sign Generation with URL encoding

function generateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const filteredParams = sortedKeys.filter(key => {
    const value = params[key];
    return value !== undefined && value !== null && value !== '' && key !== 'sign';
  });
  
  // 方法 1: 不编码
  const signString1 = filteredParams
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secret}`;
  
  // 方法 2: 对值进行编码
  const signString2 = filteredParams
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&') + `&key=${secret}`;
  
  console.log('Method 1 (No encode):');
  console.log('  String:', signString1.substring(0, 100) + '...');
  
  console.log('\nMethod 2 (URL encode):');
  console.log('  String:', signString2.substring(0, 100) + '...');
  
  const crypto = require('crypto');
  const sign1 = crypto.createHash('md5').update(signString1).digest('hex').toUpperCase();
  const sign2 = crypto.createHash('md5').update(signString2).digest('hex').toUpperCase();
  
  console.log('\nSign 1 (No encode):', sign1);
  console.log('Sign 2 (URL encode):', sign2);
}

const params = {
  mchNo: '80403445499539',
  appId: '6763e0a175249c805471328d',
  mchOrderNo: 'ORD123456789',
  wayCode: 'UP_OP',
  amount: '10000',
  currency: 'HKD',
  subject: 'Test',
  body: 'Test',
  notifyUrl: 'https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink',
  returnUrl: 'https://king-chicken.jkdcoding.com/payment/success?orderNo=ORD123456789',
  reqTime: '20250322120000'
};

const secret = '8D5rssUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTwvghdqCYWTBOPr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G';

generateSign(params, secret);
