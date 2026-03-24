-- Payment Gateway v2.0 - Multi-Merchant Platform Schema
-- 多商戶統一支付平台數據庫結構

-- 商戶表
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_no TEXT NOT NULL UNIQUE,           -- 商戶編號 (如: KC0001)
    name TEXT NOT NULL,                         -- 商戶名稱
    contact_name TEXT,                          -- 聯繫人
    contact_email TEXT,                         -- 聯繫郵箱
    contact_phone TEXT,                         -- 聯繫電話
    api_key TEXT NOT NULL UNIQUE,               -- API Key (pk_live_xxx)
    api_secret TEXT NOT NULL,                   -- API Secret (sk_live_xxx)
    easylink_mch_no TEXT,                       -- EasyLink 商戶號
    easylink_app_id TEXT,                       -- EasyLink App ID
    easylink_app_secret TEXT,                   -- EasyLink App Secret
    default_return_url TEXT,                    -- 默認支付返回地址
    webhook_secret TEXT,                        -- Webhook 簽名密鑰
    status INTEGER DEFAULT 1,                   -- 0=停用, 1=啟用, 2=審核中
    settings TEXT,                              -- JSON 配置
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 支付記錄表
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,                        -- 支付ID (PAYxxxxxx)
    merchant_id INTEGER NOT NULL,               -- 關聯商戶ID
    merchant_order_id TEXT NOT NULL,            -- 商戶訂單號
    amount INTEGER NOT NULL,                    -- 金額（分）
    currency TEXT DEFAULT 'HKD',                -- 貨幣
    pay_type TEXT NOT NULL,                     -- 支付方式
    status TEXT NOT NULL,                       -- created/pending/completed/failed/refunded
    description TEXT,                           -- 描述
    return_url TEXT,                            -- 返回地址
    notify_url TEXT,                            -- 通知地址
    customer_info TEXT,                         -- 客戶信息 (JSON)
    metadata TEXT,                              -- 元數據 (JSON)
    easylink_response TEXT,                     -- EasyLink 響應
    paid_at INTEGER,                            -- 支付時間
    created_at INTEGER NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- 退款記錄表
CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    merchant_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    easylink_response TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Webhook 發送記錄
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

-- 系統管理員表
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,                -- bcrypt hash
    role TEXT DEFAULT 'admin',                  -- admin/superadmin
    last_login_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 系統配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_merchants_api_key ON merchants(api_key);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_order ON payments(merchant_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment ON webhook_logs(payment_id);

-- 插入默認管理員 (密碼: admin123，生產環境需要修改)
INSERT OR IGNORE INTO admins (username, password_hash, role) 
VALUES ('admin', '$2y$10$YourBcryptHashHere', 'superadmin');

-- 插入示例商戶（測試用）
INSERT OR IGNORE INTO merchants (
    merchant_no, name, api_key, api_secret, 
    status, created_at
) VALUES (
    'KC0001', 
    '示例商戶', 
    'pk_live_example_api_key_12345',
    'sk_live_example_secret_key_67890',
    1,
    strftime('%s', 'now')
);

-- 插入系統配置
INSERT OR IGNORE INTO system_config (key, value) VALUES 
    ('version', '2.0'),
    ('platform_name', 'King-Chicken Payment'),
    ('api_version', 'v1');
