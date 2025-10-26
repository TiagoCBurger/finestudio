#!/bin/bash

# Script para desenvolvimento local com HTTPS via ngrok
# Inicia o servidor Next.js e o túnel ngrok simultaneamente

PORT=3000

echo "🚀 Iniciando ambiente de desenvolvimento com HTTPS..."
echo ""
echo "Este script irá:"
echo "  1. Iniciar o servidor Next.js na porta $PORT"
echo "  2. Expor via ngrok com HTTPS"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok não está instalado!"
    echo ""
    echo "Para instalar no macOS: brew install ngrok"
    exit 1
fi

# Função para limpar processos ao sair
cleanup() {
    echo ""
    echo "🛑 Encerrando servidores..."
    kill $NEXT_PID $NGROK_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar Next.js em background
echo "▶️  Iniciando Next.js..."
npm run dev &
NEXT_PID=$!

# Aguardar Next.js iniciar
echo "⏳ Aguardando Next.js iniciar..."
sleep 5

# Iniciar ngrok em background
echo ""
echo "▶️  Iniciando ngrok..."
ngrok http $PORT --log=stdout &
NGROK_PID=$!

echo ""
echo "✅ Servidores iniciados!"
echo ""
echo "📝 Próximos passos:"
echo "  1. Copie a URL HTTPS do ngrok (acima)"
echo "  2. Atualize no .env: NEXT_PUBLIC_APP_URL=https://sua-url.ngrok-free.app"
echo "  3. Reinicie este script (Ctrl+C e execute novamente)"
echo "  4. Configure os webhooks nos provedores:"
echo "     - FAL:  https://sua-url.ngrok-free.app/api/webhooks/fal"
echo "     - KIE:  https://sua-url.ngrok-free.app/api/webhooks/kie"
echo ""
echo "💡 Acesse a aplicação pela URL HTTPS do ngrok para evitar erros de WebSocket"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Manter o script rodando
wait
