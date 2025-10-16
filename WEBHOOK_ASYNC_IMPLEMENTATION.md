# Implementação Assíncrona de Webhooks - Concluída

## ✅ Mudanças Implementadas

### 1. Backend: Retorno Imediato (Não Bloqueia)

#### `lib/models/video/fal.server.ts`
```typescript
// ❌ ANTES: Esperava 3-6 minutos no servidor
const job = await waitForFalJob(request_id, {
    maxWaitTime: 6 * 60 * 1000, // BLOQUEAVA!
});

// ✅ AGORA: Retorna imediatamente
return `pending:${request_id}`;
```

**Benefícios:**
- ✅ Sem timeout de requisição HTTP
- ✅ Servidor não fica bloqueado
- ✅ Melhor escalabilidade
- ✅ Funciona em qualquer plataforma (Vercel, self-hosted)

### 2. Server Action: Detecta Status Pendente

#### `app/actions/video/create.ts`
```typescript
// Detecta se é um job pendente
if (url.startsWith('pending:')) {
    const requestId = url.replace('pending:', '');
    
    // Retorna status pendente para o frontend
    return {
        nodeData: {
            status: 'pending',
            requestId,
            updatedAt: new Date().toISOString(),
        },
    };
}
```

### 3. Frontend Hook: Polling Automático

#### `hooks/use-fal-job.ts` (NOVO)
```typescript
const { job, isPolling, isCompleted } = useFalJob({
    requestId: 'abc123',
    pollInterval: 3000, // 3 segundos
    maxPollTime: 10 * 60 * 1000, // 10 minutos
    onCompleted: (job) => {
        // Atualizar UI com resultado
        console.log('Video ready!', job.result);
    },
    onFailed: (error) => {
        console.error('Generation failed:', error);
    },
});
```

## 🔄 Fluxo Completo

### Geração de Vídeo (Exemplo)

```
1. User clica "Generate Video"
   ↓
2. Frontend chama generateVideoAction()
   ↓
3. Backend submete para Fal.ai
   ↓
4. Backend salva job no banco (status: pending)
   ↓
5. Backend retorna IMEDIATAMENTE: { status: 'pending', requestId: 'abc123' }
   ↓
6. Frontend recebe resposta (< 1 segundo)
   ↓
7. Frontend inicia polling com useFalJob()
   ↓
8. [3-6 minutos depois] Fal.ai envia webhook
   ↓
9. Webhook atualiza banco (status: completed, result: {...})
   ↓
10. Frontend detecta mudança no próximo poll
   ↓
11. Frontend atualiza UI com vídeo pronto
```

### Timeline

```
0s    - User clica "Generate"
0.5s  - Backend retorna (pending)
0.5s  - Frontend mostra "Generating..." e inicia polling
3s    - Poll #1 (ainda pending)
6s    - Poll #2 (ainda pending)
...
180s  - Webhook chega (completed)
183s  - Poll #61 detecta completed
183s  - UI atualiza com vídeo
```

## 📝 Como Usar no Frontend

### Exemplo: Componente de Vídeo

```typescript
'use client';

import { useState } from 'react';
import { useFalJob } from '@/hooks/use-fal-job';
import { generateVideoAction } from '@/app/actions/video/create';

export function VideoGenerator() {
    const [requestId, setRequestId] = useState<string | null>(null);

    const { job, isPolling, isCompleted, error } = useFalJob({
        requestId,
        onCompleted: (job) => {
            const result = job.result as { video: { url: string } };
            console.log('Video ready:', result.video.url);
            // Atualizar node com URL do vídeo
        },
        onFailed: (error) => {
            console.error('Failed:', error);
            // Mostrar erro para usuário
        },
    });

    const handleGenerate = async () => {
        const result = await generateVideoAction({
            modelId: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
            prompt: 'A cat playing piano',
            images: [],
            duration: 5,
            aspectRatio: '16:9',
            nodeId: 'node-123',
            projectId: 'project-456',
        });

        if ('error' in result) {
            console.error(result.error);
            return;
        }

        // Check if pending
        if ('status' in result.nodeData && result.nodeData.status === 'pending') {
            setRequestId(result.nodeData.requestId);
            console.log('Job submitted, polling started');
        }
    };

    return (
        <div>
            <button onClick={handleGenerate} disabled={isPolling}>
                {isPolling ? 'Generating...' : 'Generate Video'}
            </button>

            {isPolling && (
                <div>
                    <p>Status: {job?.status || 'pending'}</p>
                    <p>Polling... (this may take 3-6 minutes)</p>
                </div>
            )}

            {isCompleted && (
                <div>
                    <p>✅ Video ready!</p>
                    <video src={(job?.result as any)?.video?.url} controls />
                </div>
            )}

            {error && (
                <div>
                    <p>❌ Error: {error}</p>
                </div>
            )}
        </div>
    );
}
```

## 🔧 Configuração

### Timeouts Recomendados

```typescript
// Frontend Polling
const POLL_INTERVAL = 3000; // 3 segundos (não sobrecarrega servidor)
const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutos (tempo máximo de espera)

// Webhook Handler
// Sem timeout - processa quando chegar
```

### Variáveis de Ambiente

```bash
# .env
NEXT_PUBLIC_APP_URL=https://your-tunnel-url.ngrok.io  # Para webhooks
```

## 🐛 Troubleshooting

### Problema: "Job not found" no polling

**Causa:** Job não foi criado no banco antes do polling começar

**Solução:** Verificar se `createFalJob()` foi chamado antes de retornar

### Problema: Polling nunca completa

**Causa:** Webhook não está chegando

**Solução:**
1. Verificar se tunnel está funcionando
2. Verificar logs do webhook handler
3. Verificar se `NEXT_PUBLIC_APP_URL` está correto

### Problema: Timeout após 10 minutos

**Causa:** Geração levou mais tempo que o esperado

**Solução:**
1. Aumentar `maxPollTime` no `useFalJob`
2. Verificar se Fal.ai está com problemas
3. Verificar logs do webhook para erros

## 📊 Monitoramento

### Logs Importantes

**Backend (Submissão):**
```
✅ Video job saved, returning immediately (webhook will update)
⏱️ Expected completion time: 2-3 minutes
```

**Webhook (Quando chega):**
```
✅ Fal.ai webhook received: { request_id: 'xxx', status: 'OK' }
✅ Video uploaded to storage: https://...
✅ Job completed: xxx
```

**Frontend (Polling):**
```
[useFalJob] Job status: { requestId: 'xxx', status: 'pending', elapsed: '3s' }
[useFalJob] Job status: { requestId: 'xxx', status: 'pending', elapsed: '6s' }
...
[useFalJob] Job status: { requestId: 'xxx', status: 'completed', elapsed: '183s' }
[useFalJob] Job completed successfully
```

## ✅ Checklist de Implementação

- [x] Backend retorna imediatamente (não espera webhook)
- [x] Server action detecta status pendente
- [x] Hook de polling criado (`useFalJob`)
- [x] Webhook handler atualiza banco de dados
- [x] API endpoint para consultar status (`/api/fal-jobs/[requestId]`)
- [ ] Frontend integrado com `useFalJob` (próximo passo)
- [ ] UI mostra status de progresso
- [ ] Tratamento de erros no frontend

## 🚀 Próximos Passos

1. **Integrar `useFalJob` nos componentes de vídeo**
2. **Adicionar UI de progresso** (loading spinner, progress bar)
3. **Testar com tunnel funcionando**
4. **Considerar Supabase Realtime** (opcional, para notificações instantâneas)

## 🎯 Resultado Esperado

- ✅ Requisições retornam em < 1 segundo
- ✅ Sem timeouts de HTTP
- ✅ UI responsiva durante geração
- ✅ Webhook processa assincronamente
- ✅ Frontend atualiza automaticamente quando pronto
