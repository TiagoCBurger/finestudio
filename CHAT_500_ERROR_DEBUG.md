# Debug: Erro 500 no Chat

## Problema
```
Error: HTTP error! status: 500
Error generating text
```

## Logs Adicionados

Adicionei logs detalhados para identificar onde está falhando:

```typescript
🔵 Chat API - Request received
✅ User authenticated: [user-id]
📦 Request body: {...}
📋 Model config: Found/Not found
✅ OPENROUTER_API_KEY is configured
🚀 Using OpenRouter DIRECT API for: [model-id]
✅ OpenRouter response received
```

## Próximos Passos

1. **Reinicie o servidor:**
```bash
# Ctrl+C para parar
pnpm dev
```

2. **Tente enviar uma mensagem no chat**

3. **Verifique os logs no terminal**

Os logs vão mostrar exatamente onde está falhando:

### Possíveis Erros:

#### ❌ Authentication failed
- Usuário não está autenticado
- Token inválido ou expirado

#### ❌ Model config: Not found
- ModelId incorreto ou não existe
- Modelo não está configurado em `textModels`

#### ❌ OPENROUTER_API_KEY not configured
- Variável de ambiente não está carregada
- Reinicie o servidor após adicionar a chave

#### ❌ Error in streamOpenRouterResponse
- Problema ao chamar a API do OpenRouter
- Chave API inválida
- Modelo não disponível no OpenRouter
- Problema de rede

#### ❌ Error in convertMessages
- Formato de mensagens incorreto
- Mensagens vazias
- Problema ao extrair texto das mensagens

## Verificações

### 1. Verificar OPENROUTER_API_KEY
```bash
# No terminal
echo $OPENROUTER_API_KEY
```

### 2. Verificar se o modelo existe
```typescript
// Em lib/models/text.ts
export const textModels = {
  'openrouter/...': { ... }
}
```

### 3. Testar a API do OpenRouter diretamente
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Soluções Comuns

### Problema: OPENROUTER_API_KEY não carregada
```bash
# Verifique se está no .env
cat .env | grep OPENROUTER

# Reinicie o servidor
pnpm dev
```

### Problema: Modelo não encontrado
```typescript
// Verifique qual modelId está sendo enviado
console.log('ModelId:', modelId);

// Verifique se existe em textModels
console.log('Available models:', Object.keys(textModels));
```

### Problema: Mensagens vazias
```typescript
// Verifique o formato das mensagens
console.log('Messages:', JSON.stringify(messages, null, 2));
```

## Formato Esperado

### Request Body:
```json
{
  "modelId": "openrouter/anthropic/claude-3.5-sonnet",
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ]
}
```

### Response (Stream):
```
0:{"textDelta":"Hello"}
0:{"textDelta":" there"}
0:{"textDelta":"!"}
0:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":3}}
```

## Após Adicionar os Logs

Reinicie o servidor e tente novamente. Os logs vão mostrar exatamente onde está falhando.

Copie os logs completos e podemos identificar o problema específico!
