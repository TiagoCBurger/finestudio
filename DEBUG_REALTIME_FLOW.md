# 🐛 Debug: Fluxo Realtime de Atualização de Imagem

## Logs Adicionados

Adicionei logs detalhados em todo o fluxo para identificar onde está o problema:

### 1. Componente ImageNode (`components/nodes/image/transform.tsx`)

```
🔍 [ImageNode] State check: { nodeId, hasLoadingFlag, nodeStatus, currentUrl, loading, ... }
🔄 [ImageNode] Ativando loading state (status persistido no nó)
✅ [ImageNode] Webhook completou, URL recebida
⚠️ [ImageNode] Nó com status generating mas não está em loading!
```

### 2. Provider do Projeto (`providers/project.tsx`)

```
📊 [ProjectProvider] SWR revalidated successfully: { projectId, nodeCount, updatedAt }
🔄 [ProjectProvider] Data changed, triggering re-render
❌ [ProjectProvider] SWR revalidation error
```

### 3. Hook de Realtime (`hooks/use-project-realtime.ts`)

```
📨 Broadcast received: { projectId, payloadType, hasPayload }
Project updated via broadcast: { projectId, type, table }
Revalidating project cache: { projectId }
Project cache revalidated successfully: { projectId }
```

### 4. Webhook (`app/api/webhooks/kie/route.ts`)

```
🔔 KIE.ai webhook received
✅ Found job: { jobId, userId, modelId }
✅ Job completed successfully, processing result...
📤 Uploading image to storage...
✅ Image uploaded to storage: { url }
📝 Updating project node with permanent URL...
✅ Project node updated successfully, realtime should trigger now
```

## Como Testar

### Passo 1: Abrir Console do Navegador
1. Abra DevTools (F12)
2. Vá para a aba Console
3. Limpe o console (Ctrl+L ou Cmd+K)

### Passo 2: Gerar Imagem
1. Adicione um nó de texto com prompt
2. Adicione um nó de imagem e conecte
3. Clique em "Generate"

### Passo 3: Observar Logs

#### Logs Esperados (Fluxo Correto)

**Ao clicar "Generate":**
```
🔍 Provider detection: { modelId: 'kie-nano-banana', ... }
✅ Image generation pending, returning placeholder
🔍 [ImageNode] State check: { hasLoadingFlag: false, nodeStatus: undefined, ... }
```

**Após action retornar:**
```
🔄 Modo webhook ativado, request_id: kie-abc-123
⏳ Aguardando webhook completar...
```

**Realtime detecta mudança no banco:**
```
📨 Broadcast received: { projectId, payloadType: 'object', hasPayload: true }
Project updated via broadcast: { projectId, type: 'UPDATE', table: 'project' }
Revalidating project cache: { projectId }
```

**SWR revalida:**
```
📊 [ProjectProvider] SWR revalidated successfully: { projectId, nodeCount: 2, ... }
🔄 [ProjectProvider] Data changed, triggering re-render
```

**Componente detecta status:**
```
🔍 [ImageNode] State check: { hasLoadingFlag: true, nodeStatus: 'generating', ... }
🔄 [ImageNode] Ativando loading state (status persistido no nó)
```

**Webhook completa:**
```
🔔 KIE.ai webhook received
✅ Found job: { jobId, userId, modelId }
✅ Job completed successfully
📤 Uploading image to storage...
✅ Image uploaded to storage: https://...
📝 Updating project node with permanent URL...
✅ Project node updated successfully, realtime should trigger now
```

**Realtime detecta mudança novamente:**
```
📨 Broadcast received: { projectId, ... }
Revalidating project cache: { projectId }
📊 [ProjectProvider] SWR revalidated successfully
🔄 [ProjectProvider] Data changed, triggering re-render
```

**Componente detecta URL:**
```
🔍 [ImageNode] State check: { currentUrl: 'https://...', loading: true, ... }
✅ [ImageNode] Webhook completou, URL recebida: { url: 'https://...' }
🔄 Starting to load image: https://...
✅ Image loaded successfully: https://...
```

## Cenários de Problema

### ❌ Problema 1: Realtime Não Recebe Broadcast

**Sintoma:**
```
🔄 Modo webhook ativado, request_id: kie-abc-123
⏳ Aguardando webhook completar...
// Nenhum log de "Broadcast received"
```

**Causa Possível:**
- Trigger do banco não está funcionando
- RLS policies bloqueando broadcast
- Canal Realtime não está subscrito

**Solução:**
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'projects_broadcast_trigger';

-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'realtime.messages';

-- Testar trigger manualmente
UPDATE project SET updated_at = NOW() WHERE id = 'seu-project-id';
```

### ❌ Problema 2: SWR Não Revalida

**Sintoma:**
```
📨 Broadcast received: { projectId, ... }
Revalidating project cache: { projectId }
// Nenhum log de "SWR revalidated successfully"
```

**Causa Possível:**
- API endpoint não está respondendo
- SWR cache está travado
- Compare function está bloqueando update

**Solução:**
```javascript
// No console do navegador
mutate('/api/projects/seu-project-id')
```

### ❌ Problema 3: Componente Não Detecta Mudança

**Sintoma:**
```
📊 [ProjectProvider] SWR revalidated successfully
🔄 [ProjectProvider] Data changed, triggering re-render
// Nenhum log de "[ImageNode] State check"
```

**Causa Possível:**
- useEffect não está sendo disparado
- Dependências do useEffect estão incorretas
- Componente não está re-renderizando

**Solução:**
- Verificar se `data.updatedAt` está mudando
- Verificar se `data.generated.url` está mudando
- Forçar re-render com key prop

### ❌ Problema 4: Webhook Não Atualiza Banco

**Sintoma:**
```
✅ Image uploaded to storage: https://...
📝 Updating project node with permanent URL...
// Nenhum log de "Project node updated successfully"
```

**Causa Possível:**
- Nó foi removido do projeto
- Projeto não existe
- Erro no banco de dados

**Solução:**
- Verificar logs do webhook no terminal
- Verificar se projeto existe no banco
- Verificar se nó existe no content do projeto

## Comandos Úteis

### Ver Logs do Webhook (Terminal)
```bash
# Terminal com servidor Next.js
npm run dev

# Procurar por logs do webhook
# Você verá: "🔔 KIE.ai webhook received"
```

### Verificar Banco de Dados
```sql
-- Ver projeto atual
SELECT id, name, updated_at, 
       jsonb_array_length(content->'nodes') as node_count
FROM project 
WHERE id = 'seu-project-id';

-- Ver nós com status generating
SELECT id, name,
       jsonb_path_query(content, '$.nodes[*] ? (@.data.status == "generating")')
FROM project
WHERE id = 'seu-project-id';

-- Ver jobs pendentes
SELECT * FROM fal_jobs 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Forçar Revalidação (Console do Navegador)
```javascript
// Forçar SWR revalidar
import { mutate } from 'swr';
mutate('/api/projects/seu-project-id');

// Ver estado atual do SWR
import { useSWRConfig } from 'swr';
const { cache } = useSWRConfig();
console.log(cache);
```

## Checklist de Debug

Quando testar, verifique cada ponto:

### ✅ Fase 1: Geração Iniciada
- [ ] Log "🔄 Modo webhook ativado" aparece
- [ ] Log "⏳ Aguardando webhook completar" aparece
- [ ] Nó mostra skeleton de loading

### ✅ Fase 2: Banco Atualizado
- [ ] Log "📨 Broadcast received" aparece
- [ ] Log "Revalidating project cache" aparece
- [ ] Log "📊 SWR revalidated successfully" aparece

### ✅ Fase 3: Componente Detecta
- [ ] Log "🔍 [ImageNode] State check" aparece
- [ ] Log "🔄 Ativando loading state" aparece
- [ ] Nó continua em loading

### ✅ Fase 4: Webhook Completa
- [ ] Log "🔔 KIE.ai webhook received" aparece (terminal)
- [ ] Log "✅ Image uploaded to storage" aparece (terminal)
- [ ] Log "✅ Project node updated successfully" aparece (terminal)

### ✅ Fase 5: Realtime Notifica
- [ ] Log "📨 Broadcast received" aparece novamente
- [ ] Log "📊 SWR revalidated successfully" aparece novamente
- [ ] Log "🔄 Data changed, triggering re-render" aparece

### ✅ Fase 6: Imagem Carrega
- [ ] Log "✅ Webhook completou, URL recebida" aparece
- [ ] Log "🔄 Starting to load image" aparece
- [ ] Log "✅ Image loaded successfully" aparece
- [ ] Imagem aparece no nó
- [ ] Toast de sucesso aparece

## Próximos Passos

Após testar e coletar os logs, me envie:

1. **Todos os logs do console** (copie e cole)
2. **Logs do terminal** (onde o servidor está rodando)
3. **Em qual fase o fluxo parou** (use o checklist acima)
4. **Qual modelo você usou** (nano-banana ou nano-banana-edit)

Com essas informações, posso identificar exatamente onde está o problema!
