#!/usr/bin/env python3
"""
Payment Portal Deployment Script
Deploy to payment-portal project
"""

import os
import sys
import json
import hashlib
import requests
from pathlib import Path
import zipfile

# Config
ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "payment-portal"
DIST_DIR = r"C:\Users\Owner\cloudflare\kingchicken\source_recovery\dist"
TOKEN = "cfat_WPMsz9VesfGGOJEK9l7d7SpplHKeeZIbPpl6cVj2ae335b72"

def create_zip():
    """Create ZIP file for upload"""
    zip_path = r"C:\Users\Owner\cloudflare\kingchicken\payment-portal-deploy.zip"
    print(f"Creating ZIP: {zip_path}")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        dist_path = Path(DIST_DIR)
        for file_path in dist_path.rglob('*'):
            if file_path.is_file():
                arcname = file_path.relative_to(dist_path)
                zipf.write(file_path, arcname)
    
    size = os.path.getsize(zip_path)
    print(f"ZIP created: {size} bytes")
    return zip_path

def deploy_direct_upload():
    """Deploy using Direct Upload API"""
    print("Payment Portal Deployment")
    print("=" * 50)
    
    # Check dist directory
    dist_path = Path(DIST_DIR)
    if not dist_path.exists():
        print(f"ERROR: Cannot find deployment directory {DIST_DIR}")
        return False
    
    print(f"Deploy Directory: {DIST_DIR}")
    print(f"Project Name: {PROJECT_NAME}")
    
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    # Create ZIP file
    zip_path = create_zip()
    
    # Step 1: Create upload session
    print("\nStep 1: Creating upload session...")
    session_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments"
    
    # Prepare manifest
    files = []
    for file_path in dist_path.rglob('*'):
        if file_path.is_file():
            relative_path = str(file_path.relative_to(dist_path)).replace('\\', '/')
            content = file_path.read_bytes()
            file_hash = hashlib.sha256(content).hexdigest()
            files.append({
                "path": relative_path,
                "size": len(content),
                "hash": file_hash,
                "content": content
            })
    
    manifest = {
        "paths": {f["path"]: {"size": f["size"], "hash": f["hash"]} for f in files}
    }
    
    session_data = {
        "branch": "main",
        "manifest": manifest
    }
    
    response = requests.post(
        session_url, 
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        json=session_data
    )
    
    print(f"Session response: {response.status_code}")
    
    if response.status_code not in [200, 201]:
        print(f"Failed to create session: {response.text}")
        return False
    
    result = response.json()
    if not result.get('success'):
        print(f"API error: {result}")
        return False
    
    deployment = result['result']
    upload_url = deployment.get('upload_url')
    deployment_id = deployment.get('id')
    
    print(f"Upload URL received: {upload_url[:50] if upload_url else 'None'}...")
    
    if not upload_url:
        print("No upload URL in response")
        return False
    
    # Step 2: Upload files
    print("\nStep 2: Uploading files...")
    
    upload_files = []
    for f in files:
        upload_files.append((f["path"], f["content"]))
    
    # Use multipart form upload
    multipart_data = {}
    for i, (path, content) in enumerate(upload_files):
        multipart_data[path] = content
    
    upload_response = requests.post(upload_url, files=multipart_data)
    print(f"Upload response: {upload_response.status_code}")
    
    if upload_response.status_code not in [200, 201, 204]:
        print(f"Upload failed: {upload_response.text}")
        return False
    
    # Step 3: Check deployment status
    print("\nStep 3: Checking deployment status...")
    status_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments/{deployment_id}"
    
    status_response = requests.get(status_url, headers={"Authorization": f"Bearer {TOKEN}"})
    if status_response.status_code == 200:
        status_result = status_response.json()
        if status_result.get('success'):
            deployment_info = status_result['result']
            status = deployment_info.get('status')
            url = deployment_info.get('url')
            
            print(f"\nDeployment Status: {status}")
            print(f"Deployment URL: {url}")
            
            if status in ['success', 'active']:
                print("\n" + "=" * 50)
                print("DEPLOYMENT SUCCESSFUL!")
                print(f"Website: https://payment-portal-cwb.pages.dev")
                print(f"Custom: https://king-chicken.jkdcoding.com/admin")
                return True
    
    print("\nDeployment created, checking status...")
    return True

def main():
    try:
        success = deploy_direct_upload()
        if success:
            print("\nPlease wait 1-2 minutes for deployment to complete")
            return 0
        else:
            print("\nAuto deployment failed")
            print("Please use manual deployment:")
            print("1. Go to https://dash.cloudflare.com")
            print("2. Workers & Pages -> payment-portal")
            print("3. Click 'Create deployment'")
            print("4. Upload folder:", DIST_DIR)
            return 1
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
