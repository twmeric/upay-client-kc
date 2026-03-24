#!/bin/bash

# Payment Gateway Template - One-click Deployment Script

echo "🚀 Payment Gateway Template Deployment"
echo "========================================"

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npx is required but not installed."
    exit 1
fi

# Configuration
echo ""
echo "📋 Configuration"
echo "----------------"
read -p "Enter your worker name (e.g., merchant-payment): " WORKER_NAME
read -p "Enter your database name (e.g., payment-db): " DB_NAME

# Create D1 Database
echo ""
echo "🗄️  Creating D1 Database..."
DB_OUTPUT=$(npx wrangler d1 create "$DB_NAME" 2>&1)
echo "$DB_OUTPUT"

# Extract database ID
DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+')

if [ -z "$DB_ID" ]; then
    echo "❌ Failed to create database or extract database ID"
    echo "Please check if database already exists and update wrangler.toml manually"
    exit 1
fi

echo "✅ Database created with ID: $DB_ID"

# Update wrangler.toml
echo ""
echo "📝 Updating wrangler.toml..."
sed -i "s/name = \".*\"/name = \"$WORKER_NAME\"/" worker/wrangler.toml
sed -i "s/database_name = \".*\"/database_name = \"$DB_NAME\"/" worker/wrangler.toml
sed -i "s/database_id = \".*\"/database_id = \"$DB_ID\"/" worker/wrangler.toml

echo "✅ wrangler.toml updated"

# Initialize database
echo ""
echo "🔧 Initializing database schema..."
cd worker
npx wrangler d1 execute "$DB_NAME" --file=./schema.sql
echo "✅ Database schema initialized"

# Set secrets
echo ""
echo "🔐 Setting up secrets..."
echo "Please enter your EasyLink credentials:"
npx wrangler secret put EASYLINK_MCH_NO
npx wrangler secret put EASYLINK_APP_ID
npx wrangler secret put EASYLINK_APP_SECRET

echo "✅ Secrets configured"

# Deploy worker
echo ""
echo "🚀 Deploying Worker..."
npx wrangler deploy
echo "✅ Worker deployed"

echo ""
echo "========================================"
echo "🎉 Deployment Complete!"
echo "========================================"
echo ""
echo "Your Payment Gateway is now live at:"
echo "https://$WORKER_NAME.your-subdomain.workers.dev"
echo ""
echo "Next steps:"
echo "1. Configure webhook URL in EasyLink dashboard"
echo "2. Test with a small amount"
echo "3. Customize frontend at frontend/src/pages/PaymentPage.tsx"
echo ""
