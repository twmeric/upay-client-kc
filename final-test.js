// Final test with exact same parameters
const crypto = require('crypto');

// Same as Worker would generate
const orderNo = 'TEST' + Date.now();
const reqTime = Date.now().toString();

const params = {
  amount: '100',
  appId: '6763e0a175249c805471328d',
  body: 'Test',
  currency: 'HKD',
  mchNo: '80403445499539',
  mchOrderNo: orderNo,
  notifyUrl: 'https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink',
  reqTime: reqTime,
  returnUrl: `https://king-chicken.jkdcoding.com/payment/success?orderNo=${orderNo}`,
  signType: 'MD5',
  subject: 'Test',
  version: '1.0',
  wayCode: 'UP_OP'
};

const secret = '8D5rssUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTwvghdqCYWTBOPr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G';

// Method 1: Fixed order (as in screenshot)
const orderedKeys = ['amount', 'appId', 'body', 'currency', 'mchNo', 'mchOrderNo', 'notifyUrl', 'reqTime', 'returnUrl', 'signType', 'subject', 'version', 'wayCode'];
const signString1 = orderedKeys
  .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
  .map(key => `${key}=${params[key]}`)
  .join('&') + `&key=${secret}`;
const sign1 = crypto.createHash('md5').update(signString1).digest('hex').toUpperCase();

console.log('=== Method 1: Fixed Order ===');
console.log('String:', signString1.substring(0, 100) + '...');
console.log('Sign:', sign1);

// Method 2: Alphabetical sort
const sortedKeys = Object.keys(params).sort();
const signString2 = sortedKeys
  .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
  .map(key => `${key}=${params[key]}`)
  .join('&') + `&key=${secret}`;
const sign2 = crypto.createHash('md5').update(signString2).digest('hex').toUpperCase();

console.log('\n=== Method 2: Alphabetical Sort ===');
console.log('String:', signString2.substring(0, 100) + '...');
console.log('Sign:', sign2);

console.log('\n=== Full Request Body ===');
console.log(JSON.stringify({...params, sign: sign1, version: '1.0', signType: 'MD5'}, null, 2));
