# Instruções de Teste - Atualização Automática da Fila

## Objetivo
Verificar se a fila de requisições está atualizando automaticamente quando uma nova requisição de imagem é gerada.

## Preparação

1. Abra o console do navegador (F12 ou Cmd+Option+I no Mac)
2. Certifique-se de estar logado na aplicação
3. Abra um projeto existente ou crie um novo

## Teste 1: Verificar Subscrição Realtime

### Passos:
1. Abra o console do navegador
2. Procure por logs com `[QueueMonitor]`
3. Você deve ver:
   ```
   🔌 [QueueMonitor] Setting up INSERT subscription: {topic: "fal_jobs:...", enabled: true, userId: "..."}
   📊 [QueueMonitor] Connection state: {isConnected: true, ...}
   ```

### Resultado Esperado:
- `isConnected: true`
- `insertConnected: true`
- `insertState: "connected"`

### Se Falhar:
- Verifique se você está logado
- Verifique se o `userId` está correto
- Verifique se há erros de autenticação no console

## Teste 2: Criar Nova Requisição de Imagem

### Passos:
1. No projeto, adicione um nó de texto com um prompt
2. Adicione um nó de imagem
3. Conecte o nó de texto ao nó de imagem
4. Clique em "Generate" no nó de imagem
5. **IMPORTANTE**: Mantenha o console aberto e observe os logs

### Logs Esperados (em ordem):

#### 1. Adição Otimista:
```
➕ [ImageTransformV2] Adding job optimistically: {jobId: "...", requestId: "...", modelId: "..."}
➕ [QueueMonitor] Adding job optimistically: {jobId: "...", requestId: "...", currentJobCount: 0}
✅ [QueueMonitor] Adding new job optimistically: {jobId: "...", previousCount: 0, newCount: 1}
✅ [QueueMonitor] Job added to state: {jobId: "...", totalJobs: 1}
```

#### 2. Broadcast do Banco (pode vir depois):
```
🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {type: "INSERT", jobId: "...", newStatus: "pending"}
[DEDUPLICATION] Job already exists, updating instead of inserting: {jobId: "...", source: "broadcast_insert"}
```

### Resultado Esperado:
- ✅ O job aparece **imediatamente** na fila (ícone no canto superior direito)
- ✅ O badge mostra "1" requisição ativa
- ✅ Ao abrir a fila, o job está listado com status "pending"
- ✅ Quando a geração completar, o status muda para "completed"

### Se Falhar:

#### Cenário A: Job não aparece imediatamente
**Sintoma**: Precisa atualizar a página para ver o job

**Diagnóstico**:
1. Verifique se o log `➕ [QueueMonitor] Adding job optimistically` aparece
2. Se NÃO aparecer:
   - O contexto `QueueMonitorProvider` pode não estar envolvendo o componente
   - Verifique se `TopRightClient` está sendo renderizado
3. Se aparecer mas o job não for adicionado:
   - Verifique se há erros no console
   - Verifique se o `userId` está correto

#### Cenário B: Job aparece mas não atualiza quando completa
**Sintoma**: Job fica "pending" mesmo após completar

**Diagnóstico**:
1. Verifique se o broadcast UPDATE está chegando:
   ```
   🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {type: "UPDATE", oldStatus: "pending", newStatus: "completed"}
   ```
2. Se NÃO chegar:
   - Problema no webhook ou no trigger do banco
   - Verifique os logs do Supabase
3. Se chegar mas não atualizar:
   - Problema na lógica de atualização do estado
   - Verifique se há erros no console

#### Cenário C: Broadcast não chega
**Sintoma**: Nenhum log `🔔 [REALTIME-DIAGNOSTIC]` aparece

**Diagnóstico**:
1. Verifique o estado da conexão:
   ```
   📊 [QueueMonitor] Connection state: {isConnected: false, ...}
   ```
2. Se `isConnected: false`:
   - Problema de autenticação
   - Problema de rede
   - Verifique se o Supabase Realtime está funcionando
3. Verifique os logs do Postgres no Supabase Dashboard:
   - Procure por `[REALTIME] fal_jobs broadcast SUCCESS`
   - Se não aparecer, o trigger não está funcionando

## Teste 3: Múltiplas Requisições

### Passos:
1. Crie 3 requisições de imagem rapidamente
2. Observe a fila

### Resultado Esperado:
- ✅ Todas as 3 requisições aparecem imediatamente
- ✅ O badge mostra "3" requisições ativas
- ✅ Conforme completam, o número diminui
- ✅ Não há duplicatas na fila

### Se Falhar:
- Verifique os logs de deduplicação
- Procure por `[DEDUPLICATION]` no console

## Teste 4: Múltiplas Abas

### Passos:
1. Abra o mesmo projeto em 2 abas diferentes
2. Crie uma requisição na aba 1
3. Observe a aba 2

### Resultado Esperado:
- ✅ A requisição aparece em ambas as abas
- ✅ Quando completa, ambas as abas atualizam

### Se Falhar:
- Isso é esperado se `self: false` está configurado
- O broadcast não é enviado para a própria aba que criou
- Mas a adição otimista deve funcionar na aba que criou

## Comandos Úteis

### Limpar Console
```javascript
console.clear()
```

### Verificar Estado do QueueMonitor
```javascript
// No console do navegador
// (Não há acesso direto, mas você pode ver os logs)
```

### Forçar Refresh da Fila
```javascript
// Clique no botão de refresh na modal da fila
// Ou recarregue a página
```

## Logs de Diagnóstico Completos

Aqui está um exemplo de logs completos de uma geração bem-sucedida:

```
🔌 [QueueMonitor] Setting up INSERT subscription: {topic: "fal_jobs:e04931a4-...", enabled: true}
📊 [QueueMonitor] Connection state: {isConnected: true, insertConnected: true}

➕ [ImageTransformV2] Adding job optimistically: {jobId: "abc123", requestId: "fal_123"}
➕ [QueueMonitor] Adding job optimistically: {jobId: "abc123", currentJobCount: 0}
✅ [QueueMonitor] Adding new job optimistically: {jobId: "abc123", newCount: 1}
✅ [QueueMonitor] Job added to state: {totalJobs: 1}

🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {type: "INSERT", jobId: "abc123"}
[DEDUPLICATION] Job already exists, updating instead of inserting

🔔 [REALTIME-DIAGNOSTIC] QueueMonitor broadcast received: {type: "UPDATE", oldStatus: "pending", newStatus: "completed"}
✅ Job completed: {jobId: "abc123"}
```

## Próximos Passos

Se todos os testes passarem:
- ✅ O sistema está funcionando corretamente
- ✅ A fila atualiza automaticamente

Se algum teste falhar:
- 📋 Copie os logs do console
- 📋 Descreva o comportamento observado
- 📋 Informe qual teste falhou
- 📋 Compartilhe as informações para análise adicional
