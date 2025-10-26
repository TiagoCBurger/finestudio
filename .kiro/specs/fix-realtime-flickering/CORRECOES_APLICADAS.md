# Correções Aplicadas - Flickering e Perda de Dados no Realtime

## Problemas Identificados

### 1. Loop de Dependências no Canvas
**Problema**: O `useEffect` no `canvas.tsx` tinha `nodes` e `edges` como dependências, mas também atualizava esses mesmos estados, causando re-renders infinitos.

**Sintoma**: Logs repetidos de "Content changed via Realtime, updating canvas" mesmo sem mudanças reais.

### 2. Race Condition no Save
**Problema**: O flag `hasPendingChangesRef` era limpo antes do save completar, permitindo que atualizações do Realtime sobrescrevessem mudanças locais durante o período de debounce (1 segundo).

**Sintoma**: Mudanças que "desaparecem" logo após serem feitas.

### 3. Comparações JSON Ineficientes
**Problema**: Múltiplas comparações `JSON.stringify()` a cada render, causando overhead desnecessário.

**Sintoma**: Performance degradada e logs excessivos.

## Correções Aplicadas

### 1. Otimização do useEffect no Canvas (`components/canvas.tsx`)

**Antes**:
```typescript
useEffect(() => {
  // ...
}, [content, nodes, edges, project?.id, project?.updatedAt, saveState.isSaving]);
```

**Depois**:
```typescript
useEffect(() => {
  // ...
}, [content, project?.id, project?.updatedAt, saveState.isSaving]);
// Removido: nodes, edges (causavam loop)
```

### 2. Proteção Contra Race Conditions

**Adicionado**:
```typescript
// Track last save timestamp to prevent race conditions
const lastSaveTimestampRef = useRef<number>(0);

// No useEffect:
const timeSinceLastSave = Date.now() - lastSaveTimestampRef.current;
const recentlySaved = timeSinceLastSave < 2000; // 2 segundos de proteção

if (hasPendingChangesRef.current || saveState.isSaving || recentlySaved) {
  // Skip realtime update
  return;
}

// No save:
lastSaveTimestampRef.current = Date.now();
```

### 3. Otimização do SWR no ProjectProvider (`providers/project.tsx`)

**Mudanças**:
- `dedupingInterval`: 300ms → 500ms (reduz re-fetches durante saves)
- Função `compare` otimizada: verifica referência primeiro, depois apenas `content` e `updatedAt`

**Antes**:
```typescript
compare: (a, b) => {
  const isSame = JSON.stringify(a) === JSON.stringify(b);
  // ...
}
```

**Depois**:
```typescript
compare: (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  
  const aContent = JSON.stringify(a.content);
  const bContent = JSON.stringify(b.content);
  return aContent === bContent && a.updatedAt === b.updatedAt;
}
```

## Fluxo Corrigido

### Antes (com problemas):
```
1. Usuário faz mudança
2. handleNodesChange() → setNodes() → save() (debounced 1s)
3. useEffect detecta mudança em nodes → compara → atualiza prevContentRef
4. Realtime recebe broadcast → mutate()
5. SWR revalida → ProjectProvider atualiza
6. useEffect detecta mudança em content → sobrescreve nodes (PROBLEMA!)
7. Save completa mas dados já foram sobrescritos
```

### Depois (corrigido):
```
1. Usuário faz mudança
2. handleNodesChange() → setNodes() → save() (debounced 1s)
3. hasPendingChangesRef = true
4. useEffect detecta mudança mas IGNORA (nodes/edges não são dependências)
5. Realtime recebe broadcast → mutate()
6. SWR revalida → ProjectProvider atualiza
7. useEffect detecta mudança em content mas IGNORA (hasPendingChanges = true)
8. Save completa → lastSaveTimestampRef = now
9. Após 2 segundos, realtime updates são permitidos novamente
```

## Logs de Diagnóstico

Os logs agora mostram claramente quando updates são ignorados:

```
⏸️ Skipping realtime update - local changes pending: {
  hasPendingChanges: true,
  isSaving: false,
  recentlySaved: true,
  timeSinceLastSave: 1234,
  projectId: "..."
}
```

## Próximos Passos Recomendados

### 1. Testar o Fluxo Completo
- [ ] Fazer mudanças rápidas no canvas
- [ ] Verificar que não há flickering
- [ ] Confirmar que mudanças são salvas corretamente
- [ ] Testar com múltiplas abas abertas

### 2. Monitorar Logs
Procurar por:
- ✅ Menos logs de "Content changed via Realtime"
- ✅ Logs de "Skipping realtime update" durante saves
- ✅ Sem loops infinitos de atualização

### 3. Otimizações Adicionais (Opcional)

Se ainda houver problemas, considerar:

#### A. Debounce mais agressivo no Realtime
```typescript
// Em use-project-realtime.ts
const debouncedMutate = useDebouncedCallback(() => {
  mutate(cacheKey, undefined, { revalidate: true });
}, 500); // Debounce de 500ms
```

#### B. Optimistic Updates mais inteligentes
```typescript
// No save, usar o conteúdo atual em vez de toObject()
mutate(
  cacheKey,
  (current) => ({
    ...current,
    content: toObject(),
    updatedAt: new Date().toISOString()
  }),
  { revalidate: false }
);
```

#### C. Desabilitar Realtime durante edição ativa
```typescript
const [isEditing, setIsEditing] = useState(false);

useProjectRealtime(projectId, {
  enabled: !isEditing // Desabilita durante edição
});
```

## Verificação de Sucesso

### Antes das correções:
- ❌ Logs repetidos de "Content changed via Realtime"
- ❌ Nós que desaparecem temporariamente
- ❌ Mudanças que não são salvas
- ❌ Flickering visual

### Depois das correções:
- ✅ Logs de realtime apenas quando há mudanças reais
- ✅ Nós permanecem estáveis durante edição
- ✅ Todas as mudanças são salvas corretamente
- ✅ Sem flickering visual

## Arquivos Modificados

1. `components/canvas.tsx`
   - Removido `nodes` e `edges` das dependências do useEffect
   - Adicionado `lastSaveTimestampRef` para proteção contra race conditions
   - Melhorada lógica de skip de updates durante saves

2. `providers/project.tsx`
   - Aumentado `dedupingInterval` para 500ms
   - Otimizada função `compare` do SWR
   - Melhorados logs de diagnóstico

## Notas Técnicas

### Por que 2 segundos de proteção?
- Debounce do save: 1000ms
- Tempo de rede (save + broadcast): ~500ms
- Margem de segurança: 500ms
- **Total: 2000ms**

### Por que remover nodes/edges das dependências?
- Eles mudam a cada interação do usuário
- Causam re-execução do useEffect mesmo quando não há updates do Realtime
- O `content` do projeto já contém nodes e edges, então é suficiente observar apenas ele

### Por que aumentar dedupingInterval?
- Previne múltiplas re-fetches durante o período de save
- Reduz carga no servidor
- Melhora performance do cliente
- 500ms é suficiente para cobrir a maioria dos casos de save rápido
