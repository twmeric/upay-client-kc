#!/usr/bin/env python3
"""
Proper Cloudflare Pages Direct Upload with Manifest
"""
import os
import sys
import json
import hashlib
import requests
from pathlib import Path

ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "payment-portal"
TOKEN = "cfat_WPMsz9VesfGGOJEK9l7d7SpplHKeeZIbPpl6cVj2ae335b72"
DIST_DIR = Path(r"C:\Users\Owner\cloudflare\kingchicken\source_recovery\dist")

def get_files():
    """Get all files with hashes"""
    files = []
    for file_path in DIST_DIR.rglob('*'):
        if file_path.is_file():
            relative = file_path.relative_to(DIST_DIR).as_posix()
            content = file_path.read_bytes()
            file_hash = hashlib.sha256(content).hexdigest()
            files.append({
                "path": relative,
                "size": len(content),
                "hash": file_hash,
                "content": content
            })
    return files

def deploy():
    print("Deploying to Cloudflare Pages...")
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Get files
    print("Scanning files...")
    files = get_files()
    print(f"Found {len(files)} files")
    
    # Create manifest
    manifest = {
        "paths": {f["path"]: {"size": f["size"], "hash": f["hash"]} for f in files}
    }
    
    # Create deployment session
    print("Creating deployment session...")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments"
    
    data = {
        "branch": "main",
        "manifest": manifest["paths"]
    }
    
    response = requests.post(url, headers=headers, json=data)
    print(f"Session response: {response.status_code}")
    
    if response.status_code not in [200, 201]:
        print(f"Failed: {response.text}")
        return False
    
    result = response.json()
    if not result.get('success'):
        print(f"API error: {result}")
        return False
    
    deployment = result['result']
    upload_url = deployment.get('upload_url')
    
    if not upload_url:
        print("No upload URL")
        return False
    
    print(f"Uploading {len(files)} files...")
    
    # Upload files using multipart
    upload_files = {}
    for f in files:
        upload_files[f["path"]] = (f["path"], f["content"])
    
    upload_resp = requests.post(upload_url, files=upload_files)
    print(f"Upload response: {upload_resp.status_code}")
    
    if upload_resp.status_code in [200, 201, 204]:
        print("\nDeployment successful!")
        print(f"URL: https://{PROJECT_NAME}-cwb.pages.dev")
        return True
    else:
        print(f"Upload failed: {upload_resp.text}")
        return False

if __name__ == "__main__":
    success = deploy()
    sys.exit(0 if success else 1)
