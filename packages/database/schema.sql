-- King-Chicken Payment System v2 - 數據庫 Schema
-- 設計原則：簡潔、一致、易於維護

-- 交易記錄表
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,           -- 商家訂單號 (系統生成)
    pay_order_id TEXT,                       -- EasyLink 支付訂單號 (P開頭)
    amount INTEGER NOT NULL,                 -- 金額 (分為單位)
    currency TEXT DEFAULT 'HKD',             -- 貨幣
    pay_type TEXT NOT NULL,                  -- UP_OP(銀聯) / ALI_H5(支付寶) / WX_H5(微信)
    status TEXT DEFAULT 'pending',           -- pending/success/failed/paid
    remark TEXT DEFAULT '',                  -- 備註
    raw_response TEXT,                       -- EasyLink 原始響應
    created_at INTEGER NOT NULL,             -- 創建時間 (Unix timestamp)
    updated_at INTEGER NOT NULL              -- 更新時間 (Unix timestamp)
);

-- 報告發送歷史
CREATE TABLE IF NOT EXISTS report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL,               -- 報告日期 (YYYY-MM-DD)
    recipients TEXT NOT NULL,                -- 收件人列表 (JSON)
    report_content TEXT NOT NULL,            -- 報告內容
    status TEXT DEFAULT 'sent',              -- sent/failed
    sent_at INTEGER NOT NULL                 -- 發送時間
);

-- 報告收件人設置
CREATE TABLE IF NOT EXISTS report_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 1,               -- 1=啟用, 0=禁用
    created_at INTEGER NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_order_no ON transactions(order_no);
CREATE INDEX IF NOT EXISTS idx_transactions_pay_order_id ON transactions(pay_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
