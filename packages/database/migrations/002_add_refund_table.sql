-- Migration 002: Add Refund Table
-- Created: 2026-03-25
-- Description: Add refund support for payment reversal

-- 退款記錄表
CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_id INTEGER NOT NULL,
    refund_no TEXT NOT NULL UNIQUE,
    order_no TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    easylink_refund_id TEXT,
    raw_response TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    FOREIGN KEY (order_no) REFERENCES transactions(order_no)
);

-- 退款索引
CREATE INDEX IF NOT EXISTS idx_refunds_merchant_id ON refunds(merchant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_no ON refunds(order_no);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
