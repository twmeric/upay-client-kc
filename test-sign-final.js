// 根据截图验证 EasyLink 签名
const crypto = require('crypto');

// 截图中的参数值
const params = {
  amount: '100',
  appId: '6763e0a175249c805471328d',
  body: 'Test',
  currency: 'HKD',
  mchNo: '80403445499539',
  mchOrderNo: 'TEST1773902966078',
  notifyUrl: 'https://example.com/notify',
  reqTime: '1773902966078',
  returnUrl: 'https://example.com/return',
  signType: 'MD5',
  subject: 'Test',
  version: '1.0',
  wayCode: 'UP_OP'
};

const secret = '8D5rssUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTwvghdqCYWTBOPr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G';

// 按字母排序
const sortedKeys = Object.keys(params).sort();
console.log('Sorted keys:', sortedKeys);

// 构建签名字符串
const signString = sortedKeys
  .map(key => `${key}=${params[key]}`)
  .join('&') + `&key=${secret}`;

console.log('\nSign String:');
console.log(signString);

// 计算签名
const sign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
console.log('\nSignature:', sign);
