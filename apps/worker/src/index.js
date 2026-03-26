/**
 * EasyLink Payment Platform v2 - SaaS Multi-Tenant Worker
 * 
 * 支持多商戶的支付平台後端
 * 功能：支付、退款、預授權、Webhook
 * 路由格式: /api/v1/:merchantCode/...
 * 
 * 數據庫兼容性：適配現有 CamelCase 字段名
 */

// ============================================
// 配置
// ============================================
const CONFIG = {
  EASYLINK_BASE_URL: 'https://api-pay.gnete.com.hk',
  CURRENCY: 'HKD',
  CORS_ORIGINS: [
    'https://easylink-v2.pages.dev',
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
  // 檢查是否在允許列表中，或屬於 pages.dev 域名
  const isAllowed = CONFIG.CORS_ORIGINS.includes(origin) || 
    origin.endsWith('.pages.dev') ||
    origin.match(/^https:\/\/[a-f0-9]+\.easylink-v2\.pages\.dev$/);
  return isAllowed ? origin : CONFIG.CORS_ORIGINS[0];
}

function generateOrderNo(merchantCode, prefix = 'ORD') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = `${merchantCode}${prefix}`;
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function calculateSign(params, secret) {
  // EasyLink 簽名算法（MD5）
  const sortedKeys = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();
  
  console.log('[Sign] Sorted keys:', sortedKeys.join(','));
  
  const signString = sortedKeys
    .map(k => `${k}=${params[k]}`)
    .join('&') + `&key=${secret}`;
  
  console.log('[Sign] String:', signString);
  
  // MD5 計算
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  console.log('[Sign] MD5:', sign);
  return sign;
}

// ============================================
// 商戶管理
// ============================================

async function getMerchantByCode(env, code) {
  // 支持 code 字段或 mchNo 字段
  const result = await env.DB.prepare(
    'SELECT * FROM merchants WHERE (code = ? OR mchNo = ?) AND isActive = 1'
  ).bind(code, code).first();
  return result;
}

// ============================================
// 數據庫操作 - 支付 (使用現有 CamelCase 字段)
// ============================================

async function createTransaction(env, merchantMchNo, data) {
  const now = Math.floor(Date.now() / 1000);
  
  // 檢查表結構是否支持 driverCode 字段
  let driverCode = data.driverCode || '';
  let driverName = data.driverName || '';
  
  try {
    const result = await env.DB.prepare(`
      INSERT INTO transactions (mchNo, orderNo, mchOrderNo, amount, currency, payType, status, subject, driverCode, driverName, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `).bind(merchantMchNo, data.orderNo, data.orderNo, data.amount, data.currency, data.payType, data.description || '', driverCode, driverName, now, now).run();
    
    return { id: result.meta?.last_row_id, orderNo: data.orderNo };
  } catch (error) {
    // 如果 driverCode 字段不存在，使用舊的插入語句
    if (error.message && error.message.includes('driverCode')) {
      const result = await env.DB.prepare(`
        INSERT INTO transactions (mchNo, orderNo, mchOrderNo, amount, currency, payType, status, subject, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).bind(merchantMchNo, data.orderNo, data.orderNo, data.amount, data.currency, data.payType, data.description || '', now, now).run();
      
      return { id: result.meta?.last_row_id, orderNo: data.orderNo };
    }
    throw error;
  }
}

async function getTransactionByOrderNo(env, orderNo) {
  return await env.DB.prepare(
    'SELECT * FROM transactions WHERE orderNo = ? OR mchOrderNo = ?'
  ).bind(orderNo, orderNo).first();
}

async function getTransactions(env, mchNo, filters = {}) {
  let query = 'SELECT * FROM transactions WHERE mchNo = ?';
  const params = [mchNo];
  
  if (filters.startDate) {
    query += ' AND createdAt >= ?';
    params.push(Math.floor(new Date(filters.startDate).getTime() / 1000));
  }
  if (filters.endDate) {
    query += ' AND createdAt <= ?';
    params.push(Math.floor(new Date(filters.endDate).getTime() / 1000) + 86400);
  }
  if (filters.status) {
    // 狀態映射：pending -> 0, success -> 2, failed -> 3
    const statusMap = { 'pending': 0, 'success': 2, 'failed': 3 };
    query += ' AND status = ?';
    params.push(statusMap[filters.status] ?? filters.status);
  }
  if (filters.payType) {
    query += ' AND payType = ?';
    params.push(filters.payType);
  }
  if (filters.driverCode) {
    query += ' AND driverCode = ?';
    params.push(filters.driverCode);
  }
  if (filters.orderNo) {
    query += ' AND (orderNo LIKE ? OR mchOrderNo LIKE ?)';
    params.push(`%${filters.orderNo}%`, `%${filters.orderNo}%`);
  }
  
  query += ' ORDER BY createdAt DESC LIMIT 200';
  
  const result = await env.DB.prepare(query).bind(...params).all();
  
  // 狀態映射回字符串
  const statusMap = { 0: 'pending', 1: 'processing', 2: 'success', 3: 'failed', 4: 'cancelled' };
  
  return (result.results || []).map(tx => ({
    id: tx.id,
    orderNo: tx.orderNo || tx.mchOrderNo,
    payOrderId: tx.channelOrderNo || '-',
    amount: tx.amount / 100,
    currency: tx.currency,
    payType: tx.payType,
    status: statusMap[tx.status] || tx.status,
    remark: tx.subject || '',
    driverCode: tx.driverCode || '',
    driverName: tx.driverName || '',
    createdAt: new Date(tx.createdAt * 1000).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' }),
    createdAtTimestamp: tx.createdAt * 1000
  }));
}

async function updateTransactionStatus(env, orderNo, status, payOrderId = null, rawResponse = null) {
  const now = Math.floor(Date.now() / 1000);
  let query = 'UPDATE transactions SET status = ?, updatedAt = ?';
  const params = [status, now];
  
  if (payOrderId) {
    query += ', channelOrderNo = ?';
    params.push(payOrderId);
  }
  if (rawResponse) {
    query += ', rawResponse = ?';
    params.push(rawResponse);
  }
  
  query += ' WHERE orderNo = ? OR mchOrderNo = ?';
  params.push(orderNo, orderNo);
  
  await env.DB.prepare(query).bind(...params).run();
}

// ============================================
// 數據庫操作 - 統計
// ============================================

async function getStatistics(env, mchNo) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTimestamp = Math.floor(today.getTime() / 1000);
  const thirtyDaysAgo = todayTimestamp - (30 * 86400);
  
  const todayResult = await env.DB.prepare(`
    SELECT COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE mchNo = ? AND createdAt >= ? AND status = 2
  `).bind(mchNo, todayTimestamp).first();
  
  const thirtyDaysResult = await env.DB.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as success
    FROM transactions
    WHERE mchNo = ? AND createdAt >= ?
  `).bind(mchNo, thirtyDaysAgo).first();
  
  const payTypeResult = await env.DB.prepare(`
    SELECT payType, COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE mchNo = ? AND createdAt >= ? AND status = 2
    GROUP BY payType
  `).bind(mchNo, todayTimestamp).all();
  
  // 司機統計
  let driverRevenue = {};
  try {
    const driverResult = await env.DB.prepare(`
      SELECT driverCode, COUNT(*) as count, SUM(amount) as total
      FROM transactions
      WHERE mchNo = ? AND createdAt >= ? AND status = 2 AND driverCode IS NOT NULL AND driverCode != ''
      GROUP BY driverCode
    `).bind(mchNo, todayTimestamp).all();
    
    driverResult.results.forEach(r => {
      driverRevenue[r.driverCode] = (r.total || 0) / 100;
    });
  } catch (e) {
    // 如果 driverCode 字段不存在，返回空對象
    driverRevenue = {};
  }
  
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
      type: r.payType,
      count: r.count,
      total: (r.total || 0) / 100
    })),
    driverRevenue
  };
}

// ============================================
// EasyLink API 調用
// ============================================

async function callEasyLink(endpoint, params, secret) {
  const sign = await calculateSign(params, secret);
  
  // 手動構建請求體，確保與簽名計算格式一致（不進行 URL 編碼）
  const sortedKeys = Object.keys(params).sort();
  const bodyParts = sortedKeys.map(k => `${k}=${params[k]}`);
  bodyParts.push(`sign=${sign}`);
  const body = bodyParts.join('&');
  
  console.log('[EasyLink] Request body:', body);
  
  const response = await fetch(`${CONFIG.EASYLINK_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  });
  
  const text = await response.text();
  console.log('[EasyLink] Response:', text.substring(0, 500));
  
  try {
    return JSON.parse(text);
  } catch {
    // XML response parsing
    const codeMatch = text.match(/<code>(\d+)<\/code>/);
    const msgMatch = text.match(/<msg>([^<]+)<\/msg>/);
    const orderMatch = text.match(/<payOrderId>([^<]+)<\/payOrderId>/);
    const urlMatch = text.match(/<payUrl>([^<]+)<\/payUrl>/);
    
    const result = {
      code: codeMatch ? parseInt(codeMatch[1]) : -1,
      msg: msgMatch ? msgMatch[1] : ('XML Parse: ' + text.substring(0, 100)),
      data: {
        payOrderId: orderMatch ? orderMatch[1] : null,
        payUrl: urlMatch ? urlMatch[1] : null
      }
    };
    console.log('[EasyLink] Parsed result:', JSON.stringify(result));
    return result;
  }
}

// ============================================
// 請求處理器 - 支付
// ============================================

async function handleCreatePayment(request, env, merchant, origin) {
  try {
    console.log('[CreatePayment] Merchant:', JSON.stringify({
      mchNo: merchant.mchNo,
      name: merchant.name,
      easylink_app_id: merchant.easylink_app_id ? '***' : 'MISSING',
      easylink_app_secret: merchant.easylink_app_secret ? '***' : 'MISSING'
    }));
    
    const body = await request.json();
    const { amount, payType, orderNo: customOrderNo, description, notifyUrl, returnUrl } = body;
    console.log('[CreatePayment] Request body:', JSON.stringify(body));
    
    if (!amount || amount <= 0) {
      return errorResponse('Invalid amount', 400, origin);
    }
    
    if (!['UP_OP', 'ALI_H5', 'WX_H5'].includes(payType)) {
      return errorResponse('Invalid pay type', 400, origin);
    }
    
    const orderNo = customOrderNo || generateOrderNo(merchant.code || 'KC');
    
    // 檢查訂單號是否已存在
    const existing = await getTransactionByOrderNo(env, orderNo);
    if (existing) {
      return errorResponse('Order number already exists', 400, origin);
    }
    
    await createTransaction(env, merchant.mchNo, {
      orderNo,
      amount: Math.round(amount * 100),
      currency: CONFIG.CURRENCY,
      payType,
      description,
      driverCode: body.driverCode || '',
      driverName: body.driverName || ''
    });
    
    // 獲取 EasyLink 憑證
    const appId = env.EASYLINK_APP_ID || '6763e0a175249c805471328d';
    // 硬編碼正確的密鑰（臨時解決方案）
    const appSecret = '8DsrsUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTvvghdqCYWTBOpr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G';
    
    if (!appId || !appSecret) {
      console.error('[CreatePayment] Missing EasyLink credentials');
      return errorResponse('EasyLink credentials not configured', 500, origin);
    }
    
    // 調用 EasyLink - 使用正確的參數格式
    const now = new Date();
    const reqTime = now.getFullYear().toString() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0') + 
                   String(now.getHours()).padStart(2, '0') + 
                   String(now.getMinutes()).padStart(2, '0') + 
                   String(now.getSeconds()).padStart(2, '0');
    
    const params = {
      mchNo: merchant.easylink_mch_no || merchant.mchNo || env.EASYLINK_MCH_NO,
      appId: appId,
      body: description || 'Product Payment',
      mchOrderNo: orderNo,
      amount: Math.round(amount * 100).toString(),
      currency: CONFIG.CURRENCY,
      wayCode: payType,
      reqTime: reqTime,
      signType: 'MD5',
      subject: description || 'Product Payment',
      notifyUrl: notifyUrl || `${env.API_BASE_URL || ''}/webhook/easylink`,
      returnUrl: returnUrl || `${env.FRONTEND_URL || ''}/payment/success?merchant=${merchant.code || 'KC'}`,
      version: '1.0'
    };
    
    const result = await callEasyLink('/api/pay/unifiedOrder', params, appSecret);
    
    if (result.code !== 0) {
      await updateTransactionStatus(env, orderNo, 3); // failed
      console.error('[CreatePayment] EasyLink error:', result.msg, 'Full result:', JSON.stringify(result));
      // 返回調試信息
      return errorResponse(`EasyLink error: ${result.msg || 'Unknown error'}`, 400, origin);
    }
    
    await updateTransactionStatus(
      env, 
      orderNo, 
      1, // processing
      result.data?.payOrderId,
      JSON.stringify(result)
    );
    
    // EasyLink 返回 payData 而不是 payUrl
    const payUrl = result.data?.payUrl || result.data?.payData;
    
    return successResponse({
      orderNo,
      payOrderId: result.data?.payOrderId,
      payUrl: payUrl,
      amount,
      currency: CONFIG.CURRENCY,
      status: 'pending'
    }, origin);
    
  } catch (error) {
    console.error('[CreatePayment] Error:', error);
    return errorResponse('Internal error', 500, origin);
  }
}

async function handleQueryPayment(request, env, merchant, origin) {
  try {
    const url = new URL(request.url);
    const orderNo = url.searchParams.get('orderNo');
    
    if (!orderNo) {
      return errorResponse('Order number required', 400, origin);
    }
    
    const tx = await getTransactionByOrderNo(env, orderNo);
    
    if (!tx || tx.mchNo !== merchant.mchNo) {
      return errorResponse('Order not found', 404, origin);
    }
    
    const statusMap = { 0: 'pending', 1: 'processing', 2: 'success', 3: 'failed', 4: 'cancelled' };
    
    return successResponse({
      orderNo: tx.orderNo || tx.mchOrderNo,
      payOrderId: tx.channelOrderNo,
      amount: tx.amount / 100,
      currency: tx.currency,
      payType: tx.payType,
      status: statusMap[tx.status] || tx.status,
      remark: tx.subject,
      createdAt: new Date(tx.createdAt * 1000).toLocaleString('zh-HK', { timeZone: 'Asia/Hong_Kong' })
    }, origin);
    
  } catch (error) {
    console.error('[QueryPayment] Error:', error);
    return errorResponse('Internal error', 500, origin);
  }
}

// ============================================
// 請求處理器 - 管理
// ============================================

async function handleGetTransactions(request, env, merchant, origin) {
  try {
    const url = new URL(request.url);
    const filters = {
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
      status: url.searchParams.get('status'),
      payType: url.searchParams.get('payType'),
      driverCode: url.searchParams.get('driverCode'),
      orderNo: url.searchParams.get('orderNo')
    };
    
    const transactions = await getTransactions(env, merchant.mchNo, filters);
    return successResponse({ transactions }, origin);
    
  } catch (error) {
    console.error('[GetTransactions] Error:', error);
    return errorResponse('Failed to fetch transactions', 500, origin);
  }
}

async function handleGetStatistics(request, env, merchant, origin) {
  try {
    const stats = await getStatistics(env, merchant.mchNo);
    return successResponse(stats, origin);
  } catch (error) {
    console.error('[GetStatistics] Error:', error);
    return errorResponse('Failed to fetch statistics', 500, origin);
  }
}

async function handleGetMerchantConfig(request, merchant, origin) {
  try {
    let config = {};
    try {
      if (merchant.config) {
        config = JSON.parse(merchant.config);
      }
    } catch (e) {
      config = {};
    }
    return successResponse({
      code: merchant.code || merchant.mchNo,
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

// ============================================
// Webhook 處理
// ============================================

async function handleWebhook(request, env) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const data = {};
    params.forEach((value, key) => { data[key] = value; });
    
    const orderNo = data.mchOrderNo || data.payOrderId;
    const status = data.status;
    
    if (orderNo) {
      // EasyLink 狀態: 2=success, 3=failed
      const newStatus = status === '2' ? 2 : status === '3' ? 3 : 0;
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
      return jsonResponse({ status: 'ok', version: '2.1.0-easylink' }, 200, origin);
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
    switch (subPath) {
      case '/':
        return handleGetMerchantConfig(request, merchant, origin);
        
      case '/payment/create':
        if (request.method === 'POST') {
          return handleCreatePayment(request, env, merchant, origin);
        }
        break;
        
      case '/payment/query':
        if (request.method === 'GET') {
          return handleQueryPayment(request, env, merchant, origin);
        }
        break;
        
      case '/admin/transactions':
        if (request.method === 'GET') {
          return handleGetTransactions(request, env, merchant, origin);
        }
        break;
        
      case '/admin/statistics':
        if (request.method === 'GET') {
          return handleGetStatistics(request, env, merchant, origin);
        }
        break;
    }
    
    return errorResponse('Not found', 404, origin);
  }
};
