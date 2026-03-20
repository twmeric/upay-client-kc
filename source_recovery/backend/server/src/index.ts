import { Hono } from "hono";
import type { Client } from "@sdk/server-types";
import { tables, buckets } from "@generated";
import { eq, and, gte, lte, desc, count, sql } from "drizzle-orm";

// ══════════════════════════════════════════════════════════
// EasyLink Payment Gateway Integration
// Test: https://ts-api-pay.gnete.com.hk
// Prod: https://api-pay.gnete.com.hk
// ══════════════════════════════════════════════════════════

// Test environment (merchant account is registered on test environment)
const EASYLINK_BASE_URL = "https://ts-api-pay.gnete.com.hk";

// MD5 signature helper
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Build EasyLink sign string per official docs:
// https://ts-api-pay.gnete.com.hk/guide/rule/InterfaceRule.html
// 1. Filter out ONLY "sign" parameter and empty values
//    (signType DOES participate in signing per official docs)
// 2. Sort remaining params by ASCII key name
// 3. Concat key=value pairs with &
// 4. Append &key=appSecret
function buildSignString(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .filter((k) => {
      const v = params[k];
      // Per official docs: only "sign" is excluded from signing
      return v !== "" && v !== undefined && v !== null && k !== "sign";
    })
    .sort();
  const signStr = sorted.map((k) => `${k}=${params[k]}`).join("&");
  return signStr + `&key=${secret}`;
}

async function generateSign(params: Record<string, string>, secret: string): Promise<string> {
  const signStr = buildSignString(params, secret);
  console.log("[Payment] Sign string (for debug):", signStr.replace(/&key=.*$/, "&key=***"));
  const hash = await md5(signStr);
  console.log("[Payment] MD5 hash result:", hash.toUpperCase());
  return hash.toUpperCase();
}

// Generate unique order number
function generateOrderNo(): string {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0") +
    now.getHours().toString().padStart(2, "0") +
    now.getMinutes().toString().padStart(2, "0") +
    now.getSeconds().toString().padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `ORD${ts}${rand}`;
}

export async function createApp(
  edgespark: Client<typeof tables>
): Promise<Hono> {
  const app = new Hono();

  // ═══════════════════════════════════════════════════════════
  // PUBLIC: Create payment order
  // ═══════════════════════════════════════════════════════════
  app.post("/api/public/payment/create", async (c) => {
    try {
      const { amount, payType, subject, body: orderBody, returnUrl } = await c.req.json();

      if (!amount || amount <= 0) {
        return c.json({ error: "Invalid amount" }, 400);
      }

      const mchNo = edgespark.secret.get("EASYLINK_MCH_NO");
      const appId = edgespark.secret.get("EASYLINK_APP_ID");
      const appSecret = edgespark.secret.get("EASYLINK_APP_SECRET");

      if (!mchNo || !appId || !appSecret) {
        console.error("[Payment] Missing EasyLink secrets");
        return c.json({ error: "Payment service not configured" }, 500);
      }

      const orderNo = generateOrderNo();
      const amountInCents = Math.round(amount * 100);

      // Determine worker URL for notify
      const requestUrl = new URL(c.req.url);
      const workerBaseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      const notifyUrl = `${workerBaseUrl}/api/webhooks/easylink/notify`;

      // Build EasyLink request params (per official API docs)
      const wayCode = payType || "UP_OP";
      // Use simple ASCII-only text to avoid encoding issues in signature
      const finalSubject = subject || "Payment";
      const finalBody = orderBody || "Payment";
      const finalReturnUrl = returnUrl || `${requestUrl.protocol}//${requestUrl.host}/payment/result?orderNo=${orderNo}`;
      // reqTime must be 13-digit millisecond timestamp per docs
      const reqTime = Date.now().toString();

      // All params as strings for signature calculation
      const signParams: Record<string, string> = {
        mchNo,
        appId,
        mchOrderNo: orderNo,
        wayCode,
        amount: amountInCents.toString(),
        currency: "HKD",
        subject: finalSubject,
        body: finalBody,
        notifyUrl,
        returnUrl: finalReturnUrl,
        reqTime,
        version: "1.0",
        signType: "MD5",
      };

      // Generate sign (only "sign" itself is excluded per official docs)
      const sign = await generateSign(signParams, appSecret);

      // Build request body - match exact types per API spec
      // amount: int, reqTime: long (number), rest: strings
      const requestBody: Record<string, any> = {
        mchNo,
        appId,
        mchOrderNo: orderNo,
        wayCode,
        amount: amountInCents,  // int type per API docs
        currency: "HKD",
        subject: finalSubject,
        body: finalBody,
        notifyUrl,
        returnUrl: finalReturnUrl,
        reqTime: parseInt(reqTime, 10),  // long type per API docs
        version: "1.0",
        signType: "MD5",
        sign,
      };

      console.log("[Payment] Creating order:", { orderNo, amount: amountInCents, wayCode, env: "TEST" });
      console.log("[Payment] API URL:", `${EASYLINK_BASE_URL}/api/pay/unifiedOrder`);
      console.log("[Payment] Request body:", JSON.stringify(requestBody));
      console.log("[Payment] Sign params keys:", Object.keys(signParams).sort().join(", "));

      // Call EasyLink API
      const response = await fetch(`${EASYLINK_BASE_URL}/api/pay/unifiedOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json() as Record<string, any>;
      console.log("[Payment] EasyLink response:", JSON.stringify(result));

      // Save transaction to DB
      await edgespark.db.insert(tables.transactions).values({
        orderNo,
        mchOrderNo: orderNo,
        mchNo,
        amount: amountInCents,
        currency: "HKD",
        payType: wayCode,
        subject: finalSubject,
        body: finalBody,
        status: result.code === 0 ? 1 : 0,
        notifyUrl,
        returnUrl: finalReturnUrl,
        rawResponse: JSON.stringify(result),
        customerIp: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "",
      });

      if (result.code === 0) {
        // payData contains the payment URL/data based on payDataType
        const payData = result.data?.payData;
        const payDataType = result.data?.payDataType;
        console.log("[Payment] Success - payDataType:", payDataType, "payData:", payData);
        return c.json({
          success: true,
          orderNo,
          payUrl: payData,
          payDataType,
          data: result.data,
        });
      } else {
        console.error("[Payment] EasyLink error:", result.code, result.msg);
        return c.json({
          success: false,
          orderNo,
          error: result.msg || "Payment creation failed",
          data: result,
        }, 400);
      }
    } catch (error: any) {
      console.error("[Payment] Create order error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // PUBLIC: Query order status
  // ═══════════════════════════════════════════════════════════
  app.get("/api/public/payment/query/:orderNo", async (c) => {
    try {
      const orderNo = c.req.param("orderNo");
      const txns = await edgespark.db
        .select()
        .from(tables.transactions)
        .where(eq(tables.transactions.orderNo, orderNo))
        .limit(1);

      if (txns.length === 0) {
        return c.json({ error: "Order not found" }, 404);
      }

      const txn = txns[0];

      // Also query EasyLink for latest status
      const mchNo = edgespark.secret.get("EASYLINK_MCH_NO");
      const appId = edgespark.secret.get("EASYLINK_APP_ID");
      const appSecret = edgespark.secret.get("EASYLINK_APP_SECRET");

      if (mchNo && appId && appSecret) {
        const params: Record<string, string> = {
          mchNo,
          appId,
          mchOrderNo: orderNo,
          reqTime: Date.now().toString(),
          version: "1.0",
          signType: "MD5",
        };
        const sign = await generateSign(params, appSecret);
        params.sign = sign;

        try {
          const response = await fetch(`${EASYLINK_BASE_URL}/api/pay/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params),
          });
          const result = await response.json() as Record<string, any>;

          if (result.code === 0 && result.data) {
            const newStatus = parseInt(result.data.state || "0");
            if (newStatus !== txn.status) {
              await edgespark.db
                .update(tables.transactions)
                .set({
                  status: newStatus,
                  updatedAt: Math.floor(Date.now() / 1000),
                  paidAt: newStatus === 2 ? Math.floor(Date.now() / 1000) : txn.paidAt,
                  rawResponse: JSON.stringify(result),
                })
                .where(eq(tables.transactions.id, txn.id));
              txn.status = newStatus;
            }
          }
        } catch (e) {
          console.warn("[Payment] Query EasyLink failed:", e);
        }
      }

      return c.json({
        orderNo: txn.orderNo,
        amount: txn.amount,
        currency: txn.currency,
        status: txn.status,
        statusText: getStatusText(txn.status),
        payType: txn.payType,
        createdAt: txn.createdAt,
        paidAt: txn.paidAt,
      });
    } catch (error: any) {
      console.error("[Payment] Query error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // WEBHOOK: EasyLink payment notification
  // ═══════════════════════════════════════════════════════════
  app.post("/api/webhooks/easylink/notify", async (c) => {
    try {
      // EasyLink sends notification as application/x-www-form-urlencoded
      let data: Record<string, any>;
      const contentType = c.req.header("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await c.req.parseBody();
        data = formData as Record<string, any>;
      } else {
        data = await c.req.json() as Record<string, any>;
      }
      console.log("[Webhook] EasyLink notification:", JSON.stringify(data));

      const appSecret = edgespark.secret.get("EASYLINK_APP_SECRET");
      if (!appSecret) {
        console.error("[Webhook] Missing EASYLINK_APP_SECRET");
        return c.text("fail");
      }

      // Verify signature (exclude only "sign" per EasyLink docs)
      const receivedSign = data.sign;
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        if (k !== "sign" && v !== undefined && v !== null && v !== "") {
          params[k] = String(v);
        }
      }
      const expectedSign = await generateSign(params, appSecret);

      if (receivedSign !== expectedSign) {
        console.error("[Webhook] Sign verification failed:", { received: receivedSign, expected: expectedSign });
        return c.text("fail");
      }

      // Update transaction (use field names from EasyLink notification docs)
      const mchOrderNo = data.mchOrderNo;
      if (mchOrderNo) {
        const newStatus = parseInt(data.state || "0");
        await edgespark.db
          .update(tables.transactions)
          .set({
            status: newStatus,
            updatedAt: Math.floor(Date.now() / 1000),
            paidAt: newStatus === 2 ? Math.floor(Date.now() / 1000) : null,
            rawResponse: JSON.stringify(data),
            payType: data.wayCode || undefined,
            payerInfo: data.payerInfo || data.openId || undefined,
          })
          .where(eq(tables.transactions.orderNo, mchOrderNo));
        console.log("[Webhook] Updated order:", mchOrderNo, "status:", newStatus);
      }

      return c.text("success");
    } catch (error: any) {
      console.error("[Webhook] Error:", error.message);
      return c.text("fail");
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN: Transaction list (with filters)
  // ═══════════════════════════════════════════════════════════
  app.get("/api/transactions", async (c) => {
    try {
      const page = parseInt(c.req.query("page") || "1");
      const limit = parseInt(c.req.query("limit") || "20");
      const offset = (page - 1) * limit;
      const status = c.req.query("status");
      const mchNo = c.req.query("mchNo");
      const dateFrom = c.req.query("dateFrom");
      const dateTo = c.req.query("dateTo");

      const conditions = [];
      if (status !== undefined && status !== "" && status !== "all") {
        conditions.push(eq(tables.transactions.status, parseInt(status)));
      }
      if (mchNo) {
        conditions.push(eq(tables.transactions.mchNo, mchNo));
      }
      if (dateFrom) {
        conditions.push(gte(tables.transactions.createdAt, Math.floor(new Date(dateFrom).getTime() / 1000)));
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59);
        conditions.push(lte(tables.transactions.createdAt, Math.floor(endDate.getTime() / 1000)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [txns, totalResult] = await Promise.all([
        edgespark.db
          .select()
          .from(tables.transactions)
          .where(whereClause)
          .orderBy(desc(tables.transactions.createdAt))
          .limit(limit)
          .offset(offset),
        edgespark.db
          .select({ count: count() })
          .from(tables.transactions)
          .where(whereClause),
      ]);

      return c.json({
        data: txns,
        total: totalResult[0]?.count || 0,
        page,
        limit,
      });
    } catch (error: any) {
      console.error("[Admin] List transactions error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN: Dashboard stats (today's summary + chart data)
  // ═══════════════════════════════════════════════════════════
  app.get("/api/dashboard/stats", async (c) => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStartUnix = Math.floor(todayStart.getTime() / 1000);

      // Today's summary
      const todayTxns = await edgespark.db
        .select()
        .from(tables.transactions)
        .where(gte(tables.transactions.createdAt, todayStartUnix));

      const todayTotal = todayTxns.reduce((sum, t) => sum + (t.status === 2 ? t.amount : 0), 0);
      const todayCount = todayTxns.length;
      const todaySuccessCount = todayTxns.filter((t) => t.status === 2).length;

      // Last 7 days chart data
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

        const dayTxns = await edgespark.db
          .select()
          .from(tables.transactions)
          .where(
            and(
              gte(tables.transactions.createdAt, Math.floor(dayStart.getTime() / 1000)),
              lte(tables.transactions.createdAt, Math.floor(dayEnd.getTime() / 1000))
            )
          );

        const dayAmount = dayTxns.reduce((sum, t) => sum + (t.status === 2 ? t.amount : 0), 0);
        days.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          amount: dayAmount,
          count: dayTxns.length,
          successCount: dayTxns.filter((t) => t.status === 2).length,
        });
      }

      return c.json({
        today: {
          totalAmount: todayTotal,
          orderCount: todayCount,
          successCount: todaySuccessCount,
        },
        chart: days,
      });
    } catch (error: any) {
      console.error("[Admin] Dashboard stats error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN: Export reconciliation CSV
  // ═══════════════════════════════════════════════════════════
  app.get("/api/transactions/export", async (c) => {
    try {
      const dateFrom = c.req.query("dateFrom");
      const dateTo = c.req.query("dateTo");
      const mchNo = c.req.query("mchNo");

      const conditions = [];
      if (dateFrom) {
        conditions.push(gte(tables.transactions.createdAt, Math.floor(new Date(dateFrom).getTime() / 1000)));
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59);
        conditions.push(lte(tables.transactions.createdAt, Math.floor(endDate.getTime() / 1000)));
      }
      if (mchNo) {
        conditions.push(eq(tables.transactions.mchNo, mchNo));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const txns = await edgespark.db
        .select()
        .from(tables.transactions)
        .where(whereClause)
        .orderBy(desc(tables.transactions.createdAt));

      // Build CSV
      const headers = ["訂單號", "商戶號", "金額(HKD)", "支付方式", "狀態", "建立時間", "支付時間"];
      const rows = txns.map((t) => [
        t.orderNo,
        t.mchNo,
        (t.amount / 100).toFixed(2),
        t.payType || "",
        getStatusText(t.status),
        new Date(t.createdAt * 1000).toISOString(),
        t.paidAt ? new Date(t.paidAt * 1000).toISOString() : "",
      ]);

      const csv = "\uFEFF" + [headers, ...rows].map((r) => r.join(",")).join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=reconciliation_${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    } catch (error: any) {
      console.error("[Admin] Export error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN: Merchant list
  // ═══════════════════════════════════════════════════════════
  app.get("/api/merchants", async (c) => {
    const merchants = await edgespark.db.select().from(tables.merchants);
    return c.json({ data: merchants });
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN: Update merchant permissions
  // ═══════════════════════════════════════════════════════════
  app.put("/api/merchants/:id", async (c) => {
    try {
      const id = parseInt(c.req.param("id"));
      const data = await c.req.json();

      await edgespark.db
        .update(tables.merchants)
        .set({
          isActive: data.isActive !== undefined ? data.isActive : undefined,
          canSettle: data.canSettle !== undefined ? data.canSettle : undefined,
          settlementRate: data.settlementRate !== undefined ? data.settlementRate : undefined,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(tables.merchants.id, id));

      return c.json({ success: true });
    } catch (error: any) {
      console.error("[Admin] Update merchant error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ADMIN: Add merchant
  // ═══════════════════════════════════════════════════════════
  app.post("/api/merchants", async (c) => {
    try {
      const data = await c.req.json();
      if (!data.mchNo || !data.name) {
        return c.json({ error: "mchNo and name required" }, 400);
      }

      const merchant = await edgespark.db
        .insert(tables.merchants)
        .values({
          mchNo: data.mchNo,
          name: data.name,
          isActive: data.isActive ?? 1,
          canSettle: data.canSettle ?? 1,
          settlementRate: data.settlementRate ?? 100,
        })
        .returning();

      return c.json({ data: merchant[0] }, 201);
    } catch (error: any) {
      console.error("[Admin] Add merchant error:", error.message);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return app;
}

// Status text helper
function getStatusText(status: number): string {
  const map: Record<number, string> = {
    0: "訂單生成",
    1: "支付中",
    2: "支付成功",
    3: "支付失敗",
    4: "已撤銷",
    5: "已退款",
    6: "訂單關閉",
  };
  return map[status] || "未知";
}
