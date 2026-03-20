/**
 * Payment Gateway Standard Template
 * Cloudflare Worker + D1 Database
 * Version: 1.0
 */

const EASYLINK_BASE_URL = 'https://api-pay.gnete.com.hk';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS
    if (method === 'OPTIONS') {
      return corsResponse();
    }

    try {
      // Public APIs
      if (path === '/api/payment/create' && method === 'POST') {
        return await createPayment(request, env);
      }
      
      if (path.startsWith('/api/payment/query/') && method === 'GET') {
        const orderNo = path.split('/').pop();
        return await queryPayment(orderNo, env);
      }
      
      if (path === '/api/webhooks/notify' && method === 'POST') {
        return await handleWebhook(request, env);
      }

      // Admin APIs (需要認證)
      if (path === '/api/dashboard/stats' && method === 'GET') {
        return await getDashboardStats(env);
      }

      if (path === '/api/transactions' && method === 'GET') {
        return await listTransactions(url, env);
      }

      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: Date.now(),
          version: '1.0'
        });
      }

      return jsonResponse({ error: 'Not Found' }, 404);
    } catch (error) {
      console.error('[Worker] Error:', error);
      return jsonResponse({ 
        error: 'Internal Server Error', 
        message: error.message 
      }, 500);
    }
  }
};

// ========== Payment APIs ==========

async function createPayment(request, env) {
  const body = await request.json();
  const { amount, payType, subject, body: orderBody, returnUrl } = body;

  // Validation
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return jsonResponse({ error: 'Invalid amount', code: 'INVALID_AMOUNT' }, 400);
  }

  // Get config from env
  const mchNo = env.EASYLINK_MCH_NO;
  const appId = env.EASYLINK_APP_ID;
  const appSecret = env.EASYLINK_APP_SECRET;

  if (!mchNo || !appId || !appSecret) {
    return jsonResponse({ error: 'Payment service not configured' }, 500);
  }

  const orderNo = generateOrderNo();
  const amountInCents = Math.round(numAmount * 100);
  const wayCode = payType || 'UP_OP';

  const url = new URL(request.url);
  const host = url.host;
  const notifyUrl = `https://${host}/api/webhooks/notify`;
  const finalReturnUrl = returnUrl || `https://${host}/payment/success?orderNo=${orderNo}`;

  // Build EasyLink request
  const reqTime = Date.now().toString();
  const signParams = {
    mchNo,
    appId,
    mchOrderNo: orderNo,
    wayCode,
    amount: amountInCents.toString(),
    currency: 'HKD',
    subject: (subject || 'Payment').replace(/[\u4e00-\u9fa5]/g, ''),
    body: (orderBody || 'Payment').replace(/[\u4e00-\u9fa5]/g, ''),
    notifyUrl,
    returnUrl: finalReturnUrl,
    reqTime,
    version: '1.0',
    signType: 'MD5',
    expiredTime: '1800'
  };

  const sign = await generateSign(signParams, appSecret);

  const requestBody = {
    ...signParams,
    amount: amountInCents,
    reqTime: parseInt(reqTime, 10),
    sign
  };

  // Call EasyLink API
  const response = await fetch(`${EASYLINK_BASE_URL}/api/pay/unifiedOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const result = await response.json();

  // Save to database
  await saveTransaction(env, {
    orderNo,
    mchOrderNo: orderNo,
    mchNo,
    amount: amountInCents,
    currency: 'HKD',
    payType: wayCode,
    subject: signParams.subject,
    body: signParams.body,
    status: result.code === 0 ? 1 : 0,
    notifyUrl,
    returnUrl: finalReturnUrl,
    rawResponse: JSON.stringify(result),
    createdAt: Math.floor(Date.now() / 1000)
  });

  if (result.code === 0) {
    return jsonResponse({
      success: true,
      orderNo,
      payUrl: result.data?.payData,
      payDataType: result.data?.payDataType,
      amount: amountInCents
    });
  } else {
    return jsonResponse({
      success: false,
      error: result.msg || 'Payment creation failed'
    }, 400);
  }
}

async function queryPayment(orderNo, env) {
  const txn = await getTransaction(env, orderNo);
  
  if (!txn) {
    return jsonResponse({ error: 'Order not found' }, 404);
  }

  return jsonResponse({
    orderNo: txn.orderNo,
    amount: txn.amount,
    currency: txn.currency,
    status: txn.status,
    statusText: getStatusText(txn.status),
    payType: txn.payType,
    createdAt: txn.createdAt,
    paidAt: txn.paidAt
  });
}

async function handleWebhook(request, env) {
  const contentType = request.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    data = Object.fromEntries(formData);
  } else {
    data = await request.json();
  }

  // Verify signature
  const appSecret = env.EASYLINK_APP_SECRET;
  const receivedSign = data.sign;
  const params = {};
  
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'sign' && v !== undefined && v !== null && v !== '') {
      params[k] = String(v);
    }
  }
  
  const expectedSign = await generateSign(params, appSecret);

  if (receivedSign !== expectedSign) {
    return new Response('fail');
  }

  // Update order status
  const mchOrderNo = data.mchOrderNo;
  if (mchOrderNo) {
    const newStatus = parseInt(data.state || '0');
    await updateTransactionStatus(env, mchOrderNo, newStatus);
  }

  return new Response('success');
}

// ========== Admin APIs ==========

async function getDashboardStats(env) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

  const { results: todayResult } = await env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as totalAmount,
      COUNT(*) as orderCount,
      SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
    FROM transactions 
    WHERE createdAt >= ?
  `).bind(todayStartUnix).all();

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayStartUnix = Math.floor(dayStart.getTime() / 1000);
    const dayEndUnix = dayStartUnix + 86400;

    const { results: dayResult } = await env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as amount,
        COUNT(*) as count,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
      FROM transactions 
      WHERE createdAt >= ? AND createdAt < ?
    `).bind(dayStartUnix, dayEndUnix).all();

    days.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      amount: dayResult[0]?.amount || 0,
      count: dayResult[0]?.count || 0,
      successCount: dayResult[0]?.successCount || 0
    });
  }

  return jsonResponse({
    today: {
      totalAmount: todayResult[0]?.totalAmount || 0,
      orderCount: todayResult[0]?.orderCount || 0,
      successCount: todayResult[0]?.successCount || 0
    },
    chart: days
  });
}

async function listTransactions(url, env) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const { results } = await env.DB.prepare(`
    SELECT * FROM transactions 
    ORDER BY createdAt DESC 
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const { results: countResult } = await env.DB.prepare(`
    SELECT COUNT(*) as total FROM transactions
  `).all();

  return jsonResponse({
    data: results,
    total: countResult[0]?.total || 0,
    page,
    limit
  });
}

// ========== Database Helpers ==========

async function saveTransaction(env, txn) {
  await env.DB.prepare(`
    INSERT INTO transactions (
      orderNo, mchOrderNo, mchNo, amount, currency, payType,
      subject, body, status, notifyUrl, returnUrl, rawResponse, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    txn.orderNo, txn.mchOrderNo, txn.mchNo, txn.amount, txn.currency,
    txn.payType, txn.subject, txn.body, txn.status, txn.notifyUrl,
    txn.returnUrl, txn.rawResponse, txn.createdAt
  ).run();
}

async function getTransaction(env, orderNo) {
  const { results } = await env.DB.prepare(`
    SELECT * FROM transactions WHERE orderNo = ?
  `).bind(orderNo).all();
  return results[0];
}

async function updateTransactionStatus(env, orderNo, status) {
  const paidAt = status === 2 ? Math.floor(Date.now() / 1000) : null;
  await env.DB.prepare(`
    UPDATE transactions 
    SET status = ?, paidAt = ?, updatedAt = ?
    WHERE orderNo = ?
  `).bind(status, paidAt, Math.floor(Date.now() / 1000), orderNo).run();
}

// ========== Utilities ==========

async function generateSign(params, secret) {
  const sorted = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'sign')
    .sort();
  const signStr = sorted.map(k => `${k}=${params[k]}`).join('&');
  const signString = signStr + `&key=${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function generateOrderNo() {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ORD${ts}${rand}`;
}

function getStatusText(status) {
  const map = {
    0: '訂單生成', 1: '支付中', 2: '支付成功',
    3: '支付失敗', 4: '已撤銷', 5: '已退款', 6: '訂單關閉'
  };
  return map[status] || '未知';
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
