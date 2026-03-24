-- Schema Upgrade V4: Support Multiple Boss Recipients
-- 支持多個老闆收件人

-- 新增：收件人表（支持多個通知對象）
CREATE TABLE IF NOT EXISTS boss_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,                    -- WhatsApp 電話號碼
    name TEXT,                              -- 名稱（可選，如：陳總、李經理）
    is_enabled INTEGER DEFAULT 1,           -- 是否啟用
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_boss_recipients_phone ON boss_recipients(phone);
CREATE INDEX IF NOT EXISTS idx_boss_recipients_enabled ON boss_recipients(is_enabled);

-- 遷移現有數據：將舊的 boss_config.phone 移到新表
-- 注意：這只是初始化，執行後需要手動添加更多收件人

-- 發送記錄詳情表（記錄每個收件人的發送狀態）
CREATE TABLE IF NOT EXISTS daily_report_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,             -- 關聯的報告 ID
    recipient_phone TEXT NOT NULL,          -- 收件人電話
    status TEXT DEFAULT 'pending',          -- 狀態: pending, sent, failed
    error_message TEXT,                     -- 錯誤信息
    whatsapp_message_id TEXT,               -- WhatsApp 消息 ID
    sent_at INTEGER,                        -- 發送時間
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (report_id) REFERENCES daily_reports(id)
);

CREATE INDEX IF NOT EXISTS idx_report_logs_report_id ON daily_report_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_logs_recipient ON daily_report_logs(recipient_phone);

-- 插入預設收件人（如果 boss_config 有數據）
-- 這會將現有的電話號碼遷移到新表
INSERT OR IGNORE INTO boss_recipients (phone, name, is_enabled)
SELECT phone, '老闆', is_enabled FROM boss_config WHERE phone IS NOT NULL AND phone != '';
