-- ============================================
-- Migration: Add Driver Tracking
-- Description: Add driver tracking fields to transactions table
-- Date: 2024
-- ============================================

-- Add driver tracking fields to transactions table
-- Note: D1 uses ALTER TABLE ADD COLUMN syntax

-- Check if driverCode column exists first
-- If the ALTER fails, it means the column already exists or D1 doesn't support this syntax

-- Add driverCode column
ALTER TABLE transactions ADD COLUMN driverCode TEXT DEFAULT '';

-- Add driverName column
ALTER TABLE transactions ADD COLUMN driverName TEXT DEFAULT '';

-- Create index for efficient driver filtering
CREATE INDEX IF NOT EXISTS idx_transactions_driverCode ON transactions(driverCode);

-- ============================================
-- Optional: Create drivers table for management
-- ============================================

CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchantId INTEGER NOT NULL,
    driverCode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    licensePlate TEXT,
    status TEXT DEFAULT 'active', -- active, inactive, suspended
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_drivers_merchant ON drivers(merchantId);
CREATE INDEX IF NOT EXISTS idx_drivers_code ON drivers(driverCode);

-- ============================================
-- Sample Data: Insert sample drivers for KC merchant
-- ============================================

-- Get KC merchant ID first (this would need to be adjusted based on actual data)
-- INSERT INTO drivers (merchantId, driverCode, name, phone, licensePlate, status, createdAt, updatedAt)
-- SELECT id, 'KC001', '張師傅', '9123-4567', 'HK1234', 'active', strftime('%s', 'now'), strftime('%s', 'now')
-- FROM merchants WHERE code = 'KC';

-- INSERT INTO drivers (merchantId, driverCode, name, phone, licensePlate, status, createdAt, updatedAt)
-- SELECT id, 'KC002', '李師傅', '9234-5678', 'HK5678', 'active', strftime('%s', 'now'), strftime('%s', 'now')
-- FROM merchants WHERE code = 'KC';

-- INSERT INTO drivers (merchantId, driverCode, name, phone, licensePlate, status, createdAt, updatedAt)
-- SELECT id, 'KC003', '王師傅', '9345-6789', 'HK9012', 'active', strftime('%s', 'now'), strftime('%s', 'now')
-- FROM merchants WHERE code = 'KC';
