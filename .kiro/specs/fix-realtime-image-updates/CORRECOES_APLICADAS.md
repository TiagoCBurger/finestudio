# Correções Aplicadas - Sistema de Fila e Realtime

## Data: 2025-10-25

## Problema Reportado

O usuário relatou que:
1. Quando envia uma requisição, ela não atualiza automaticamente na fila
2. No nó deveria aparecer a imagem após receber o webhook, mas isso não acontece

## Análise dos Logs

Analisando os logs fornecidos, identificamos:

```
[WEBHOOK-V2] No image URL found in result: {
  result: '{"resultUrls":["https://tempfile.aiquickdraw.com/workers/nano/image_1761432279810_4ubl3s_1x1_1024x1024.png"]}'
}
```

A URL da imagem **está presente** no resultado, mas não está sendo extraída corretamente.

## Correções Aplicadas

### 1. ✅ Extração de URL da Imagem

**Arquivo:** `lib/webhooks/image-webhook-handler.ts`

**Problema:**
A função `extractImageUrl()` esperava que `result` fosse um objeto com propriedade `resultJson`, mas o KIE.ai envia `result` como uma **string JSON diretamente**.

**Solução:**
```typescript
function extractImageUrl(result: unknown): string | null {
    if (!result) {
        return null;
    }

    // ✅ NOVO: Se result é uma string JSON, parsear primeiro
    if (typeof result === 'string') {
        try {
            const parsed = JSON.parse(result);
            if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                return parsed.resultUrls[0];
            }
            // ... outros formatos
        } catch {
            // Se não for JSON válido, ignorar
        }
    }
    
    // ... resto da lógica para objetos
}
```

**Impacto:**
- ✅ Imagens do KIE.ai agora serão extraídas corretamente
- ✅ Imagens aparecerão no nó após webhook
- ✅ Mantém compatibilidade com outros providers (Fal, etc)

### 2. ✅ Logs Diagnósticos Adicionados

**Arquivos Modificados:**
- `lib/webhooks/image-webhook-handler.ts`
- `hooks/use-queue-monitor.ts`
- `components/nodes/image/transform.tsx`

**Logs Adicionados:**

**No Webhook Handler:**
```typescript
console.log('[WEBHOOK-V2] Attempting to extract image URL:', {
    resultType: typeof result,
    resultPreview: ...
});

console.log('[WEBHOOK-V2] Image URL extraction result:', {
    imageUrl: imageUrl ? imageUrl.substring(0, 100) : null,
    success: !!imageUrl
});
```

**No Hook de Fila:**
```typescript
console.log('➕ [QueueMonitor] Inside setJobs callback:', {
    prevJobsCount: prevJobs.length,
    prevJobIds: prevJobs.map(j => j.id),
    newJobId: job.id
});
```

**No Componente de Imagem:**
```typescript
console.log('➕ [ImageTransformV2] BEFORE addJobOptimistically:', { ... });
console.log('➕ [ImageTransformV2] AFTER addJobOptimistically:', { ... });
```

**Impacto:**
- ✅ Melhor rastreabilidade do fluxo de dados
- ✅ Facilita debug de problemas futuros
- ✅ Permite identificar onde o processo falha

## Verificação do Sistema

### Triggers de Realtime ✅

```sql
-- Verificado que os triggers estão ativos
fal_jobs_broadcast_trigger -> notify_fal_job_changes (enabled)
projects_broadcast_trigger -> notify_project_changes (enabled)
```

### Políticas RLS ✅

```sql
-- Verificado que as políticas estão corretas
users_can_receive_fal_jobs_broadcasts (SELECT)
users_can_broadcast_fal_jobs (INSERT)
users_can_receive_project_broadcasts (SELECT)
users_can_broadcast_to_own_projects (INSERT)
```

### Estrutura de Código ✅

- ✅ `useQueueMonitor` implementa `addJobOptimistically`
- ✅ `QueueMonitorProvider` expõe a função no contexto
- ✅ Componente de imagem chama a função corretamente
- ✅ Subscription do Realtime está configurada corretamente

## Problemas Restantes

### ⚠️ Fila Não Atualiza Imediatamente

**Status:** Em investigação

**Sintoma:**
- Job não aparece na fila quando criado
- Só aparece quando webhook retorna

**Possíveis Causas:**
1. Race condition com Realtime
2. Estado não está sendo atualizado corretamente
3. Deduplicação pode estar removendo job otimista

**Próximos Passos:**
1. Executar teste com logs adicionados
2. Verificar se `addJobOptimistically` é realmente chamado
3. Verificar se o estado é atualizado mas não renderiza
4. Verificar timing entre otimista e broadcast

## Como Testar

1. **Reiniciar o servidor Next.js** para aplicar as mudanças
2. **Criar uma nova imagem** no app
3. **Observar os logs** no terminal
4. **Verificar se:**
   - Logs mostram "Image URL extraction result" com sucesso
   - Imagem aparece no nó após ~10-15 segundos
   - Job aparece na fila (imediatamente ou após webhook)

## Logs Esperados (Sucesso)

```
🎨 [GenerateImageV2] Starting generation
✅ [KIE] Job submitted successfully
➕ [ImageTransformV2] BEFORE addJobOptimistically
➕ [QueueMonitor] addJobOptimistically CALLED
➕ [QueueMonitor] Inside setJobs callback
✅ [QueueMonitor] Adding new job optimistically
➕ [ImageTransformV2] AFTER addJobOptimistically

... (após ~10 segundos) ...

🔔 KIE.ai webhook received
[WEBHOOK-V2] Attempting to extract image URL
[WEBHOOK-V2] Image URL extraction result: { success: true }
[WEBHOOK-V2] Image URL extracted
[WEBHOOK-V2] Storage upload complete
[WEBHOOK-V2] Project node updated successfully
```

## Arquivos Modificados

1. `lib/webhooks/image-webhook-handler.ts` - Correção de extração de URL + logs
2. `hooks/use-queue-monitor.ts` - Logs diagnósticos
3. `components/nodes/image/transform.tsx` - Logs diagnósticos

## Próxima Ação

Execute o teste conforme descrito em `TESTE_RAPIDO.md` e reporte os resultados.
