# 🔧 Correção: Webhook Timeout no Cloudflare Tunnel

## Problema Identificado

```
ERR Request failed error="Incoming request ended abruptly: context canceled"
```

**Causa:** Cloudflare Tunnel está cancelando requisições do webhook KIE.ai antes delas completarem.

**Resultado:**
- ❌ Webhook nunca chega ao servidor
- ❌ Banco de dados nunca é atualizado
- ❌ Realtime nunca é notificado
- ❌ Nó fica travado em loading ou mostra "?"

## Soluções

### Solução 1: Usar ngrok (Recomendado para Desenvolvimento)

ngrok é mais estável para webhooks e não cancela requisições.

#### Instalar ngrok
```bash
# macOS
brew install ngrok

# Ou baixar de https://ngrok.com/download
```

#### Criar script de túnel com ngrok
```bash
# scripts/tunnel-ngrok.sh
#!/bin/bash
PORT=${1:-3000}

echo "🚀 Iniciando ngrok tunnel na porta $PORT..."
echo ""
echo "📝 Após o túnel iniciar, copie a URL HTTPS e atualize no .env:"
echo "   NEXT_PUBLIC_APP_URL=https://sua-url.ngrok-free.app"
echo ""

ngrok http $PORT
```

#### Usar
```bash
chmod +x scripts/tunnel-ngrok.sh
./scripts/tunnel-ngrok.sh 3000
```

### Solução 2: Webhook com Retry (Implementar no KIE.ai)

Se você controla a configuração do webhook no KIE.ai, configure retry:

```javascript
// Configuração do webhook no KIE.ai
{
  "url": "https://sua-url.trycloudflare.com/api/webhooks/kie",
  "retry": {
    "max_attempts": 3,
    "backoff": "exponential"
  },
  "timeout": 30000 // 30 segundos
}
```

### Solução 3: Webhook Assíncrono (Melhor para Produção)

Modificar o webhook para responder imediatamente e processar em background:

```typescript
// app/api/webhooks/kie/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ Responder imediatamente (200 OK)
    const response = NextResponse.json({ received: true });
    
    // 🔄 Processar em background (não bloqueia resposta)
    processWebhookInBackground(body).catch(error => {
      console.error('Background processing error:', error);
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

async function processWebhookInBackground(body: any) {
  // Todo o processamento atual do webhook aqui
  // Upload de imagem, atualização do banco, etc.
}
```

### Solução 4: Polling como Fallback

Se webhook falhar, usar polling como backup:

```typescript
// hooks/use-image-generation.ts
export function useImageGeneration(nodeId: string, requestId: string | null) {
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;
  
  useEffect(() => {
    if (!requestId) return;
    
    // Aguardar webhook por 30 segundos
    const webhookTimeout = setTimeout(() => {
      console.warn('⚠️ Webhook timeout, iniciando polling...');
      startPolling();
    }, 30000);
    
    const startPolling = () => {
      const interval = setInterval(async () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error('❌ Polling timeout após', maxAttempts, 'tentativas');
          return;
        }
        
        try {
          const response = await fetch(`/api/fal-jobs/${requestId}`);
          const job = await response.json();
          
          if (job.status === 'completed') {
            clearInterval(interval);
            console.log('✅ Job completado via polling');
            // Atualizar nó manualmente
          }
          
          setAttempts(prev => prev + 1);
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Poll a cada 3 segundos
    };
    
    return () => {
      clearTimeout(webhookTimeout);
    };
  }, [requestId, attempts]);
}
```

## Solução Temporária Rápida

Enquanto não implementa uma solução permanente, você pode:

### 1. Reiniciar o Túnel Frequentemente
```bash
# Parar túnel atual (Ctrl+C)
# Reiniciar
./scripts/tunnel.sh 3000
```

### 2. Usar Timeout Maior no Next.js

```typescript
// next.config.ts
export default {
  // ... outras configs
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      timeout: 60000, // 60 segundos
    },
  },
  // Aumentar timeout de API routes
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
```

### 3. Adicionar Health Check no Webhook

```typescript
// app/api/webhooks/kie/health/route.ts
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    tunnel: 'active'
  });
}
```

Teste com:
```bash
curl https://sua-url.trycloudflare.com/api/webhooks/kie/health
```

## Logs para Verificar

### Terminal do Túnel
```
✅ Bom: Connection established
❌ Ruim: context canceled
❌ Ruim: connection reset
```

### Terminal do Next.js
```
✅ Bom: 🔔 KIE.ai webhook received
❌ Ruim: Nenhum log (webhook não chegou)
```

### Console do Navegador
```
✅ Bom: 📨 Broadcast received
❌ Ruim: Nenhum broadcast (webhook não atualizou banco)
```

## Teste de Conectividade

```bash
# Testar se webhook está acessível
curl -X POST https://sua-url.trycloudflare.com/api/webhooks/kie \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Deve retornar erro 400 (payload inválido) mas confirma que chegou
```

## Recomendação Final

Para desenvolvimento local com webhooks:

1. **Use ngrok** - Mais estável que Cloudflare Tunnel
2. **Implemente retry** - No lado do KIE.ai se possível
3. **Adicione polling como fallback** - Para casos onde webhook falha
4. **Para produção** - Use Vercel/Netlify que têm URLs estáveis

## Script Melhorado com ngrok

```bash
#!/bin/bash
# scripts/tunnel-ngrok.sh

PORT=${1:-3000}

echo "🚀 Iniciando ngrok tunnel na porta $PORT..."
echo ""
echo "⚠️  IMPORTANTE: Após obter a URL, atualize:"
echo "   1. .env: NEXT_PUBLIC_APP_URL=https://sua-url.ngrok-free.app"
echo "   2. KIE.ai: Configure webhook URL"
echo "   3. Reinicie o servidor Next.js"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Iniciar ngrok
ngrok http $PORT --log=stdout
```

Isso deve resolver o problema de webhook timeout!
