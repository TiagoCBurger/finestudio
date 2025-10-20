# Cloudflare Tunnel - Guia Rápido

## Por que usar?

Para que webhooks do fal.ai funcionem em desenvolvimento local, você precisa expor sua aplicação para a internet. O Cloudflare Tunnel substitui o Serveo (que está fora do ar).

## Instalação

```bash
brew install cloudflare/cloudflare/cloudflared
```

## Uso

### Opção 1: Script Helper (Recomendado)

```bash
# Inicia o tunnel na porta 3000 (padrão)
./scripts/tunnel.sh

# Ou especifique outra porta
./scripts/tunnel.sh 3001
```

### Opção 2: Comando Direto

```bash
cloudflared tunnel --url http://localhost:3000
```

## Configuração

1. Execute o script/comando acima
2. Copie a URL gerada (ex: `https://abc-123.trycloudflare.com`)
3. Atualize no `.env`:
   ```
   NEXT_PUBLIC_APP_URL=https://abc-123.trycloudflare.com
   ```
4. Reinicie o servidor Next.js

## Notas

- A URL muda a cada execução (URLs temporárias)
- Gratuito e sem necessidade de cadastro
- Mais estável que Serveo
- Para URLs fixas, use ngrok ou configure um tunnel permanente do Cloudflare

## Alternativas

Se preferir URLs fixas:

```bash
# ngrok (requer cadastro gratuito)
brew install ngrok
ngrok http 3000
```
