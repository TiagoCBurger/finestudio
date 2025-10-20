# Guia: Cloudflare Tunnel para Webhooks

## 🎯 Por que usar o Cloudflare Tunnel?

O Cloudflare Tunnel permite que webhooks externos (como fal.ai) acessem seu servidor local durante o desenvolvimento, sem precisar fazer deploy.

## 🚀 Como Usar

### 1. Instalar cloudflared

**macOS (Homebrew)**:
```bash
brew install cloudflared
```

**Linux**:
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**Windows**:
Baixe de: https://github.com/cloudflare/cloudflared/releases

### 2. Iniciar o Servidor Next.js

```bash
npm run dev
# ou
pnpm dev
```

Aguarde o servidor iniciar na porta 3000 (ou outra porta configurada).

### 3. Iniciar o Túnel

Em um **terminal separado**:

```bash
./scripts/tunnel.sh
# ou especificar porta
./scripts/tunnel.sh 3000
```

### 4. Copiar a URL do Túnel

O cloudflared vai gerar uma URL temporária como:

```
https://delayed-romantic-cayman-fairy.trycloudflare.com
```

**Copie essa URL!**

### 5. Atualizar o .env

Adicione a URL no arquivo `.env`:

```bash
NEXT_PUBLIC_APP_URL=https://sua-url-gerada.trycloudflare.com
```

### 6. Reiniciar o Servidor Next.js

**IMPORTANTE**: Variáveis `NEXT_PUBLIC_*` só são carregadas no build/start.

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

### 7. Testar

Gere uma imagem ou vídeo e verifique os logs:

```
Fal.ai video submission mode: {
  mode: 'WEBHOOK (production/tunnel)',
  webhookUrl: 'https://sua-url.trycloudflare.com/api/webhooks/fal'
}
```

## ⚠️ Avisos Comuns (Podem ser Ignorados)

### "Cannot determine default origin certificate path"

```
ERR Cannot determine default origin certificate path. No file cert.pem...
```

**Causa**: O cloudflared procura por um certificado de túnel nomeado (named tunnel).

**Solução**: Ignorar! Estamos usando **Quick Tunnel** (modo temporário) que não precisa de certificado.

**Status**: ✅ O túnel funciona normalmente mesmo com esse aviso.

### "Created ICMP proxy listening on..."

```
INF Created ICMP proxy listening on 192.168.0.61:0
```

**Causa**: O cloudflared cria um proxy ICMP para melhor performance.

**Status**: ✅ Normal, não é um erro.

## 🔍 Verificar se o Túnel Está Funcionando

### Teste 1: Acessar via Browser

Abra a URL do túnel no navegador:
```
https://sua-url.trycloudflare.com
```

Você deve ver sua aplicação Next.js.

### Teste 2: Verificar Webhook

Nos logs do Next.js, procure por:
```
Fal.ai video submission mode: {
  mode: 'WEBHOOK (production/tunnel)',
  webhookUrl: 'https://...'
}
```

Se aparecer `mode: 'WEBHOOK'`, está funcionando! ✅

Se aparecer `mode: 'FALLBACK'`, o túnel não está configurado. ❌

### Teste 3: Gerar Imagem/Vídeo

1. Gere uma imagem ou vídeo
2. Verifique os logs do webhook:
   ```
   Fal.ai webhook received: { request_id: '...', status: 'COMPLETED' }
   ```

## 🐛 Troubleshooting

### Problema: Modo FALLBACK em vez de WEBHOOK

**Sintoma**:
```
Fal.ai video submission mode: {
  mode: 'FALLBACK (dev only)',
  webhookUrl: 'N/A'
}
```

**Causa**: `NEXT_PUBLIC_APP_URL` não está definido ou não foi carregado.

**Solução**:
1. Verificar se `.env` tem `NEXT_PUBLIC_APP_URL=https://...`
2. **Reiniciar o servidor Next.js** (Ctrl+C e `npm run dev`)
3. Verificar se a variável foi carregada:
   ```bash
   echo $NEXT_PUBLIC_APP_URL
   ```

### Problema: Túnel Desconecta

**Sintoma**: URL do túnel para de funcionar após alguns minutos.

**Causa**: Quick Tunnels são temporários e podem desconectar.

**Solução**:
1. Reiniciar o túnel: `./scripts/tunnel.sh`
2. Copiar a **nova URL** gerada
3. Atualizar `.env` com a nova URL
4. Reiniciar o servidor Next.js

### Problema: Webhook Não Recebe Notificações

**Sintoma**: Geração fica em loading infinito.

**Verificações**:

1. **Túnel está rodando?**
   ```bash
   # Verificar se cloudflared está ativo
   ps aux | grep cloudflared
   ```

2. **URL está correta no .env?**
   ```bash
   cat .env | grep NEXT_PUBLIC_APP_URL
   ```

3. **Servidor foi reiniciado após atualizar .env?**
   - Variáveis `NEXT_PUBLIC_*` precisam de restart

4. **Logs do webhook aparecem?**
   - Se não aparecer nada, o webhook não está chegando
   - Verificar se a URL do túnel está acessível

## 📊 Comparação: Quick Tunnel vs Named Tunnel

| Característica | Quick Tunnel | Named Tunnel |
|----------------|--------------|--------------|
| **Configuração** | Nenhuma | Requer certificado |
| **URL** | Aleatória | Fixa |
| **Duração** | Temporária | Permanente |
| **Uso** | Desenvolvimento | Produção |
| **Comando** | `cloudflared tunnel --url` | `cloudflared tunnel run` |

Para desenvolvimento, **Quick Tunnel é suficiente**! ✅

## 🎯 Fluxo Completo

```
┌─────────────────┐
│ 1. npm run dev  │ (Porta 3000)
└────────┬────────┘
         │
┌────────▼────────────────┐
│ 2. ./scripts/tunnel.sh  │
└────────┬────────────────┘
         │
┌────────▼─────────────────────────────────┐
│ 3. Copiar URL:                           │
│    https://abc-xyz.trycloudflare.com     │
└────────┬─────────────────────────────────┘
         │
┌────────▼──────────────────────────────┐
│ 4. Atualizar .env:                    │
│    NEXT_PUBLIC_APP_URL=https://...    │
└────────┬──────────────────────────────┘
         │
┌────────▼────────────┐
│ 5. Reiniciar dev    │ (Ctrl+C + npm run dev)
└────────┬────────────┘
         │
┌────────▼────────────┐
│ 6. Testar webhook   │ ✅
└─────────────────────┘
```

## 💡 Dicas

1. **Mantenha o túnel rodando**: Não feche o terminal do cloudflared
2. **URL muda**: Cada vez que reiniciar o túnel, a URL será diferente
3. **Reinicie o Next.js**: Sempre que atualizar `NEXT_PUBLIC_APP_URL`
4. **Logs são seus amigos**: Verifique os logs para debug
5. **Produção**: Use variáveis de ambiente do Vercel/Railway/etc

## 🚀 Alternativas para Produção

Em produção, você não precisa do túnel! Use:

- **Vercel**: Variáveis de ambiente automáticas
- **Railway**: Configure `NEXT_PUBLIC_APP_URL` no dashboard
- **Netlify**: Configure nas variáveis de ambiente
- **Docker**: Use variáveis de ambiente do container

O túnel é **apenas para desenvolvimento local**! 🎯
