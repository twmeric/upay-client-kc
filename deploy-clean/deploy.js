const fs = require('fs');
const https = require('https');
const path = require('path');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';

console.log('Deploying to Cloudflare Pages...\n');

// Read file
const filePath = path.join(__dirname, 'index.html');
const content = fs.readFileSync(filePath, 'utf8');
console.log('File size:', content.length, 'bytes');
console.log('Has API_BASE:', content.includes('API_BASE'));
console.log('Has POST:', content.includes('POST'));

// Build manifest
const hash = require('crypto').createHash('sha256').update(content).digest('hex');
const manifest = {
    manifest: {
        files: {
            'index.html': {
                hash: hash,
                size: content.length
            }
        }
    }
};

// Build multipart body manually with buffers
const boundary = '----FormBoundary' + Date.now();
const manifestJson = JSON.stringify(manifest);

const parts = [];

// Part 1: manifest
parts.push(Buffer.from(`--${boundary}\r\n`));
parts.push(Buffer.from('Content-Disposition: form-data; name="manifest"\r\n\r\n'));
parts.push(Buffer.from(manifestJson));
parts.push(Buffer.from('\r\n'));

// Part 2: index.html
parts.push(Buffer.from(`--${boundary}\r\n`));
parts.push(Buffer.from('Content-Disposition: form-data; name="index.html"; filename="index.html"\r\n'));
parts.push(Buffer.from('Content-Type: text/html\r\n\r\n'));
parts.push(Buffer.from(content));
parts.push(Buffer.from('\r\n'));

// End boundary
parts.push(Buffer.from(`--${boundary}--\r\n`));

const body = Buffer.concat(parts);
console.log('\nTotal body size:', body.length, 'bytes');

// Send request
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

console.log('\nUploading...');

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('\nResponse:');
        try {
            const result = JSON.parse(data);
            if (result.success) {
                console.log('✅ SUCCESS!');
                console.log('URL:', result.result.url);
                console.log('ID:', result.result.id);
            } else {
                console.log('❌ Failed:', result.errors);
            }
        } catch (e) {
            console.log('Raw response:', data.substring(0, 500));
        }
    });
});

req.on('error', (err) => {
    console.error('Request error:', err);
});

req.write(body);
req.end();
