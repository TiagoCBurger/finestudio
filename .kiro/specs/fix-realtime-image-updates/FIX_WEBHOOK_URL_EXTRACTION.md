# Fix: Webhook URL Extraction

## Problema Identificado

Analisando os logs, identificamos dois problemas principais:

### 1. URL da Imagem Não Sendo Extraída ✅ CORRIGIDO

**Sintoma:**
```
[WEBHOOK-V2] No image URL found in result: {
  result: '{"resultUrls":["https://tempfile.aiquickdraw.com/workers/nano/image_1761432279810_4ubl3s_1x1_1024x1024.png"]}'
}
```

**Causa:**
A função `extractImageUrl()` em `lib/webhooks/image-webhook-handler.ts` estava esperando que `result` fosse um objeto com propriedade `resultJson`, mas o KIE.ai envia `result` como uma **string JSON diretamente**.

**Solução Aplicada:**
Modificamos `extractImageUrl()` para:
1. Primeiro verificar se `result` é uma string
2. Se for string, fazer parse do JSON
3. Extrair `resultUrls` do objeto parseado
4. Manter compatibilidade com outros formatos (Fal, etc)

**Código Corrigido:**
```typescript
function extractImageUrl(result: unknown): string | null {
    if (!result) {
        return null;
    }

    // Se result é uma string JSON, parsear primeiro
    if (typeof result === 'string') {
        try {
            const parsed = JSON.parse(result);
            // Tentar extrair do objeto parseado
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

### 2. Fila Não Atualiza Imediatamente ⚠️ INVESTIGAR

**Sintoma:**
- Quando uma requisição é enviada, ela não aparece imediatamente na fila
- A fila só atualiza quando o webhook retorna

**Análise:**
- O código está chamando `addJobOptimistically()` corretamente
- O provider `QueueMonitorProvider` está configurado corretamente
- O hook `useQueueMonitor` tem a função implementada
- Logs mostram que a função é chamada, mas o estado não atualiza

**Possíveis Causas:**
1. O job pode estar sendo adicionado mas imediatamente substituído
2. Pode haver um problema de timing com o Realtime
3. O estado pode não estar sendo atualizado corretamente

**Próximos Passos:**
1. Adicionar mais logs no `addJobOptimistically`
2. Verificar se há race condition com Realtime
3. Testar se a correção da URL resolve o problema (pode ser que o job apareça mas sem imagem)

## Teste Necessário

1. **Testar Extração de URL:**
   - Criar uma nova imagem
   - Verificar nos logs se a URL é extraída corretamente
   - Confirmar que a imagem aparece no nó após webhook

2. **Testar Atualização da Fila:**
   - Criar uma nova imagem
   - Verificar se aparece imediatamente na fila (status: pending)
   - Verificar se atualiza quando webhook retorna (status: completed)

## Arquivos Modificados

- `lib/webhooks/image-webhook-handler.ts` - Corrigida extração de URL

## Logs Relevantes

```
✅ [KIE] Job submitted successfully: { requestId: '24ce8098c35044324c724eb5d8f07f84' }
...
🔔 KIE.ai webhook received
[WEBHOOK-V2] No image URL found in result  ← PROBLEMA AQUI
[WEBHOOK-V2] Job marked as completed (no image)
```

## Status

- ✅ Correção aplicada para extração de URL
- ⚠️ Problema de fila ainda em investigação
- 🧪 Teste necessário para confirmar correção
