#!/usr/bin/env python3
"""
Direct deployment to Cloudflare Pages using API
"""
import os
import sys
import json
import zipfile
import requests
from pathlib import Path

# Config
ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "payment-portal"
TOKEN = "cfat_WPMsz9VesfGGOJEK9l7d7SpplHKeeZIbPpl6cVj2ae335b72"
DIST_DIR = r"C:\Users\Owner\cloudflare\kingchicken\source_recovery\dist"

def deploy():
    print("Deploying to Cloudflare Pages...")
    print(f"Project: {PROJECT_NAME}")
    
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    # Create ZIP
    print("\nCreating ZIP...")
    zip_path = r"C:\Users\Owner\cloudflare\kingchicken\deploy.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(DIST_DIR):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, DIST_DIR)
                zf.write(file_path, arcname)
    print(f"ZIP created: {os.path.getsize(zip_path)} bytes")
    
    # Create deployment
    print("\nCreating deployment...")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments"
    
    with open(zip_path, 'rb') as f:
        files = {'file': ('deploy.zip', f, 'application/zip')}
        data = {'branch': 'main'}
        
        response = requests.post(url, headers=headers, files=files, data=data)
    
    print(f"Response: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        if result.get('success'):
            print("\nDeployment successful!")
            print(f"URL: https://{PROJECT_NAME}-cwb.pages.dev")
            print(f"Custom: https://king-chicken.jkdcoding.com")
            return True
        else:
            print(f"API Error: {result}")
    else:
        print(f"HTTP Error: {response.text}")
    
    return False

if __name__ == "__main__":
    success = deploy()
    sys.exit(0 if success else 1)
