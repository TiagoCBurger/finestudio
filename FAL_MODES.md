# Modos de Operação Fal.ai

## 🎯 Visão Geral

O sistema suporta **dois modos** de operação com fal.ai, decididos **antes** da submissão para evitar cobrança dupla.

## 🚀 Modo Webhook (Produção/Recomendado)

### Quando usar:
- ✅ **Produção** com domínio configurado
- ✅ **Desenvolvimento** com túnel (serveo/ngrok)
- ✅ Quando velocidade é importante
- ✅ Quando não quer bloquear requisições

### Como ativar:
```bash
# .env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
# ou
NEXT_PUBLIC_APP_URL=https://abc123.serveo.net
```

### Como funciona:
1. Cria job no banco de dados
2. Submete para fal.ai **com webhook URL**
3. Retorna imediatamente (não bloqueia)
4. Frontend faz polling do status no banco
5. Webhook atualiza job quando completa
6. Frontend recebe resultado automaticamente

### Vantagens:
- ⚡ **Rápido** - não aguarda processamento
- 🚀 **Não bloqueia** - Server Action retorna imediatamente
- 💰 **Eficiente** - uma única submissão
- 🎨 **Melhor UX** - usuário pode continuar trabalhando

## 🔧 Modo Fallback (Desenvolvimento)

### Quando usar:
- ⚠️ **Apenas desenvolvimento** sem túnel
- ⚠️ Quando não quer configurar webhook
- ⚠️ Para testes rápidos locais

### Como ativar:
```bash
# .env
# NEXT_PUBLIC_APP_URL=...  (comentado ou removido)
```

### Como funciona:
1. Submete para fal.ai **sem webhook URL**
2. Aguarda processamento (polling direto na API fal.ai)
3. Retorna resultado completo quando termina

### Desvantagens:
- 🐌 **Lento** - aguarda processamento completo
- 🔒 **Bloqueia** - Server Action fica aguardando
- ⏱️ **Timeout** - pode exceder limites de tempo
- 😴 **Pior UX** - usuário fica esperando

## ⚠️ Importante: Sem Cobrança Dupla

O sistema **decide o modo ANTES** de submeter:

```typescript
const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;

if (useWebhook) {
  // Submete COM webhook
  await fal.queue.submit(modelId, { input, webhookUrl });
} else {
  // Submete SEM webhook
  await fal.queue.submit(modelId, { input });
}
```

**Nunca** há duas submissões = **Nunca** há cobrança dupla! ✅

## 📊 Comparação

| Aspecto | Webhook | Fallback |
|---------|---------|----------|
| **Velocidade** | ⚡ Instantâneo | 🐌 Aguarda completo |
| **Bloqueio** | ❌ Não bloqueia | ✅ Bloqueia |
| **Configuração** | 🔧 Precisa túnel | 🎯 Funciona sempre |
| **Produção** | ✅ Recomendado | ❌ Não usar |
| **Desenvolvimento** | ✅ Com túnel | ✅ Sem túnel |
| **Cobrança** | 💰 Uma vez | 💰 Uma vez |

## 🎯 Recomendações

### Produção:
```bash
# Sempre usar webhook
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### Desenvolvimento:
```bash
# Com túnel (recomendado)
NEXT_PUBLIC_APP_URL=https://abc123.serveo.net

# Sem túnel (fallback)
# NEXT_PUBLIC_APP_URL=...
```

## 🔍 Logs

### Webhook Mode:
```
Fal.ai submission mode: { mode: 'WEBHOOK (production/tunnel)', webhookUrl: 'https://...' }
Pre-creating job to avoid race condition...
Job pre-created with ID: xxx
Fal.ai queue submitted: { request_id: 'xxx', useWebhook: true }
Job updated with real request_id, waiting for webhook...
Returning pending result, frontend will poll for completion...
```

### Fallback Mode:
```
Fal.ai submission mode: { mode: 'FALLBACK (dev only)', webhookUrl: 'N/A' }
⚠️ Using fallback polling mode (dev only, slower)
```

## 🚨 Troubleshooting

### Webhook não funciona?
1. Verifique se `NEXT_PUBLIC_APP_URL` está configurado
2. Teste se a URL é acessível externamente
3. Verifique logs do webhook em `/api/webhooks/fal`
4. Se necessário, use fallback temporariamente

### Fallback muito lento?
1. Configure um túnel (serveo/ngrok)
2. Ative modo webhook
3. Aproveite a velocidade! 🚀
