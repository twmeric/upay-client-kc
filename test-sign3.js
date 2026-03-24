// Test EasyLink Sign with minimal params

function generateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const filteredParams = sortedKeys.filter(key => {
    const value = params[key];
    return value !== undefined && value !== null && value !== '';
  });
  
  const signString = filteredParams
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secret}`;
  
  console.log('Sign String:', signString);
  
  const crypto = require('crypto');
  const sign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  
  console.log('Sign:', sign);
  return sign;
}

const secret = '8D5rssUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTwvghdqCYWTBOPr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G';

console.log('=== Test 1: All params ===');
generateSign({
  mchNo: '80403445499539',
  appId: '6763e0a175249c805471328d',
  mchOrderNo: 'ORD123456789',
  wayCode: 'UP_OP',
  amount: '10000',
  currency: 'HKD',
  subject: 'Test',
  body: 'Test',
  reqTime: '20250322120000'
}, secret);

console.log('\n=== Test 2: Without subject/body ===');
generateSign({
  mchNo: '80403445499539',
  appId: '6763e0a175249c805471328d',
  mchOrderNo: 'ORD123456789',
  wayCode: 'UP_OP',
  amount: '10000',
  currency: 'HKD',
  reqTime: '20250322120000'
}, secret);

console.log('\n=== Test 3: Only required ===');
generateSign({
  mchNo: '80403445499539',
  appId: '6763e0a175249c805471328d',
  mchOrderNo: 'ORD123456789',
  wayCode: 'UP_OP',
  amount: '10000',
  reqTime: '20250322120000'
}, secret);
