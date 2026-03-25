/**
 * King-Chicken Payment System v2 - SaaS Multi-Tenant Worker
 * 
 * 支持多商戶的支付平台後端
 * 路由格式: /api/v1/:merchantCode/...
 */

// ============================================
// 配置
// ============================================
const CONFIG = {
  EASYLINK_BASE_URL: 'https://ts-api-pay.gnete.com.hk',
  CURRENCY: 'HKD',
  CORS_ORIGINS: [
    'https://kingchicken-v2.pages.dev',
    'https://upay-client-kc.pages.dev',
    'https://king-chicken.jkdcoding.com',
    'http://localhost:8788',
    'http://localhost:3000'
  ]
};

// ============================================
// 工具函數
// ============================================

function jsonResponse(data, status = 200, origin = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(message, status = 400, origin = null) {
  return jsonResponse({ success: false, error: message }, status, origin);
}

function successResponse(data = null, origin = null) {
  return jsonResponse({ success: true, data }, 200, origin);
}

function getCorsOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return CONFIG.CORS_ORIGINS[0];
  const allowed = CONFIG.CORS_ORIGINS.find(o => 
    origin === o || origin.endsWith('.pages.dev')
  );
  return allowed || CONFIG.CORS_ORIGINS[0];
}

function generateOrderNo(merchantCode) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = merchantCode;
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function calculateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map(k => `${k}=${params[k]}`)
    .join('&') + `&key=${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ============================================
// 商戶管理
// ============================================

async function getMerchantByCode(env, code) {
  const result = await env.DB.prepare(
    'SELECT * FROM merchants WHERE code = ? AND status = "active"'
  ).bind(code).first();
  return result;
}

async function getMerchantById(env, id) {
  const result = await env.DB.prepare(
    'SELECT * FROM merchants WHERE id = ?'
  ).bind(id).first();
  return result;
}

// ============================================
// 數據庫操作
// ============================================

async function createTransaction(env, merchantId, data) {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(`
    INSERT INTO transactions (merchant_id, order_no, amount, currency, pay_type, status, remark, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(merchantId, data.orderNo, data.amount, data.currency, data.payType, data.remark || '', now, now).run();
  
  return { id: result.meta?.last_row_id, orderNo: data.orderNo };
}

async function getTransactions(env, merchantId, filters = {}) {
  let query = 'SELECT * FROM transactions WHERE merchant_id = ?';
  const params = [merchantId];
  
  if (filters.startDate) {
    query += ' AND created_at >= ?';
    params.push(Math.floor(new Date(filters.startDate).getTime() / 1000));
  }
  if (filters.endDate) {
    query += ' AND created_at <= ?';
    params.push(Math.floor(new Date(filters.endDate).getTime() / 1000) + 86400);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.payType) {
    query += ' AND pay_type = ?';
    params.push(filters.payType);
  }
  if (filters.orderNo) {
    query += ' AND order_no LIKE ?';
    params.push(`%${filters.orderNo}%`);
  }
  if (filters.payOrderId) {
    query += ' AND pay_order_id LIKE ?';
    params.push(`%${filters.payOrderId}%`);
  }
  
  query += ' ORDER BY created_at DESC LIMIT 200';
  
  const result = await env.DB.prepare(query).bind(...params).all();
  
  return (result.results || []).map(tx => ({
    id: tx.id,
    orderNo: tx.order_no,
    payOrderId: tx.pay_order_id,
    amount: tx.amount / 100,
    currency: tx.currency,
    payType: tx.pay_type,
    status: tx.status,
    remark: tx.remark,
    createdAt: new Date(tx.created_at * 1000).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }),
    createdAtTimestamp: tx.created_at * 1000
  }));
}

async function updateTransactionStatus(env, orderNo, status, payOrderId = null, rawResponse = null) {
  const now = Math.floor(Date.now() / 1000);
  let query = 'UPDATE transactions SET status = ?, updated_at = ?';
  const params = [status, now];
  
  if (payOrderId) {
    query += ', pay_order_id = ?';
    params.push(payOrderId);
  }
  if (rawResponse) {
    query += ', raw_response = ?';
    params.push(rawResponse);
  }
  
  query += ' WHERE order_no = ?';
  params.push(orderNo);
  
  await env.DB.prepare(query).bind(...params).run();
}

async function updateRemark(env, orderNo, remark) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`
    UPDATE transactions SET remark = ?, updated_at = ? WHERE order_no = ?
  `).bind(remark, now, orderNo).run();
}

async function getStatistics(env, merchantId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTimestamp = Math.floor(today.getTime() / 1000);
  const thirtyDaysAgo = todayTimestamp - (30 * 86400);
  
  // 今日數據
  const todayResult = await env.DB.prepare(`
    SELECT COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE merchant_id = ? AND created_at >= ? AND status = 'success'
  `).bind(merchantId, todayTimestamp).first();
  
  // 30天數據
  const thirtyDaysResult = await env.DB.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
    FROM transactions
    WHERE merchant_id = ? AND created_at >= ?
  `).bind(merchantId, thirtyDaysAgo).first();
  
  // 支付方式統計
  const payTypeResult = await env.DB.prepare(`
    SELECT pay_type, COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE merchant_id = ? AND created_at >= ? AND status = 'success'
    GROUP BY pay_type
  `).bind(merchantId, todayTimestamp).all();
  
  const todayRevenue = (todayResult?.total || 0) / 100;
  const todayOrders = todayResult?.count || 0;
  const totalOrders = thirtyDaysResult?.total || 0;
  const successOrders = thirtyDaysResult?.success || 0;
  const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 1000) / 10 : 0;
  
  return {
    todayRevenue,
    todayOrders,
    successRate,
    avgResponseTime: 1.2,
    payTypeStats: (payTypeResult.results || []).map(r => ({
      type: r.pay_type,
      count: r.count,
      total: (r.total || 0) / 100
    }))
  };
}

async function getReportRecipients(env, merchantId) {
  const result = await env.DB.prepare(`
    SELECT * FROM report_recipients WHERE merchant_id = ? AND enabled = 1
  `).bind(merchantId).all();
  return result.results || [];
}

// ============================================
// EasyLink API 調用
// ============================================

async function createEasyLinkOrder(params, secret) {
  const sign = await calculateSign(params, secret);
  const body = new URLSearchParams({ ...params, sign });
  
  const response = await fetch(`${CONFIG.EASYLINK_BASE_URL}/unifiedOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  
  const text = await response.text();
  
  try {
    return JSON.parse(text);
  } catch {
    const codeMatch = text.match(/<code>(\d+)<\/code>/);
    const msgMatch = text.match(/<msg>([^<]+)<\/msg>/);
    const orderMatch = text.match(/<payOrderId>([^<]+)<\/payOrderId>/);
    const urlMatch = text.match(/<payUrl>([^<]+)<\/payUrl>/);
    
    return {
      code: codeMatch ? parseInt(codeMatch[1]) : -1,
      msg: msgMatch ? msgMatch[1] : 'Parse error',
      data: {
        payOrderId: orderMatch ? orderMatch[1] : null,
        payUrl: urlMatch ? urlMatch[1] : null
      }
    };
  }
}

// ============================================
// 請求處理器
// ============================================

async function handleCreatePayment(request, env, merchant, origin) {
  try {
    const body = await request.json();
    const { amount, payType, remark } = body;
    
    if (!amount || amount <= 0) {
      return errorResponse('Invalid amount', 400, origin);
    }
    
    if (!['UP_OP', 'ALI_H5', 'WX_H5'].includes(payType)) {
      return errorResponse('Invalid pay type', 400, origin);
    }
    
    // 創建訂單
    const orderNo = generateOrderNo(merchant.code);
    await createTransaction(env, merchant.id, {
      orderNo,
      amount: Math.round(amount * 100),
      currency: CONFIG.CURRENCY,
      payType,
      remark
    });
    
    // 調用 EasyLink
    const params = {
      mchNo: merchant.easylink_mch_no,
      appId: merchant.easylink_app_id,
      mchOrderNo: orderNo,
      amount: Math.round(amount * 100),
      currency: CONFIG.CURRENCY,
      payType,
      subject: `${merchant.name} Payment`,
      notifyUrl: `${env.API_BASE_URL || ''}/webhook/easylink`,
      returnUrl: `${env.FRONTEND_URL || ''}/payment/success?merchant=${merchant.code}`
    };
    
    const result = await createEasyLinkOrder(params, merchant.easylink_app_secret);
    
    if (result.code !== 0) {
      await updateTransactionStatus(env, orderNo, 'failed');
      return errorResponse(result.msg || 'Payment creation failed', 400, origin);
    }
    
    await updateTransactionStatus(
      env, 
      orderNo, 
      'pending', 
      result.data?.payOrderId,
      JSON.stringify(result)
    );
    
    return successResponse({
      orderNo,
      payOrderId: result.data?.payOrderId,
      payUrl: result.data?.payUrl
    }, origin);
    
  } catch (error) {
    console.error('[CreatePayment] Error:', error);
    return errorResponse('Internal error', 500, origin);
  }
}

async function handleGetTransactions(request, env, merchant, origin) {
  try {
    const url = new URL(request.url);
    const filters = {
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
      status: url.searchParams.get('status'),
      payType: url.searchParams.get('payType'),
      orderNo: url.searchParams.get('orderNo'),
      payOrderId: url.searchParams.get('payOrderId')
    };
    
    const transactions = await getTransactions(env, merchant.id, filters);
    return successResponse({ transactions }, origin);
    
  } catch (error) {
    console.error('[GetTransactions] Error:', error);
    return errorResponse('Failed to fetch transactions', 500, origin);
  }
}

async function handleGetStatistics(request, env, merchant, origin) {
  try {
    const stats = await getStatistics(env, merchant.id);
    return successResponse(stats, origin);
  } catch (error) {
    console.error('[GetStatistics] Error:', error);
    return errorResponse('Failed to fetch statistics', 500, origin);
  }
}

async function handleUpdateRemark(request, env, origin) {
  try {
    const body = await request.json();
    const { orderNo, remark } = body;
    
    if (!orderNo) {
      return errorResponse('Order number required', 400, origin);
    }
    
    await updateRemark(env, orderNo, remark || '');
    return successResponse(null, origin);
  } catch (error) {
    console.error('[UpdateRemark] Error:', error);
    return errorResponse('Failed to update remark', 500, origin);
  }
}

async function handleGetMerchantConfig(request, merchant, origin) {
  try {
    const config = JSON.parse(merchant.config || '{}');
    return successResponse({
      code: merchant.code,
      name: merchant.name,
      theme: config.theme || 'orange',
      currency: config.currency || 'HKD',
      logo: config.logo || '🐔'
    }, origin);
  } catch (error) {
    console.error('[GetMerchantConfig] Error:', error);
    return errorResponse('Failed to get config', 500, origin);
  }
}

async function handleWebhook(request, env) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const data = {};
    params.forEach((value, key) => { data[key] = value; });
    
    const orderNo = data.mchOrderNo;
    const status = data.status;
    
    if (orderNo) {
      const newStatus = status === '2' ? 'success' : status === '3' ? 'failed' : 'pending';
      await updateTransactionStatus(env, orderNo, newStatus, null, JSON.stringify(data));
    }
    
    return new Response('success', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response('error', { status: 500 });
  }
}

// ============================================
// 主入口
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = getCorsOrigin(request);
    
    // CORS 預檢
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
        }
      });
    }
    
    const path = url.pathname;
    
    // 健康檢查
    if (path === '/health') {
      return jsonResponse({ status: 'ok', version: '2.0.0-saas' }, 200, origin);
    }
    
    // Webhook (不需要商戶識別)
    if (path === '/webhook/easylink' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    
    // 解析商戶代碼: /api/v1/:merchantCode/...
    const pathMatch = path.match(/^\/api\/v1\/([^\/]+)(\/.*)?$/);
    if (!pathMatch) {
      return errorResponse('Invalid API path. Use /api/v1/:merchantCode/...', 404, origin);
    }
    
    const merchantCode = pathMatch[1];
    const subPath = pathMatch[2] || '/';
    
    // 獲取商戶信息
    const merchant = await getMerchantByCode(env, merchantCode);
    if (!merchant) {
      return errorResponse('Merchant not found', 404, origin);
    }
    
    // 路由分發
    if (subPath === '/' && request.method === 'GET') {
      return handleGetMerchantConfig(request, merchant, origin);
    }
    
    if (subPath === '/payment/create' && request.method === 'POST') {
      return handleCreatePayment(request, env, merchant, origin);
    }
    
    if (subPath === '/admin/transactions' && request.method === 'GET') {
      return handleGetTransactions(request, env, merchant, origin);
    }
    
    if (subPath === '/admin/statistics' && request.method === 'GET') {
      return handleGetStatistics(request, env, merchant, origin);
    }
    
    if (subPath === '/admin/remark' && request.method === 'POST') {
      return handleUpdateRemark(request, env, origin);
    }
    
    return errorResponse('Not found', 404, origin);
  }
};
