#!/bin/bash

# LocalTunnel Script
# Gratuito, não precisa instalar nada globalmente

PORT=${1:-3000}

echo "🚀 Starting LocalTunnel on port $PORT..."
echo ""
echo "📦 Using npx to run localtunnel (no installation needed)..."
echo ""
echo "🌐 Starting tunnel..."
echo "⚠️  Copy the HTTPS URL that appears below and update your .env file"
echo ""

npx localtunnel --port $PORT
