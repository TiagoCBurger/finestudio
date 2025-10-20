#!/bin/bash

# Script para iniciar o Cloudflare Tunnel (Quick Tunnel - sem certificado)
# Uso: ./scripts/tunnel.sh [porta]
PORT=${1:-3000}

echo "🚀 Iniciando Cloudflare Tunnel na porta $PORT..."
echo ""
echo "ℹ️  Usando Quick Tunnel (modo temporário, sem certificado)"
echo "   Avisos sobre 'origin certificate' podem ser ignorados"
echo ""
echo "📝 Após o túnel iniciar, copie a URL gerada e atualize no .env:"
echo "   NEXT_PUBLIC_APP_URL=https://sua-url.trycloudflare.com"
echo ""
echo "⚠️  Importante: Reinicie o servidor Next.js após atualizar o .env"
echo "   para que a variável NEXT_PUBLIC_APP_URL seja carregada"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Usar --no-autoupdate para evitar avisos sobre atualizações
cloudflared tunnel --url http://localhost:$PORT --no-autoupdate 2>&1 | grep -v "Cannot determine default origin certificate"
