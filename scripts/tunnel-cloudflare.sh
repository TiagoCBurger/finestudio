#!/bin/bash

# Cloudflare Tunnel Script
# Gratuito e ilimitado!

PORT=${1:-3000}

echo "🚀 Starting Cloudflare Tunnel on port $PORT..."
echo ""
echo "📦 Installing cloudflared if needed..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflared
    else
        echo "Please install cloudflared manually from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
fi

echo ""
echo "🌐 Starting tunnel..."
echo "⚠️  Copy the HTTPS URL that appears below and update your .env file"
echo ""

cloudflared tunnel --url http://localhost:$PORT
