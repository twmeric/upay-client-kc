-- ============================================
-- King Chicken 司機管理系統數據庫 Schema
-- ============================================

-- 1. 司機表
CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driverCode TEXT NOT NULL UNIQUE,      -- 司機編號: KC001, KC002...
    name TEXT NOT NULL,                    -- 司機姓名
    phone TEXT,                            -- 聯繫電話
    email TEXT,                            -- 電子郵箱
    password TEXT,                         -- 登入密碼（bcrypt hash）
    status TEXT DEFAULT 'active',          -- active/inactive
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

-- 2. 修改交易表，添加司機關聯
-- 注意：這個 migration 需要在現有數據庫執行
ALTER TABLE transactions ADD COLUMN driverId INTEGER REFERENCES drivers(id);
ALTER TABLE transactions ADD COLUMN driverCode TEXT;  -- 冗余存儲，方便查詢

-- 3. 司機收款統計視圖（可選）
CREATE VIEW IF NOT EXISTS driver_daily_stats AS
SELECT 
    driverCode,
    date(createdAt, 'unixepoch') as date,
    COUNT(*) as transactionCount,
    SUM(amount) / 100.0 as totalAmount,
    SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as successCount
FROM transactions
WHERE driverCode IS NOT NULL
GROUP BY driverCode, date(createdAt, 'unixepoch');

-- ============================================
-- 初始數據：添加示例司機
-- ============================================

-- 管理員賬戶（mimichu 已存在）

-- 示例司機（可根據實際情況添加）
INSERT OR IGNORE INTO drivers (driverCode, name, phone, status, createdAt, updatedAt) VALUES
('KC001', '張師傅', '9123-4567', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
('KC002', '李師傅', '9234-5678', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
('KC003', '王師傅', '9345-6789', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
('KC004', '陳師傅', '9456-7890', 'active', strftime('%s', 'now'), strftime('%s', 'now')),
('KC005', '劉師傅', '9567-8901', 'active', strftime('%s', 'now'), strftime('%s', 'now'));
