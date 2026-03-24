const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';
const SOURCE_DIR = path.join(__dirname, '..', 'UpayClient', '_KC');

async function deploy() {
    console.log('📦 Reading files...');
    
    // Create form data
    const form = new FormData();
    
    // Add manifest
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
            manifest.manifest.files[file] = {
                hash: hash,
                size: stat.size
            };
            form.append(file, fs.createReadStream(filePath));
        }
    }
    
    form.append('manifest', JSON.stringify(manifest));
    
    console.log(`📁 Uploading ${Object.keys(manifest.manifest.files).length} files...`);
    
    const options = {
        hostname: 'api.cloudflare.com',
        port: 443,
        path: `/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            ...form.getHeaders()
        }
    };
    
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
        
        req.on('error', reject);
        form.pipe(req);
    });
}

deploy().catch(console.error);
