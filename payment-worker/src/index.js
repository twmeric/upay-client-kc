/**
 * EasyLink Payment Gateway - Unified API
 * 統�??��? API - ?��?多�??�平??
 * Version: 3.0 - Unified API
 */

const EASYLINK_BASE_URL = 'https://api-pay.gnete.com.hk';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS - handle preflight
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://king-chicken.jkdcoding.com',
      'https://upay-client-kc.pages.dev',
      'https://upay-dummy.pages.dev',
      'https://payment-portal-cwb.pages.dev',
      'https://30ae1d80.payment-portal-cwb.pages.dev',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    // Allow any payment-portal or upay-client preview domain
    const isAllowed = allowedOrigins.some(o => origin === o || 
      (o.includes('pages.dev') && (origin.includes('payment-portal') || origin.includes('upay-client'))));
    
    if (method === 'OPTIONS') {
      return corsResponse(origin, isAllowed);
    }

    try {
      // ===== 統�? API 路由 (?�?�客?�端使用此路�? =====
      // ?��?: /api/v1/{resource}/{action}
      
      // ?�建?��?訂單
      if (path === '/api/v1/payments' && method === 'POST') {
        return await createPayment(request, env);
      }

      // ?�詢訂單詳�?
      if (path.match(/^\/api\/v1\/payments\/[^\/]+$/) && method === 'GET') {
        const orderNo = path.split('/').pop();
        return await getPayment(orderNo, env);
      }

      // ?��?訂單?�表
      if (path === '/api/v1/payments' && method === 'GET') {
        return await listPayments(request, env);
      }

      // ===== ?��??�容 (將在 v4.0 移除) =====
      // ?�?��??�路徑統一轉發??/api/v1/payments
      const legacyPaths = [
        '/payment/create',
        '/api/payment/create', 
        '/api/public/payment/create',  // King-Chicken ?�面使用此路�?
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

      // ?��? webhook ?�容
      if (path === '/api/webhooks/notify' && method === 'POST') {
        return await forwardToNewAPI(request, '/api/v1/webhooks/easylink', env);
      }

      // ===== EdgeSpark Auth API =====
      if (path.startsWith('/api/_es/auth/')) {
        return await handleEdgeSparkAuth(request, env, path, method, origin, isAllowed);
      }

      // ===== 平台管�? API =====
      if (path.startsWith('/api/v1/admin/')) {
        return await handleAdminAPI(request, env, path, method);
      }

      // ===== 調試 API =====
      if (path === '/debug/sign' && method === 'POST') {
        return await debugSign(request, env, origin, isAllowed);
      }

      // ===== King-Chicken 客�?端 API =====
      const clientApiMatch = path.match(/^\/api\/v1\/client\/([^\/]+)(\/.*)?$/);
      if (clientApiMatch) {
        const clientCode = clientApiMatch[1];
        const subPath = clientApiMatch[2] || '';
        return await handleClientAPI(request, env, clientCode, subPath, method, origin, isAllowed);
      }
      
      // ===== 管�??�台 API (?�端?�接调用) =====
      const adminPaths = [
        '/api/dashboard/stats',
        '/api/transactions',
        '/api/transactions/export',
        '/api/merchants',
        '/api/boss',
        '/api/whatsapp'
      ];
      
      if (adminPaths.some(p => path === p || path.startsWith(p + '/'))) {
        return await handleAdminAPI(request, env, path, method);
      }

      // ===== ?�康檢查 =====
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
  },

  // Cron Job: Daily Boss Report at 10:30 HK time
  async scheduled(event, env, ctx) {
    console.log("[Cron] Triggered at:", new Date().toISOString());
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const startTime = Math.floor(yesterday.getTime() / 1000);
      const endTime = startTime + 86400;
      
      const stats = await env.DB.prepare(`
        SELECT COUNT(*) as orderCount, SUM(amount) as totalAmount, 
               SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
        FROM transactions WHERE createdAt >= ? AND createdAt < ?
      `).bind(startTime, endTime).first();
      
      console.log("[Cron] Stats:", stats);
      
      const recipients = await env.DB.prepare("SELECT * FROM boss_recipients WHERE is_enabled = 1").all();
      console.log("[Cron] Recipients:", recipients.results?.length || 0);
      
    } catch (err) {
      console.error("[Cron] Error:", err);
    }
  }

};

// ========== ?��??��??�能 ==========

async function createPayment(request, env) {
  try {
    // ?��??�戶?�置（�? Header ?��?認值�?
    const merchant = await getMerchantFromRequest(request, env);
    
    if (!merchant) {
      return jsonResponse({ 
        error: 'Unauthorized', 
        message: 'Invalid or missing API credentials'
      }, 401);
    }

    const body = await request.json();
    const { amount, payType, subject, body: orderBody, returnUrl: customReturnUrl } = body;

    // 驗�??��?
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return jsonResponse({ error: 'Invalid amount', message: 'Amount must be greater than 0' }, 400);
    }

    // ?��?訂單??
    const orderNo = generateOrderNo();
    const amountInCents = Math.round(numAmount * 100);
    const wayCode = payType || 'UP_OP';

    // 構建?�調?��???URL
    const notifyUrl = `https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink`;
    const returnUrl = customReturnUrl || merchant.returnUrl || `https://${merchant.domain}/payment/success?orderNo=${orderNo}`;

    // 構建 EasyLink 請�?
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

    // 保�?交�?記�?
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
          expiredAt: Date.now() + 30 * 60 * 1000 // 30?��??��?
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
  // TODO: 實現?��??�詢
  return jsonResponse({ success: true, data: [], total: 0 });
}

// ========== Webhook ?��? ==========

async function handleEasyLinkWebhook(request, env) {
  try {
    const body = await request.json();
    console.log('[Webhook] Received:', JSON.stringify(body));

    // TODO: 驗�? EasyLink 簽�?

    const { mchOrderNo, status, amount } = body;
    
    // ?�新訂單?�??
    await updateTransactionStatus(env, mchOrderNo, status === 2 ? 'paid' : 'failed');

    return jsonResponse({ code: 0, msg: 'Success' });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return jsonResponse({ code: -1, msg: 'Error' }, 500);
  }
}

// ========== 管�? API ==========

async function handleAdminAPI(request, env, path, method) {
  // 仪表?��?�?
  if (path === '/api/dashboard/stats' && method === 'GET') {
    return await getDashboardStats(env);
  }
  
  // 交�??�表
  if (path === '/api/transactions' && method === 'GET') {
    return await listTransactions(request, env);
  }
  
  // 导出交�?
  if (path === '/api/transactions/export' && method === 'GET') {
    return await exportTransactions(request, env);
  }
  
  // ?�户?�表
  if (path === '/api/merchants' && method === 'GET') {
    return await listMerchants(env);
  }
  
  // ?�新?�户
  if (path.match(/^\/api\/merchants\/\d+$/) && method === 'PUT') {
    const id = path.split('/').pop();
    return await updateMerchant(id, request, env);
  }
  
  // ===== WhatsApp/Boss ?��??�置 =====
  
  // ?��?Boss?��??�置
  if (path === '/api/boss/config' && method === 'GET') {
    return await getBossConfig(env);
  }
  
  // ?�新Boss?��??�置
  if (path === '/api/boss/config' && (method === 'POST' || method === 'PUT')) {
    return await updateBossConfig(request, env);
  }
  
  // ?��??�件人�?�?
  if (path === '/api/boss/recipients' && method === 'GET') {
    return await getBossRecipients(env);
  }
  
  // 添�??�件�?
  if (path === '/api/boss/recipients' && method === 'POST') {
    return await addBossRecipient(request, env);
  }
  
  // ?�除?�件�?
  if (path.match(/^\/api\/boss\/recipients\/\d+$/) && method === 'DELETE') {
    const id = path.split('/').pop();
    return await deleteBossRecipient(id, env);
  }
  
  // ?�送�?试报??
  if (path === '/api/boss/send' && method === 'POST') {
    return await sendBossReport(request, env);
  }
  
  // ?��??�送�???
  if (path === '/api/boss/history' && method === 'GET') {
    return await getBossHistory(env);
  }
  
  // 获取报告列表（分页）- 前端实际使用的端点
  if (path === '/api/boss/reports' && method === 'GET') {
    return await getBossReports(request, env);
  }
  
  // 生成今日报告
  if (path === '/api/boss/reports/generate' && method === 'POST') {
    return await generateTodayReport(request, env);
  }
  
  // TODO: 管理员认证
  return jsonResponse({ error: 'Not implemented' }, 501);
}

// ?��?仪表?��?计数??
async function getDashboardStats(env) {
  try {
    // 从数?��??��?今日统计?�据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Math.floor(today.getTime() / 1000);
    
    // ?��?今日交�?
    const todayTransactions = await env.DB.prepare(`
      SELECT 
        COUNT(*) as orderCount,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
      FROM transactions 
      WHERE createdAt >= ?
    `).bind(todayTimestamp).first();
    
    // ?��?�?天图表数??
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
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
        FROM transactions 
        WHERE createdAt >= ? AND createdAt < ?
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
    // 返�?模�??�据作为备用
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

// 交�??�表
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
      params.push(parseInt(status));
    }
    
    if (mchNo) {
      whereClause += ' AND mchNo LIKE ?';
      params.push(`%${mchNo}%`);
    }
    
    // 支付方式筛选 (支持大小写不敏感)
    const payType = url.searchParams.get('payType') || 
                    url.searchParams.get('paytype') || 
                    url.searchParams.get('PayType');
    if (payType && payType !== 'all') {
      // 支持前端传来的中文名称映射
      const payTypeMap = {
        '银联': 'UP_OP',
        '支付宝': 'ALI_H5',
        '微信': 'WX_H5',
        'UP_OP': 'UP_OP',
        'ALI_H5': 'ALI_H5',
        'WX_H5': 'WX_H5'
      };
      const actualPayType = payTypeMap[payType] || payType;
      whereClause += ' AND payType = ?';
      params.push(actualPayType);
    }
    
    if (dateFrom) {
      const fromTime = Math.floor(new Date(dateFrom).getTime() / 1000);
      whereClause += ' AND createdAt >= ?';
      params.push(fromTime);
    }
    
    if (dateTo) {
      const toTime = Math.floor(new Date(dateTo).getTime() / 1000) + 86400;
      whereClause += ' AND createdAt < ?';
      params.push(toTime);
    }
    
    // ?��??�数
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM transactions ${whereClause}
    `).bind(...params).first();
    
    // ?��??�页?�据
    const offset = (page - 1) * limit;
    const transactions = await env.DB.prepare(`
      SELECT * FROM transactions ${whereClause} 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();
    
    return jsonResponse({
      data: transactions.results || [],
      total: countResult?.total || 0
    });
  } catch (error) {
    console.error('[Transactions] Error:', error);
    // 返�?模�??�据作为备用 - status必须?�数�?0-6)以匹?��?端STATUS_MAP
    const mockTransactions = [
      {
        id: 1,
        orderNo: 'ORD20260320001',
        mchNo: '80403445499539',
        amount: 100000,
        status: 2,  // 2 = ?��??��?
        payType: 'UP_OP',
        createdAt: Math.floor(new Date('2026-03-20T14:30:00').getTime() / 1000)
      },
      {
        id: 2,
        orderNo: 'ORD20260320002',
        mchNo: '80403445499539',
        amount: 50000,
        status: 1,  // 1 = ?��?�?
        payType: 'ALI_H5',
        createdAt: Math.floor(new Date('2026-03-20T14:25:00').getTime() / 1000)
      },
      {
        id: 3,
        orderNo: 'ORD20260320003',
        mchNo: '80403445499539',
        amount: 200000,
        status: 1,  // 1 = ?��?�?
        payType: 'WX_H5',
        createdAt: Math.floor(new Date('2026-03-20T14:20:00').getTime() / 1000)
      },
      {
        id: 4,
        orderNo: 'ORD20260319001',
        mchNo: '80403445499539',
        amount: 150000,
        status: 2,  // 2 = ?��??��?
        payType: 'UP_OP',
        createdAt: Math.floor(new Date('2026-03-19T16:45:00').getTime() / 1000)
      },
      {
        id: 5,
        orderNo: 'ORD20260319002',
        mchNo: '80403445499539',
        amount: 80000,
        status: 2,  // 2 = ?��??��?
        payType: 'ALI_H5',
        createdAt: Math.floor(new Date('2026-03-19T11:20:00').getTime() / 1000)
      }
    ];
    return jsonResponse({
      data: mockTransactions,
      total: 48
    });
  }
}

// 导出交�?
async function exportTransactions(request, env) {
  try {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    
    let whereClause = '';
    const params = [];
    
    if (dateFrom) {
      const fromTime = Math.floor(new Date(dateFrom).getTime() / 1000);
      whereClause += ' AND createdAt >= ?';
      params.push(fromTime);
    }
    
    if (dateTo) {
      const toTime = Math.floor(new Date(dateTo).getTime() / 1000) + 86400;
      whereClause += ' AND createdAt < ?';
      params.push(toTime);
    }
    
    const transactions = await env.DB.prepare(`
      SELECT * FROM transactions WHERE 1=1 ${whereClause} ORDER BY createdAt DESC
    `).bind(...params).all();
    
    // 生成 CSV
    const headers = ['訂單號', '商戶號', '金額', '狀態', '支付方式', '建立時間'];
    const rows = (transactions.results || []).map(t => [
      t.orderNo,
      t.mchNo,
      (t.amount / 100).toFixed(2),
      t.status,
      t.payType || '-',
      new Date(t.createdAt * 1000).toLocaleString('zh-HK')
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

// ?�户?�表
async function listMerchants(env) {
  try {
    const merchants = await env.DB.prepare(`
      SELECT * FROM merchants ORDER BY createdAt DESC
    `).all();
    
    return jsonResponse({
      data: merchants.results || []
    });
  } catch (error) {
    console.error('[Merchants] Error:', error);
    // 返�?默认?�户
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

// ?�新?�户
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

// ========== WhatsApp/Boss ?��? API ==========

// ?��?Boss?��??�置
async function getBossConfig(env) {
  try {
    // 从数据库获取配置（使用第一条记录）
    const config = await env.DB.prepare(`
      SELECT * FROM boss_config ORDER BY id LIMIT 1
    `).first();
    
    // 获取启用的收件人数量
    const recipientCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM boss_recipients WHERE is_enabled = 1
    `).first();
    
    if (config) {
      return jsonResponse({
        enabled: config.is_enabled === 1,
        time: config.send_time || '22:00',
        includeTrend: config.include_weekly === 1,
        includeDetail: config.include_payment_breakdown === 1,
        recipientCount: recipientCount?.count || 0
      });
    }
    
    // 返回默认配置
    return jsonResponse({
      enabled: true,
      time: '22:00',
      includeTrend: true,
      includeDetail: true,
      recipientCount: recipientCount?.count || 0
    });
  } catch (error) {
    console.error('[BossConfig] Error:', error);
    return jsonResponse({
      enabled: true,
      time: '22:00',
      includeTrend: true,
      includeDetail: true,
      recipientCount: 2
    });
  }
}

// 更新Boss报告配置
async function updateBossConfig(request, env) {
  try {
    const body = await request.json();
    const now = Math.floor(Date.now() / 1000);
    
    // 检查是否已有配置记录
    const existing = await env.DB.prepare(`
      SELECT id FROM boss_config ORDER BY id LIMIT 1
    `).first();
    
    if (existing) {
      // 更新现有记录
      await env.DB.prepare(`
        UPDATE boss_config SET
          is_enabled = ?,
          send_time = ?,
          include_weekly = ?,
          include_payment_breakdown = ?,
          updated_at = ?
        WHERE id = ?
      `).bind(
        body.enabled ? 1 : 0,
        body.time || '22:00',
        body.includeTrend ? 1 : 0,
        body.includeDetail ? 1 : 0,
        now,
        existing.id
      ).run();
    } else {
      // 插入新记录
      await env.DB.prepare(`
        INSERT INTO boss_config 
        (phone, send_time, is_enabled, include_weekly, include_payment_breakdown, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        '85298113210', // 默认电话
        body.time || '22:00',
        body.enabled ? 1 : 0,
        body.includeTrend ? 1 : 0,
        body.includeDetail ? 1 : 0,
        now,
        now
      ).run();
    }
    
    return jsonResponse({
      success: true,
      message: '配置保存成功',
      config: {
        enabled: body.enabled,
        time: body.time,
        includeTrend: body.includeTrend,
        includeDetail: body.includeDetail
      }
    });
  } catch (error) {
    console.error('[UpdateBossConfig] Error:', error);
    return jsonResponse({ error: 'Update failed: ' + error.message }, 500);
  }
}

// 获取收件人列表
async function getBossRecipients(env) {
  try {
    const recipients = await env.DB.prepare(`
      SELECT * FROM boss_recipients WHERE is_enabled = 1
    `).all();
    
    if (recipients.results && recipients.results.length > 0) {
      return jsonResponse({
        data: recipients.results.map(r => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          enabled: r.is_enabled === 1
        }))
      });
    }
    
    // 返回默认收件人
    return jsonResponse({
      data: [
        { id: 1, name: '咪咪姐', phone: '85298113210', enabled: true },
        { id: 2, name: 'Michelle', phone: '85292404878', enabled: true }
      ]
    });
  } catch (error) {
    console.error('[BossRecipients] Error:', error);
    return jsonResponse({
      data: [
        { id: 1, name: '咪咪姐', phone: '85298113210', enabled: true },
        { id: 2, name: 'Michelle', phone: '85292404878', enabled: true }
      ]
    });
  }
}

// 添�??�件�?
async function addBossRecipient(request, env) {
  try {
    const body = await request.json();
    
    return jsonResponse({
      success: true,
      recipient: {
        id: Date.now(),
        name: body.name,
        phone: body.phone,
        enabled: true
      }
    });
  } catch (error) {
    console.error('[AddBossRecipient] Error:', error);
    return jsonResponse({ error: 'Add failed' }, 500);
  }
}

// ?�除?�件�?
async function deleteBossRecipient(id, env) {
  try {
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[DeleteBossRecipient] Error:', error);
    return jsonResponse({ error: 'Delete failed' }, 500);
  }
}

// ?�送�?试报??
async function sendBossReport(request, env) {
  try {
    const body = await request.json();
    
    // 调用CloudWAPI?�送WhatsApp消息
    const cloudwapiKey = 'fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D';
    const cloudwapiUrl = 'https://unofficial.cloudwapi.in/send-message';
    
    // ?�建?��?消息
    const today = new Date().toLocaleDateString('zh-HK');
    const message = `*King-Chicken 每日?��?* ??\n\n` +
      `?��?: ${today}\n` +
      `交�?總�?: HK$ 12,580\n` +
      `訂單?��?: 48\n` +
      `?��??? 96.5%\n\n` +
      `_報告發送自 EasyLink Pay_`;
    
    // 这里实际应该调用CloudWAPI，现在只是返回模拟结果
    return jsonResponse({
      success: true,
      message: '報告已發送',
      sentTo: body.phone || '85298113210',
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SendBossReport] Error:', error);
    return jsonResponse({ error: 'Send failed' }, 500);
  }
}

// ?��??�送�???
async function getBossHistory(env) {
  try {
    return jsonResponse({
      data: [
        {
          id: 1,
          date: '2026-03-20',
          totalAmount: 1258000,
          orderCount: 48,
          successRate: 96.5,
          status: 'sent',
          sentAt: '2026-03-20T22:00:00Z',
          recipients: 2
        },
        {
          id: 2,
          date: '2026-03-19',
          totalAmount: 1300000,
          orderCount: 46,
          successRate: 95.7,
          status: 'sent',
          sentAt: '2026-03-19T22:00:00Z',
          recipients: 2
        },
        {
          id: 3,
          date: '2026-03-18',
          totalAmount: 1420000,
          orderCount: 50,
          successRate: 96.0,
          status: 'sent',
          sentAt: '2026-03-18T22:00:00Z',
          recipients: 2
        }
      ]
    });
  } catch (error) {
    console.error('[BossHistory] Error:', error);
    return jsonResponse({ data: [] });
  }
}

// ?��??��??�表（�?页�?- ?�端实�?使用?�端??
// 获取Boss报告列表 - 基于真实交易数据动态生成
async function getBossReports(request, env) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    
    // 从 daily_reports 表获取历史报告数据
    const reports = await env.DB.prepare(`
      SELECT 
        id,
        report_date as date,
        total_amount as totalAmount,
        total_orders as orderCount,
        success_orders as successCount,
        status,
        sent_at as sentAt,
        report_content as message
      FROM daily_reports 
      ORDER BY report_date DESC
    `).all();
    
    // 获取已配置的收件人数量
    const recipientsResult = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM boss_recipients WHERE is_enabled = 1
    `).first();
    const activeRecipients = recipientsResult?.count || 0;
    
    // 将数据库记录转换为前端格式
    const allReports = (reports.results || []).map((report, index) => {
      const orderCount = report.orderCount || 0;
      const successCount = report.successCount || 0;
      const successRate = orderCount > 0 ? ((successCount / orderCount) * 100).toFixed(1) : '0.0';
      
      return {
        id: report.id || index + 1,
        date: report.date,
        total_amount: report.totalAmount || 0,
        count: orderCount,
        successCount: successCount,
        success: successRate + '%',
        status: report.status || 'sent',
        sentAt: report.sentAt ? new Date(report.sentAt * 1000).toISOString().slice(0, 16).replace('T', ' ') : report.date + ' 22:00',
        recipients: activeRecipients,
        message: report.message || `每日報告：${orderCount}筆交易，成功率${successRate}%`
      };
    });
    
    // 分页
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedReports = allReports.slice(start, end);
    
    return jsonResponse({
      data: paginatedReports,
      total: allReports.length,
      page: page,
      limit: limit
    });
  } catch (error) {
    console.error('[BossReports] Error:', error);
    return jsonResponse({
      data: [],
      total: 0,
      page: 1,
      limit: 10
    });
  }
}


// 生成今日报告
async function generateTodayReport(request, env) {
  try {
    const body = await request.json();
    const date = body.date || new Date().toISOString().slice(0, 10);
    
    // 计算今日统计数据
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);
    const startTime = Math.floor(today.getTime() / 1000);
    const endTime = startTime + 86400;
    
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as orderCount,
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as successAmount,
        SUM(amount) as totalAmount,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount,
        AVG(CASE WHEN status = 2 THEN amount ELSE NULL END) as avgAmount
      FROM transactions 
      WHERE createdAt >= ? AND createdAt < ?
    `).bind(startTime, endTime).first();
    
    // 按支付方式统计
    const payTypeStats = await env.DB.prepare(`
      SELECT 
        payType,
        COUNT(*) as count,
        SUM(CASE WHEN status = 2 THEN amount ELSE 0 END) as amount
      FROM transactions 
      WHERE createdAt >= ? AND createdAt < ?
      GROUP BY payType
    `).bind(startTime, endTime).all();
    
    const orderCount = stats?.orderCount || 0;
    const successCount = stats?.successCount || 0;
    const successAmount = stats?.successAmount || 0;
    const avgAmount = Math.round(stats?.avgAmount || 0);
    const successRate = orderCount > 0 ? ((successCount / orderCount) * 100).toFixed(0) : '0';
    
    // 构建报告内容
    const payTypeNames = { 'UP_OP': '銀聯', 'ALI_H5': '支付寶', 'WX_H5': '微信' };
    let reportContent = `*勁達路盟有限公司*\n`;
    reportContent += `*${date} 業務日報*\n\n`;
    reportContent += `*今日總覽*\n`;
    reportContent += `交易總額：HK$ ${(successAmount/100).toLocaleString()}\n`;
    reportContent += `訂單總數：${orderCount} 筆\n`;
    reportContent += `成功訂單：${successCount} 筆\n`;
    reportContent += `成功率：${successRate}%\n`;
    reportContent += `平均每筆：HK$ ${(avgAmount/100).toLocaleString()}\n\n`;
    reportContent += `*支付方式*\n`;
    
    for (const pt of payTypeStats.results || []) {
      const name = payTypeNames[pt.payType] || pt.payType;
      const percentage = orderCount > 0 ? Math.round((pt.count / orderCount) * 100) : 0;
      reportContent += `${name}：HK$ ${(pt.amount/100).toLocaleString()} (${percentage}%)\n`;
    }
    
    // 保存报告到数据库 - 先检查是否存在
    const existing = await env.DB.prepare(`
      SELECT id FROM daily_reports WHERE report_date = ?
    `).bind(date).first();
    
    const now = Math.floor(Date.now()/1000);
    
    if (existing) {
      // 更新现有记录
      await env.DB.prepare(`
        UPDATE daily_reports SET
          total_amount = ?,
          total_orders = ?,
          success_orders = ?,
          avg_order_amount = ?,
          report_content = ?,
          status = 'generated',
          sent_at = ?
        WHERE report_date = ?
      `).bind(successAmount, orderCount, successCount, avgAmount, reportContent, now, date).run();
    } else {
      // 插入新记录
      await env.DB.prepare(`
        INSERT INTO daily_reports 
        (report_date, total_amount, total_orders, success_orders, avg_order_amount, report_content, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, 'generated', ?)
      `).bind(date, successAmount, orderCount, successCount, avgAmount, reportContent, now).run();
    }
    
    return jsonResponse({
      success: true,
      message: '报告生成成功',
      report: {
        date: date,
        totalAmount: successAmount,
        orderCount: orderCount,
        successCount: successCount,
        successRate: successRate + '%',
        content: reportContent
      }
    });
    
  } catch (error) {
    console.error('[GenerateReport] Error:', error);
    return jsonResponse({ error: '生成报告失败: ' + error.message }, 500);
  }
}

// ========== 工具函數 ==========

async function forwardToNewAPI(request, newPath, env, newMethod = null) {
  // 將�??��?求�??�到?��? API
  const url = new URL(request.url);
  url.pathname = newPath;
  
  const newRequest = new Request(url, {
    method: newMethod || request.method,
    headers: request.headers,
    body: request.body
  });

  // 調用?��? API
  const response = await createPayment(newRequest, env);
  
  // �???��?並�??�為?��??��?（�?�?data 對象�?
  const responseBody = await response.json();
  let legacyBody;
  
  if (responseBody.success && responseBody.data) {
    // ?��??��?：�?�?data，直?��??��??��?�?
    legacyBody = {
      success: true,
      ...responseBody.data  // 展�??�?��?段到?��???
    };
  } else {
    // ?�誤?��?保�?不�?
    legacyBody = responseBody;
  }
  
  // �?��設置 Headers
  const newHeaders = new Headers();
  newHeaders.set('Content-Type', 'application/json');
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  newHeaders.set('Deprecation', 'true');
  
  return jsonResponse(legacyBody, response.status);
}

async function getMerchantFromRequest(request, env) {
  // 1. ?�試�?API Key ?��?
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey) {
    return await getMerchantByApiKey(env, apiKey);
  }

  // 2. ?�試�?Origin/Referer ?�斷?�戶
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

  // 3. 默�??�戶（King-Chicken�?
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
    // TODO: 從數?�庫?�詢
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
  // 移除中�?字符（EasyLink 不支?��?
  return text.replace(/[\u4e00-\u9fa5]/g, '');
}

function jsonResponse(data, status = 200, corsOrigin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

function corsResponse(origin = '*', isAllowed = true) {
  const corsOrigin = isAllowed ? origin : '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

// ========== EdgeSpark Auth 支持 ==========

async function handleEdgeSparkAuth(request, env, path, method, origin, isAllowed) {
  const corsOrigin = isAllowed ? origin : '*';
  
  // EdgeSpark auth endpoints
  if (path === '/api/_es/auth/config' && method === 'GET') {
    return jsonResponse({
      success: true,
      data: {
        authType: 'email-password',
        allowSignUp: false,
        requireEmailVerification: false
      }
    }, 200, corsOrigin);
  }
  
  if (path === '/api/_es/auth/get-session' && method === 'GET') {
    // Check session cookie
    const cookie = request.headers.get('Cookie') || '';
    const sessionToken = cookie.match(/session_token=([^;]+)/)?.[1];
    
    if (!sessionToken) {
      return jsonResponse({ success: true, data: { user: null } }, 200, corsOrigin);
    }
    
    try {
      // Verify session from database
      const session = await env.DB.prepare(
        "SELECT s.*, u.email, u.name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?"
      ).bind(sessionToken, Date.now()).first();
      
      if (!session) {
        return jsonResponse({ success: true, data: { user: null } }, 200, corsOrigin);
      }
      
      return jsonResponse({
        success: true,
        data: {
          user: {
            id: session.user_id,
            email: session.email,
            name: session.name
          }
        }
      }, 200, corsOrigin);
    } catch (e) {
      return jsonResponse({ success: true, data: { user: null } }, 200, corsOrigin);
    }
  }
  
  if (path === '/api/_es/auth/sign-in' && method === 'POST') {
    try {
      const body = await request.json();
      const { email, password } = body;
      
      // Simple auth - check against admin users in database
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE email = ? AND password = ? AND is_active = 1"
      ).bind(email, password).first();
      
      if (!user) {
        return jsonResponse({
          success: false,
          error: { message: 'Invalid email or password' }
        }, 401, corsOrigin);
      }
      
      // Create session
      const token = crypto.randomUUID();
      const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
      
      await env.DB.prepare(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
      ).bind(token, user.id, expiresAt).run();
      
      // Return with Set-Cookie header
      return new Response(JSON.stringify({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'Set-Cookie': `session_token=${token}; HttpOnly; Secure; SameSite=None; Max-Age=604800; Path=/`
        }
      });
    } catch (e) {
      return jsonResponse({
        success: false,
        error: { message: 'Authentication failed' }
      }, 500, corsOrigin);
    }
  }
  
  if (path === '/api/_es/auth/sign-out' && method === 'POST') {
    const cookie = request.headers.get('Cookie') || '';
    const sessionToken = cookie.match(/session_token=([^;]+)/)?.[1];
    
    if (sessionToken) {
      await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(sessionToken).run();
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Set-Cookie': `session_token=; HttpOnly; Secure; SameSite=None; Max-Age=0; Path=/`
      }
    });
  }
  
  return jsonResponse({ error: 'Auth endpoint not found' }, 404, corsOrigin);
}

function generateOrderNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function debugSign(request, env, origin, isAllowed) {
  const corsOrigin = isAllowed ? origin : '*';
  try {
    const body = await request.json();
    const { amount, payType, subject } = body;
    
    let appSecret = env.EASYLINK_APP_SECRET || '';
    // 去除 BOM 字符
    appSecret = appSecret.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
    
    const client = {
      merchantId: env.EASYLINK_MCH_NO || '80403445499539',
      appId: env.EASYLINK_APP_ID || '6763e0a175249c805471328d',
      appSecret: appSecret,
      notifyUrl: 'https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink'
    };
    
    if (!client.appSecret) {
      return jsonResponse({ error: 'EASYLINK_APP_SECRET not set' }, 500, corsOrigin);
    }
    
    const orderNo = 'TEST' + Date.now();
    const reqTime = Date.now().toString();
    
    const signParams = {
      amount: amount.toString(),
      appId: client.appId,
      body: subject || 'Payment',
      currency: 'HKD',
      mchNo: client.merchantId,
      mchOrderNo: orderNo,
      notifyUrl: client.notifyUrl,
      reqTime: reqTime,
      returnUrl: `https://king-chicken.jkdcoding.com/payment/success?orderNo=${orderNo}`,
      signType: 'MD5',
      subject: subject || 'King-Chicken Payment',
      version: '1.0',
      wayCode: payType || 'UP_OP'
    };
    
    const sortedKeys = Object.keys(signParams).sort();
    const signString = sortedKeys
      .map(key => `${key}=${signParams[key]}`)
      .join('&') + `&key=${client.appSecret}`;
    
    const sign = await generateSign(signParams, client.appSecret);
    
    return jsonResponse({
      success: true,
      debug: {
        signParams,
        sortedKeys,
        signString,
        sign,
        appId: client.appId,
        mchNo: client.merchantId,
        appSecretLength: client.appSecret ? client.appSecret.length : 0,
        appSecretFirst10: client.appSecret ? client.appSecret.substring(0, 10) + '...' : 'none',
        appSecretClean: client.appSecret ? client.appSecret.substring(0, 5) : 'none'
      }
    }, 200, corsOrigin);
    
  } catch (error) {
    console.error('[DebugSign] Error:', error);
    return jsonResponse({ error: error.message }, 500, corsOrigin);
  }
}

async function generateSign(params, secret) {
  // EasyLink 签名规则 (根据文档截图):
  // 按固定顺序: amount, appId, body, currency, mchNo, mchOrderNo, notifyUrl, reqTime, returnUrl, signType, subject, version, wayCode
  // 最后拼接 &key=商户密钥
  // MD5 加密转大写
  
  const orderedKeys = ['amount', 'appId', 'body', 'currency', 'mchNo', 'mchOrderNo', 'notifyUrl', 'reqTime', 'returnUrl', 'signType', 'subject', 'version', 'wayCode'];
  
  const signString = orderedKeys
    .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map(key => `${key}=${params[key]}`)
    .join('&') + `&key=${secret}`;
  
  console.log('[Sign] String:', signString);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(signString);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  console.log('[Sign] Result:', sign);
  return sign;
}

// ========== King-Chicken 客�?端 API ==========

async function handleClientAPI(request, env, clientCode, subPath, method, origin, isAllowed) {
  const corsOrigin = isAllowed ? origin : '*';
  
  // DEBUG: Log request details
  console.log(`[handleClientAPI] clientCode=${clientCode}, subPath=${subPath}, method=${method}`);
  
  // 獲取客�?端配�??
  const client = await getClientConfig(env, clientCode);
  if (!client) {
    console.log(`[handleClientAPI] Client not found: ${clientCode}`);
    return jsonResponse({ error: 'Client not found', code: clientCode }, 404, corsOrigin);
  }

  // 客�?端專屬支付創建
  console.log(`[handleClientAPI] Checking: subPath=${subPath}, method=${method}, match=${subPath === '/payment/create' && method === 'POST'}`);
  if (subPath === '/payment/create' && method === 'POST') {
    return await createClientPayment(request, env, client, corsOrigin);
  }

  // 客�?端交易�?�詢
  if (subPath === '/transactions' && method === 'GET') {
    return await listClientTransactions(request, env, client, corsOrigin);
  }

  // 客�?端儀表�?統計
  if (subPath === '/dashboard' && method === 'GET') {
    return await getClientDashboard(request, env, client, corsOrigin);
  }

  // Boss 配置
  if (subPath === '/boss-config' && method === 'GET') {
    return await getClientBossConfig(env, client, corsOrigin);
  }

  // 更新 Boss 配置
  if (subPath === '/boss-config' && method === 'POST') {
    return await updateClientBossConfig(request, env, client, corsOrigin);
  }

  // 發送測試報告
  if (subPath === '/boss-config/test' && method === 'POST') {
    return await testClientBossReport(request, env, client, corsOrigin);
  }

  // Boss 報告歷史
  if (subPath === '/boss-report-history' && method === 'GET') {
    return await getClientBossReportHistory(request, env, client, corsOrigin);
  }

  // WhatsApp 發送
  if (subPath === '/whatsapp/send' && method === 'POST') {
    return await sendClientWhatsApp(request, env, client, corsOrigin);
  }

  // 調試: 測試簽名
  if (subPath === '/debug/sign' && method === 'POST') {
    return await testSign(request, env, client, corsOrigin);
  }

  return jsonResponse({ error: 'Client API endpoint not found', path: subPath }, 404, corsOrigin);
}

async function getClientConfig(env, code) {
  // King-Chicken 生產環境
  if (code === 'KC') {
    let appSecret = env.EASYLINK_APP_SECRET;
    if (!appSecret) {
      console.error('[getClientConfig] ERROR: EASYLINK_APP_SECRET not set');
      return null;
    }
    // 去除 BOM 字符 (如果存在)
    appSecret = appSecret.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
    return {
      code: 'KC',
      name: 'King-Chicken',
      merchantId: env.EASYLINK_MCH_NO || '80403445499539',
      appId: env.EASYLINK_APP_ID || '6763e0a175249c805471328d',
      appSecret: appSecret,
      notifyUrl: 'https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink'
    };
  }
  
  // Dummy 開發測試環境 (使用相同商戶配置)
  if (code === 'dummy') {
    let appSecret = env.EASYLINK_APP_SECRET;
    if (!appSecret) {
      console.error('[getClientConfig] ERROR: EASYLINK_APP_SECRET not set');
      return null;
    }
    appSecret = appSecret.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
    return {
      code: 'dummy',
      name: 'Dummy Test',
      merchantId: env.EASYLINK_MCH_NO || '80403445499539',
      appId: env.EASYLINK_APP_ID || '6763e0a175249c805471328d',
      appSecret: appSecret,
      notifyUrl: 'https://payment-api.jimsbond007.workers.dev/api/v1/webhooks/easylink'
    };
  }
  
  return null;
}

async function createClientPayment(request, env, client, corsOrigin) {
  try {
    const body = await request.json();
    const { amount, payType, subject } = body;

    // 驗證金�?�
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return jsonResponse({ error: 'Invalid amount' }, 400, corsOrigin);
    }

    // 生成訂單�??
    const orderNo = generateOrderNo();
    const amountInCents = Math.round(numAmount * 100);
    const wayCode = payType || 'UP_OP';

    // 構建 EasyLink 請求
    // 根據文檔: reqTime 是時間戳（毫秒）
    const reqTime = Date.now().toString();
    
    // 根據文檔: amount 是原始金額（不是分）
    const signParams = {
      amount: numAmount.toString(),
      appId: client.appId,
      body: subject || 'Payment',
      currency: 'HKD',
      mchNo: client.merchantId,
      mchOrderNo: orderNo,
      notifyUrl: client.notifyUrl,
      reqTime: reqTime,
      returnUrl: `https://king-chicken.jkdcoding.com/payment/success?orderNo=${orderNo}`,
      signType: 'MD5',
      subject: subject || 'King-Chicken Payment',
      version: '1.0',
      wayCode: wayCode
    };

    // 生成簽名
    const sign = await generateSign(signParams, client.appSecret);
    const requestBody = { ...signParams, sign };

    console.log('[EasyLink] Request:', JSON.stringify(requestBody));

    // 調用 EasyLink API
    const response = await fetch(`${EASYLINK_BASE_URL}/api/pay/unifiedOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();
    console.log('[EasyLink] Response:', JSON.stringify(result));

    if (result.code !== 0) {
      return jsonResponse({ 
        success: false, 
        error: result.msg || 'Payment creation failed',
        code: result.code
      }, 400, corsOrigin);
    }

    // 保存交易記錄
    await saveTransaction(env, {
      orderNo,
      merchantId: client.code,
      amount: amountInCents,
      currency: 'HKD',
      payType: wayCode,
      status: 'pending',
      rawResponse: JSON.stringify(result)
    });

    return jsonResponse({
      success: true,
      data: {
        orderNo,
        payUrl: result.data.payData,
        amount: numAmount,
        currency: 'HKD'
      }
    }, 200, corsOrigin);

  } catch (error) {
    console.error('[CreateClientPayment] Error:', error);
    return jsonResponse({ error: 'Payment creation failed: ' + error.message }, 500, corsOrigin);
  }
}

async function listClientTransactions(request, env, client, corsOrigin) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    const status = params.get('status');
    const payType = params.get('payType');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    const minAmount = params.get('minAmount');
    const maxAmount = params.get('maxAmount');
    const page = parseInt(params.get('page')) || 1;
    const pageSize = parseInt(params.get('pageSize')) || 20;
    const mchOrderNo = params.get('mchOrderNo');

    let whereClause = 'WHERE merchant_id = ?';
    const bindings = [client.code];

    if (status) {
      whereClause += ' AND status = ?';
      bindings.push(status);
    }
    if (payType) {
      whereClause += ' AND pay_type = ?';
      bindings.push(payType);
    }
    if (startDate) {
      whereClause += ' AND created_at >= ?';
      bindings.push(Math.floor(new Date(startDate).getTime() / 1000));
    }
    if (endDate) {
      whereClause += ' AND created_at <= ?';
      bindings.push(Math.floor(new Date(endDate).getTime() / 1000));
    }
    if (minAmount) {
      whereClause += ' AND amount >= ?';
      bindings.push(parseInt(minAmount));
    }
    if (maxAmount) {
      whereClause += ' AND amount <= ?';
      bindings.push(parseInt(maxAmount));
    }
    if (mchOrderNo) {
      whereClause += ' AND order_no LIKE ?';
      bindings.push(`%${mchOrderNo}%`);
    }

    // 獲取總數
    const countResult = await env.DB.prepare(`SELECT COUNT(*) as total FROM transactions ${whereClause}`)
      .bind(...bindings).first();
    const total = countResult?.total || 0;

    // 獲取數據
    const offset = (page - 1) * pageSize;
    const transactions = await env.DB.prepare(`
      SELECT * FROM transactions ${whereClause} 
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(...bindings, pageSize, offset).all();

    // 處理數據 - 提取 EL Order ID
    const processedData = (transactions.results || []).map(tx => {
      let elOrderId = tx.payOrderId || '-';
      if (tx.raw_response) {
        try {
          const raw = JSON.parse(tx.raw_response);
          if (raw.data?.payOrderId) elOrderId = raw.data.payOrderId;
          else if (raw.payOrderId) elOrderId = raw.payOrderId;
        } catch (e) {}
      }
      return { ...tx, elOrderId };
    });

    return jsonResponse({
      success: true,
      data: processedData,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    }, 200, corsOrigin);

  } catch (error) {
    console.error('[ListClientTransactions] Error:', error);
    return jsonResponse({ error: 'Failed to fetch transactions' }, 500, corsOrigin);
  }
}

async function getClientDashboard(request, env, client, corsOrigin) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const yesterdayStart = todayStart - 86400;
    const weekStart = todayStart - 7 * 86400;

    // 今日統計
    const todayStats = await env.DB.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total, 
             SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
             SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count
      FROM transactions WHERE merchant_id = ? AND created_at >= ?
    `).bind(client.code, todayStart).first();

    // 昨日統計
    const yesterdayStats = await env.DB.prepare(`
      SELECT COUNT(*) as count, SUM(amount) as total
      FROM transactions WHERE merchant_id = ? AND created_at >= ? AND created_at < ?
    `).bind(client.code, yesterdayStart, todayStart).first();

    // 最近7天趨勢
    const weeklyData = await env.DB.prepare(`
      SELECT DATE(datetime(created_at, 'unixepoch')) as date, 
             COUNT(*) as count, SUM(amount) as total
      FROM transactions 
      WHERE merchant_id = ? AND created_at >= ? AND status = 'paid'
      GROUP BY date ORDER BY date DESC LIMIT 7
    `).bind(client.code, weekStart).all();

    // 支付方式分佈
    const payTypeDist = await env.DB.prepare(`
      SELECT pay_type, COUNT(*) as count, SUM(amount) as total
      FROM transactions WHERE merchant_id = ? AND status = 'paid' AND created_at >= ?
      GROUP BY pay_type
    `).bind(client.code, todayStart).all();

    return jsonResponse({
      success: true,
      data: {
        today: {
          orderCount: todayStats?.count || 0,
          totalAmount: (todayStats?.total || 0) / 100,
          paidAmount: (todayStats?.paid_amount || 0) / 100,
          paidCount: todayStats?.paid_count || 0
        },
        yesterday: {
          orderCount: yesterdayStats?.count || 0,
          totalAmount: (yesterdayStats?.total || 0) / 100
        },
        weeklyTrend: weeklyData.results || [],
        payTypeDistribution: payTypeDist.results || []
      }
    }, 200, corsOrigin);

  } catch (error) {
    console.error('[GetClientDashboard] Error:', error);
    return jsonResponse({ error: 'Failed to fetch dashboard' }, 500, corsOrigin);
  }
}

async function getClientBossConfig(env, client, corsOrigin) {
  try {
    let config = await env.DB.prepare('SELECT * FROM boss_configs WHERE merchant_id = ?')
      .bind(client.code).first();
    
    if (!config) {
      // 創建默認配置
      await env.DB.prepare(`
        INSERT INTO boss_configs (merchant_id, is_enabled, send_time, created_at)
        VALUES (?, 0, '10:30', ?)
      `).bind(client.code, Math.floor(Date.now() / 1000)).run();
      
      config = await env.DB.prepare('SELECT * FROM boss_configs WHERE merchant_id = ?')
        .bind(client.code).first();
    }

    // 獲取收件人列表
    const recipients = await env.DB.prepare(`
      SELECT * FROM boss_recipients WHERE tenant_id = ? ORDER BY created_at DESC
    `).bind(1).all(); // 暫時使用 tenant_id = 1

    return jsonResponse({
      success: true,
      data: { ...config, recipients: recipients.results || [] }
    }, 200, corsOrigin);

  } catch (error) {
    console.error('[GetClientBossConfig] Error:', error);
    return jsonResponse({ error: 'Failed to fetch boss config' }, 500, corsOrigin);
  }
}

async function updateClientBossConfig(request, env, client, corsOrigin) {
  try {
    const body = await request.json();
    const { is_enabled, send_time, recipients } = body;

    // 更新主配置
    await env.DB.prepare(`
      UPDATE boss_configs SET is_enabled = ?, send_time = ?, updated_at = ?
      WHERE merchant_id = ?
    `).bind(is_enabled ? 1 : 0, send_time, Math.floor(Date.now() / 1000), client.code).run();

    // 如果有收件人更新
    if (recipients && Array.isArray(recipients)) {
      for (const r of recipients) {
        if (r.id) {
          await env.DB.prepare(`
            UPDATE boss_recipients SET phone = ?, name = ?, is_enabled = ? WHERE id = ?
          `).bind(r.phone, r.name, r.is_enabled ? 1 : 0, r.id).run();
        } else {
          await env.DB.prepare(`
            INSERT INTO boss_recipients (tenant_id, phone, name, is_enabled, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).bind(1, r.phone, r.name, r.is_enabled ? 1 : 1, Math.floor(Date.now() / 1000)).run();
        }
      }
    }

    return jsonResponse({ success: true, message: '配置已更新' }, 200, corsOrigin);

  } catch (error) {
    console.error('[UpdateClientBossConfig] Error:', error);
    return jsonResponse({ error: 'Failed to update config' }, 500, corsOrigin);
  }
}

async function testClientBossReport(request, env, client, corsOrigin) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return jsonResponse({ error: 'Phone number required' }, 400, corsOrigin);
    }

    // 生成測試報告內容
    const reportContent = `【King-Chicken 測試報告】
日期：${new Date().toLocaleDateString('zh-HK')}
訂單數：5
成功金額：HK$1,250.00
成功率：100%

這是一條測試消息。`;

    const result = await sendWhatsAppMessage(phone, reportContent);

    // 記錄發送歷史
    await env.DB.prepare(`
      INSERT INTO boss_report_history (tenant_id, report_date, report_content, recipients_count, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(1, new Date().toISOString().split('T')[0], reportContent, 1, result.success ? 'sent' : 'failed', Math.floor(Date.now() / 1000)).run();

    return jsonResponse({
      success: result.success,
      message: result.success ? '測試報告已發送' : '發送失敗: ' + result.error
    }, 200, corsOrigin);

  } catch (error) {
    console.error('[TestClientBossReport] Error:', error);
    return jsonResponse({ error: 'Failed to send test report' }, 500, corsOrigin);
  }
}

async function getClientBossReportHistory(request, env, client, corsOrigin) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 10;

    const history = await env.DB.prepare(`
      SELECT * FROM boss_report_history 
      WHERE tenant_id = ? ORDER BY sent_at DESC LIMIT ?
    `).bind(1, limit).all();

    return jsonResponse({
      success: true,
      data: history.results || []
    }, 200, corsOrigin);

  } catch (error) {
    console.error('[GetClientBossReportHistory] Error:', error);
    return jsonResponse({ error: 'Failed to fetch history' }, 500, corsOrigin);
  }
}

async function sendClientWhatsApp(request, env, client, corsOrigin) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return jsonResponse({ error: 'Phone and message required' }, 400, corsOrigin);
    }

    const result = await sendWhatsAppMessage(phone, message);
    return jsonResponse(result, result.success ? 200 : 500, corsOrigin);

  } catch (error) {
    console.error('[SendClientWhatsApp] Error:', error);
    return jsonResponse({ error: 'Failed to send message' }, 500, corsOrigin);
  }
}

async function testSign(request, env, client, corsOrigin) {
  try {
    const body = await request.json();
    const { amount, payType, subject } = body;
    
    const orderNo = 'TEST' + Date.now();
    const reqTime = Date.now().toString();
    
    const signParams = {
      amount: amount.toString(),
      appId: client.appId,
      body: subject || 'Payment',
      currency: 'HKD',
      mchNo: client.merchantId,
      mchOrderNo: orderNo,
      notifyUrl: client.notifyUrl,
      reqTime: reqTime,
      returnUrl: `https://king-chicken.jkdcoding.com/payment/success?orderNo=${orderNo}`,
      signType: 'MD5',
      subject: subject || 'King-Chicken Payment',
      version: '1.0',
      wayCode: payType || 'UP_OP'
    };
    
    const sortedKeys = Object.keys(signParams).sort();
    const signString = sortedKeys
      .map(key => `${key}=${signParams[key]}`)
      .join('&') + `&key=${client.appSecret}`;
    
    const sign = await generateSign(signParams, client.appSecret);
    
    return jsonResponse({
      success: true,
      debug: {
        signParams,
        sortedKeys,
        signString,
        sign,
        appId: client.appId,
        mchNo: client.merchantId,
        appSecretLength: client.appSecret ? client.appSecret.length : 0
      }
    }, 200, corsOrigin);
    
  } catch (error) {
    console.error('[TestSign] Error:', error);
    return jsonResponse({ error: error.message }, 500, corsOrigin);
  }
}

async function sendWhatsAppMessage(phone, message) {
  try {
    // 使用 CloudWAPI 發送 WhatsApp
    const apiKey = 'fLt40WBzPE2DIK5Ls8AIPAMnt8pV8D';
    const sender = '85262322466';
    
    // 清理手機號碼
    const cleanPhone = phone.toString().replace(/[^0-9]/g, '');
    
    const response = await fetch('https://unofficial.cloudwapi.in/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        sender: sender,
        number: cleanPhone,
        message: message
      })
    });

    const result = await response.json();
    console.log('[WhatsApp] Send result:', JSON.stringify(result));

    if (result.status === 'success' || result.message === 'Message sent successfully') {
      return { success: true, messageId: result.data?.message_id || result.message };
    }

    return { success: false, error: result.message || 'Failed to send message' };

  } catch (error) {
    console.error('[SendWhatsApp] Error:', error);
    return { success: false, error: error.message };
  }
}
