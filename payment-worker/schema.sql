-- D1 Database Schema for Payment Gateway

-- 交易記錄表
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    orderNo TEXT NOT NULL UNIQUE,
    mchOrderNo TEXT,
    mchNo TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'HKD',
    payType TEXT,
    subject TEXT,
    body TEXT,
    status INTEGER DEFAULT 0,
    channelOrderNo TEXT,
    payerInfo TEXT,
    notifyUrl TEXT,
    returnUrl TEXT,
    rawResponse TEXT,
    customerIp TEXT,
    channelExtra TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER DEFAULT 0,
    paidAt INTEGER
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_transactions_orderNo ON transactions(orderNo);
CREATE INDEX IF NOT EXISTS idx_transactions_mchNo ON transactions(mchNo);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON transactions(createdAt);
CREATE INDEX IF NOT EXISTS idx_transactions_mch_status ON transactions(mchNo, status);

-- 商戶表（可選，用於多商戶支持）
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mchNo TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    canSettle INTEGER DEFAULT 1,
    settlementRate REAL DEFAULT 100,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_merchants_mchNo ON merchants(mchNo);

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
