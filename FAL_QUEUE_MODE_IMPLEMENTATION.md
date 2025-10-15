# Implementação do Modo Fila (Queue) para Fal.ai

## Resumo

Implementado o modo fila (queue) para todos os modelos do provider fal.ai, tanto para imagens quanto para vídeos, seguindo a documentação oficial: https://docs.fal.ai/model-apis/model-endpoints/queue

## Mudanças Realizadas

### 1. Modelos de Imagem (`lib/models/image/fal.ts`)

**Antes:**
- Usava chamadas HTTP diretas com `fetch()` para `https://fal.run/${modelId}`
- Implementação síncrona sem sistema de fila

**Depois:**
- Importa e configura o SDK `@fal-ai/client`
- Usa `fal.queue.submit()` para enviar requisições
- Usa `fal.queue.result()` para aguardar resultados com polling automático
- Logs melhorados indicando uso do modo fila

**Código atualizado:**
```typescript
import * as fal from '@fal-ai/client';

// Submeter para a fila (credenciais passadas inline)
const { request_id } = await fal.queue.submit(modelId, {
  input,
  credentials: env.FAL_API_KEY,
});

// Aguardar resultado
const result = await fal.queue.result(modelId, {
  requestId: request_id,
  logs: true,
  credentials: env.FAL_API_KEY,
}) as FalImageOutput;
```

### 2. Modelos de Vídeo (`lib/models/video/fal.ts`)

**Antes:**
- Usava chamadas HTTP diretas com `fetch()`
- Implementação manual de polling com `while` loop
- Timeout configurado manualmente

**Depois:**
- Importa e configura o SDK `@fal-ai/client`
- Usa `fal.queue.submit()` para enviar requisições
- Usa `fal.queue.result()` com timeout configurável
- Polling gerenciado automaticamente pelo SDK
- Código mais limpo e manutenível

**Código atualizado:**
```typescript
import * as falClient from '@fal-ai/client';

// Submeter para a fila (credenciais passadas inline)
const { request_id } = await falClient.queue.submit(modelId, {
    input,
    credentials: env.FAL_API_KEY,
});

// Aguardar resultado com timeout apropriado
const timeoutMs = modelId.includes('sora') ? 6 * 60 * 1000 : 3 * 60 * 1000;

const result = await falClient.queue.result(modelId, {
    requestId: request_id,
    logs: true,
    timeout: timeoutMs,
    credentials: env.FAL_API_KEY,
}) as { video: { url: string } };
```

## ⚠️ Importante: Credenciais Inline

Em ambientes como Next.js com Turbopack, o método `config()` do SDK pode causar problemas. Por isso, passamos as credenciais diretamente em cada chamada:

```typescript
// ✅ Correto - credenciais inline
await fal.queue.submit(modelId, { 
  input,
  credentials: env.FAL_API_KEY  // Passado em cada chamada
});
```

Isso garante compatibilidade total com Next.js, Turbopack e outros bundlers modernos.

## Benefícios do Modo Fila

### 1. **Melhor Gerenciamento de Recursos**
- Requisições são enfileiradas e processadas de forma otimizada
- Evita sobrecarga do servidor

### 2. **Polling Automático**
- O SDK gerencia automaticamente o polling
- Não precisa implementar loops manuais
- Tratamento de erros mais robusto

### 3. **Logs e Monitoramento**
- Opção `logs: true` fornece informações detalhadas do progresso
- Melhor visibilidade do status da geração

### 4. **Timeouts Configuráveis**
- Timeouts específicos por tipo de modelo
- Sora 2: 6 minutos (gerações mais longas)
- Kling: 3 minutos (gerações mais rápidas)

### 5. **Código Mais Limpo**
- Menos código boilerplate
- Mais fácil de manter e debugar
- Segue as melhores práticas do fal.ai

## Modelos Afetados

### Imagens
- `fal-ai/nano-banana/edit`
- `fal-ai/gpt-image`
- `fal-ai/gpt-image-1/edit-image/byok`
- `fal-ai/flux/dev/image-to-image`
- `fal-ai/flux-pro/kontext`
- `fal-ai/flux-pro/kontext/max/multi`
- `fal-ai/ideogram/character`

### Vídeos
- `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`
- `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`
- `fal-ai/sora-2/image-to-video/pro`

## Compatibilidade

- ✅ SDK `@fal-ai/client` já instalado (v1.6.2)
- ✅ Nenhuma mudança necessária nas variáveis de ambiente
- ✅ API key `FAL_API_KEY` continua sendo usada
- ✅ Compatível com todas as funcionalidades existentes
- ✅ Sem breaking changes na interface pública

## Testes

Para testar a implementação:

1. **Modelos de Imagem:**
   - Acesse qualquer nó de imagem que use fal.ai
   - Verifique os logs do console para "Fal.ai queue request" e "Fal.ai queue submitted"
   - Confirme que a geração funciona normalmente

2. **Modelos de Vídeo:**
   - Acesse qualquer nó de vídeo que use fal.ai (Kling ou Sora 2)
   - Verifique os logs do console para "Fal.ai video queue request" e "Fal.ai video queue submitted"
   - Confirme que a geração funciona normalmente

## Referências

- [Documentação Fal.ai Queue Mode](https://docs.fal.ai/model-apis/model-endpoints/queue)
- [SDK @fal-ai/client](https://www.npmjs.com/package/@fal-ai/client)
- [Fal.ai API Reference](https://fal.ai/docs)
