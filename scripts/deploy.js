#!/usr/bin/env node
/**
 * King-Chicken Payment System v2 - 部署腳本
 * 
 * 使用方式:
 *   node scripts/deploy.js [worker|web|all]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, cwd) {
  log(`> ${command}`, 'blue');
  try {
    return execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    log(`命令失敗: ${command}`, 'red');
    throw error;
  }
}

function deployWorker() {
  log('\n📦 部署 Worker 後端...', 'bright');
  
  const workerDir = path.join(__dirname, '..', 'apps', 'worker');
  
  // 檢查 Wrangler 配置
  const wranglerPath = path.join(workerDir, 'wrangler.toml');
  if (!fs.existsSync(wranglerPath)) {
    log('錯誤: 找不到 wrangler.toml', 'red');
    process.exit(1);
  }
  
  // 安裝依賴
  log('安裝依賴...', 'yellow');
  exec('npm install', workerDir);
  
  // 部署
  log('部署到 Cloudflare...', 'yellow');
  exec('npx wrangler deploy', workerDir);
  
  log('✅ Worker 部署完成', 'green');
}

function deployWeb() {
  log('\n🌐 部署前端頁面...', 'bright');
  
  const webDir = path.join(__dirname, '..', 'apps', 'web');
  const rootDir = path.join(__dirname, '..');
  
  // 創建臨時部署目錄
  const deployDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  // 複製文件
  log('準備部署文件...', 'yellow');
  
  // 支付頁面
  fs.cpSync(path.join(webDir, 'payment'), path.join(deployDir, 'payment'), { recursive: true });
  
  // 登入頁面
  fs.cpSync(path.join(webDir, 'login'), path.join(deployDir, 'login'), { recursive: true });
  
  // 管理後台
  fs.cpSync(path.join(webDir, 'admin'), path.join(deployDir, 'admin'), { recursive: true });
  
  // 根目錄 index.html (重定向到支付頁面)
  fs.writeFileSync(path.join(deployDir, 'index.html'), `
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=./payment/">
</head>
<body>
    <p>Redirecting to <a href="./payment/">payment page</a>...</p>
</body>
</html>
  `.trim());
  
  // 部署
  log('部署到 Cloudflare Pages...', 'yellow');
  exec('npx wrangler pages deploy dist --project-name=kingchicken-v2', rootDir);
  
  log('✅ 前端部署完成', 'green');
}

function setupDatabase() {
  log('\n🗄️  設置數據庫...', 'bright');
  
  const dbDir = path.join(__dirname, '..', 'packages', 'database');
  
  log('創建 D1 數據庫...', 'yellow');
  log('請手動執行: npx wrangler d1 create kingchicken-db-v2', 'blue');
  log('然後更新 wrangler.toml 中的 database_id', 'blue');
  
  log('\n執行遷移...', 'yellow');
  log('請手動執行: npx wrangler d1 execute kingchicken-db-v2 --file=packages/database/migrations/001_initial.sql', 'blue');
}

function main() {
  const target = process.argv[2] || 'all';
  
  log('\n🚀 King-Chicken Payment System v2 部署', 'bright');
  log('=' .repeat(50), 'bright');
  
  try {
    if (target === 'worker' || target === 'all') {
      deployWorker();
    }
    
    if (target === 'web' || target === 'all') {
      deployWeb();
    }
    
    if (target === 'db') {
      setupDatabase();
    }
    
    log('\n✨ 部署完成!', 'green');
    log('\n重要 URL:', 'bright');
    log('- 支付頁面: https://kingchicken-v2.pages.dev/payment/');
    log('- 管理後台: https://kingchicken-v2.pages.dev/admin/');
    
  } catch (error) {
    log('\n❌ 部署失敗', 'red');
    process.exit(1);
  }
}

main();
