# Guia de Logs de Debug - Fila de Requisições

## Como Testar

1. **Abra o Console do Navegador**
   - Pressione F12 (ou Cmd+Option+I no Mac)
   - Vá para a aba "Console"
   - Limpe o console (botão 🚫 ou Ctrl+L)

2. **Crie uma Nova Requisição de Imagem**
   - Adicione um nó de texto com um prompt
   - Adicione um nó de imagem
   - Conecte e clique em "Generate"

3. **Observe os Logs**

## Logs Esperados (em ordem)

### 1. Subscrição Inicial
```
🔌 [QueueMonitor] Setting up INSERT subscription: {topic: "fal_jobs:...", enabled: true}
📊 [QueueMonitor] Connection state: {isConnected: true, ...}
🔄 [QueueMonitorProvider] Rendering: {userId: "...", jobCount: 0, activeCount: 0}
🔄 [useQueueMonitor] Returning values: {jobCount: 0, activeCount: 0}
🔄 [QueueMonitor] Component render: {jobCount: 0, activeCount: 0}
```

### 2. Adição Otimista do Job
```
➕ [ImageTransformV2] Adding job optimistically: {jobId: "...", requestId: "..."}
➕ [QueueMonitor] Adding job optimistically: {jobId: "...", currentJobCount: 0}
✅ [QueueMonitor] Adding new job optimistically: {previousCount: 0, newCount: 1}
✅ [QueueMonitor] Job added to state: {totalJobs: 1}
```

### 3. Estado Atualizado
```
📊 [useQueueMonitor] Jobs state changed: {jobCount: 1, jobIds: ["..."]}
🔄 [useQueueMonitor] Returning values: {jobCount: 1, activeCount: 1}
🔄 [QueueMonitorProvider] Rendering: {jobCount: 1, activeCount: 1}
🔄 [QueueMonitor] Component render: {jobCount: 1, activeCount: 1}
🔄 [QueueMonitor] Jobs changed, forcing re-render: {jobCount: 1, activeCount: 1}
```

### 4. Broadcast do Banco (pode vir depois)
```
🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {type: "INSERT", jobId: "..."}
[DEDUPLICATION] Job already exists, updating instead of inserting
📊 [useQueueMonitor] Jobs state changed: {jobCount: 1}
```

## Diagnóstico por Logs

### Cenário A: Nenhum log aparece
**Problema**: Componente não está montado ou console está filtrado

**Solução**:
1. Verifique se você está em um projeto (não na home)
2. Verifique se o filtro do console não está escondendo logs
3. Recarregue a página e tente novamente

### Cenário B: Logs de subscrição aparecem, mas não de adição
**Problema**: `addJobOptimistically` não está sendo chamado

**Logs esperados que NÃO aparecem**:
```
➕ [ImageTransformV2] Adding job optimistically
➕ [QueueMonitor] Adding job optimistically
```

**Solução**:
1. Verifique se você está usando `transform.v2.tsx` (não `transform.tsx`)
2. Verifique se o contexto está disponível
3. Verifique se há erros no console

### Cenário C: Adição otimista funciona, mas componente não re-renderiza
**Problema**: Estado muda mas UI não atualiza

**Logs esperados**:
```
✅ [QueueMonitor] Job added to state: {totalJobs: 1}  ← Estado mudou
📊 [useQueueMonitor] Jobs state changed: {jobCount: 1}  ← Hook detectou
```

**Logs que NÃO aparecem**:
```
🔄 [QueueMonitor] Component render: {jobCount: 1}  ← Componente NÃO re-renderizou
```

**Solução**: Este é o problema que estamos corrigindo!

### Cenário D: Componente re-renderiza mas badge não atualiza
**Problema**: Badge não está reagindo ao `activeCount`

**Logs esperados**:
```
🔄 [QueueMonitor] Component render: {jobCount: 1, activeCount: 1}
🔄 [QueueMonitor] Jobs changed, forcing re-render: {activeCount: 1}
```

**Verificar no código**:
```tsx
{activeCount > 0 && (
    <Badge>{activeCount}</Badge>
)}
```

### Cenário E: Broadcast não chega
**Problema**: Realtime não está funcionando

**Logs esperados que NÃO aparecem**:
```
🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received
```

**Verificar**:
1. Estado da conexão: `isConnected: true`?
2. Logs do Postgres no Supabase Dashboard
3. Políticas RLS configuradas corretamente

## Comandos Úteis no Console

### Limpar Console
```javascript
console.clear()
```

### Filtrar Logs
```javascript
// No campo de filtro do console, digite:
QueueMonitor
// ou
REALTIME
```

### Verificar Estado Atual
```javascript
// Inspecione o componente no React DevTools
// Procure por "QueueMonitor" ou "QueueMonitorProvider"
```

## Próximos Passos

### Se os logs mostram que o estado muda mas o componente não re-renderiza:

1. **Verifique se o problema é de referência**:
   - O array `jobs` está sendo criado como novo array?
   - O `activeCount` está sendo recalculado?

2. **Verifique se o problema é de contexto**:
   - O contexto está sendo atualizado?
   - O provider está re-renderizando?

3. **Verifique se o problema é de React**:
   - Há algum memo ou useMemo bloqueando?
   - O componente está dentro de um Suspense?

### Se os logs mostram que o estado NÃO muda:

1. **Verifique a função `addJobOptimistically`**:
   - Está sendo chamada?
   - Está recebendo os parâmetros corretos?
   - Está chamando `setJobs` corretamente?

2. **Verifique a função `setJobs`**:
   - Está criando um novo array?
   - Está retornando o valor correto?

## Exemplo de Logs Completos (Sucesso)

```
[00:00.000] 🔌 [QueueMonitor] Setting up INSERT subscription
[00:00.050] 📊 [QueueMonitor] Connection state: {isConnected: true}
[00:00.100] 🔄 [QueueMonitorProvider] Rendering: {jobCount: 0}
[00:00.150] 🔄 [useQueueMonitor] Returning values: {jobCount: 0}
[00:00.200] 🔄 [QueueMonitor] Component render: {jobCount: 0}

[00:05.000] ➕ [ImageTransformV2] Adding job optimistically
[00:05.010] ➕ [QueueMonitor] Adding job optimistically: {currentJobCount: 0}
[00:05.020] ✅ [QueueMonitor] Adding new job optimistically: {newCount: 1}
[00:05.030] ✅ [QueueMonitor] Job added to state: {totalJobs: 1}

[00:05.040] 📊 [useQueueMonitor] Jobs state changed: {jobCount: 1}
[00:05.050] 🔄 [useQueueMonitor] Returning values: {jobCount: 1, activeCount: 1}
[00:05.060] 🔄 [QueueMonitorProvider] Rendering: {jobCount: 1, activeCount: 1}
[00:05.070] 🔄 [QueueMonitor] Component render: {jobCount: 1, activeCount: 1}
[00:05.080] 🔄 [QueueMonitor] Jobs changed, forcing re-render: {activeCount: 1}

[00:05.500] 🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {type: "INSERT"}
[00:05.510] [DEDUPLICATION] Job already exists, updating instead of inserting
```

## Compartilhar Logs

Se precisar de ajuda, copie e cole:

1. **Todos os logs que começam com**:
   - `🔌 [QueueMonitor]`
   - `📊 [QueueMonitor]`
   - `🔄 [QueueMonitor]`
   - `➕ [QueueMonitor]`
   - `✅ [QueueMonitor]`
   - `🔔 [REALTIME-DIAGNOSTIC]`

2. **Informações do navegador**:
   ```javascript
   console.log('Browser:', navigator.userAgent);
   console.log('URL:', window.location.href);
   ```

3. **Descrição do comportamento observado**:
   - O que você esperava?
   - O que aconteceu?
   - Quando aconteceu?
