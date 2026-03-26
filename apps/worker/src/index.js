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
  ],
  // 商戶自定義域名映射
  MERCHANT_DOMAINS: {
    'KC': 'king-chicken.jkdcoding.com',
    '_dummy': 'dummy.jkdcoding.com'
  }
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

// 獲取商戶回調 URL
function getMerchantReturnUrl(merchantCode) {
  // 檢查是否有自定義域名
  const customDomain = CONFIG.MERCHANT_DOMAINS[merchantCode];
  if (customDomain) {
    return `https://${customDomain}/payment-success.html?merchant=${merchantCode}`;
  }
  // 默認使用 Pages 域名
  return `https://easylink-client-${merchantCode.toLowerCase()}.pages.dev/payment-success.html?merchant=${merchantCode}`;
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
    remark: tx.note || '',
    subject: tx.subject || '',
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
      returnUrl: returnUrl || getMerchantReturnUrl(merchant.code || 'KC'),
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

async function handleUpdateTransactionNote(request, env, merchant, origin) {
  try {
    const body = await request.json();
    const { orderNo, note } = body;
    
    if (!orderNo) {
      return errorResponse('Order number is required', 400, origin);
    }
    
    await env.DB.prepare(`
      UPDATE transactions 
      SET note = ?, updatedAt = ?
      WHERE (orderNo = ? OR mchOrderNo = ?) AND mchNo = ?
    `).bind(note || '', Math.floor(Date.now() / 1000), orderNo, orderNo, merchant.mchNo).run();
    
    return successResponse({ success: true }, origin);
  } catch (error) {
    console.error('[UpdateNote] Error:', error);
    return errorResponse('Failed to update note', 500, origin);
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
    
    // 批量同步 EasyLink 訂單狀態 (管理員功能)
    if (path === '/admin/sync-easylink-orders' && request.method === 'POST') {
      return handleSyncEasyLinkOrders(request, env, origin);
    }
    
    // Agent Portal API (代理商API)
    if (path.startsWith('/api/agent/')) {
      return handleAgentApi(request, env, path, origin);
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
        
      // 更新交易備註
      case '/admin/transactions/note':
        if (request.method === 'PUT') {
          return handleUpdateTransactionNote(request, env, merchant, origin);
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

// ============================================
// EasyLink 訂單同步功能
// ============================================

async function handleSyncEasyLinkOrders(request, env, origin) {
  try {
    const body = await request.json();
    const { mchNo = '80403445499539', date, limit = 50 } = body;
    
    console.log(`[SyncOrders] Starting sync for ${mchNo}, date: ${date}, limit: ${limit}`);
    
    // 1. 從數據庫獲取待同步的訂單（最近創建的、狀態不是成功的訂單）
    let query = 'SELECT * FROM transactions WHERE mchNo = ?';
    const params = [mchNo];
    
    if (date) {
      const startTime = Math.floor(new Date(date).getTime() / 1000);
      const endTime = startTime + 86400;
      query += ' AND createdAt >= ? AND createdAt <= ?';
      params.push(startTime, endTime);
    } else {
      // 默認查詢最近3天的訂單
      const threeDaysAgo = Math.floor(Date.now() / 1000) - 3 * 86400;
      query += ' AND createdAt >= ?';
      params.push(threeDaysAgo);
    }
    
    query += ' ORDER BY createdAt DESC LIMIT ?';
    params.push(limit);
    
    const orders = await env.DB.prepare(query).bind(...params).all();
    
    if (!orders.results || orders.results.length === 0) {
      return successResponse({
        message: 'No orders found to sync',
        synced: 0,
        updated: 0,
        details: []
      }, origin);
    }
    
    // 2. 逐個查詢 EasyLink 的最新狀態
    const results = [];
    let updatedCount = 0;
    
    for (const order of orders.results) {
      try {
        const easylinkStatus = await queryEasyLinkOrder(env, order.orderNo);
        
        if (easylinkStatus.success) {
          // 檢查狀態是否需要更新
          const currentStatus = order.status;
          const newStatus = easylinkStatus.state; // 0-生成, 1-支付中, 2-成功, 3-失敗, 4-撤銷, 5-退款, 6-關閉
          
          const statusChanged = currentStatus !== newStatus;
          
          if (statusChanged) {
            // 更新數據庫
            await updateTransactionStatus(
              env, 
              order.orderNo, 
              newStatus, 
              easylinkStatus.payOrderId,
              JSON.stringify(easylinkStatus.rawData)
            );
            updatedCount++;
          }
          
          results.push({
            orderNo: order.orderNo,
            mchOrderNo: order.mchOrderNo,
            currentStatus,
            newStatus,
            statusChanged,
            easylinkData: easylinkStatus.rawData
          });
        } else {
          results.push({
            orderNo: order.orderNo,
            mchOrderNo: order.mchOrderNo,
            error: easylinkStatus.error || 'Query failed'
          });
        }
        
        // 延遲避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`[SyncOrders] Failed to sync ${order.orderNo}:`, err);
        results.push({
          orderNo: order.orderNo,
          error: err.message
        });
      }
    }
    
    return successResponse({
      message: 'Sync completed',
      total: orders.results.length,
      updated: updatedCount,
      details: results
    }, origin);
    
  } catch (error) {
    console.error('[SyncOrders] Error:', error);
    return errorResponse('Failed to sync orders', 500, origin);
  }
}

// 查詢 EasyLink 單個訂單狀態
async function queryEasyLinkOrder(env, orderNo) {
  try {
    const appId = env.EASYLINK_APP_ID || '6763e0a175249c805471328d';
    // 使用與創建訂單相同的硬編碼密鑰
    const appSecret = '8DsrsUZH9FPHEtLO9k3SYh9decnsYMbfDcjE8r5BaCIHGxbKgjucyHxRRPVfuwZgULBiPvVS5bHWTvvghdqCYWTBOpr7t6qahTe6AspingMJcg7jkzPxY3OnsvJJJz5G';
    const mchNo = '80403445499539';
    
    console.log(`[QueryEasyLink] Using appId: ${appId}, mchNo: ${mchNo}`);
    
    // 使用與創建訂單相同的 reqTime 格式：YYYYMMDDHHMMSS
    const now = new Date();
    const reqTime = now.getFullYear().toString() + 
                   String(now.getMonth() + 1).padStart(2, '0') + 
                   String(now.getDate()).padStart(2, '0') + 
                   String(now.getHours()).padStart(2, '0') + 
                   String(now.getMinutes()).padStart(2, '0') + 
                   String(now.getSeconds()).padStart(2, '0');
    
    const params = {
      mchNo: mchNo,
      appId: appId,
      mchOrderNo: orderNo,
      reqTime: reqTime,
      version: '1.0',
      signType: 'MD5'
    };
    
    console.log(`[QueryEasyLink] Params:`, JSON.stringify(params));
    
    const result = await callEasyLink('/api/pay/query', params, appSecret);
    
    console.log(`[QueryEasyLink] Result for ${orderNo}:`, JSON.stringify(result));
    
    if (result.code === 0 && result.data) {
      return {
        success: true,
        state: result.data.state,
        payOrderId: result.data.payOrderId,
        amount: result.data.amount,
        rawData: result.data
      };
    } else {
      return {
        success: false,
        error: result.msg || 'Unknown error'
      };
    }
    
  } catch (error) {
    console.error('[QueryEasyLink] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================
// Agent Portal API Handlers
// ============================================

async function handleAgentApi(request, env, path, origin) {
  // Agent 登录
  if (path === '/api/agent/login' && request.method === 'POST') {
    return handleAgentLogin(request, env, origin);
  }
  
  // 验证 Agent Token (简化版，使用 header 中的 X-Agent-Code)
  const agentCode = request.headers.get('X-Agent-Code');
  if (!agentCode) {
    return errorResponse('Unauthorized', 401, origin);
  }
  
  const agent = await getAgentByCode(env, agentCode);
  if (!agent) {
    return errorResponse('Agent not found', 404, origin);
  }
  
  // 获取 Agent 统计
  if (path === '/api/agent/dashboard' && request.method === 'GET') {
    return handleAgentDashboard(request, env, agent, origin);
  }
  
  // 获取旗下商户列表
  if (path === '/api/agent/merchants' && request.method === 'GET') {
    return handleAgentMerchants(request, env, agent, origin);
  }
  
  // 提交商户申请
  if (path === '/api/agent/applications' && request.method === 'POST') {
    return handleCreateApplication(request, env, agent, origin);
  }
  
  // 获取申请列表
  if (path === '/api/agent/applications' && request.method === 'GET') {
    return handleGetApplications(request, env, agent, origin);
  }
  
  // 获取单个申请详情
  const applicationMatch = path.match(/^\/api\/agent\/applications\/(.+)$/);
  if (applicationMatch && request.method === 'GET') {
    return handleGetApplicationDetail(request, env, agent, applicationMatch[1], origin);
  }
  
  return errorResponse('Not found', 404, origin);
}

// Agent 登录 (简化版，直接返回 agent code)
async function handleAgentLogin(request, env, origin) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // 简化验证：检查是否存在该 agent
    const agent = await env.DB.prepare(
      'SELECT * FROM agents WHERE email = ? AND status = "active"'
    ).bind(email).first();
    
    if (!agent) {
      return errorResponse('Invalid credentials', 401, origin);
    }
    
    // 简化：直接返回 agent code (生产环境应该使用 JWT)
    return successResponse({
      agentCode: agent.agentCode,
      name: agent.name,
      email: agent.email
    }, origin);
    
  } catch (error) {
    console.error('[AgentLogin] Error:', error);
    return errorResponse('Login failed', 500, origin);
  }
}

// 获取 Agent 信息
async function getAgentByCode(env, code) {
  return await env.DB.prepare(
    'SELECT * FROM agents WHERE agentCode = ? AND status = "active"'
  ).bind(code).first();
}

// Agent Dashboard 统计
async function handleAgentDashboard(request, env, agent, origin) {
  try {
    // 获取旗下商户数
    const merchantCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM agent_merchants WHERE agentId = ?
    `).bind(agent.id).first();
    
    // 获取待处理申请数
    const pendingApps = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM merchant_applications 
      WHERE agentId = ? AND status IN ('draft', 'pending')
    `).bind(agent.id).first();
    
    // 获取今日交易额（简化：返回模拟数据）
    const todayRevenue = 0;
    
    return successResponse({
      totalMerchants: merchantCount?.count || 0,
      pendingApplications: pendingApps?.count || 0,
      todayRevenue: todayRevenue,
      commissionRate: agent.commissionRate
    }, origin);
    
  } catch (error) {
    console.error('[AgentDashboard] Error:', error);
    return errorResponse('Failed to fetch dashboard', 500, origin);
  }
}

// 获取旗下商户列表
async function handleAgentMerchants(request, env, agent, origin) {
  try {
    const merchants = await env.DB.prepare(`
      SELECT m.* FROM merchants m
      INNER JOIN agent_merchants am ON m.id = am.merchantId
      WHERE am.agentId = ?
      ORDER BY m.createdAt DESC
    `).bind(agent.id).all();
    
    return successResponse({
      merchants: merchants.results || []
    }, origin);
    
  } catch (error) {
    console.error('[AgentMerchants] Error:', error);
    return errorResponse('Failed to fetch merchants', 500, origin);
  }
}

// 创建商户申请
async function handleCreateApplication(request, env, agent, origin) {
  try {
    const body = await request.json();
    const now = Math.floor(Date.now() / 1000);
    
    // 生成申请编号
    const appNo = `APP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    
    const result = await env.DB.prepare(`
      INSERT INTO merchant_applications (
        applicationNo, agentId, merchantName, merchantShortName, merchantType, industryType,
        brNumber, crNumber, registeredAddress, operatingAddress,
        directorName, directorPosition, directorIdNumber, directorPhone, directorEmail, directorShareholding,
        contactName, contactPosition, contactPhone, contactEmail,
        websiteUrl, appName, businessDescription, estimatedMonthlyRevenue, averageTransactionAmount,
        settlementAccountName, bankName, bankAccountNumber, bankBranchCode,
        status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      appNo,
      agent.id,
      body.merchantName,
      body.merchantShortName || '',
      body.merchantType,
      body.industryType,
      body.brNumber,
      body.crNumber || '',
      body.registeredAddress,
      body.operatingAddress,
      body.directorName,
      body.directorPosition,
      body.directorIdNumber,
      body.directorPhone,
      body.directorEmail,
      body.directorShareholding || 0,
      body.contactName,
      body.contactPosition,
      body.contactPhone,
      body.contactEmail,
      body.websiteUrl || '',
      body.appName || '',
      body.businessDescription || '',
      body.estimatedMonthlyRevenue || '',
      body.averageTransactionAmount || 0,
      body.settlementAccountName,
      body.bankName,
      body.bankAccountNumber,
      body.bankBranchCode || '',
      'draft',
      now,
      now
    ).run();
    
    return successResponse({
      applicationNo: appNo,
      id: result.meta?.last_row_id,
      status: 'draft'
    }, origin);
    
  } catch (error) {
    console.error('[CreateApplication] Error:', error);
    return errorResponse('Failed to create application', 500, origin);
  }
}

// 获取申请列表
async function handleGetApplications(request, env, agent, origin) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let query = `
      SELECT id, applicationNo, merchantName, merchantType, status, createdAt, submittedAt
      FROM merchant_applications 
      WHERE agentId = ?
    `;
    const params = [agent.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const applications = await env.DB.prepare(query).bind(...params).all();
    
    return successResponse({
      applications: applications.results || []
    }, origin);
    
  } catch (error) {
    console.error('[GetApplications] Error:', error);
    return errorResponse('Failed to fetch applications', 500, origin);
  }
}

// 获取申请详情
async function handleGetApplicationDetail(request, env, agent, appNo, origin) {
  try {
    const application = await env.DB.prepare(`
      SELECT * FROM merchant_applications 
      WHERE applicationNo = ? AND agentId = ?
    `).bind(appNo, agent.id).first();
    
    if (!application) {
      return errorResponse('Application not found', 404, origin);
    }
    
    // 获取关联文件
    const documents = await env.DB.prepare(`
      SELECT id, documentType, documentName, fileUrl, uploadedAt
      FROM application_documents 
      WHERE applicationId = ?
    `).bind(application.id).all();
    
    return successResponse({
      application: application,
      documents: documents.results || []
    }, origin);
    
  } catch (error) {
    console.error('[GetApplicationDetail] Error:', error);
    return errorResponse('Failed to fetch application', 500, origin);
  }
}
