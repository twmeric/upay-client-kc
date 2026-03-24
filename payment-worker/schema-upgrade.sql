-- Database Schema Upgrade
-- 添加缺少的列

-- 檢查並添加 users 表的 role 列
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'admin';

-- 檢查並添加其他可能缺少的列
-- 如果列已存在會報錯，但使用 IF NOT EXISTS 語法在 SQLite 中不支持 ALTER TABLE
-- 所以先嘗試添加，如果失敗則忽略
