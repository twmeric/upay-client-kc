-- EasyLink Payment Platform v2 - 數據庫設置腳本
-- 在 Cloudflare Dashboard > D1 > easylink-db-v2 > Console 中執行

-- 1. 創建商戶表
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    easylink_mch_no TEXT NOT NULL,
    easylink_app_id TEXT NOT NULL,
    easylink_app_secret TEXT NOT NULL,
    config TEXT,
    admin_username TEXT NOT NULL,
    admin_password TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 2. 創建交易表
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    order_no TEXT NOT NULL UNIQUE,
    pay_order_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'HKD',
    pay_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    remark TEXT DEFAULT '',
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- 3. 創建退款表
CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    refund_no TEXT NOT NULL UNIQUE,
    order_no TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    easylink_refund_id TEXT,
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- 4. 創建報告收件人表
CREATE TABLE IF NOT EXISTS report_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- 5. 創建報告歷史表
CREATE TABLE IF NOT EXISTS report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    report_date TEXT NOT NULL,
    recipients TEXT NOT NULL,
    report_content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at INTEGER NOT NULL,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- 6. 創建索引
CREATE INDEX IF NOT EXISTS idx_merchants_code ON merchants(code);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_no ON transactions(order_no);
CREATE INDEX IF NOT EXISTS idx_transactions_pay_order_id ON transactions(pay_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_refunds_merchant_id ON refunds(merchant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_no ON refunds(order_no);

-- 7. 插入 King-Chicken 商戶（請替換 YOUR_APP_ID 和 YOUR_APP_SECRET）
INSERT OR IGNORE INTO merchants (
    code, name, status,
    easylink_mch_no, easylink_app_id, easylink_app_secret,
    config, admin_username, admin_password,
    created_at, updated_at
) VALUES (
    'KC',
    'King-Chicken',
    'active',
    '30104',
    'YOUR_APP_ID_HERE',
    'YOUR_APP_SECRET_HERE',
    '{"theme":"orange","currency":"HKD","logo":"🐔"}',
    'mimichu',
    'mimichu123',
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- 8. 插入默認報告收件人
INSERT OR IGNORE INTO report_recipients (merchant_id, name, phone, enabled, created_at)
SELECT id, '咪咪姐', '85298113210', 1, strftime('%s', 'now') FROM merchants WHERE code = 'KC';

INSERT OR IGNORE INTO report_recipients (merchant_id, name, phone, enabled, created_at)
SELECT id, 'Michelle', '85292404878', 1, strftime('%s', 'now') FROM merchants WHERE code = 'KC';

INSERT OR IGNORE INTO report_recipients (merchant_id, name, phone, enabled, created_at)
SELECT id, 'Eric Tsang', '85251164453', 1, strftime('%s', 'now') FROM merchants WHERE code = 'KC';

-- 9. 驗證數據
SELECT 'Merchants:' as table_name, COUNT(*) as count FROM merchants
UNION ALL
SELECT 'Report Recipients:', COUNT(*) FROM report_recipients;
