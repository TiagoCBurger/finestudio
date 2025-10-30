# Debug: Colar Imagens no Whiteboard

## Mudanças Aplicadas

1. **Prioridade de detecção**: Agora verifica imagens ANTES de nós copiados
2. **Logs melhorados**: Adicionado log inicial quando handlePaste é chamado
3. **Removido hotkey conflitante**: O `useHotkeys('meta+v')` foi removido para evitar conflito
4. **Log no listener**: Adicionado log quando o evento paste é detectado

## Como Testar

### Teste 1: Verificar se o evento está sendo capturado

1. Abra o console do navegador (F12)
2. Copie uma imagem qualquer (Cmd+C)
3. Clique no canvas
4. Cole (Cmd+V)
5. **Verifique no console**:
   - Deve aparecer: `📎 Paste event detected:`
   - Deve aparecer: `🎯 handlePaste called:`

**Se não aparecer nada**: O evento não está sendo capturado. Possíveis causas:
- Outro elemento está capturando o evento
- O foco não está no documento
- Há um preventDefault em outro lugar

### Teste 2: Verificar se a imagem está no clipboard

Se o evento está sendo capturado, verifique:

1. No console, procure por: `📋 Clipboard items:`
2. Deve mostrar algo como:
   ```
   count: 1
   types: [{type: "image/png", kind: "file"}]
   ```

**Se não aparecer**: O clipboard não contém uma imagem. Tente:
- Copiar de outra fonte (screenshot, navegador, etc)
- Usar Cmd+Shift+Ctrl+4 (Mac) para screenshot direto no clipboard

### Teste 3: Verificar upload

Se a imagem foi detectada:

1. Procure por: `⬆️ Starting image upload...`
2. Deve aparecer um toast: "Uploading image..."
3. Deve criar um nó com loading state
4. Procure por: `✅ Upload complete:`

**Se falhar no upload**: Verifique:
- Network tab para ver o erro da API
- Se o projeto está carregado (`project?.id`)
- Se há erros de CORS ou autenticação

### Teste 4: Arquivo de teste standalone

Abra o arquivo `test-paste-image.html` no navegador:

```bash
open test-paste-image.html
```

Este arquivo testa APENAS a funcionalidade de paste, sem React ou Next.js.

1. Copie uma imagem
2. Cole no arquivo
3. Verifique os logs
4. A imagem deve aparecer

**Se funcionar aqui mas não no app**: O problema está na integração com React/ReactFlow.

## Possíveis Problemas

### 1. Foco não está no documento

**Sintoma**: Nenhum log aparece quando cola

**Solução**: Clique no canvas antes de colar

### 2. Outro listener está capturando o evento

**Sintoma**: Logs aparecem mas param em algum ponto

**Solução**: Procure por outros `addEventListener('paste')` no código

### 3. ReactFlow está bloqueando o evento

**Sintoma**: Evento não chega ao listener

**Solução**: Verificar se ReactFlow tem alguma configuração de eventos

### 4. Clipboard vazio ou formato errado

**Sintoma**: `📋 Clipboard items: count: 0` ou tipos errados

**Solução**: 
- Copiar de outra fonte
- Verificar permissões do navegador
- Testar com screenshot direto (Cmd+Shift+Ctrl+4)

## Logs Esperados (Sucesso)

```
📎 Paste event detected: {hasClipboardData: true, itemsCount: 1}
🎯 handlePaste called: {hasEvent: true, hasProjectId: true, copiedNodesCount: 0, hasClipboardData: true}
📋 Clipboard items: {count: 1, types: [{type: "image/png", kind: "file"}]}
📄 Checking item 0: {type: "image/png", kind: "file", isImage: true}
📁 Got file from clipboard: {hasFile: true, fileName: "image.png", fileSize: 12345, fileType: "image/png"}
⬆️ Starting image upload...
✅ Created loading node: abc123
✅ Upload complete: {url: "https://...", type: "image/png"}
```

## Próximos Passos

1. **Teste o arquivo HTML standalone** para confirmar que o navegador suporta paste
2. **Abra o console** e cole uma imagem no canvas
3. **Copie todos os logs** e me envie se não funcionar
4. **Verifique a Network tab** para ver se há erros de API

## Comandos Úteis

```bash
# Abrir teste standalone
open test-paste-image.html

# Ver logs do servidor (se houver erro de upload)
npm run dev

# Limpar cache do navegador
Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows)
```
