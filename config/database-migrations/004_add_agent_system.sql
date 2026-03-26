-- ============================================
-- Migration: Add Agent System
-- Description: Add agent and merchant application tables
-- Date: 2026-03-26
-- ============================================

-- Agents table (代理商表)
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agentCode TEXT NOT NULL UNIQUE,        -- 代理商代码: AG001
    name TEXT NOT NULL,                     -- 代理商名称
    email TEXT NOT NULL UNIQUE,             -- 登录邮箱
    passwordHash TEXT NOT NULL,             -- 密码哈希
    phone TEXT,                             -- 联系电话
    status TEXT DEFAULT 'active',           -- 状态: active, inactive, suspended
    commissionRate REAL DEFAULT 0.005,      -- 佣金比例 (默认0.5%)
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

-- Create index for agent lookups
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(agentCode);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Merchant Applications table (商户入网申请表)
CREATE TABLE IF NOT EXISTS merchant_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicationNo TEXT NOT NULL UNIQUE,     -- 申请编号: APP-2024-0001
    agentId INTEGER NOT NULL,               -- 所属代理商ID
    
    -- 基本信息
    merchantName TEXT NOT NULL,             -- 商户全称
    merchantShortName TEXT,                 -- 商户简称
    merchantType TEXT NOT NULL,             -- 商户类型: limited/unlimited/sole/partnership/individual
    industryType TEXT NOT NULL,             -- 行业类型
    brNumber TEXT NOT NULL,                 -- 商业登记证号码
    crNumber TEXT,                          -- 公司注册号码
    registeredAddress TEXT NOT NULL,        -- 注册地址
    operatingAddress TEXT NOT NULL,         -- 经营地址
    
    -- 法定代表人信息
    directorName TEXT NOT NULL,             -- 董事姓名
    directorPosition TEXT NOT NULL,         -- 职位
    directorIdNumber TEXT NOT NULL,         -- 证件号码
    directorPhone TEXT NOT NULL,            -- 联系电话
    directorEmail TEXT NOT NULL,            -- 邮箱
    directorShareholding REAL,              -- 持股比例
    
    -- 联系人信息
    contactName TEXT NOT NULL,              -- 联系人姓名
    contactPosition TEXT NOT NULL,          -- 职位
    contactPhone TEXT NOT NULL,             -- 电话
    contactEmail TEXT NOT NULL,             -- 邮箱
    
    -- 经营信息
    websiteUrl TEXT,                        -- 网站URL
    appName TEXT,                           -- APP名称
    businessDescription TEXT,               -- 业务模式说明
    estimatedMonthlyRevenue TEXT,           -- 预计月交易额
    averageTransactionAmount REAL,          -- 平均单笔金额
    
    -- 结算信息
    settlementAccountName TEXT NOT NULL,    -- 结算账户名称
    bankName TEXT NOT NULL,                 -- 银行名称
    bankAccountNumber TEXT NOT NULL,        -- 银行账号
    bankBranchCode TEXT,                    -- 分行代码
    
    -- 申请状态
    status TEXT DEFAULT 'draft',            -- 状态: draft/pending/reviewing/approved/rejected
    
    -- 审核信息
    submittedAt INTEGER,                    -- 提交时间
    reviewedAt INTEGER,                     -- 审核时间
    reviewedBy INTEGER,                     -- 审核人ID
    reviewNotes TEXT,                       -- 审核备注
    
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    
    FOREIGN KEY (agentId) REFERENCES agents(id)
);

-- Create indexes for applications
CREATE INDEX IF NOT EXISTS idx_applications_agent ON merchant_applications(agentId);
CREATE INDEX IF NOT EXISTS idx_applications_status ON merchant_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_app_no ON merchant_applications(applicationNo);

-- Application Documents table (申请文件表)
CREATE TABLE IF NOT EXISTS application_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applicationId INTEGER NOT NULL,
    documentType TEXT NOT NULL,             -- 文件类型
    documentName TEXT NOT NULL,             -- 文件名称
    fileUrl TEXT NOT NULL,                  -- 文件URL
    fileSize INTEGER,                       -- 文件大小(字节)
    uploadedAt INTEGER NOT NULL,
    
    FOREIGN KEY (applicationId) REFERENCES merchant_applications(id) ON DELETE CASCADE
);

-- Create index for documents
CREATE INDEX IF NOT EXISTS idx_docs_application ON application_documents(applicationId);

-- Agent-Merchant Relationship table (代理商-商户关系表)
CREATE TABLE IF NOT EXISTS agent_merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agentId INTEGER NOT NULL,
    merchantId INTEGER NOT NULL,            -- 关联merchants表的ID
    createdAt INTEGER NOT NULL,
    
    FOREIGN KEY (agentId) REFERENCES agents(id),
    FOREIGN KEY (merchantId) REFERENCES merchants(id)
);

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_merchant_unique ON agent_merchants(agentId, merchantId);

-- Insert sample agent (for testing)
-- Password: agent123 (hashed)
INSERT OR IGNORE INTO agents (agentCode, name, email, passwordHash, phone, status, createdAt, updatedAt) VALUES
('AG001', 'Test Agent', 'agent@easylink.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '85291234567', 'active', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- Document Types Reference
-- ============================================
-- 1. business_registration - 商业登记证
-- 2. certificate_of_incorporation - 公司注册证明书
-- 3. annual_return - 公司周年申报表
-- 4. articles_of_association - 公司章程
-- 5. director_id - 董事身份证/护照
-- 6. beneficial_owner_id - 实益拥有人身份证明
-- 7. bank_statement - 银行流水证明
-- 8. premises_photo - 经营场所照片
-- 9. website_screenshot - 网站截图
-- 10. bank_proof - 银行证明文件
