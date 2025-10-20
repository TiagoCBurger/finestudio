# Quick Start: Configurar Webhooks para Desenvolvimento

## 🚀 Passos Rápidos

### 1. Verificar Configuração Atual
```bash
./scripts/check-webhook-config.sh
```

### 2. Iniciar Servidor Next.js
```bash
npm run dev
```

### 3. Iniciar Túnel (em outro terminal)
```bash
./scripts/tunnel.sh
```

### 4. Copiar URL Gerada
Exemplo:
```
https://delayed-romantic-cayman-fairy.trycloudflare.com
```

### 5. Atualizar .env
```bash
NEXT_PUBLIC_APP_URL=https://sua-url-gerada.trycloudflare.com
```

### 6. Reiniciar Servidor Next.js
```bash
# Ctrl+C no terminal do servidor
npm run dev
```

### 7. Testar
Gere uma imagem ou vídeo e verifique os logs:
```
✅ mode: 'WEBHOOK (production/tunnel)'
```

## ⚠️ Avisos que Podem ser Ignorados

```
ERR Cannot determine default origin certificate path...
```
↑ Isso é normal! O túnel funciona mesmo com esse aviso.

## 🐛 Problemas?

Consulte: `CLOUDFLARE_TUNNEL_GUIDE.md`

## 💡 Lembre-se

- **Túnel muda**: URL é diferente cada vez que reiniciar
- **Reinicie o Next.js**: Sempre que atualizar `NEXT_PUBLIC_APP_URL`
- **Mantenha rodando**: Não feche o terminal do cloudflared
