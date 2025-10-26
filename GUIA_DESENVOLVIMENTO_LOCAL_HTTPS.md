# Guia: Desenvolvimento Local com HTTPS

## Por que HTTPS é necessário?

O Supabase Realtime usa WebSocket Secure (WSS) quando conecta de um contexto HTTPS. Se você está acessando seu app via HTTP, mas o Supabase está em HTTPS, pode haver problemas de mixed content e conexões WebSocket.

## Opções para HTTPS Local

### Opção 1: Cloudflare Tunnel (Recomendado - Mais Rápido)

**Vantagens:**
- Gratuito e sem cadastro
- Muito rápido de configurar
- URL temporária mas funcional

**Desvantagens:**
- URL muda a cada reinício
- Pode ter timeout em requisições muito longas

**Como usar:**

```bash
# 1. Instalar cloudflared (se ainda não tiver)
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 2. Iniciar seu servidor Next.js
npm run dev

# 3. Em outro terminal, iniciar o tunnel
chmod +x scripts/tunnel.sh
./scripts/tunnel.sh 3000

# 4. Copiar a URL gerada (ex: https://abc-def-ghi.trycloudflare.com)

# 5. Atualizar .env
# NEXT_PUBLIC_APP_URL=https://abc-def-ghi.trycloudflare.com

# 6. Reiniciar o servidor Next.js
```

### Opção 2: ngrok (Recomendado - Mais Estável)

**Vantagens:**
- Muito estável para webhooks
- Não cancela requisições longas
- URL pode ser permanente (com conta gratuita)
- Interface web para debug (http://localhost:4040)

**Desvantagens:**
- Requer instalação
- Limite de requisições no plano gratuito

**Como usar:**

```bash
# 1. Instalar ngrok
# macOS
brew install ngrok

# Linux
snap install ngrok

# Windows
choco install ngrok

# 2. (Opcional) Criar conta gratuita em https://ngrok.com
# e configurar authtoken para URL permanente
ngrok config add-authtoken SEU_TOKEN

# 3. Iniciar seu servidor Next.js
npm run dev

# 4. Em outro terminal, iniciar o tunnel
chmod +x scripts/tunnel-ngrok.sh
./scripts/tunnel-ngrok.sh 3000

# 5. Copiar a URL HTTPS (ex: https://abc123.ngrok-free.app)

# 6. Atualizar .env
# NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app

# 7. Reiniciar o servidor Next.js
```

### Opção 3: localhost.run (Sem Instalação)

**Vantagens:**
- Não precisa instalar nada
- Usa apenas SSH

**Como usar:**

```bash
# 1. Iniciar seu servidor Next.js
npm run dev

# 2. Em outro terminal, criar tunnel via SSH
ssh -R 80:localhost:3000 nokey@localhost.run

# 3. Copiar a URL gerada

# 4. Atualizar .env e reiniciar
```

### Opção 4: Certificado SSL Local (Mais Complexo)

**Vantagens:**
- Funciona offline
- URL sempre a mesma (localhost)

**Desvantagens:**
- Configuração mais complexa
- Avisos de certificado não confiável

**Como usar:**

```bash
# 1. Instalar mkcert
brew install mkcert
mkcert -install

# 2. Criar certificados
mkdir -p .cert
mkcert -key-file .cert/localhost-key.pem -cert-file .cert/localhost.pem localhost

# 3. Configurar Next.js para usar HTTPS
# Criar server.js na raiz do projeto
```

Depois criar `server.js`:

```javascript
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./.cert/localhost-key.pem'),
  cert: fs.readFileSync('./.cert/localhost.pem'),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on https://localhost:3000');
  });
});
```

E atualizar `package.json`:

```json
{
  "scripts": {
    "dev": "node server.js",
    "dev:http": "next dev"
  }
}
```

## Workflow Recomendado

### Para Desenvolvimento Rápido (Cloudflare)

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Tunnel
./scripts/tunnel.sh

# Copiar URL, atualizar .env, reiniciar Next.js
```

### Para Webhooks e Testes Estáveis (ngrok)

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Tunnel
./scripts/tunnel-ngrok.sh

# Copiar URL, atualizar .env, reiniciar Next.js
# Configurar webhooks com a URL do ngrok
```

## Checklist de Configuração

Após iniciar o tunnel:

- [ ] Copiar a URL HTTPS gerada
- [ ] Atualizar `NEXT_PUBLIC_APP_URL` no `.env`
- [ ] Reiniciar o servidor Next.js (Ctrl+C e `npm run dev`)
- [ ] Verificar que a variável foi carregada (console do navegador)
- [ ] Testar conexão Realtime
- [ ] (Se usar webhooks) Atualizar URLs de webhook nos serviços externos

## Troubleshooting

### WebSocket ainda não conecta

1. Verifique se está acessando via HTTPS (não HTTP)
2. Verifique se `NEXT_PUBLIC_APP_URL` está correto no `.env`
3. Reinicie o servidor Next.js após mudar `.env`
4. Limpe o cache do navegador (Cmd+Shift+R / Ctrl+Shift+R)

### Tunnel desconecta frequentemente

- Use ngrok em vez de Cloudflare Tunnel
- Verifique sua conexão de internet
- Considere usar URL permanente do ngrok (conta gratuita)

### Webhooks não chegam

- Use ngrok (mais estável para webhooks)
- Verifique se a URL do webhook está cor