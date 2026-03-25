-- King-Chicken Payment System v2 - SaaS 多租戶數據庫 Schema

-- ============================================
-- 1. 商戶表 (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,              -- 商戶代碼: KC, CLIENT2, CLIENT3...
    name TEXT NOT NULL,                      -- 商戶名稱
    status TEXT DEFAULT 'active',            -- active/suspended/deleted
    
    -- EasyLink 配置
    easylink_mch_no TEXT NOT NULL,           -- EasyLink 商戶號
    easylink_app_id TEXT NOT NULL,           -- EasyLink App ID
    easylink_app_secret TEXT NOT NULL,       -- EasyLink App Secret
    
    -- 自定義配置 (JSON)
    config TEXT,                             -- {"theme": "orange", "logo": "..."}
    
    -- 管理員登入
    admin_username TEXT NOT NULL,
    admin_password TEXT NOT NULL,            -- bcrypt hash
    
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- ============================================
-- 2. 交易記錄表 (Transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,            -- 關聯商戶
    order_no TEXT NOT NULL,                  -- 商家訂單號
    pay_order_id TEXT,                       -- EasyLink 支付訂單號 (P開頭)
    amount INTEGER NOT NULL,                 -- 金額 (分為單位)
    currency TEXT DEFAULT 'HKD',
    pay_type TEXT NOT NULL,                  -- UP_OP/ALI_H5/WX_H5
    status TEXT DEFAULT 'pending',           -- pending/success/failed/paid
    remark TEXT DEFAULT '',
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- ============================================
-- 3. 報告收件人 (Report Recipients)
-- ============================================
CREATE TABLE IF NOT EXISTS report_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- ============================================
-- 4. 報告發送歷史
-- ============================================
CREATE TABLE IF NOT EXISTS report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    report_date TEXT NOT NULL,
    recipients TEXT NOT NULL,                -- JSON array
    report_content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at INTEGER NOT NULL,
    
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- ============================================
-- 5. API 調用日誌 (可選，用於審計)
-- ============================================
CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    request_body TEXT,
    response_status INTEGER,
    created_at INTEGER NOT NULL
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_merchants_code ON merchants(code);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_no ON transactions(order_no);
CREATE INDEX IF NOT EXISTS idx_transactions_pay_order_id ON transactions(pay_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ============================================
-- 插入 King-Chicken 作為默認商戶
-- ============================================
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
    '',  -- 部署時填入
    '',  -- 部署時填入
    '{"theme":"orange","currency":"HKD"}',
    'mimichu',
    '$2b$10$YourHashedPasswordHere',  -- bcrypt hash of "mimichu123"
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- 插入默認報告收件人
INSERT OR IGNORE INTO report_recipients (merchant_id, name, phone, enabled, created_at)
SELECT 
    id, '咪咪姐', '85298113210', 1, strftime('%s', 'now')
FROM merchants WHERE code = 'KC';

INSERT OR IGNORE INTO report_recipients (merchant_id, name, phone, enabled, created_at)
SELECT 
    id, 'Michelle', '85292404878', 1, strftime('%s', 'now')
FROM merchants WHERE code = 'KC';

INSERT OR IGNORE INTO report_recipients (merchant_id, name, phone, enabled, created_at)
SELECT 
    id, 'Eric Tsang', '85251164453', 1, strftime('%s', 'now')
FROM merchants WHERE code = 'KC';
