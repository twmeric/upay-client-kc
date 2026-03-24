#!/usr/bin/env python3
"""Test deployment with current token"""
import os
import requests

TOKEN = "請貼上您的Token"
ACCOUNT_ID = "dfbee5c2a5706a81bc04675499c933d4"
PROJECT_NAME = "payment-portal"

headers = {"Authorization": f"Bearer {TOKEN}"}

# Test API access
url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects"
resp = requests.get(url, headers=headers)

print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")
