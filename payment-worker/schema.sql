-- D1 Database Schema for Payment Gateway

-- 交易記錄表
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    mch_order_no TEXT,
    merchant_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'HKD',
    pay_type TEXT,
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'pending',
    pay_order_id TEXT,
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER DEFAULT 0,
    paid_at INTEGER
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_transactions_order_no ON transactions(order_no);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_status ON transactions(merchant_id, status);

-- 商戶表（可選，用於多商戶支持）
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    mch_no TEXT,
    app_id TEXT,
    app_secret TEXT,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_merchants_code ON merchants(code);

-- 插入 King-Chicken 商戶
INSERT OR IGNORE INTO merchants (code, name, mch_no, app_id) VALUES 
    ('KC', 'King-Chicken', '80403445499539', '6763e0a175249c805471328d');

-- 系統配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 插入默認配置
INSERT OR IGNORE INTO system_config (key, value) VALUES 
    ('version', '1.0'),
    ('environment', 'production');

-- Boss 每日報告配置表
CREATE TABLE IF NOT EXISTS boss_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id TEXT NOT NULL UNIQUE,
    is_enabled INTEGER DEFAULT 0,
    send_time TEXT DEFAULT '10:30',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_boss_configs_merchant ON boss_configs(merchant_id);

-- Boss 報告收件人表
CREATE TABLE IF NOT EXISTS boss_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    phone TEXT NOT NULL,
    name TEXT,
    is_enabled INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_boss_recipients_tenant ON boss_recipients(tenant_id);

-- Boss 報告發送歷史表
CREATE TABLE IF NOT EXISTS boss_report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    report_date TEXT NOT NULL,
    report_content TEXT,
    recipients_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_boss_history_tenant ON boss_report_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_boss_history_date ON boss_report_history(report_date);

-- 每日報告表（統計數據）
CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL UNIQUE,
    total_amount INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    success_orders INTEGER DEFAULT 0,
    avg_order_amount INTEGER DEFAULT 0,
    report_content TEXT,
    status TEXT DEFAULT 'pending',
    sent_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);

-- 用戶表（用於管理後台登錄）
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'admin',
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 會話表
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- 插入默認管理員用戶（不指定 role，使用默認值）
INSERT OR IGNORE INTO users (id, email, password, name) VALUES 
    (1, 'admin@king-chicken.com', 'kingchicken123', 'Administrator');
