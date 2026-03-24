const fs = require('fs');
const path = require('path');
const https = require('https');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';
const SOURCE_DIR = path.join(__dirname, '..', 'UpayClient', '_KC');

console.log('📦 Source directory:', SOURCE_DIR);

// 讀取並驗證 index.html
const indexPath = path.join(SOURCE_DIR, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');
console.log('📄 index.html size:', indexContent.length);
console.log('📄 Has API_BASE:', indexContent.includes('API_BASE'));
console.log('📄 API_BASE line:', indexContent.match(/const API_BASE.*/)?.[0]);

// 創建 multipart form-data 手動
const boundary = '----FormBoundary' + Date.now();
const chunks = [];

// 添加 manifest
const manifest = {
    manifest: {
        files: {}
    }
};

const files = fs.readdirSync(SOURCE_DIR);
for (const file of files) {
    const filePath = path.join(SOURCE_DIR, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
        const content = fs.readFileSync(filePath);
        const hash = require('crypto').createHash('sha256').update(content).digest('hex');
        manifest.manifest.files[file] = { hash, size: stat.size };
        
        // 添加文件到 form-data
        chunks.push(Buffer.from(`--${boundary}\r\n`));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${file}"; filename="${file}"\r\n`));
        chunks.push(Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`));
        chunks.push(content);
        chunks.push(Buffer.from(`\r\n`));
    }
}

// 添加 manifest
chunks.push(Buffer.from(`--${boundary}\r\n`));
chunks.push(Buffer.from(`Content-Disposition: form-data; name="manifest"\r\n\r\n`));
chunks.push(Buffer.from(JSON.stringify(manifest)));
chunks.push(Buffer.from(`\r\n`));

// 結尾
chunks.push(Buffer.from(`--${boundary}--\r\n`));

const body = Buffer.concat(chunks);
console.log('📦 Total upload size:', body.length, 'bytes');

// 發送請求
const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: `/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
    }
};

console.log('🚀 Uploading...');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('✅ Deployment successful!');
                console.log('🌐 URL:', result.result.url);
                console.log('📝 Deployment ID:', result.result.id);
            } else {
                console.error('❌ Deployment failed:', JSON.stringify(result.errors, null, 2));
            }
        } catch (e) {
            console.error('❌ Parse error:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Request error:', err);
});

req.write(body);
req.end();
