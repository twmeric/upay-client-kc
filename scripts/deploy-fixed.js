const fs = require('fs');
const path = require('path');
const https = require('https');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';
const SOURCE_DIR = path.join(__dirname, '..', 'UpayClient', '_KC');

console.log('🔧 Fixed Deploy - Correct manifest format\n');

// 構建文件清單
const fileList = [];
const items = fs.readdirSync(SOURCE_DIR);

for (const item of items) {
    const filePath = path.join(SOURCE_DIR, item);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
        fileList.push({
            name: item,
            path: filePath,
            size: stat.size,
            content: fs.readFileSync(filePath)
        });
    }
}

console.log('Files to upload:');
fileList.forEach(f => console.log(`  - ${f.name}: ${f.size} bytes`));

// 驗證 index.html
const indexFile = fileList.find(f => f.name === 'index.html');
const indexContent = indexFile.content.toString('utf8');
console.log('\nVerification:');
console.log('  API_BASE present:', indexContent.includes('API_BASE'));
console.log('  POST method present:', indexContent.includes("method: 'POST'"));

// 構建 manifest（正確格式）
const manifestFiles = {};
fileList.forEach(f => {
    const hash = require('crypto').createHash('sha256').update(f.content).digest('hex');
    manifestFiles[f.name] = {
        hash: hash,
        size: f.size
    };
});

const manifest = {
    manifest: {
        files: manifestFiles
    }
};

const manifestJson = JSON.stringify(manifest);
console.log('\nManifest:', manifestJson.substring(0, 200) + '...');

// 創建 multipart body（修正格式）
const boundary = '----FormBoundary' + Date.now();
let body = '';

// Manifest 部分
body += `--${boundary}\r\n`;
body += 'Content-Disposition: form-data; name="manifest"\r\n';
body += 'Content-Type: application/json\r\n\r\n';
body += manifestJson;
body += '\r\n';

// 每個文件
fileList.forEach(f => {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${f.name}"; filename="${f.name}"\r\n`;
    body += 'Content-Type: application/octet-stream\r\n\r\n';
    body += f.content.toString('binary');
    body += '\r\n';
});

body += `--${boundary}--\r\n`;

const bodyBuffer = Buffer.from(body, 'binary');
console.log(`\nTotal size: ${bodyBuffer.length} bytes`);

// 發送請求
const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: `/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
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
                console.log('\n⏳ Wait 30-60 seconds, then test:');
                console.log('   https://upay-client-kc.pages.dev');
            } else {
                console.error('\n❌ Deployment failed:', JSON.stringify(result.errors, null, 2));
            }
        } catch (e) {
            console.error('\n❌ Parse error:', data.substring(0, 500));
        }
    });
});

req.on('error', (err) => {
    console.error('❌ Request error:', err);
});

req.write(bodyBuffer);
req.end();
