#!/usr/bin/env python3
"""Deploy Pages using Cloudflare API"""
import requests
import zipfile
import os
from pathlib import Path

API_TOKEN = "cfut_U9fdeBzWaVKBK83pfPZAtmufVQnJqtCTKLQj53UFad7fbeca"
ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "upay-client-kc"

def create_zip(source_dir, output_path):
    """Create zip file from directory"""
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    return output_path

def deploy():
    headers = {
        "Authorization": f"Bearer {API_TOKEN}"
    }
    
    # Create zip
    source = "UpayClient/_KC"
    zip_file = "kc-deploy-py.zip"
    
    print("Creating zip file...")
    create_zip(source, zip_file)
    file_size = os.path.getsize(zip_file) / 1024
    print(f"Created: {zip_file} ({file_size:.2f} KB)")
    
    # Get upload token
    print("\nGetting upload token...")
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/upload-token"
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        data = resp.json()
        
        if data.get("success"):
            upload_token = data["result"]["upload_token"]
            upload_url = data["result"]["upload_url"]
            
            print(f"Upload URL: {upload_url[:60]}...")
            
            # Upload file
            print("\nUploading...")
            with open(zip_file, 'rb') as f:
                files = {'file': (zip_file, f, 'application/zip')}
                upload_headers = {
                    "Authorization": f"Bearer {API_TOKEN}"
                }
                upload_resp = requests.post(upload_url, headers=upload_headers, files=files, timeout=60)
            
            print(f"Upload status: {upload_resp.status_code}")
            print(f"Response: {upload_resp.text[:500]}")
            
            if upload_resp.status_code in [200, 201]:
                print("\n✅ Deployment successful!")
                print(f"URL: https://{PROJECT_NAME}.pages.dev")
            else:
                print(f"\n❌ Upload failed: {upload_resp.status_code}")
        else:
            print(f"❌ Failed to get token: {data}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    deploy()
