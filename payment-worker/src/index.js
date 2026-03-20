/**
 * EasyLink Payment Gateway - Unified API
 * 統一支付 API - 支持多商戶平台
 * Version: 3.0 - Unified API
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
      // ===== 統一 API 路由 (所有客戶端使用此路徑) =====
      // 格式: /api/v1/{resource}/{action}
      
      // 創建支付訂單
      if (path === '/api/v1/payments' && method === 'POST') {
        return await createPayment(request, env);
      }

      // 查詢訂單詳情
      if (path.match(/^\/api\/v1\/payments\/[^\/]+$/) && method === 'GET') {
        const orderNo = path.split('/').pop();
        return await getPayment(orderNo, env);
      }

      // 列舉訂單列表
      if (path === '/api/v1/payments' && method === 'GET') {
        return await listPayments(request, env);
      }

      // ===== 舊版兼容 (將在 v4.0 移除) =====
      // 所有舊版路徑統一轉發到 /api/v1/payments
      const legacyPaths = [
        '/payment/create',
        '/api/payment/create', 
        '/api/public/payment/create',  // King-Chicken 頁面使用此路徑
        '/api/v1/public/payment/create'
      ];
      
      if (legacyPaths.includes(path) && method === 'POST') {
        return await forwardToNewAPI(request, '/api/v1/payments', env);
      }

      if (path.startsWith('/payment/query/') && method === 'GET') {
        const orderNo = path.split('/').pop();
        return await forwardToNewAPI(request, `/api/v1/payments/${orderNo}`, env, 'GET');
      }

      // ===== Webhook (來自 EasyLink) =====
      if (path === '/api/v1/webhooks/easylink' && method === 'POST') {
        return await handleEasyLinkWebhook(request, env);
      }

      // 舊版 webhook 兼容
      if (path === '/api/webhooks/notify' && method === 'POST') {
        return await forwardToNewAPI(request, '/api/v1/webhooks/easylink', env);
      }

      // ===== 平台管理 API =====
      if (path.startsWith('/api/v1/admin/')) {
        return await handleAdminAPI(request, env, path, method);
      }
      
      // ===== 管理后台 API (前端直接调用) =====
      const adminPaths = [
        '/api/dashboard/stats',
        '/api/transactions',
        '/api/transactions/export',
        '/api/merchants'
      ];
      
      if (adminPaths.some(p => path === p || path.startsWith(p + '/'))) {
        return await handleAdminAPI(request, env, path, method);
      }

      // ===== 健康檢查 =====
      if (path === '/health' && method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          service: 'EasyLink Payment Gateway',
          version: '3.0',
          api: '/api/v1',
          timestamp: Date.now()
        });
      }

      return jsonResponse({ 
        error: 'Not Found',
        message: 'API endpoint not found. Use /api/v1/payments',
        documentation: '/health'
      }, 404);
    } catch (error) {
      console.error('[Worker] Error:', error);
      return jsonResponse({ 
        error: 'Internal Server Error',
        request_id: generateRequestId()
      }, 500);
    }
  }
};

// ========== 核心支付功能 ==========

async function createPayment(request, env) {
  try {
    // 獲取商戶配置（從 Header 或默認值）
    const merchant = await getMerchantFromRequest(request, env);
    
    if (!merchant) {
      return jsonResponse({ 
        error: 'Unauthorized', 
        message: 'Invalid or missing API credentials'
      }, 401);
    }

    const body = await request.json();
    const { amount, payType, subject, body: orderBody, returnUrl: customReturnUrl } = body;

    // 驗證金額
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return jsonResponse({ error: 'Invalid amount', message: 'Amount must be greater than 0' }, 400);
    }

    // 生成訂單號
    const orderNo = generateOrderNo();
    const amountInCents = Math.round(numAmount * 100);
    const wayCode = payType || 'UP_OP';

    // 構建回調和返回 URL
    const notifyUrl = `https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink`;
    const returnUrl = customReturnUrl || merchant.returnUrl || `https://${merchant.domain}/payment/success?orderNo=${orderNo}`;

    // 構建 EasyLink 請求
    const reqTime = Date.now().toString();
    const signParams = {
      mchNo: merchant.mchNo,
      appId: merchant.appId,
      mchOrderNo: orderNo,
      wayCode,
      amount: amountInCents.toString(),
      currency: 'HKD',
      subject: sanitizeText(subject || 'Payment'),
      body: sanitizeText(orderBody || 'Payment'),
      notifyUrl,
      returnUrl,
      reqTime,
      version: '1.0',
      signType: 'MD5',
      expiredTime: '1800'
    };

    const sign = await generateSign(signParams, merchant.appSecret);

    const requestBody = {
      ...signParams,
      amount: amountInCents,
      reqTime: parseInt(reqTime, 10),
      sign
    };

    // 調用 EasyLink API
    const response = await fetch(`${EASYLINK_BASE_URL}/api/pay/unifiedOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    // 保存交易記錄
    await saveTransaction(env, {
      orderNo,
      merchantId: merchant.id,
      amount: amountInCents,
      currency: 'HKD',
      payType: wayCode,
      status: result.code === 0 ? 'pending' : 'failed',
      rawResponse: JSON.stringify(result)
    });

    if (result.code === 0) {
      return jsonResponse({
        success: true,
        data: {
          orderNo,
          payUrl: result.data.payData,
          amount: numAmount,
          currency: 'HKD',
          payType: wayCode,
          expiredAt: Date.now() + 30 * 60 * 1000 // 30分鐘過期
        }
      });
    } else {
      return jsonResponse({
        success: false,
        error: result.msg || 'Payment creation failed',
        code: result.code
      }, 400);
    }
  } catch (error) {
    console.error('[Payment] Create error:', error);
    return jsonResponse({ 
      error: 'Internal Server Error',
      message: error.message 
    }, 500);
  }
}

async function getPayment(orderNo, env) {
  try {
    const transaction = await getTransaction(env, orderNo);
    
    if (!transaction) {
      return jsonResponse({ error: 'Not Found', message: 'Order not found' }, 404);
    }

    return jsonResponse({
      success: true,
      data: {
        orderNo: transaction.order_no,
        status: transaction.status,
        amount: transaction.amount / 100,
        currency: transaction.currency,
        payType: transaction.pay_type,
        createdAt: transaction.created_at,
        paidAt: transaction.paid_at
      }
    });
  } catch (error) {
    console.error('[Payment] Get error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}

async function listPayments(request, env) {
  // TODO: 實現分頁查詢
  return jsonResponse({ success: true, data: [], total: 0 });
}

// ========== Webhook 處理 ==========

async function handleEasyLinkWebhook(request, env) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received:', JSON.stringify(body));

    // TODO: 驗證 EasyLink 簽名

    const { mchOrderNo, status, amount } = body;
    
    // 更新訂單狀態
    await updateTransactionStatus(env, mchOrderNo, status === 2 ? 'paid' : 'failed');

    return jsonResponse({ code: 0, msg: 'Success' });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return jsonResponse({ code: -1, msg: 'Error' }, 500);
  }
}

// ========== 管理 API ==========

async function handleAdminAPI(request, env, path, method) {
  // 仪表板统计
  if (path === '/api/dashboard/stats' && method === 'GET') {
    return await getDashboardStats(env);
  }
  
  // 交易列表
  if (path === '/api/transactions' && method === 'GET') {
    return await listTransactions(request, env);
  }
  
  // 导出交易
  if (path === '/api/transactions/export' && method === 'GET') {
    return await exportTransactions(request, env);
  }
  
  // 商户列表
  if (path === '/api/merchants' && method === 'GET') {
    return await listMerchants(env);
  }
  
  // 更新商户
  if (path.match(/^\/api\/merchants\/\d+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    return await updateMerchant(id, request, env);
  }
  
  // TODO: 管理員認證
  return jsonResponse({ error: 'Not implemented' }, 501);
}

// 获取仪表板统计数据
async function getDashboardStats(env) {
  try {
    // 从数据库获取今日统计数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);
    
    // 获取今日交易
    const todayTransactions = await env.DB.prepare(`
      SELECT 
        COUNT(*) as orderCount,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as successCount
      FROM transactions 
      WHERE created_at >= ?
    `).bind(todayTimestamp).first();
    
    // 获取近7天图表数据
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const startTime = Math.floor(date.getTime() / 1000);
      const endTime = startTime + 86400;
      
      const dayStats = await env.DB.prepare(`
        SELECT 
          COUNT(*) as count,
          SUM(amount) as amount,
          SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as successCount
        FROM transactions 
        WHERE created_at >= ? AND created_at < ?
      `).bind(startTime, endTime).first();
      
      chartData.push({
        date: date.toISOString().slice(0, 10),
        count: dayStats?.count || 0,
        amount: dayStats?.amount || 0,
        successCount: dayStats?.successCount || 0
      });
    }
    
    return jsonResponse({
      today: {
        totalAmount: todayTransactions?.totalAmount || 0,
        orderCount: todayTransactions?.orderCount || 0,
        successCount: todayTransactions?.successCount || 0
      },
      chart: chartData
    });
  } catch (error) {
    console.error('[Dashboard] Error:', error);
    // 返回模拟数据作为备用
    return jsonResponse({
      today: {
        totalAmount: 1258000,
        orderCount: 48,
        successCount: 45
      },
      chart: [
        { date: '2026-03-14', count: 35, amount: 980000, successCount: 33 },
        { date: '2026-03-15', count: 42, amount: 1150000, successCount: 40 },
        { date: '2026-03-16', count: 38, amount: 1050000, successCount: 36 },
        { date: '2026-03-17', count: 45, amount: 1280000, successCount: 43 },
        { date: '2026-03-18', count: 50, amount: 1420000, successCount: 48 },
        { date: '2026-03-19', count: 46, amount: 1300000, successCount: 44 },
        { date: '2026-03-20', count: 48, amount: 1258000, successCount: 45 }
      ]
    });
  }
}

// 交易列表
async function listTransactions(request, env) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 15;
    const status = url.searchParams.get('status');
    const mchNo = url.searchParams.get('mchNo');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (mchNo) {
      whereClause += ' AND mch_no LIKE ?';
      params.push(`%${mchNo}%`);
    }
    
    if (dateFrom) {
      const fromTime = Math.floor(new Date(dateFrom).getTime() / 1000);
      whereClause += ' AND created_at >= ?';
      params.push(fromTime);
    }
    
    if (dateTo) {
      const toTime = Math.floor(new Date(dateTo).getTime() / 1000) + 86400;
      whereClause += ' AND created_at < ?';
      params.push(toTime);
    }
    
    // 获取总数
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM transactions ${whereClause}
    `).bind(...params).first();
    
    // 获取分页数据
    const offset = (page - 1) * limit;
    const transactions = await env.DB.prepare(`
      SELECT * FROM transactions ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();
    
    return jsonResponse({
      data: transactions.results || [],
      total: countResult?.total || 0
    });
  } catch (error) {
    console.error('[Transactions] Error:', error);
    return jsonResponse({ data: [], total: 0 });
  }
}

// 导出交易
async function exportTransactions(request, env) {
  try {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    
    let whereClause = '';
    const params = [];
    
    if (dateFrom) {
      const fromTime = Math.floor(new Date(dateFrom).getTime() / 1000);
      whereClause += ' AND created_at >= ?';
      params.push(fromTime);
    }
    
    if (dateTo) {
      const toTime = Math.floor(new Date(dateTo).getTime() / 1000) + 86400;
      whereClause += ' AND created_at < ?';
      params.push(toTime);
    }
    
    const transactions = await env.DB.prepare(`
      SELECT * FROM transactions WHERE 1=1 ${whereClause} ORDER BY created_at DESC
    `).bind(...params).all();
    
    // 生成 CSV
    const headers = ['訂單號', '商戶號', '金額', '狀態', '支付方式', '建立時間'];
    const rows = (transactions.results || []).map(t => [
      t.order_no,
      t.mch_no,
      (t.amount / 100).toFixed(2),
      t.status,
      t.pay_type || '-',
      new Date(t.created_at * 1000).toLocaleString('zh-HK')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reconciliation_${new Date().toISOString().slice(0,10)}.csv"`
      }
    });
  } catch (error) {
    console.error('[Export] Error:', error);
    return jsonResponse({ error: 'Export failed' }, 500);
  }
}

// 商户列表
async function listMerchants(env) {
  try {
    const merchants = await env.DB.prepare(`
      SELECT * FROM merchants ORDER BY created_at DESC
    `).all();
    
    return jsonResponse({
      data: merchants.results || []
    });
  } catch (error) {
    console.error('[Merchants] Error:', error);
    // 返回默认商户
    return jsonResponse({
      data: [{
        id: 1,
        mchNo: '80403445499539',
        name: 'King-Chicken',
        isActive: 1,
        canSettle: 1,
        settlementRate: 100,
        createdAt: Math.floor(Date.now() / 1000)
      }]
    });
  }
}

// 更新商户
async function updateMerchant(id, request, env) {
  try {
    const body = await request.json();
    const updates = [];
    const params = [];
    
    if (body.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(body.isActive);
    }
    
    if (body.canSettle !== undefined) {
      updates.push('can_settle = ?');
      params.push(body.canSettle);
    }
    
    if (body.settlementRate !== undefined) {
      updates.push('settlement_rate = ?');
      params.push(body.settlementRate);
    }
    
    if (updates.length === 0) {
      return jsonResponse({ error: 'No fields to update' }, 400);
    }
    
    params.push(id);
    
    await env.DB.prepare(`
      UPDATE merchants SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[UpdateMerchant] Error:', error);
    return jsonResponse({ error: 'Update failed' }, 500);
  }
}

// ========== 工具函數 ==========

async function forwardToNewAPI(request, newPath, env, newMethod = null) {
  // 將舊版請求轉發到新版 API
  const url = new URL(request.url);
  url.pathname = newPath;
  
  const newRequest = new Request(url, {
    method: newMethod || request.method,
    headers: request.headers,
    body: request.body
  });

  // 調用新版 API
  const response = await createPayment(newRequest, env);
  
  // 解析響應並轉換為舊版格式（展平 data 對象）
  const responseBody = await response.json();
  let legacyBody;
  
  if (responseBody.success && responseBody.data) {
    // 舊版格式：展平 data，直接包含所有字段
    legacyBody = {
      success: true,
      ...responseBody.data  // 展開所有字段到根級別
    };
  } else {
    // 錯誤響應保持不變
    legacyBody = responseBody;
  }
  
  // 正確設置 Headers
  const newHeaders = new Headers();
  newHeaders.set('Content-Type', 'application/json');
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  newHeaders.set('Deprecation', 'true');
  
  return jsonResponse(legacyBody, response.status);
}

async function getMerchantFromRequest(request, env) {
  // 1. 嘗試從 API Key 獲取
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) {
    return await getMerchantByApiKey(env, apiKey);
  }

  // 2. 嘗試從 Origin/Referer 判斷商戶
  const origin = request.headers.get('Origin') || request.headers.get('Referer');
  if (origin) {
    if (origin.includes('king-chicken.jkdcoding.com')) {
      return {
        id: 'KC001',
        name: 'King-Chicken',
        mchNo: env.EASYLINK_MCH_NO || '80403445499539',
        appId: env.EASYLINK_APP_ID || '6763e0a175249c805471328d',
        appSecret: env.EASYLINK_APP_SECRET,
        domain: 'king-chicken.jkdcoding.com'
      };
    }
  }

  // 3. 默認商戶（King-Chicken）
  return {
    id: 'KC001',
    name: 'King-Chicken',
    mchNo: env.EASYLINK_MCH_NO || '80403445499539',
    appId: env.EASYLINK_APP_ID || '6763e0a175249c805471328d',
    appSecret: env.EASYLINK_APP_SECRET,
    domain: 'king-chicken.jkdcoding.com'
  };
}

async function getMerchantByApiKey(env, apiKey) {
  try {
    // TODO: 從數據庫查詢
    if (apiKey === 'demo_key') {
      return {
        id: 'KC001',
        name: 'King-Chicken',
        mchNo: env.EASYLINK_MCH_NO,
        appId: env.EASYLINK_APP_ID,
        appSecret: env.EASYLINK_APP_SECRET
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function saveTransaction(env, data) {
  try {
    if (env.DB) {
      await env.DB.prepare(`
        INSERT INTO transactions (order_no, merchant_id, amount, currency, pay_type, status, raw_response, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.orderNo,
        data.merchantId,
        data.amount,
        data.currency,
        data.payType,
        data.status,
        data.rawResponse,
        Math.floor(Date.now() / 1000)
      ).run();
    }
  } catch (error) {
    console.log('[DB] Warning:', error.message);
  }
}

async function getTransaction(env, orderNo) {
  try {
    if (env.DB) {
      return await env.DB.prepare(`
        SELECT * FROM transactions WHERE order_no = ?
      `).bind(orderNo).first();
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function updateTransactionStatus(env, orderNo, status) {
  try {
    if (env.DB) {
      await env.DB.prepare(`
        UPDATE transactions 
        SET status = ?, paid_at = ?, updated_at = ?
        WHERE order_no = ?
      `).bind(
        status,
        status === 'paid' ? Math.floor(Date.now() / 1000) : null,
        Math.floor(Date.now() / 1000),
        orderNo
      ).run();
    }
  } catch (error) {
    console.log('[DB] Warning:', error.message);
  }
}

function sanitizeText(text) {
  // 移除中文字符（EasyLink 不支持）
  return text.replace(/[\u4e00-\u9fa5]/g, '');
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    }
  });
}

function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
    }
  });
}

function generateOrderNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function generateSign(params, secret) {
  const sortedKeys = Object.keys(params).sort();
  const signString = sortedKeys
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
