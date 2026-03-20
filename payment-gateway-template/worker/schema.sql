-- Payment Gateway Standard Template - Database Schema

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
    note TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER DEFAULT 0,
    paidAt INTEGER
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_orderNo ON transactions(orderNo);
CREATE INDEX IF NOT EXISTS idx_transactions_mchNo ON transactions(mchNo);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_createdAt ON transactions(createdAt);

-- 商戶表
CREATE TABLE IF NOT EXISTS merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mchNo TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    nameEn TEXT,
    contactEmail TEXT,
    contactPhone TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 系統配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updatedAt INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 插入默認配置
INSERT OR IGNORE INTO system_config (key, value) VALUES 
    ('version', '1.0'),
    ('environment', 'production'),
    ('currency', 'HKD');
