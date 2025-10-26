# Análise e Refatoração: Fluxo de Criação de Imagem

## 📊 Análise do Fluxo Atual

### Fluxo Completo (Modo Webhook)

```
1. Usuário clica "Generate" no componente ImageTransform
   ↓
2. handleGenerate() chama generateImageAction() (server action)
   ↓
3. Server action chama provider (fal.server.ts ou kie.server.ts)
   ↓
4. Provider submete job para API externa (Fal.ai ou Kie.ai)
   ↓
5. Provider cria registro no banco (fal_jobs table)
   ↓
6. Provider atualiza project.content com loading state
   ↓
7. Server action retorna com headers x-fal-status: pending
   ↓
8. handleGenerate() adiciona job otimisticamente na fila
   ↓
9. Componente detecta loading state e mostra skeleton
   ↓
10. API externa processa e chama webhook
   ↓
11. Webhook baixa imagem e faz upload para storage
   ↓
12. Webhook atualiza fal_jobs com status completed
   ↓
13. Webhook atualiza project.content com URL permanente
   ↓
14. Trigger do banco envia broadcast via Realtime
   ↓
15. useProjectRealtime detecta mudança e chama mutate()
   ↓
16. SWR revalida e componente re-renderiza
   ↓
17. Componente detecta nova URL e carrega imagem
   ↓
18. onLoad da imagem remove loading state e mostra toast
```

## 🐛 Problemas Identificados

### 1. **Lógica de Loading State Complexa e Frágil**

**Problema:** O componente tem múltiplos useEffects interdependentes que tentam gerenciar estados de loading, causando race conditions e comportamento imprevisível.

```typescript
// ❌ PROBLEMA: Múltiplos estados para a mesma coisa
const [loading, setLoading] = useState(false);
const [imageLoading, setImageLoading] = useState(false);
const [previousUrl, setPreviousUrl] = useState(data.generated?.url || '');
const [shouldShowSuccessToast, setShouldShowSuccessToast] = useState(false);
const [lastErrorUrl, setLastErrorUrl] = useState<string | null>(null);
```

**Impacto:**
- Difícil de debugar
- Estados podem ficar dessincronizados
- Lógica espalhada em múltiplos lugares

### 2. **Detecção de Webhook Completion Inconsistente**

**Problema:** O componente tenta detectar quando o webhook completou comparando URLs e flags, mas a lógica é complexa e propensa a erros.

```typescript
// ❌ PROBLEMA: Lógica complexa e frágil
useEffect(() => {
  const currentUrl = data.generated?.url || '';
  const hasLoadingFlag = (data as any).loading === true;
  const nodeStatus = (data as any).status;
  const requestId = (data as any).requestId;
  
  // 50+ linhas de lógica condicional...
}, [loading, data.generated?.url, id, data.updatedAt, ...]);
```

**Impacto:**
- Falsos positivos/negativos
- Toasts duplicados ou ausentes
- Loading state que não limpa

### 3. **Tratamento de Erros Confuso**

**Problema:** O código tenta filtrar "falsos positivos" mas a lógica é baseada em strings e pode falhar.

```typescript
// ❌ PROBLEMA: Detecção de erro baseada em strings
const falsePositivePatterns = [
  'Node not found',
  'Target node',
  'not found in project',
  // ...
];

const isFalsePositive = falsePositivePatterns.some(pattern =>
  errorMessage.toLowerCase().includes(pattern.toLowerCase())
);
```

**Impacto:**
- Erros reais podem ser ignorados
- Falsos positivos podem passar
- Difícil de manter

### 4. **Falta de Máquina de Estados Clara**

**Problema:** O componente não tem uma máquina de estados explícita, tornando difícil entender em que estado está.

**Estados Possíveis:**
- `idle` - Aguardando input
- `generating` - Gerando imagem (webhook pendente)
- `loading_image` - Imagem gerada, carregando do storage
- `ready` - Imagem carregada e pronta
- `error` - Erro na geração

### 5. **Duplicação de Lógica entre Providers**

**Problema:** `fal.server.ts` e `kie.server.ts` têm lógica muito similar mas duplicada.

**Código Duplicado:**
- Criação de job no banco
- Atualização do project.content
- Estrutura de retorno
- Logging

## ✅ Solução Proposta

### 1. **Criar Máquina de Estados Explícita**

```typescript
// ✅ SOLUÇÃO: Estado único e claro
type ImageNodeState = 
  | { status: 'idle' }
  | { status: 'generating'; requestId: string; jobId: string }
  | { status: 'loading_image'; url: string }
  | { status: 'ready'; url: string; timestamp: string }
  | { status: 'error'; error: string; canRetry: boolean };

// Armazenar no data do nó
interface ImageNodeData {
  // ... outros campos
  state: ImageNodeState;
}
```

### 2. **Simplificar Lógica de Loading**

```typescript
// ✅ SOLUÇÃO: Um único useEffect baseado no estado
useEffect(() => {
  const state = data.state;
  
  switch (state.status) {
    case 'idle':
      setShowPlaceholder(true);
      break;
      
    case 'generating':
      setShowSkeleton(true);
      setShowPlaceholder(false);
      break;
      
    case 'loading_image':
      setShowSkeleton(true);
      setShowPlaceholder(false);
      break;
      
    case 'ready':
      setShowSkeleton(false);
      setShowPlaceholder(false);
      setImageUrl(state.url);
      break;
      
    case 'error':
      setShowSkeleton(false);
      setShowPlaceholder(true);
      toast.error(state.error);
      break;
  }
}, [data.state]);
```

### 3. **Abstrair Lógica Comum dos Providers**

```typescript
// ✅ SOLUÇÃO: Classe base para providers
abstract class ImageProviderBase {
  abstract submitJob(input: JobInput): Promise<SubmissionResult>;
  
  async generateImage(params: GenerateParams): Promise<GenerateResult> {
    // 1. Validar input
    // 2. Criar job no banco
    // 3. Atualizar project com estado 'generating'
    // 4. Submeter para API externa
    // 5. Retornar resultado padronizado
  }
}

class FalImageProvider extends ImageProviderBase {
  async submitJob(input: JobInput) {
    // Lógica específica do Fal.ai
  }
}

class KieImageProvider extends ImageProviderBase {
  async submitJob(input: JobInput) {
    // Lógica específica do Kie.ai
  }
}
```

### 4. **Melhorar Tratamento de Erros**

```typescript
// ✅ SOLUÇÃO: Tipos de erro explícitos
type ImageGenerationError =
  | { type: 'validation'; message: string; canRetry: false }
  | { type: 'api'; message: string; canRetry: true }
  | { type: 'network'; message: string; canRetry: true }
  | { type: 'node_deleted'; message: string; canRetry: false; silent: true }
  | { type: 'project_deleted'; message: string; canRetry: false; silent: true };

function handleError(error: ImageGenerationError) {
  if (error.silent) {
    // Apenas logar, não mostrar toast
    console.warn('Silent error:', error);
    return;
  }
  
  toast.error(error.message, {
    action: error.canRetry ? {
      label: 'Retry',
      onClick: () => handleGenerate()
    } : undefined
  });
}
```

### 5. **Webhook com Validação Robusta**

```typescript
// ✅ SOLUÇÃO: Validação em camadas
async function handleWebhook(payload: WebhookPayload) {
  // 1. Validar payload
  const validation = validatePayload(payload);
  if (!validation.success) {
    return errorResponse(validation.error);
  }
  
  // 2. Buscar job
  const job = await findJob(payload.requestId);
  if (!job) {
    return notFoundResponse();
  }
  
  // 3. Validar projeto existe
  const project = await findProject(job.projectId);
  if (!project) {
    // Marcar como completed (não failed) - projeto foi deletado
    await markJobCompleted(job.id, { note: 'Project deleted' });
    return successResponse();
  }
  
  // 4. Validar nó existe
  const node = findNodeInProject(project, job.nodeId);
  if (!node) {
    // Marcar como completed (não failed) - nó foi deletado
    await markJobCompleted(job.id, { note: 'Node deleted' });
    return successResponse();
  }
  
  // 5. Processar resultado
  const result = await processResult(payload);
  
  // 6. Atualizar nó com estado 'ready'
  await updateNodeState(project, node, {
    status: 'ready',
    url: result.url,
    timestamp: new Date().toISOString()
  });
  
  return successResponse();
}
```

## 📝 Plano de Refatoração

### Fase 1: Preparação (Sem Breaking Changes)
1. ✅ Criar tipos para estados
2. ✅ Criar classe base para providers
3. ✅ Adicionar testes unitários

### Fase 2: Migração Gradual
1. ✅ Migrar Fal provider para nova estrutura
2. ✅ Migrar Kie provider para nova estrutura
3. ✅ Atualizar webhooks com validação robusta
4. ✅ Manter compatibilidade com código antigo

### Fase 3: Atualização do Componente
1. ✅ Adicionar suporte para novo formato de estado
2. ✅ Simplificar lógica de loading
3. ✅ Melhorar tratamento de erros
4. ✅ Remover código legado

### Fase 4: Limpeza
1. ✅ Remover código antigo
2. ✅ Atualizar documentação
3. ✅ Adicionar testes E2E

## 🎯 Benefícios Esperados

1. **Código Mais Simples**
   - Menos estados locais
   - Lógica mais clara
   - Fácil de debugar

2. **Mais Confiável**
   - Menos race conditions
   - Tratamento de erro robusto
   - Estados bem definidos

3. **Mais Manutenível**
   - Lógica centralizada
   - Menos duplicação
   - Tipos explícitos

4. **Melhor UX**
   - Loading states corretos
   - Toasts apropriados
   - Erros claros

## 🚀 Próximos Passos

1. Revisar e aprovar este plano
2. Criar branch para refatoração
3. Implementar Fase 1
4. Testar em desenvolvimento
5. Deploy gradual em produção
