# Análise de Timeouts do Sistema Webhook

## Problema Identificado

O sistema está esperando pelo webhook, mas há um **problema crítico de timeout**:

### Timeouts Atuais

#### 1. **Video Generation** (`lib/models/video/fal.server.ts`)
```typescript
// Sora 2: 6 minutos
const maxWaitTime = modelId.includes('sora')
    ? 6 * 60 * 1000  // 360,000ms = 6 minutos
    : 3 * 60 * 1000; // 180,000ms = 3 minutos (Kling)

const job = await waitForFalJob(request_id, {
    maxWaitTime,
    pollInterval: 3000, // 3 segundos
});
```

#### 2. **Image Generation** (`lib/models/image/fal.server.ts`)
```typescript
// ❌ PROBLEMA: Não está usando waitForFalJob!
// Retorna imediatamente sem esperar pelo webhook
return pendingResult; // Retorna instantaneamente
```

#### 3. **Polling Function** (`lib/fal-jobs.ts`)
```typescript
const maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutos padrão
const pollInterval = options.pollInterval || 2000; // 2 segundos padrão
```

## ⚠️ Problema Crítico: Next.js Request Timeout

**Next.js tem um timeout de requisição padrão:**
- **Vercel (Production):** 10 segundos (Hobby), 60 segundos (Pro), 300 segundos (Enterprise)
- **Next.js Dev:** ~5 minutos (mas pode variar)
- **Self-hosted:** Depende do servidor (Nginx, etc.)

### O Que Acontece Agora

```
1. User gera vídeo
2. Server chama fal.ai (instantâneo)
3. Server salva job no banco (instantâneo)
4. Server ESPERA pelo webhook via polling (3-6 minutos!) ❌
5. Next.js TIMEOUT antes do webhook chegar! ❌
```

**Resultado:** A requisição HTTP timeout antes do webhook ser recebido!

## 🎯 Logs do Seu Sistema

```
Video job saved, waiting for webhook...
POST /projects/cd882720-e06d-4a9e-8a13-a7d268871652 200 in 192680ms
```

**192680ms = 3.2 minutos** - A requisição está bloqueada esperando!

## Solução: Arquitetura Assíncrona

### Arquitetura Atual (Problemática)
```
Client → Server Action → Fal.ai Submit → Wait (3-6min) → Webhook → Return
                                          ↑
                                    TIMEOUT AQUI!
```

### Arquitetura Correta (Assíncrona)
```
Client → Server Action → Fal.ai Submit → Return Immediately
                              ↓
                         Webhook (async) → Update DB → Notify Client
                              ↓
Client ← Polling/Realtime ← DB Update
```

## Implementação Recomendada

### Opção 1: Retornar Imediatamente + Frontend Polling (Atual para Imagens)

**Backend:**
```typescript
// Submeter job
await createFalJob({ requestId, userId, modelId, type: 'video', input });

// ✅ Retornar IMEDIATAMENTE (não esperar)
return {
    status: 'pending',
    requestId: request_id,
    message: 'Video generation started'
};
```

**Frontend:**
```typescript
// Polling no frontend
const pollJobStatus = async (requestId: string) => {
    const response = await fetch(`/api/fal-jobs/${requestId}`);
    const job = await response.json();
    
    if (job.status === 'completed') {
        // Atualizar UI com resultado
        updateNode(job.result);
    } else if (job.status === 'pending') {
        // Continuar polling
        setTimeout(() => pollJobStatus(requestId), 3000);
    }
};
```

### Opção 2: Supabase Realtime (Melhor UX)

**Backend (Webhook):**
```typescript
// Quando webhook chega
await database.update(falJobs).set({ status: 'completed', result });

// Broadcast via Realtime
await supabase.channel(`job:${requestId}`)
    .send({
        type: 'broadcast',
        event: 'job_completed',
        payload: { requestId, result }
    });
```

**Frontend:**
```typescript
// Escutar mudanças em tempo real
const channel = supabase.channel(`job:${requestId}`)
    .on('broadcast', { event: 'job_completed' }, (payload) => {
        updateNode(payload.result);
    })
    .subscribe();
```

## Timeouts Recomendados

### Backend (Server-Side Polling)
```typescript
// ❌ NÃO FAZER: Esperar 3-6 minutos no server
await waitForFalJob(request_id, { maxWaitTime: 6 * 60 * 1000 });

// ✅ FAZER: Retornar imediatamente
return { status: 'pending', requestId };
```

### Frontend (Client-Side Polling)
```typescript
// ✅ Polling no frontend (não bloqueia servidor)
const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutos
const POLL_INTERVAL = 3000; // 3 segundos

// Polling com timeout no cliente
```

### Webhook Handler
```typescript
// ✅ Webhook processa assincronamente
// Sem timeout - processa quando chegar
export const POST = async (req: Request) => {
    // Processar webhook
    // Atualizar banco
    // Notificar cliente (via Realtime ou polling)
};
```

## Configurações de Timeout

### Next.js (next.config.js)
```javascript
module.exports = {
    // Aumentar timeout para API routes (não recomendado)
    experimental: {
        proxyTimeout: 300000, // 5 minutos (máximo razoável)
    }
};
```

### Vercel (vercel.json)
```json
{
    "functions": {
        "app/api/**/*.ts": {
            "maxDuration": 300 // 5 minutos (Enterprise only)
        }
    }
}
```

## Recomendação Final

**Para Vídeos (3-6 minutos de geração):**
1. ✅ Retornar imediatamente após submeter para fal.ai
2. ✅ Webhook atualiza banco de dados
3. ✅ Frontend faz polling ou usa Realtime
4. ❌ NÃO esperar no servidor (causa timeout)

**Para Imagens (30-60 segundos de geração):**
1. ✅ Pode esperar até 60 segundos no servidor (se necessário)
2. ✅ Ou usar mesma arquitetura assíncrona dos vídeos
3. ✅ Webhook + Frontend polling (mais escalável)

## Próximos Passos

1. **Remover `waitForFalJob` do video/fal.server.ts**
2. **Retornar imediatamente após submeter job**
3. **Implementar polling no frontend** (ou Realtime)
4. **Testar com tunnel funcionando**

Isso resolve:
- ✅ Timeouts de requisição
- ✅ Escalabilidade
- ✅ Melhor UX (não bloqueia)
- ✅ Funciona em qualquer plataforma (Vercel, self-hosted, etc.)
