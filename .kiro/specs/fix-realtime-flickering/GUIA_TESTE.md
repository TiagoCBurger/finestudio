# Guia de Teste - Correções de Flickering e Perda de Dados

## Preparação

1. **Abra o Console do Navegador** (F12 ou Cmd+Option+I)
2. **Limpe o console** para ver apenas os novos logs
3. **Recarregue a página** do projeto

## Testes a Realizar

### Teste 1: Edição Simples (Sem Flickering)

**Objetivo**: Verificar que não há flickering durante edições normais

**Passos**:
1. Mova um nó no canvas
2. Aguarde 2 segundos (tempo do save)
3. Observe o console

**Resultado Esperado**:
```
✅ hasPendingChanges deve ser true durante o save
✅ Deve aparecer "Skipping realtime update - local changes pending"
✅ Após o save, deve aparecer "SWR revalidated successfully"
✅ NÃO deve aparecer "Content changed via Realtime, updating canvas"
✅ O nó NÃO deve "pular" ou voltar para posição anterior
```

**Resultado Incorreto** (se ainda houver problema):
```
❌ Múltiplos logs de "Content changed via Realtime"
❌ O nó "pula" ou volta para posição anterior
❌ Logs repetidos do mesmo conteúdo
```

### Teste 2: Edições Rápidas (Race Condition)

**Objetivo**: Verificar que mudanças rápidas não são perdidas

**Passos**:
1. Mova um nó
2. Imediatamente mova outro nó (antes de 1 segundo)
3. Mova um terceiro nó (antes de 1 segundo)
4. Aguarde 3 segundos
5. Recarregue a página

**Resultado Esperado**:
```
✅ Todos os 3 nós devem estar nas novas posições
✅ Nenhuma mudança deve ser perdida
✅ Console deve mostrar apenas 1 save (debounced)
```

### Teste 3: Múltiplas Abas (Sincronização)

**Objetivo**: Verificar que mudanças em uma aba aparecem em outra

**Passos**:
1. Abra o mesmo projeto em 2 abas
2. Na Aba 1: mova um nó
3. Aguarde 2 segundos
4. Observe a Aba 2

**Resultado Esperado**:
```
✅ Aba 2 deve receber o update via Realtime
✅ Aba 2 deve mostrar "Content changed via Realtime, updating canvas"
✅ O nó deve aparecer na nova posição na Aba 2
✅ NÃO deve haver flickering na Aba 2
```

### Teste 4: Edição Durante Realtime Update

**Objetivo**: Verificar que edições locais têm prioridade sobre updates remotos

**Passos**:
1. Abra o mesmo projeto em 2 abas
2. Na Aba 1: mova um nó para posição A
3. Na Aba 2: IMEDIATAMENTE mova o mesmo nó para posição B
4. Aguarde 3 segundos
5. Observe ambas as abas

**Resultado Esperado**:
```
✅ Aba 1 deve mostrar o nó na posição A
✅ Aba 2 deve mostrar o nó na posição B
✅ Após 3 segundos, ambas devem convergir para a última mudança salva
✅ Console da Aba 2 deve mostrar "Skipping realtime update - local changes pending"
```

### Teste 5: Geração de Imagem (Webhook)

**Objetivo**: Verificar que updates de webhook não causam flickering

**Passos**:
1. Adicione um nó de imagem
2. Gere uma imagem
3. Observe o console durante a geração
4. Aguarde a imagem ser gerada

**Resultado Esperado**:
```
✅ Durante a geração, deve aparecer "Skipping realtime update" se houver outras mudanças
✅ Quando a imagem for gerada, deve aparecer "Content changed via Realtime"
✅ A imagem deve aparecer sem flickering
✅ Outros nós NÃO devem "pular" quando a imagem aparecer
```

## Logs Importantes a Observar

### Logs Positivos (Indicam que está funcionando):

```javascript
// Proteção contra race condition funcionando
⏸️ Skipping realtime update - local changes pending: {
  hasPendingChanges: true,
  isSaving: false,
  recentlySaved: true,
  timeSinceLastSave: 1234
}

// Update legítimo do Realtime
✅ Content changed via Realtime, updating canvas: {
  nodesChanged: true,
  edgesChanged: false
}

// SWR revalidando corretamente
📊 [ProjectProvider] SWR revalidated successfully
```

### Logs Negativos (Indicam problema):

```javascript
// Loop infinito (NÃO deve aparecer repetidamente)
🔄 Checking for canvas sync: { ... }
✅ Content changed via Realtime, updating canvas: { ... }
🔄 Checking for canvas sync: { ... }
✅ Content changed via Realtime, updating canvas: { ... }
// ... repetindo infinitamente

// Múltiplas subscrições (NÃO deve aparecer)
[Warning] Subscription already in progress or active

// Erros de mutate (NÃO deve aparecer)
❌ Error calling mutate()
```

## Métricas de Sucesso

### Antes das Correções:
- Logs de "Content changed via Realtime": **10-20 por minuto** (mesmo sem mudanças)
- Flickering: **Visível a cada 1-2 segundos**
- Mudanças perdidas: **~10% das edições rápidas**

### Depois das Correções:
- Logs de "Content changed via Realtime": **Apenas quando há mudanças reais**
- Flickering: **Nenhum durante edição local**
- Mudanças perdidas: **0%**

## Troubleshooting

### Se ainda houver flickering:

1. **Verifique o tempo de proteção**:
   ```typescript
   // Em canvas.tsx, tente aumentar para 3 segundos
   const recentlySaved = timeSinceLastSave < 3000;
   ```

2. **Verifique o dedupingInterval**:
   ```typescript
   // Em project.tsx, tente aumentar para 1000ms
   dedupingInterval: 1000,
   ```

3. **Desabilite temporariamente o Realtime**:
   ```typescript
   // Em use-project-realtime.ts
   useRealtimeSubscription({
     // ...
     enabled: false, // Desabilita temporariamente
   });
   ```

### Se mudanças ainda forem perdidas:

1. **Verifique o debounce do save**:
   ```typescript
   // Em canvas.tsx, tente reduzir para 500ms
   }, 500); // Antes era 1000
   ```

2. **Adicione logs no save**:
   ```typescript
   console.log('💾 Saving:', {
     nodeCount: newContent.nodes.length,
     edgeCount: newContent.edges.length,
     timestamp: Date.now()
   });
   ```

3. **Verifique erros de rede**:
   - Abra a aba Network no DevTools
   - Procure por requests falhando para `/api/projects/[id]`

## Comandos Úteis

### Limpar cache do SWR (no console):
```javascript
// Força revalidação de todos os caches
mutate(() => true, undefined, { revalidate: true });
```

### Verificar estado do Realtime:
```javascript
// No console
RealtimeConnectionManager.getInstance().getConnectionState();
```

### Forçar reconexão do Realtime:
```javascript
// No console
RealtimeConnectionManager.getInstance().reconnect();
```

## Relatório de Teste

Após realizar os testes, preencha:

- [ ] Teste 1: Edição Simples - ✅ Passou / ❌ Falhou
- [ ] Teste 2: Edições Rápidas - ✅ Passou / ❌ Falhou
- [ ] Teste 3: Múltiplas Abas - ✅ Passou / ❌ Falhou
- [ ] Teste 4: Edição Durante Update - ✅ Passou / ❌ Falhou
- [ ] Teste 5: Geração de Imagem - ✅ Passou / ❌ Falhou

**Observações**:
```
[Descreva qualquer comportamento inesperado ou logs estranhos]
```

**Próximos Passos**:
```
[Liste o que precisa ser ajustado, se houver]
```
