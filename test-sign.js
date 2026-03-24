// Test EasyLink Sign Generation
// 根据 EasyLink 文档验证签名算法

function generateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const filteredParams = sortedKeys.filter(key => {
    const value = params[key];
    return value !== undefined && value !== null && value !== '' && key !== 'sign';
  });
  
  const signString = filteredParams
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secret}`;
  
  console.log('Sign String:', signString);
  
  // Node.js crypto
  const crypto = require('crypto');
  const sign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  
  console.log('Generated Sign:', sign);
  return sign;
}

// Test with actual values
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

console.log('Testing EasyLink Signature...\n');
generateSign(params, secret);
