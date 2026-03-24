#!/usr/bin/env node
/**
 * Cloudflare Pages Direct Upload
 * Uses the upload-token endpoint for reliable deployment
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const ACCOUNT_ID = 'dfbee5c2a5706a81bc04675499c933d4';
const PROJECT_NAME = 'upay-client-kc';
const TOKEN = 'cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca';
const SOURCE_DIR = path.join(__dirname, '..', 'UpayClient', '_KC');

async function getUploadToken() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            port: 443,
            path: `/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/upload-token`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success) {
                        resolve(result.result);
                    } else {
                        reject(new Error(JSON.stringify(result.errors)));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function uploadFiles(uploadToken, uploadUrl) {
    // Create zip file
    const zipPath = path.join(__dirname, '..', 'deploy-temp.zip');
    
    // Use PowerShell to create zip
    const psCommand = `Compress-Archive -Path "${SOURCE_DIR}\*" -DestinationPath "${zipPath}" -Force`;
    try {
        execSync(psCommand, { stdio: 'inherit' });
    } catch (e) {
        console.error('Failed to create zip:', e.message);
        throw e;
    }

    console.log('Zip created:', zipPath);
    console.log('Uploading to:', uploadUrl);

    // Use curl for upload
    const curlCmd = `curl -s -X POST "${uploadUrl}" -H "Authorization: Bearer ${TOKEN}" -F "file=@${zipPath}"`;
    
    try {
        const result = execSync(curlCmd, { encoding: 'utf8' });
        console.log('Upload result:', result);
        
        // Cleanup
        fs.unlinkSync(zipPath);
        
        return JSON.parse(result);
    } catch (e) {
        console.error('Upload failed:', e.message);
        throw e;
    }
}

async function main() {
    console.log('🚀 Direct Upload to Cloudflare Pages\n');
    
    // Verify source files
    const indexPath = path.join(SOURCE_DIR, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    console.log('Source verification:');
    console.log('  API_BASE present:', indexContent.includes('API_BASE'));
    console.log('  POST method present:', indexContent.includes("method: 'POST'"));
    console.log('');
    
    try {
        console.log('1. Getting upload token...');
        const { upload_token, upload_url } = await getUploadToken();
        console.log('   ✅ Got upload token\n');
        
        console.log('2. Uploading files...');
        const result = await uploadFiles(upload_token, upload_url);
        
        if (result.success) {
            console.log('\n✅ DEPLOYMENT SUCCESSFUL!');
            console.log('🌐 URL:', result.result?.url || `https://${PROJECT_NAME}.pages.dev`);
            console.log('⏳ Wait 30-60 seconds for propagation');
        } else {
            console.error('\n❌ Deployment failed:', result.errors);
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

main();
