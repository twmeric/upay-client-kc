-- Migration 001: Initial Schema
-- Created: 2026-03-25

-- 交易記錄表
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    pay_order_id TEXT,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'HKD',
    pay_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    remark TEXT DEFAULT '',
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 報告歷史
CREATE TABLE IF NOT EXISTS report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL,
    recipients TEXT NOT NULL,
    report_content TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at INTEGER NOT NULL
);

-- 報告收件人
CREATE TABLE IF NOT EXISTS report_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_order_no ON transactions(order_no);
CREATE INDEX IF NOT EXISTS idx_transactions_pay_order_id ON transactions(pay_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- 插入默認報告收件人
INSERT OR IGNORE INTO report_recipients (name, phone, enabled, created_at) VALUES
    ('咪咪姐', '85298113210', 1, strftime('%s', 'now')),
    ('Michelle', '85292404878', 1, strftime('%s', 'now')),
    ('Eric Tsang', '85251164453', 1, strftime('%s', 'now'));
