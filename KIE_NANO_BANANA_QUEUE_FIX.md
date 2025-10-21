# KIE Nano Banana - Implementação de Fila e Loading State

## Problema
O modelo `google/nano-banana` (geração) do KIE.ai não estava usando o sistema de fila/webhook como o modelo `google/nano-banana-edit` (edição), resultando em:
- Nó não ficava em estado de loading durante a geração
- Imagem não era carregada automaticamente quando o webhook retornava
- Experiência inconsistente entre geração e edição

## Solução Implementada

### 1. Modelo KIE Server (`lib/models/image/kie.server.ts`)
**Alteração:** Ambos os modelos (geração e edição) agora aceitam imagens como entrada.

```typescript
// ANTES: Apenas edit models aceitavam imagens
if (isEditModel) {
  // ... adicionar imagens
}

// DEPOIS: Ambos os modelos aceitam imagens
if (imageUrls && imageUrls.length > 0) {
  console.log(`🖼️ Adding ${imageUrls.length} image(s) to KIE ${isEditModel ? 'edit' : 'generation'} request`);
  input.image_urls = imageUrls.slice(0, MAX_KIE_IMAGES);
}
```

**Benefício:** O modelo de geração agora pode usar imagens como referência, seguindo o mesmo fluxo do modelo de edição.

### 2. Action de Criação (`app/actions/image/create.ts`)
**Alterações:**
1. Adicionado suporte para provider KIE nos `providerOptions`
2. Adicionado detecção de status pending para KIE
3. Adicionado logs de debug para identificar o provider

```typescript
// Detectar provider
const isFalProvider = provider.model.provider === 'fal';
const isKieProvider = provider.model.provider === 'kie';

// Passar metadados para KIE
providerOptions: isKieProvider
  ? {
    kie: {
      nodeId,
      projectId,
    },
  }
  : undefined,

// Detectar status pending de KIE
const isKiePending = responseHeaders['x-kie-status'] === 'pending';
const isPending = isFalPending || isKiePending;
```

**Benefício:** O modelo KIE agora retorna o estado de loading corretamente e passa os metadados necessários para o webhook atualizar o projeto.

### 3. Componente de Transformação (`components/nodes/image/transform.tsx`)
**Alteração:** Adicionado detecção de status pending para KIE no modo webhook.

```typescript
// ANTES: Apenas Fal
const falRequestId = nodeData.generated?.headers?.['x-fal-request-id'];
const falStatus = nodeData.generated?.headers?.['x-fal-status'];
if (falRequestId && falStatus === 'pending') { ... }

// DEPOIS: Fal e KIE
const kieRequestId = nodeData.generated?.headers?.['x-kie-request-id'];
const kieStatus = nodeData.generated?.headers?.['x-kie-status'];
const isWebhookMode = (falRequestId && falStatus === 'pending') || (kieRequestId && kieStatus === 'pending');
```

**Benefício:** O componente agora detecta corretamente quando o modelo KIE está em modo webhook e mantém o estado de loading até o webhook retornar.

### 4. Limpeza de Imports (`lib/models/image/fal.server.ts`)
**Alteração:** Removidos imports não utilizados.

```typescript
// REMOVIDO:
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
```

**Benefício:** Código mais limpo e sem warnings do TypeScript.

## Fluxo Completo

### Geração de Imagem (google/nano-banana)
1. **Usuário clica em "Generate"**
   - `components/nodes/image/transform.tsx` → `handleGenerate()`
   - Chama `generateImageAction()` com `nodeId` e `projectId`

2. **Server Action processa**
   - `app/actions/image/create.ts` → `_generateImageAction()`
   - Detecta provider KIE e passa metadados
   - Chama `generateImage()` do AI SDK

3. **Modelo KIE submete job**
   - `lib/models/image/kie.server.ts` → `doGenerate()`
   - Cria job no banco com `nodeId` e `projectId` nos metadados
   - Submete para API KIE.ai com webhook URL
   - Retorna headers com `x-kie-status: pending` e `x-kie-request-id`

4. **Action retorna estado de loading**
   - Detecta `x-kie-status: pending`
   - Retorna `nodeData` com `loading: true`
   - Componente mantém skeleton de loading

5. **Webhook recebe resultado**
   - `app/api/webhooks/kie/route.ts` → `POST()`
   - Baixa imagem do KIE.ai
   - Faz upload para storage permanente (R2/Supabase)
   - Atualiza job no banco
   - Atualiza projeto no banco com URL permanente
   - Trigger do Supabase dispara broadcast Realtime

6. **Realtime atualiza UI**
   - `hooks/use-project-realtime.ts` recebe broadcast
   - Atualiza estado do projeto
   - Componente re-renderiza com nova URL
   - Imagem carrega e remove skeleton

### Edição de Imagem (google/nano-banana-edit)
O fluxo é idêntico, mas com imagens de entrada:
- `editImageAction()` passa array de imagens
- Modelo KIE recebe `image_urls` no input
- Resto do fluxo é o mesmo

## Arquivos Modificados

1. ✅ `lib/models/image/kie.server.ts` - Suporte a imagens em ambos os modelos
2. ✅ `app/actions/image/create.ts` - Metadados KIE e detecção de pending
3. ✅ `components/nodes/image/transform.tsx` - Detecção de webhook KIE
4. ✅ `lib/models/image/fal.server.ts` - Limpeza de imports

## Arquivos Não Modificados (já funcionavam)

- ✅ `app/api/webhooks/kie/route.ts` - Webhook já estava correto
- ✅ `lib/models/image/index.server.ts` - Configuração já estava correta
- ✅ `app/actions/image/edit.ts` - Edição já funcionava

## Testes

### Manual
1. Criar um nó de texto com prompt
2. Criar um nó de imagem (Nano Banana KIE)
3. Conectar texto → imagem
4. Clicar em "Generate"
5. Verificar:
   - ✅ Nó fica em loading (skeleton com spinner)
   - ✅ Após ~10-30s, imagem aparece automaticamente
   - ✅ Toast de sucesso é exibido
   - ✅ Imagem persiste após reload da página

### Logs Esperados
```
🔍 Provider detection: { modelId: 'kie-nano-banana', provider: 'kie', isKieProvider: true }
🔍 Kie.ai queue request: { modelId: 'google/nano-banana', isEditModel: false }
🚀 Kie.ai submission mode: { mode: 'WEBHOOK (required)' }
✅ Kie.ai queue submitted: { request_id: 'xxx', useWebhook: true }
✅ Image generation pending, returning placeholder for webhook polling
🔄 Modo webhook ativado, request_id: xxx
```

## Benefícios

1. **Consistência:** Geração e edição agora usam o mesmo fluxo
2. **UX Melhorada:** Loading state claro durante geração
3. **Confiabilidade:** Webhook garante que imagem seja carregada automaticamente
4. **Escalabilidade:** Não bloqueia servidor durante geração
5. **Multi-window:** Realtime sincroniza entre abas/janelas

## Próximos Passos (Opcional)

1. Adicionar retry automático em caso de falha do webhook
2. Adicionar timeout para jobs que não completam
3. Adicionar cancelamento de jobs em andamento
4. Adicionar preview da imagem durante geração (se API suportar)
