# Guia de Teste: Correção de Flickering

## Objetivo

Verificar que a correção eliminou o problema de "flickering" onde nós voltavam temporariamente a estados anteriores ao regenerar imagens.

## Pré-requisitos

1. Aplicação rodando localmente ou em staging
2. Conta de usuário com créditos
3. Console do navegador aberto para ver logs

## Teste 1: Regenerar Imagem Simples

### Passos

1. Criar novo projeto
2. Adicionar nó de texto com prompt: "A beautiful sunset over mountains"
3. Adicionar nó de imagem
4. Conectar texto → imagem
5. Clicar em "Generate" no nó de imagem
6. Aguardar imagem ser gerada
7. Clicar em "Regenerate"

### Resultado Esperado

✅ **Comportamento Correto:**
- Nó entra em estado "generating" imediatamente
- Texto permanece inalterado durante toda a geração
- Quando imagem completa, transição suave para "ready"
- Nova imagem aparece sem mostrar imagem anterior

❌ **Comportamento Incorreto (Bug):**
- Texto volta temporariamente ao valor anterior
- Imagem anterior aparece brevemente
- "Flickering" visual

### Logs Esperados

```
✅ Allowing state-only update during pending changes: {
  projectId: "...",
  hasStateChanges: true,
  stateChangedNodes: ["image-node-id"],
  ...
}
```

## Teste 2: Editar Texto Durante Geração

### Passos

1. Criar nó de texto com prompt: "A cat"
2. Criar nó de imagem conectado
3. Gerar imagem
4. Enquanto imagem está gerando, editar texto para: "A dog"
5. Aguardar geração completar

### Resultado Esperado

✅ **Comportamento Correto:**
- Edição do texto é preservada
- Imagem gerada corresponde ao prompt original ("A cat")
- Texto permanece como "A dog" após geração completar

❌ **Comportamento Incorreto:**
- Texto volta para "A cat" após geração
- Edição é perdida

## Teste 3: Múltiplas Regenerações Rápidas

### Passos

1. Criar nó de texto + imagem conectados
2. Gerar imagem
3. Clicar em "Regenerate" 3 vezes rapidamente (intervalo < 1s)

### Resultado Esperado

✅ **Comportamento Correto:**
- Apenas a última regeneração é processada
- Nó permanece em estado "generating" até completar
- Sem flickering entre estados

❌ **Comportamento Incorreto:**
- Múltiplas gerações são iniciadas
- Estados se sobrepõem causando flickering

## Teste 4: Múltiplos Nós Simultâneos

### Passos

1. Criar 3 nós de texto diferentes
2. Criar 3 nós de imagem
3. Conectar cada texto a uma imagem
4. Gerar todas as 3 imagens ao mesmo tempo
5. Enquanto estão gerando, editar um dos textos

### Resultado Esperado

✅ **Comportamento Correto:**
- Todas as 3 imagens geram corretamente
- Edição do texto é preservada
- Cada nó atualiza independentemente
- Sem interferência entre nós

## Teste 5: Regenerar com Nó de Texto Conectado

### Passos

1. Criar nó de texto: "Original prompt"
2. Criar nó de imagem conectado
3. Gerar imagem
4. Editar texto para: "Modified prompt"
5. Clicar em "Regenerate" na imagem
6. Observar comportamento durante geração

### Resultado Esperado

✅ **Comportamento Correto:**
- Texto permanece como "Modified prompt" durante toda a geração
- Nova imagem usa o prompt modificado
- Sem reversão do texto

## Verificação de Logs

### Logs Importantes

1. **Atualização de Estado Permitida:**
```
✅ Allowing state-only update during pending changes
```

2. **Atualização Bloqueada (Esperado para mudanças estruturais):**
```
⏸️ Skipping realtime update - local changes pending
```

3. **Sincronização do Canvas:**
```
🔄 Checking for canvas sync
✅ Content changed via Realtime, updating canvas
```

### Logs de Problema

Se você ver estes logs, o bug ainda existe:

```
❌ Content changed but blocked due to pending save
❌ State reverted to previous value
❌ Image flickering detected
```

## Métricas de Sucesso

- [ ] Teste 1: Sem flickering ao regenerar
- [ ] Teste 2: Edições preservadas durante geração
- [ ] Teste 3: Múltiplas regenerações tratadas corretamente
- [ ] Teste 4: Múltiplos nós funcionam independentemente
- [ ] Teste 5: Texto conectado não reverte

## Troubleshooting

### Se o flickering ainda ocorrer:

1. **Verificar logs do console:**
   - Procurar por "Allowing state-only update"
   - Verificar se `onlyStateChanges` é `true`

2. **Verificar timing:**
   - Logs devem mostrar `timeSinceLastSave`
   - Verificar se está dentro do período de 2s

3. **Verificar estrutura do estado:**
   - Estado deve estar em `node.data.state`
   - Verificar se comparação JSON está funcionando

4. **Verificar Realtime:**
   - Abrir DevTools → Network → WS
   - Verificar se broadcasts estão chegando
   - Verificar payload dos broadcasts

### Comandos Úteis

```bash
# Ver logs do Supabase Realtime
supabase logs realtime --follow

# Ver logs do banco de dados
supabase logs postgres --follow

# Verificar triggers
psql -c "SELECT * FROM pg_trigger WHERE tgname LIKE '%broadcast%';"
```

## Notas Adicionais

- O período de bloqueio é de 2 segundos após cada save
- Apenas mudanças em `data.state` e `data.updatedAt` passam durante bloqueio
- Mudanças estruturais (posição, conexões) são corretamente bloqueadas
- A correção não afeta performance ou funcionalidade existente
