-- Upgrade to v2.0: Add multi-merchant platform columns

-- 添加新列到 merchants 表
ALTER TABLE merchants ADD COLUMN merchant_no TEXT;
ALTER TABLE merchants ADD COLUMN api_key TEXT;
ALTER TABLE merchants ADD COLUMN api_secret TEXT;
ALTER TABLE merchants ADD COLUMN easylink_app_id TEXT;
ALTER TABLE merchants ADD COLUMN easylink_app_secret TEXT;
ALTER TABLE merchants ADD COLUMN default_return_url TEXT;
ALTER TABLE merchants ADD COLUMN webhook_secret TEXT;
ALTER TABLE merchants ADD COLUMN contact_name TEXT;
ALTER TABLE merchants ADD COLUMN contact_email TEXT;
ALTER TABLE merchants ADD COLUMN contact_phone TEXT;
ALTER TABLE merchants ADD COLUMN settings TEXT;

-- 創建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_api_key ON merchants(api_key);

-- 更新現有數據
UPDATE merchants SET 
    merchant_no = mchNo,
    api_key = 'pk_live_' || lower(hex(randomblob(16))),
    api_secret = 'sk_live_' || lower(hex(randomblob(16))),
    status = CASE WHEN isActive = 1 THEN 1 ELSE 0 END
WHERE merchant_no IS NULL;

-- 創建 payments 表
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    merchant_id INTEGER NOT NULL,
    merchant_order_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'HKD',
    pay_type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    return_url TEXT,
    notify_url TEXT,
    customer_info TEXT,
    metadata TEXT,
    easylink_response TEXT,
    paid_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_order ON payments(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 創建 refunds 表
CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    merchant_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    easylink_response TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 創建 webhook_logs 表
CREATE TABLE IF NOT EXISTS webhook_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT NOT NULL,
    merchant_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    payload TEXT,
    response_status INTEGER,
    response_body TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 創建 admins 表
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    last_login_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 插入默認管理員（密碼需要通過 bcrypt 生成）
INSERT OR IGNORE INTO admins (username, password_hash, role) 
VALUES ('admin', '$2a$10$YourBcryptHashHere', 'superadmin');
