const fs = require('fs');
const path = require('path');
const https = require('https');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';
const SOURCE_DIR = path.join(__dirname, '..', 'UpayClient', '_KC');

// 生成 manifest
function generateManifest(dir) {
    const files = {};
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile()) {
            const content = fs.readFileSync(fullPath);
            const hash = require('crypto').createHash('sha256').update(content).digest('hex');
            files[item] = {
                hash: hash,
                size: stat.size
            };
        }
    }
    
    return { manifest: { files } };
}

// 創建 multipart form-data
function createFormData(manifest, files) {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    const chunks = [];
    
    // Add manifest
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="manifest"\r\n\r\n'));
    chunks.push(Buffer.from(JSON.stringify(manifest)));
    chunks.push(Buffer.from('\r\n'));
    
    // Add files
    for (const [filename, filepath] of Object.entries(files)) {
        const content = fs.readFileSync(filepath);
        chunks.push(Buffer.from(`--${boundary}\r\n`));
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${filename}"; filename="${filename}"\r\n`));
        chunks.push(Buffer.from('Content-Type: application/octet-stream\r\n\r\n'));
        chunks.push(content);
        chunks.push(Buffer.from('\r\n'));
    }
    
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    
    return {
        buffer: Buffer.concat(chunks),
        boundary
    };
}

async function deploy() {
    console.log('📦 Generating manifest...');
    const manifest = generateManifest(SOURCE_DIR);
    
    const files = {};
    const items = fs.readdirSync(SOURCE_DIR);
    for (const item of items) {
        const fullPath = path.join(SOURCE_DIR, item);
        if (fs.statSync(fullPath).isFile()) {
            files[item] = fullPath;
        }
    }
    
    console.log(`📁 Files to deploy: ${Object.keys(files).length}`);
    
    const { buffer, boundary } = createFormData(manifest, files);
    
    const options = {
        hostname: 'api.cloudflare.com',
        port: 443,
        path: `/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': buffer.length
        }
    };
    
    console.log('🚀 Uploading to Cloudflare Pages...');
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        console.log('✅ Deployment successful!');
                        console.log(`🌐 URL: https://${PROJECT_NAME}.pages.dev`);
                        resolve(result);
                    } else {
                        console.error('❌ Deployment failed:', result.errors);
                        reject(result.errors);
                    }
                } catch (e) {
                    console.error('❌ Parse error:', data);
                    reject(e);
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Request error:', err);
            reject(err);
        });
        
        req.write(buffer);
        req.end();
    });
}

deploy().catch(console.error);
