#!/usr/bin/env python3
"""
King-Chicken Fixed Version Deployment Script
"""

import os
import sys
import json
import hashlib
import requests
from pathlib import Path

# Config
ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "king-chicken"
DIST_DIR = r"C:\Users\Owner\cloudflare\kingchicken\source_recovery\dist"
TOKEN = "cfat_WPMsz9VesfGGOJEK9l7d7SpplHKeeZIbPpl6cVj2ae335b72"

def deploy_to_pages():
    """Deploy to Cloudflare Pages"""
    print("King-Chicken Fixed Version Deployment")
    print("=" * 50)
    
    # Check dist directory
    dist_path = Path(DIST_DIR)
    if not dist_path.exists():
        print(f"ERROR: Cannot find deployment directory {DIST_DIR}")
        return False
    
    print(f"Deploy Directory: {DIST_DIR}")
    print(f"Project Name: {PROJECT_NAME}")
    print(f"API Token: {TOKEN[:10]}...")
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    # 1. Check/Create Project
    print("\nChecking Pages Project...")
    project_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}"
    response = requests.get(project_url, headers=headers)
    
    if response.status_code == 200:
        print(f"Project '{PROJECT_NAME}' exists")
    else:
        print(f"Creating new project...")
        create_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects"
        data = {
            "name": PROJECT_NAME,
            "production_branch": "main"
        }
        response = requests.post(create_url, headers=headers, json=data)
        if response.status_code in [200, 201]:
            print(f"Project created successfully")
        else:
            print(f"Warning: Create project failed: {response.status_code}")
    
    # 2. Prepare file manifest
    print("\nScanning files...")
    files = []
    for file_path in dist_path.rglob('*'):
        if file_path.is_file():
            relative_path = file_path.relative_to(dist_path).as_posix()
            content = file_path.read_bytes()
            file_hash = hashlib.sha256(content).hexdigest()
            files.append({
                "path": relative_path,
                "size": len(content),
                "hash": file_hash
            })
    
    print(f"Found {len(files)} files")
    
    # 3. Create Deployment
    print("\nCreating Deployment...")
    deploy_url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments"
    
    manifest = {
        "paths": {f["path"]: {"size": f["size"], "hash": f["hash"]} for f in files}
    }
    
    data = {
        "branch": "main",
        "manifest": manifest
    }
    
    response = requests.post(deploy_url, headers=headers, json=data)
    
    if response.status_code in [200, 201]:
        result = response.json()
        if result.get('success'):
            deployment = result['result']
            print(f"Deployment created successfully!")
            print(f"Website: https://{PROJECT_NAME}.pages.dev")
            print(f"Custom Domain: https://king-chicken.jkdcoding.com/admin")
            return True
        else:
            print(f"Deployment creation failed")
            print(json.dumps(result, indent=2))
    else:
        print(f"API Error: {response.status_code}")
        print(response.text)
    
    return False

def main():
    try:
        success = deploy_to_pages()
        if success:
            print("\n" + "=" * 50)
            print("Deployment Successful!")
            print("Please wait 1-2 minutes for Cloudflare to complete")
            print("Then visit: https://king-chicken.jkdcoding.com/admin")
            return 0
        else:
            print("\nAuto deployment failed, please use manual deployment:")
            print("1. Go to https://dash.cloudflare.com")
            print("2. Workers & Pages -> king-chicken")
            print("3. Click 'Create deployment'")
            print("4. Upload folder:", DIST_DIR)
            return 1
    except Exception as e:
        print(f"\nError: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
