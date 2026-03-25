/**
 * King-Chicken Payment System v2 - Worker Backend
 * 
 * 設計原則：
 * 1. 單一文件，功能完整
 * 2. 清晰的路由結構
 * 3. 統一的錯誤處理
 * 4. 完整的類型註釋
 */

// ============================================
// 配置
// ============================================
const CONFIG = {
  EASYLINK_BASE_URL: 'https://ts-api-pay.gnete.com.hk',
  EASYLINK_MCH_NO: '30104',
  CURRENCY: 'HKD',
  CLIENT_CODE: 'KC',
  CORS_ORIGINS: [
    'https://upay-client-kc.pages.dev',
    'https://king-chicken.jkdcoding.com',
    'http://localhost:8788'
  ]
};

// ============================================
// 工具函數
// ============================================

/**
 * 生成 JSON 響應
 */
function jsonResponse(data, status = 200, origin = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
  };
  
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * 生成錯誤響應
 */
function errorResponse(message, status = 400, origin = null) {
  return jsonResponse({ success: false, error: message }, status, origin);
}

/**
 * 生成成功響應
 */
function successResponse(data = null, origin = null) {
  return jsonResponse({ success: true, data }, 200, origin);
}

/**
 * 獲取 CORS Origin
 */
function getCorsOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return CONFIG.CORS_ORIGINS[0];
  
  const allowed = CONFIG.CORS_ORIGINS.find(o => 
    origin === o || origin.endsWith('.pages.dev')
  );
  return allowed || CONFIG.CORS_ORIGINS[0];
}

/**
 * 生成訂單號
 */
function generateOrderNo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'KC';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 計算 EasyLink 簽名
 */
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
// 數據庫操作
// ============================================

/**
 * 創建交易記錄
 */
async function createTransaction(env, data) {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(`
    INSERT INTO transactions (order_no, amount, currency, pay_type, status, remark, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(data.orderNo, data.amount, data.currency, data.payType, data.remark || '', now, now).run();
  
  return { id: result.meta?.last_row_id, orderNo: data.orderNo };
}

/**
 * 獲取交易記錄
 */
async function getTransactions(env, filters = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];
  
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

/**
 * 更新交易狀態
 */
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

/**
 * 更新備註
 */
async function updateRemark(env, orderNo, remark) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`
    UPDATE transactions SET remark = ?, updated_at = ? WHERE order_no = ?
  `).bind(remark, now, orderNo).run();
}

/**
 * 獲取統計數據
 */
async function getStatistics(env) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayTimestamp = Math.floor(today.getTime() / 1000);
  const thirtyDaysAgo = todayTimestamp - (30 * 86400);
  
  // 今日數據
  const todayResult = await env.DB.prepare(`
    SELECT COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE created_at >= ? AND status = 'success'
  `).bind(todayTimestamp).first();
  
  // 30天數據
  const thirtyDaysResult = await env.DB.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
    FROM transactions
    WHERE created_at >= ?
  `).bind(thirtyDaysAgo).first();
  
  // 支付方式統計
  const payTypeResult = await env.DB.prepare(`
    SELECT pay_type, COUNT(*) as count, SUM(amount) as total
    FROM transactions
    WHERE created_at >= ? AND status = 'success'
    GROUP BY pay_type
  `).bind(todayTimestamp).all();
  
  const todayRevenue = (todayResult?.total || 0) / 100;
  const todayOrders = todayResult?.count || 0;
  const totalOrders = thirtyDaysResult?.total || 0;
  const successOrders = thirtyDaysResult?.success || 0;
  const successRate = totalOrders > 0 ? Math.round((successOrders / totalOrders) * 1000) / 10 : 0;
  
  return {
    todayRevenue,
    todayOrders,
    successRate,
    avgResponseTime: 1.2, // 固定值，實際應計算
    payTypeStats: (payTypeResult.results || []).map(r => ({
      type: r.pay_type,
      count: r.count,
      total: (r.total || 0) / 100
    }))
  };
}

// ============================================
// EasyLink API 調用
// ============================================

/**
 * 創建支付訂單
 */
async function createEasyLinkOrder(params, secret) {
  const sign = await calculateSign(params, secret);
  const body = new URLSearchParams({ ...params, sign });
  
  const response = await fetch(`${CONFIG.EASYLINK_BASE_URL}/unifiedOrder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  
  const text = await response.text();
  
  // 嘗試解析 JSON
  try {
    return JSON.parse(text);
  } catch {
    // 可能是 XML，簡單解析
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

/**
 * 處理創建支付
 */
async function handleCreatePayment(request, env, origin) {
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
    const orderNo = generateOrderNo();
    await createTransaction(env, {
      orderNo,
      amount: Math.round(amount * 100),
      currency: CONFIG.CURRENCY,
      payType,
      remark
    });
    
    // 調用 EasyLink
    const params = {
      mchNo: CONFIG.EASYLINK_MCH_NO,
      appId: env.EASYLINK_APP_ID,
      mchOrderNo: orderNo,
      amount: Math.round(amount * 100),
      currency: CONFIG.CURRENCY,
      payType,
      subject: 'King-Chicken Payment',
      notifyUrl: `${env.API_BASE_URL || ''}/webhook/easylink`,
      returnUrl: env.RETURN_URL || 'https://upay-client-kc.pages.dev/payment/success'
    };
    
    const result = await createEasyLinkOrder(params, env.EASYLINK_APP_SECRET);
    
    if (result.code !== 0) {
      await updateTransactionStatus(env, orderNo, 'failed');
      return errorResponse(result.msg || 'Payment creation failed', 400, origin);
    }
    
    // 更新交易
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

/**
 * 處理獲取交易列表
 */
async function handleGetTransactions(request, env, origin) {
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
    
    const transactions = await getTransactions(env, filters);
    
    return successResponse({ transactions }, origin);
    
  } catch (error) {
    console.error('[GetTransactions] Error:', error);
    return errorResponse('Failed to fetch transactions', 500, origin);
  }
}

/**
 * 處理獲取統計數據
 */
async function handleGetStatistics(request, env, origin) {
  try {
    const stats = await getStatistics(env);
    return successResponse(stats, origin);
  } catch (error) {
    console.error('[GetStatistics] Error:', error);
    return errorResponse('Failed to fetch statistics', 500, origin);
  }
}

/**
 * 處理更新備註
 */
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

/**
 * 處理 Webhook
 */
async function handleWebhook(request, env) {
  try {
    const body = await request.text();
    
    // 解析通知數據
    const params = new URLSearchParams(body);
    const data = {};
    params.forEach((value, key) => { data[key] = value; });
    
    const orderNo = data.mchOrderNo;
    const status = data.status; // 2=success, 3=failed
    
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
    
    // 處理 CORS 預檢請求
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
    
    // 路由
    const path = url.pathname;
    
    // 健康檢查
    if (path === '/health') {
      return jsonResponse({ status: 'ok', version: '2.0.0' }, 200, origin);
    }
    
    // 創建支付
    if (path === '/api/payment/create' && request.method === 'POST') {
      return handleCreatePayment(request, env, origin);
    }
    
    // 獲取交易列表
    if (path === '/api/admin/transactions' && request.method === 'GET') {
      return handleGetTransactions(request, env, origin);
    }
    
    // 獲取統計數據
    if (path === '/api/admin/statistics' && request.method === 'GET') {
      return handleGetStatistics(request, env, origin);
    }
    
    // 更新備註
    if (path === '/api/admin/remark' && request.method === 'POST') {
      return handleUpdateRemark(request, env, origin);
    }
    
    // Webhook
    if (path === '/webhook/easylink' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    
    // 404
    return errorResponse('Not found', 404, origin);
  }
};
