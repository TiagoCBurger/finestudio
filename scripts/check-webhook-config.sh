#!/bin/bash

# Script para verificar se o webhook está configurado corretamente
# Uso: ./scripts/check-webhook-config.sh

echo "🔍 Verificando configuração do webhook..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado${NC}"
    echo "   Crie um arquivo .env baseado no .env.example"
    exit 1
fi

# Verificar NEXT_PUBLIC_APP_URL
if grep -q "NEXT_PUBLIC_APP_URL=" .env; then
    APP_URL=$(grep "NEXT_PUBLIC_APP_URL=" .env | cut -d '=' -f2)
    
    if [ -z "$APP_URL" ]; then
        echo -e "${YELLOW}⚠️  NEXT_PUBLIC_APP_URL está vazio${NC}"
        echo "   Modo: FALLBACK (síncrono, mais lento)"
        echo ""
        echo "   Para usar webhooks:"
        echo "   1. Execute: ./scripts/tunnel.sh"
        echo "   2. Copie a URL gerada"
        echo "   3. Adicione no .env: NEXT_PUBLIC_APP_URL=https://sua-url.trycloudflare.com"
        echo "   4. Reinicie o servidor Next.js"
    else
        echo -e "${GREEN}✅ NEXT_PUBLIC_APP_URL configurado${NC}"
        echo "   URL: $APP_URL"
        echo "   Modo: WEBHOOK (assíncrono, mais rápido)"
        echo ""
        
        # Verificar se a URL é válida
        if [[ $APP_URL == https://*.trycloudflare.com ]]; then
            echo -e "${GREEN}✅ URL do Cloudflare Tunnel detectada${NC}"
            
            # Verificar se o túnel está acessível
            echo ""
            echo "🔍 Testando conectividade..."
            if curl -s --head --request GET "$APP_URL" | grep "200\|301\|302" > /dev/null; then
                echo -e "${GREEN}✅ Túnel está acessível${NC}"
            else
                echo -e "${RED}❌ Túnel não está acessível${NC}"
                echo "   Verifique se o cloudflared está rodando:"
                echo "   ./scripts/tunnel.sh"
            fi
        else
            echo -e "${YELLOW}⚠️  URL não parece ser do Cloudflare Tunnel${NC}"
            echo "   Isso é normal se estiver em produção (Vercel, Railway, etc)"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_APP_URL não encontrado no .env${NC}"
    echo "   Modo: FALLBACK (síncrono, mais lento)"
    echo ""
    echo "   Para usar webhooks:"
    echo "   1. Execute: ./scripts/tunnel.sh"
    echo "   2. Copie a URL gerada"
    echo "   3. Adicione no .env: NEXT_PUBLIC_APP_URL=https://sua-url.trycloudflare.com"
    echo "   4. Reinicie o servidor Next.js"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se cloudflared está instalado
if command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}✅ cloudflared está instalado${NC}"
    cloudflared --version
else
    echo -e "${RED}❌ cloudflared não está instalado${NC}"
    echo ""
    echo "   Instale com:"
    echo "   macOS: brew install cloudflared"
    echo "   Linux: wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared-linux-amd64.deb"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se o servidor Next.js está rodando
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor Next.js está rodando na porta 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor Next.js não está rodando na porta 3000${NC}"
    echo "   Execute: npm run dev"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se cloudflared está rodando
if pgrep -x "cloudflared" > /dev/null; then
    echo -e "${GREEN}✅ cloudflared está rodando${NC}"
    echo "   Processos:"
    ps aux | grep cloudflared | grep -v grep
else
    echo -e "${YELLOW}⚠️  cloudflared não está rodando${NC}"
    echo "   Execute: ./scripts/tunnel.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Para mais informações, consulte: CLOUDFLARE_TUNNEL_GUIDE.md"
echo ""
