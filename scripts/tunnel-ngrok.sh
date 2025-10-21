#!/bin/bash

# Script para iniciar ngrok tunnel (mais estável para webhooks)
# Uso: ./scripts/tunnel-ngrok.sh [porta]
PORT=${1:-3000}

echo "🚀 Iniciando ngrok tunnel na porta $PORT..."
echo ""
echo "ℹ️  ngrok é mais estável que Cloudflare Tunnel para webhooks"
echo "   Não cancela requisições longas"
echo ""
echo "📝 Após o túnel iniciar, copie a URL HTTPS e atualize:"
echo "   1. No arquivo .env:"
echo "      NEXT_PUBLIC_APP_URL=https://sua-url.ngrok-free.app"
echo ""
echo "   2. No KIE.ai (se necessário):"
echo "      Webhook URL: https://sua-url.ngrok-free.app/api/webhooks/kie"
echo ""
echo "⚠️  Importante: Reinicie o servidor Next.js após atualizar o .env"
echo "   para que a variável NEXT_PUBLIC_APP_URL seja carregada"
echo ""
echo "💡 Dica: Para URL permanente, crie conta gratuita em https://ngrok.com"
echo "   e use: ngrok http $PORT --domain=seu-dominio.ngrok-free.app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok não está instalado!"
    echo ""
    echo "Para instalar:"
    echo "  macOS:   brew install ngrok"
    echo "  Linux:   snap install ngrok"
    echo "  Windows: choco install ngrok"
    echo ""
    echo "Ou baixe de: https://ngrok.com/download"
    exit 1
fi

# Iniciar ngrok
ngrok http $PORT --log=stdout
