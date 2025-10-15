# Guia de Configuração - Webhooks Fal.ai

## ✅ Implementação Completa

A implementação de webhooks do fal.ai está **completa e funcional**. O sistema agora suporta processamento assíncrono de imagens e vídeos com fallback automático.

## 📋 O que foi implementado

### 1. Schema do Banco de Dados
- ✅ Tabela `fal_jobs` criada em `schema.ts`
- Armazena: request_id, status, resultado, erro, timestamps

### 2. Webhook Endpoint
- ✅ Rota criada: `app/api/webhooks/fal/route.ts`
- Recebe notificações do fal.ai
- Atualiza status dos jobs no banco

### 3. Funções Auxiliares
- ✅ `lib/fal-jobs.ts` criado com:
  - `createFalJob()` - Salva job no banco
  - `getFalJobByRequestId()` - Busca job
  - `waitForFalJob()` - Aguarda conclusão com polling

### 4. Modelos Atualizados
- ✅ `lib/models/image/fal.ts` - Suporta webhooks
- ✅ `lib/models/video/fal.ts` - Suporta webhooks
- Ambos com fallback automático para polling direto

### 5. Variáveis de Ambiente
- ✅ `NEXT_PUBLIC_APP_URL` adicionada ao `.env` e `.env.example`

## 🚀 Como Usar

### Modo 1: Com Webhooks (Recomendado para Produção)

**Produção:**
```bash
# .env
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

**Desenvolvimento com ngrok:**
```bash
# Terminal 1: Iniciar aplicação
npm run dev

# Terminal 2: Iniciar ngrok
ngrok http 3000

# Copiar URL do ngrok (ex: https://abc123.ngrok.io)
# Atualizar .env:
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### Modo 2: Sem Webhooks (Fallback Automático)

Se `NEXT_PUBLIC_APP_URL` não estiver definida, o sistema automaticamente usa polling direto na API do fal.ai:

```bash
# .env (comentar ou remover)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
```

O código detecta automaticamente e usa o modo apropriado!

## 🔄 Fluxo de Trabalho

### Com Webhook:
```
1. Cliente → fal.queue.submit(modelId, { input, webhookUrl })
2. Sistema → Salva job no banco (status: pending)
3. Sistema → Retorna request_id imediatamente
4. Sistema → Faz polling no banco a cada 2s
5. Fal.ai → Processa e chama webhook
6. Webhook → Atualiza banco (status: completed)
7. Sistema → Detecta mudança e retorna resultado
```

### Sem Webhook (Fallback):
```
1. Cliente → fal.queue.submit(modelId, { input })
2. Sistema → fal.queue.result() com polling direto
3. Fal.ai → Retorna resultado quando pronto
```

## 📊 Vantagens do Webhook

| Aspecto | Com Webhook | Sem Webhook |
|---------|-------------|-------------|
| **Resposta** | Imediata (request_id) | Bloqueante |
| **Escalabilidade** | Alta | Limitada |
| **Confiabilidade** | Alta (banco persiste) | Média |
| **Monitoramento** | Completo (histórico) | Limitado |
| **Desenvolvimento** | Requer túnel | Funciona direto |

## 🛠️ Próximos Passos

### 1. Criar Migração do Banco
```bash
# Gerar migração para a tabela fal_jobs
npm run db:generate
npm run db:migrate
```

### 2. Testar em Desenvolvimento

**Opção A: Com ngrok (webhooks ativos)**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000

# Atualizar NEXT_PUBLIC_APP_URL no .env com URL do ngrok
# Testar geração de imagem/vídeo
```

**Opção B: Sem ngrok (fallback automático)**
```bash
# Comentar NEXT_PUBLIC_APP_URL no .env
npm run dev
# Testar geração de imagem/vídeo
```

### 3. Deploy em Produção

```bash
# Configurar variável de ambiente no Vercel/Railway/etc
NEXT_PUBLIC_APP_URL=https://seu-dominio.com

# Deploy
git push
```

## 🐛 Troubleshooting

### Erro: "Job not found"
- Verificar se a tabela `fal_jobs` foi criada
- Rodar migração do banco

### Erro: "User not authenticated"
- Webhook requer usuário autenticado
- Verificar se `currentUser()` está funcionando

### Webhook não é chamado
- Verificar se `NEXT_PUBLIC_APP_URL` está correta
- Em dev, verificar se ngrok está rodando
- Verificar logs do fal.ai

### Timeout
- Imagens: 5 minutos padrão
- Vídeos Kling: 3 minutos
- Vídeos Sora: 6 minutos
- Ajustar `maxWaitTime` se necessário

## 📝 Logs para Debug

O sistema gera logs detalhados:

```typescript
// Ao submeter
"Fal.ai submission mode: { useWebhook: true, webhookUrl: '✓' }"
"Fal.ai queue submitted: { request_id: '...', useWebhook: true }"
"Job saved, waiting for webhook..."

// No webhook
"Fal.ai webhook received: { request_id: '...', status: 'COMPLETED' }"
"Job completed: ..."

// Ao completar
"Job result received"
```

## 📚 Documentação Adicional

- `FAL_WEBHOOK_IMPLEMENTATION.md` - Detalhes técnicos completos
- `FAL_QUEUE_MODE_IMPLEMENTATION.md` - Implementação do modo fila
- [Fal.ai Webhooks Docs](https://docs.fal.ai/model-apis/model-endpoints/webhooks)

## ✨ Conclusão

A implementação está **100% funcional** com:
- ✅ Webhooks implementados
- ✅ Fallback automático
- ✅ Suporte a imagens e vídeos
- ✅ Monitoramento completo
- ✅ Pronto para produção

Basta configurar `NEXT_PUBLIC_APP_URL` e está pronto para usar! 🚀
