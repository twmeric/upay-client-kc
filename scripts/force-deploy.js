const fs = require('fs');
const path = require('path');
const https = require('https');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';
const SOURCE_DIR = path.join(__dirname, '..', 'UpayClient', '_KC');

console.log('🚀 Force Deploy - Creating clean upload...\n');

// 讀取所有文件
const files = {};
const fileContents = {};
const items = fs.readdirSync(SOURCE_DIR);

for (const item of items) {
    const filePath = path.join(SOURCE_DIR, item);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
        const content = fs.readFileSync(filePath);
        const hash = require('crypto').createHash('sha256').update(content).digest('hex');
        files[item] = { hash, size: stat.size };
        fileContents[item] = content;
        console.log(`📄 ${item}: ${stat.size} bytes, hash: ${hash.substring(0, 16)}...`);
    }
}

// 特別驗證 index.html
const indexContent = fileContents['index.html'].toString('utf8');
console.log('\n✅ Verification:');
console.log('  index.html has API_BASE:', indexContent.includes('API_BASE'));
console.log('  index.html has POST:', indexContent.includes("method: 'POST'"));

// 創建 manifest
const manifest = { manifest: { files } };
const manifestJson = JSON.stringify(manifest);

// 創建 multipart body
const boundary = '----FormBoundary' + Date.now();
const chunks = [];

// 添加 manifest
chunks.push(Buffer.from(`--${boundary}\r\n`));
chunks.push(Buffer.from('Content-Disposition: form-data; name="manifest"\r\n\r\n'));
chunks.push(Buffer.from(manifestJson));
chunks.push(Buffer.from('\r\n'));

// 添加所有文件
for (const [filename, content] of Object.entries(fileContents)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${filename}"; filename="${filename}"\r\n`));
    chunks.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'));
    chunks.push(content);
    chunks.push(Buffer.from('\r\n'));
}

chunks.push(Buffer.from(`--${boundary}--\r\n`));

const body = Buffer.concat(chunks);
console.log(`\n📦 Total upload: ${body.length} bytes`);

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

console.log('\n🚀 Uploading...');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
                console.log('🌐 URL:', result.result.url);
                console.log('📝 ID:', result.result.id);
                console.log('\n⚠️  IMPORTANT:');
                console.log('   Wait 30-60 seconds for CDN propagation');
                console.log('   Then test: https://upay-client-kc.pages.dev');
            } else {
                console.error('\n❌ Deployment failed:', JSON.stringify(result.errors, null, 2));
            }
        } catch (e) {
            console.error('\n❌ Parse error:', data);
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Request error:', err);
});

req.write(body);
req.end();
