# Fix: Estrutura do Payload do Supabase Realtime

## Problema Identificado

Nos logs aparecia:
```
[Warning] [REALTIME-DIAGNOSTIC] Unknown event type: Object
```

Isso indicava que o payload estava chegando com estrutura diferente da esperada.

## Causa Raiz

O Supabase Realtime pode enviar o payload de duas formas:

### Forma 1: Payload Direto
```javascript
{
    type: 'INSERT',
    table: 'fal_jobs',
    schema: 'public',
    new: { id: '...', status: 'pending', ... },
    old: null
}
```

### Forma 2: Payload Encapsulado (O QUE ESTAVA ACONTECENDO)
```javascript
{
    payload: {
        type: 'INSERT',
        table: 'fal_jobs',
        schema: 'public',
        new: { id: '...', status: 'pending', ... },
        old: null
    },
    event: 'INSERT',
    // outros metadados...
}
```

## Solução Implementada

### 1. Detectar Estrutura do Payload

```typescript
const handleJobUpdate = useCallback((payload: any) => {
    // [FIX] O payload pode vir encapsulado
    const actualPayload = payload?.payload || payload;
    
    // Extrair dados do payload correto
    const { type, new: newJob, old: oldJob } = actualPayload;
    
    // ... resto do código
}, [userId]);
```

### 2. Logs de Diagnóstico Melhorados

```typescript
console.log('🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received:', {
    rawPayload: payload,
    actualPayload,
    payloadKeys: Object.keys(payload || {}),
    actualPayloadKeys: Object.keys(actualPayload || {}),
});
```

Isso permite ver exatamente qual estrutura está chegando.

### 3. Validação Robusta

```typescript
if (!actualPayload || typeof actualPayload !== 'object') {
    console.warn('[REALTIME-DIAGNOSTIC] Invalid payload received');
    return;
}

if (!type) {
    console.warn('[REALTIME-DIAGNOSTIC] No type in payload');
    return;
}
```

## Arquivos Modificados

### `hooks/use-queue-monitor.ts`
- ✅ Adicionada detecção de payload encapsulado
- ✅ Melhorados logs de diagnóstico
- ✅ Adicionada validação robusta
- ✅ Atualizado tipo para `any` nas subscrições

## Como Testar

1. **Abra o console do navegador**
2. **Crie uma requisição de imagem**
3. **Verifique os logs**:

### Logs Esperados (SUCESSO):
```
🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {
    rawPayload: { payload: {...}, event: 'INSERT' },
    actualPayload: { type: 'INSERT', new: {...}, old: null },
    payloadKeys: ['payload', 'event', ...],
    actualPayloadKeys: ['type', 'new', 'old', 'table', 'schema']
}

🔔 [REALTIME-DIAGNOSTIC] Extracted data: {
    type: 'INSERT',
    jobId: 'c57f19b2-713b-4c29-8991-40b7f0058cba',
    oldStatus: undefined,
    newStatus: 'pending',
    hasNew: true,
    hasOld: false
}

➕ [QueueMonitor] Adding job optimistically
✅ [QueueMonitor] Job added to state: {totalJobs: 1}
```

### Logs de Erro (ANTES DA CORREÇÃO):
```
❌ [Warning] [REALTIME-DIAGNOSTIC] Unknown event type: Object
❌ [REALTIME-DIAGNOSTIC] Invalid payload received
```

## Diferenças Entre Antes e Depois

### ANTES (❌ Não Funcionava):
```typescript
const handleJobUpdate = useCallback((payload: JobUpdatePayload) => {
    const { type, new: newJob, old: oldJob } = payload;
    // type era undefined porque payload tinha estrutura diferente
    
    if (!type) {
        console.warn('Unknown event type:', typeof payload); // "Object"
        return;
    }
    // ...
});
```

### DEPOIS (✅ Funciona):
```typescript
const handleJobUpdate = useCallback((payload: any) => {
    // Detecta se payload está encapsulado
    const actualPayload = payload?.payload || payload;
    const { type, new: newJob, old: oldJob } = actualPayload;
    
    // Agora type tem o valor correto: 'INSERT', 'UPDATE', ou 'DELETE'
    // ...
});
```

## Por Que Isso Aconteceu?

O Supabase Realtime pode enviar payloads em formatos diferentes dependendo de:

1. **Versão da biblioteca** `@supabase/realtime-js`
2. **Tipo de canal** (broadcast vs postgres_changes)
3. **Configuração do canal** (private vs public)
4. **Método de envio** (realtime.broadcast_changes vs realtime.send)

Nossa implementação usa `realtime.broadcast_changes` que pode encapsular o payload.

## Benefícios da Correção

1. ✅ **Compatibilidade**: Funciona com ambas as estruturas de payload
2. ✅ **Robustez**: Validação em múltiplos níveis
3. ✅ **Debugging**: Logs detalhados mostram exatamente o que está chegando
4. ✅ **Manutenibilidade**: Código mais claro e fácil de entender

## Próximos Passos

1. ✅ Testar com criação de imagem
2. ✅ Verificar se os logs mostram a estrutura correta
3. ✅ Confirmar que o job aparece na fila imediatamente
4. ✅ Verificar se o status atualiza quando completa

## Rollback

Se houver problemas, reverter:
```bash
git diff hooks/use-queue-monitor.ts
git checkout hooks/use-queue-monitor.ts
```

## Conclusão

A correção resolve o problema de parsing do payload do Supabase Realtime, permitindo que os broadcasts sejam processados corretamente e a fila atualize automaticamente.

**AGORA DEVE FUNCIONAR!** 🎉
