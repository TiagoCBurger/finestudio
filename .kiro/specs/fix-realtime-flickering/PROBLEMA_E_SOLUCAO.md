# Problema: Flickering ao Regenerar Imagem

## Descrição do Problema

Ao clicar em "Regenerar" uma imagem, o seguinte comportamento incorreto ocorria:

1. **Clique em Regenerar**: Nó entra em estado "generating"
2. **Nó conectado volta ao texto anterior**: Um nó de texto conectado volta temporariamente ao conteúdo anterior
3. **Imagem anterior aparece**: O nó de imagem mostra brevemente uma imagem antiga
4. **Depois aparece corretamente**: Após alguns segundos, a nova imagem aparece

Isso dava a impressão de que o sistema "voltou alguns saves antes" e depois se corrigiu.

## Causa Raiz

O problema estava no `components/canvas.tsx`, na lógica de sincronização com atualizações do Realtime:

```typescript
// PROBLEMA: Bloqueio de 2 segundos após cada save
const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
const recentlySaved = timeSinceLastSave < 2000;

if (hasPendingChangesRef.current || saveState.isSaving || recentlySaved) {
  // Bloqueava TODAS as atualizações do Realtime
  return;
}
```

### Sequência do Problema

1. **T=0s**: Usuário clica em "Regenerar"
   - Nó atualizado localmente para estado "generating"
   - `hasPendingChangesRef.current = true`

2. **T=0.5s**: Save é executado (debounced)
   - Projeto salvo no banco
   - `lastSaveTimestampRef.current = Date.now()`
   - Trigger do banco envia broadcast via Realtime

3. **T=0.6s**: Broadcast chega do Realtime
   - Canvas **bloqueia** a atualização (save recente < 2s)
   - Estado do nó não é atualizado

4. **T=5s**: Webhook completa geração da imagem
   - Banco atualizado com novo estado "ready"
   - Trigger envia novo broadcast

5. **T=5.1s**: Broadcast chega do Realtime
   - Canvas **ainda bloqueia** (save recente < 2s)
   - Nova imagem não aparece

6. **T=2.5s**: Período de bloqueio termina
   - Próximo broadcast finalmente passa
   - Mas pode conter estado intermediário incorreto
   - Causa "flickering" visual

## Solução Aplicada

Modificamos a lógica para **permitir atualizações de estado de nó mesmo durante o período de bloqueio**:

```typescript
if (hasPendingChangesRef.current || saveState.isSaving || recentlySaved) {
  // Verificar se apenas o estado do nó mudou
  const currentNodesById = new Map(nodes.map(n => [n.id, n]));
  const newNodesById = new Map(content.nodes.map(n => [n.id, n]));

  let onlyStateChanges = true;
  let hasStateChanges = false;
  const stateChangedNodes: string[] = [];

  for (const [id, newNode] of newNodesById) {
    const currentNode = currentNodesById.get(id);
    
    // Comparar tudo EXCETO data.state e data.updatedAt
    const { state: newState, updatedAt: newUpdatedAt, ...newDataRest } = (newNode.data || {}) as any;
    const { state: currentState, updatedAt: currentUpdatedAt, ...currentDataRest } = (currentNode.data || {}) as any;

    // Se algo além do estado mudou, não é apenas atualização de estado
    if (JSON.stringify(newDataRest) !== JSON.stringify(currentDataRest) ||
        newNode.position.x !== currentNode.position.x ||
        newNode.position.y !== currentNode.position.y) {
      onlyStateChanges = false;
      break;
    }

    // Verificar se o estado mudou
    if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
      hasStateChanges = true;
      stateChangedNodes.push(id);
    }
  }

  // Se APENAS o estado mudou, aplicar a atualização
  if (onlyStateChanges && hasStateChanges) {
    setNodes(prevNodes => {
      return prevNodes.map(node => {
        const newNode = newNodesById.get(node.id);
        if (newNode && stateChangedNodes.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              state: (newNode.data as any)?.state,
              updatedAt: (newNode.data as any)?.updatedAt,
            }
          };
        }
        return node;
      });
    });
    return;
  }
}
```

## Benefícios da Solução

1. **Sem Flickering**: Atualizações de estado (como imagem pronta) passam imediatamente
2. **Proteção Mantida**: Mudanças de posição/conexões ainda são bloqueadas durante saves
3. **Melhor UX**: Usuário vê a transição suave de "generating" → "ready"
4. **Sem Race Conditions**: Apenas o campo `state` é atualizado, preservando mudanças locais

## Casos de Uso Cobertos

### ✅ Permitido Durante Bloqueio
- Atualização de `data.state` (idle → generating → ready)
- Atualização de `data.updatedAt`
- Webhook completando geração de imagem
- Webhook completando geração de áudio
- Webhook completando geração de vídeo

### ❌ Bloqueado Durante Bloqueio (Correto)
- Mudanças de posição de nós
- Mudanças de conexões (edges)
- Mudanças em `data.instructions`
- Mudanças em `data.model`
- Mudanças em outros campos de dados

## Testes Recomendados

1. **Regenerar Imagem**
   - Conectar nó de texto a nó de imagem
   - Gerar imagem
   - Clicar em "Regenerar"
   - Verificar que não há flickering
   - Verificar que texto não volta ao estado anterior

2. **Múltiplas Regenerações Rápidas**
   - Clicar em "Regenerar" várias vezes rapidamente
   - Verificar que cada geração é processada corretamente
   - Verificar que não há estados intermediários incorretos

3. **Editar Durante Geração**
   - Iniciar geração de imagem
   - Editar texto em nó conectado durante geração
   - Verificar que edição não é perdida quando imagem completa

4. **Múltiplos Nós Simultâneos**
   - Gerar múltiplas imagens ao mesmo tempo
   - Verificar que todas atualizam corretamente
   - Verificar que não há interferência entre nós

## Arquivos Modificados

- `components/canvas.tsx`: Lógica de sincronização com Realtime

## Próximos Passos

- [ ] Monitorar logs em produção para verificar eficácia
- [ ] Considerar reduzir período de bloqueio de 2s para 1s
- [ ] Adicionar testes automatizados para este cenário
- [ ] Documentar padrão para outros tipos de nós
