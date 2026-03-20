-- Schema Upgrade V3: Boss Daily Report System
-- 老闆摯愛日報系統

-- 老闆配置表
CREATE TABLE IF NOT EXISTS boss_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,                    -- 老闆 WhatsApp 電話號碼 (e.g., 85291234567)
    send_time TEXT DEFAULT '22:00',         -- 每日發送時間 (HH:MM格式，預設晚上10點)
    is_enabled INTEGER DEFAULT 1,           -- 是否啟用
    report_type TEXT DEFAULT 'pdf',         -- 報告類型: pdf 或 text
    include_weekly INTEGER DEFAULT 1,       -- 是否包含本週對比
    include_payment_breakdown INTEGER DEFAULT 1, -- 是否包含支付方式明細
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 每日報告記錄表
CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date TEXT NOT NULL,              -- 報告日期 (YYYY-MM-DD)
    total_amount INTEGER DEFAULT 0,         -- 當日總交易額 (分)
    total_orders INTEGER DEFAULT 0,         -- 當日總訂單數
    success_orders INTEGER DEFAULT 0,       -- 成功訂單數
    failed_orders INTEGER DEFAULT 0,        -- 失敗訂單數
    avg_order_amount INTEGER DEFAULT 0,     -- 平均每筆金額 (分)
    report_content TEXT,                    -- 報告內容 (JSON格式，包含詳細數據)
    pdf_url TEXT,                           -- PDF 文件 R2 URL
    whatsapp_message_id TEXT,               -- WhatsApp 發送消息ID
    status TEXT DEFAULT 'pending',          -- 狀態: pending, sent, failed
    error_message TEXT,                     -- 錯誤信息
    sent_at INTEGER,                        -- 實際發送時間
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_reports(status);

-- 插入默認老闆配置 (需要手動修改電話號碼)
INSERT OR IGNORE INTO boss_config (id, phone, send_time, is_enabled) 
VALUES (1, '85291234567', '22:00', 0);
