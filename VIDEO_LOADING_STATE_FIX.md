# Solução: Estado de Loading Persistido para Geração de Vídeo

## 🎯 Problema

O estado de loading não era persistido no banco de dados durante a geração de vídeo via webhook, causando:
- Perda do estado ao recarregar a página
- Falta de sincronização entre múltiplas janelas
- Usuário não sabe se há geração em andamento após reload

## ✅ Solução Implementada

### 1. Persistir Loading no Banco (`app/actions/video/create.ts`)

```typescript
// Salvar estado de loading no banco quando job é pendente
const nodeDataWithLoading = {
  ...(existingNode.data ?? {}),
  status: 'pending',
  requestId,
  loading: true, // ✅ Persistido no banco
  updatedAt: new Date().toISOString(),
};

await database.update(projects).set({ 
  content: { ...content, nodes: updatedNodes },
  updatedAt: new Date(), // Trigger realtime
});
```

### 2. Sincronizar no Frontend (`components/nodes/video/transform.tsx`)

```typescript
// Inicializar baseado no banco
const [loading, setLoading] = useState(
  data.loading === true || data.status === 'pending'
);

// Sincronizar continuamente
useEffect(() => {
  const shouldBeLoading = data.loading === true || data.status === 'pending';
  if (shouldBeLoading && !loading) {
    setLoading(true);
  }
}, [data.loading, data.status, loading]);
```

### 3. Remover no Webhook (`app/api/webhooks/fal/route.ts`)

```typescript
// Quando geração completa
data: {
  ...node.data,
  generated: { url: mediaUrl, type: 'video/mp4' },
  loading: false, // ✅ Remove loading
  status: undefined, // ✅ Remove pending
  requestId: undefined,
}
```

## 🔄 Fluxo

1. **Início**: Action salva `loading: true` no banco → Realtime notifica
2. **Durante**: Estado persiste no banco, sobrevive a reloads
3. **Conclusão**: Webhook remove `loading: false` → Realtime notifica → Toast de sucesso

## 🎨 Estados do Nó

**Durante Geração**:
```json
{
  "status": "pending",
  "requestId": "abc123",
  "loading": true
}
```

**Após Conclusão**:
```json
{
  "generated": {
    "url": "https://r2.../video.mp4",
    "type": "video/mp4"
  }
}
```

## ✨ Benefícios

- ✅ Estado sobrevive a reloads
- ✅ Sincronização multi-window via Realtime
- ✅ UX consistente
- ✅ Não perde contexto de gerações em andamento
