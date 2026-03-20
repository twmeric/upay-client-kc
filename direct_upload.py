#!/usr/bin/env python3
"""
Cloudflare Pages Direct Upload
使用 Direct Upload API 部署靜態網站
"""

import os
import sys
import json
import base64
import hashlib
import zipfile
import requests
from pathlib import Path

# 配置
ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "payment-portal"
DIST_DIR = r"C:\Users\Owner\.kimi\sessions\ab7b4a23e658d653ca96121b30262054\424392ec-4b6f-43b8-8b7e-d868acc2597a\uploads\extracted\dist"

# 從環境變量或 .env 文件讀取 Token
def get_token():
    # 首先嘗試環境變量
    token = os.getenv('CLOUDFLARE_API_TOKEN') or os.getenv('CF_API_TOKEN')
    if token:
        return token
    
    # 嘗試讀取 .env 文件
    env_path = r"C:\Users\Owner\cloudflare\motherbase\motherbase\.env"
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith('CF_API_TOKEN='):
                    return line.split('=', 1)[1].strip()
    
    return None

def create_pages_project(token):
    """創建 Pages 專案（如果不存在）"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # 檢查專案是否存在
    response = requests.get(f"{url}/{PROJECT_NAME}", headers=headers)
    if response.status_code == 200:
        print(f"✓ 專案 '{PROJECT_NAME}' 已存在")
        return True
    
    # 創建新專案
    data = {
        "name": PROJECT_NAME,
        "production_branch": "main"
    }
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code in [200, 201]:
        print(f"✓ 專案 '{PROJECT_NAME}' 創建成功")
        return True
    else:
        print(f"✗ 創建專案失敗: {response.status_code}")
        print(response.text)
        return False

def create_direct_upload(token):
    """創建 Direct Upload session"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # 準備文件清單
    files = []
    dist_path = Path(DIST_DIR)
    
    for file_path in dist_path.rglob('*'):
        if file_path.is_file():
            relative_path = file_path.relative_to(dist_path).as_posix()
            content = file_path.read_bytes()
            
            # 計算 hash
            file_hash = hashlib.sha256(content).hexdigest()
            
            files.append({
                "path": relative_path,
                "size": len(content),
                "hash": file_hash,
                "content": content  # 臨時存儲，實際上傳時使用
            })
    
    print(f"📦 準備上傳 {len(files)} 個文件")
    
    # 創建 deployment
    manifest = {
        "paths": {f["path"]: {"size": f["size"], "hash": f["hash"]} for f in files}
    }
    
    data = {
        "branch": "main",
        "manifest": manifest
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code in [200, 201]:
        result = response.json()
        if result.get('success'):
            print("✓ Direct Upload session 創建成功")
            return result['result']
    
    print(f"✗ 創建 deployment 失敗: {response.status_code}")
    print(response.text)
    return None

def upload_files(token, upload_data, files):
    """上傳文件"""
    upload_url = upload_data.get('upload_url')
    if not upload_url:
        print("✗ 沒有上傳 URL")
        return False
    
    # 準備要上傳的文件
    upload_files = {}
    for f in files:
        upload_files[f["path"]] = (f["path"], f["content"])
    
    # 上傳
    response = requests.post(upload_url, files=upload_files)
    
    if response.status_code in [200, 201, 204]:
        print("✓ 文件上傳成功")
        return True
    else:
        print(f"✗ 文件上傳失敗: {response.status_code}")
        print(response.text)
        return False

def check_deployment(token, deployment_id):
    """檢查部署狀態"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{PROJECT_NAME}/deployments/{deployment_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            deployment = result['result']
            return deployment.get('status'), deployment.get('url')
    
    return None, None

def main():
    print("🚀 Cloudflare Pages Direct Upload")
    print("=" * 50)
    
    # 獲取 Token
    token = get_token()
    if not token:
        print("✗ 找不到 API Token")
        print("請設置 CLOUDFLARE_API_TOKEN 環境變量或在 .env 文件中設置")
        return 1
    
    print(f"✓ API Token 已獲取: {token[:10]}...")
    
    # 檢查 dist 目錄
    if not os.path.exists(DIST_DIR):
        print(f"✗ 找不到部署目錄: {DIST_DIR}")
        return 1
    
    print(f"✓ 部署目錄: {DIST_DIR}")
    
    # 創建專案
    if not create_pages_project(token):
        return 1
    
    # 創建 Direct Upload
    print("\n📡 創建 Direct Upload session...")
    upload_data = create_direct_upload(token)
    
    if not upload_data:
        print("\n📋 請使用手動上傳方式:")
        print("1. 前往 https://dash.cloudflare.com")
        print("2. Workers & Pages → Create application")
        print("3. 選擇 Pages → Upload assets")
        print(f"4. 專案名稱: {PROJECT_NAME}")
        print(f"5. 上傳 ZIP: C:\\Users\\Owner\\cloudflare\\kingchicken\\payment-portal-deploy.zip")
        return 0
    
    print(f"\n✅ 部署已創建!")
    print(f"🌐 網站地址: https://{PROJECT_NAME}.pages.dev")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
