# Persistência do Estado de Loading de Imagens

## Problema Resolvido

Quando um usuário gerava uma imagem usando modelos de IA (KIE, FAL), o nó entrava em estado de loading mas perdia esse estado ao recarregar a página. Isso causava:

- Toast de "Image generated successfully" aparecendo imediatamente
- Toast de erro "Failed to load image" logo em seguida
- Nó mostrando "?" no lugar da imagem
- Necessidade de recarregar a página manualmente para ver a imagem

## Solução Implementada

A solução persiste o estado de loading diretamente no `data` do nó dentro da coluna `content` do projeto. Não foi necessário criar uma nova coluna no banco de dados.

### Fluxo Completo

#### 1. Início da Geração (app/actions/image/create.ts)

Quando o usuário clica em gerar:

```typescript
if (isPending) {
  // 1. Buscar o projeto atual
  const project = await database.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  // 2. Atualizar o nó no content com status 'generating'
  const updatedNodes = content.nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        data: {
          ...node.data,
          loading: true,
          status: 'generating',
          requestId,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    return node;
  });

  // 3. Salvar no banco (triggers Realtime broadcast)
  await database.update(projects).set({ 
    content: { ...content, nodes: updatedNodes },
    updatedAt: new Date(),
  });
}
```

**Resultado**: O estado de loading fica persistido no banco de dados e sobrevive a reloads da página.

#### 2. Webhook Recebe Imagem (app/api/webhooks/kie/route.ts)

Quando o webhook do KIE/FAL retorna com a imagem:

```typescript
// 1. Fazer upload da imagem para storage permanente
const uploadResult = await uploadImageToStorage(imageUrl, job.userId);

// 2. Atualizar o nó com a URL permanente e limpar flags de loading
const updatedNodes = content.nodes.map((node) => {
  if (node.id === nodeId) {
    return {
      ...node,
      data: {
        ...node.data,
        generated: {
          url: uploadResult.url, // URL permanente
          type: IMAGE_CONTENT_TYPE,
        },
        loading: false,        // Remove loading
        status: undefined,     // Remove status
        requestId: undefined,  // Remove requestId
        updatedAt: new Date().toISOString(),
      },
    };
  }
  return node;
});

// 3. Salvar no banco (triggers Realtime broadcast)
await database.update(projects).set({
  content: { ...content, nodes: updatedNodes },
  updatedAt: new Date(),
});
```

**Resultado**: O Supabase Realtime notifica automaticamente todos os clientes conectados.

#### 3. Frontend Atualiza Automaticamente (components/nodes/image/transform.tsx)

O componente detecta mudanças via Realtime:

```typescript
useEffect(() => {
  const hasLoadingFlag = (data as any).loading === true;
  const nodeStatus = (data as any).status;

  // Detectar estado de loading persistido
  if ((hasLoadingFlag || nodeStatus === 'generating') && !loading) {
    console.log('🔄 Ativando loading state (status persistido no nó)');
    setLoading(true);
    return;
  }

  // Detectar quando webhook completou
  if (loading && currentUrl && currentUrl.length > 0 && currentUrl !== previousUrl) {
    console.log('✅ Webhook completou, URL recebida');
    setImageLoading(true);
    setPreviousUrl(currentUrl);
    setShouldShowSuccessToast(true);
  }
}, [data.generated?.url, data.loading, data.status, data.updatedAt]);
```

**Resultado**: O nó atualiza automaticamente sem necessidade de reload manual.

## Vantagens da Solução

### ✅ Sem Nova Coluna
- Usa a coluna `content` existente
- Não requer migration no banco de dados
- Mantém a estrutura simples

### ✅ Persistência Automática
- Estado de loading sobrevive a reloads da página
- Usuário pode fechar e abrir o navegador
- Estado é restaurado automaticamente

### ✅ Sincronização Multi-Janela
- Supabase Realtime notifica todas as janelas abertas
- Atualização automática em tempo real
- Sem necessidade de polling

### ✅ Experiência do Usuário
- Nó fica em loading até a imagem estar pronta
- Imagem aparece automaticamente quando pronta
- Toast de sucesso só aparece quando realmente completou
- Sem erros falsos de "Failed to load image"

## Estrutura do Nó Durante Geração

```typescript
{
  id: "node-123",
  type: "image",
  data: {
    // Estado de loading persistido
    loading: true,
    status: "generating",
    requestId: "kie-abc-123",
    
    // Placeholder até webhook completar
    generated: {
      url: "",
      type: "image/png",
      headers: { ... }
    },
    
    updatedAt: "2024-12-20T10:30:00.000Z"
  }
}
```

## Estrutura do Nó Após Conclusão

```typescript
{
  id: "node-123",
  type: "image",
  data: {
    // Flags de loading removidas
    loading: false,
    status: undefined,
    requestId: undefined,
    
    // URL permanente da imagem
    generated: {
      url: "https://storage.supabase.co/...",
      type: "image/png"
    },
    
    updatedAt: "2024-12-20T10:31:00.000Z"
  }
}
```

## Fluxo de Dados

```
1. Usuário clica "Generate"
   ↓
2. Action salva status='generating' no nó
   ↓
3. Database trigger → Supabase Realtime broadcast
   ↓
4. Frontend recebe update → Ativa loading state
   ↓
5. Webhook recebe imagem do KIE/FAL
   ↓
6. Webhook faz upload para storage permanente
   ↓
7. Webhook atualiza nó com URL permanente
   ↓
8. Database trigger → Supabase Realtime broadcast
   ↓
9. Frontend recebe update → Mostra imagem
   ↓
10. Toast de sucesso aparece
```

## Compatibilidade

- ✅ Funciona com KIE.ai
- ✅ Funciona com FAL.ai
- ✅ Funciona com qualquer provider que use webhooks
- ✅ Compatível com storage R2 e Supabase
- ✅ Suporta múltiplas janelas abertas
- ✅ Funciona offline (estado é restaurado ao reconectar)

## Testes Recomendados

1. **Teste de Reload**: Gerar imagem e recarregar página durante geração
2. **Teste Multi-Janela**: Abrir projeto em duas janelas e gerar imagem
3. **Teste de Reconexão**: Desconectar internet durante geração e reconectar
4. **Teste de Erro**: Simular falha no webhook e verificar tratamento
