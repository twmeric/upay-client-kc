// EasyLink 签名验证脚本
// 用于排查签名失败问题

const crypto = require('crypto');

function generateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const filteredParams = sortedKeys.filter(key => {
    const value = params[key];
    return value !== undefined && value !== null && value !== '';
  });
  
  const signString = filteredParams
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secret}`;
  
  const sign = crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  
  return { signString, sign };
}

// 您的配置
const CONFIG = {
  mchNo: '80403445499539',
  appId: '6763e0a175249c805471328d',
  appSecret: '8D5rssUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTwvghdqCYWTBOPr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G'
};

console.log('========================================');
console.log('EasyLink 签名验证工具');
console.log('========================================\n');

console.log('商户号:', CONFIG.mchNo);
console.log('应用ID:', CONFIG.appId);
console.log('密钥长度:', CONFIG.appSecret.length, '字符\n');

// 生成测试订单
const orderNo = 'ORD' + Date.now().toString(36).toUpperCase();
const now = new Date();
const reqTime = now.getFullYear().toString() + 
                String(now.getMonth() + 1).padStart(2, '0') + 
                String(now.getDate()).padStart(2, '0') + 
                String(now.getHours()).padStart(2, '0') + 
                String(now.getMinutes()).padStart(2, '0') + 
                String(now.getSeconds()).padStart(2, '0');

console.log('测试订单号:', orderNo);
console.log('请求时间:', reqTime, '\n');

// 场景 1: 标准参数
console.log('--- 场景 1: 标准参数 ---');
const params1 = {
  mchNo: CONFIG.mchNo,
  appId: CONFIG.appId,
  mchOrderNo: orderNo,
  wayCode: 'UP_OP',
  amount: '10000',
  currency: 'HKD',
  subject: 'Test Payment',
  body: 'Test',
  reqTime: reqTime
};
const result1 = generateSign(params1, CONFIG.appSecret);
console.log('签名字符串:', result1.signString.substring(0, 100) + '...');
console.log('签名结果:', result1.sign, '\n');

// 完整请求体
const requestBody = {
  ...params1,
  sign: result1.sign,
  version: '1.0',
  signType: 'MD5'
};

console.log('--- 完整请求 JSON ---');
console.log(JSON.stringify(requestBody, null, 2));
