#!/bin/bash

# Script para iniciar ngrok tunnel
# Uso: ./scripts/tunnel-ngrok.sh [porta]
PORT=${1:-3000}

echo "🚀 Iniciando ngrok tunnel na porta $PORT..."
echo ""

# Verificar se ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok não está instalado!"
    echo ""
    echo "Para instalar no macOS: brew install ngrok"
    exit 1
fi

# Iniciar ngrok
echo "📡 Túnel ativo. Acesse via HTTPS para evitar problemas com WebSocket/Realtime"
echo ""
echo "🔗 URLs dos webhooks:"
echo "   FAL:  https://sua-url.ngrok-free.app/api/webhooks/fal"
echo "   KIE:  https://sua-url.ngrok-free.app/api/webhooks/kie"
echo ""
echo "⚠️  Atualize NEXT_PUBLIC_APP_URL no .env com a URL HTTPS do ngrok"
echo "   e reinicie o servidor Next.js"
echo ""

ngrok http $PORT --log=stdout
