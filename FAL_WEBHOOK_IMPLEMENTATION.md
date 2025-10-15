# Implementação de Webhooks Fal.ai

## Visão Geral

Este documento descreve como implementar webhooks do fal.ai para processar gerações de imagem e vídeo de forma assíncrona, seguindo a documentação oficial: https://docs.fal.ai/model-apis/model-endpoints/webhooks

## Arquitetura

### 1. Tabela de Jobs (`fal_jobs`)

Armazena o estado de cada requisição:
- `request_id`: ID único do fal.ai
- `status`: 'pending', 'completed', 'failed'
- `result`: Resultado quando completado
- `error`: Mensagem de erro se falhar

### 2. Webhook Endpoint

**URL**: `/api/webhooks/fal`

Recebe notificações do fal.ai quando jobs são completados:
- `IN_QUEUE`: Job na fila
- `IN_PROGRESS`: Job em processamento
- `COMPLETED`: Job completado com sucesso
- `FAILED`: Job falhou

### 3. Fluxo de Trabalho

```
1. Cliente submete requisição → fal.queue.submit() com webhook_url
2. Salva job no banco com status 'pending'
3. Retorna request_id imediatamente
4. Cliente faz polling no banco de dados
5. Fal.ai processa e chama webhook
6. Webhook atualiza status no banco
7. Cliente recebe resultado
```

## Configuração

### Variáveis de Ambiente

Adicione ao `.env`:

```bash
# URL base da aplicação (produção ou desenvolvimento)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
# ou para desenvolvimento:
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Webhook URL

O webhook será acessível em:
- **Produção**: `https://seu-dominio.com/api/webhooks/fal`
- **Desenvolvimento**: `http://localhost:3000/api/webhooks/fal`

⚠️ **Importante**: Para desenvolvimento local, você precisará usar um túnel (ngrok, localtunnel, etc.) para que o fal.ai possa acessar seu webhook.

## Implementação

### Exemplo: Geração de Imagem com Webhook

```typescript
import { fal } from '@fal-ai/client';
import { createFalJob, waitForFalJob } from '@/lib/fal-jobs';

// 1. Configurar credenciais
fal.config({
  credentials: env.FAL_API_KEY,
});

// 2. Submeter com webhook
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`;

const { request_id } = await fal.queue.submit(modelId, {
  input: {
    prompt: 'A beautiful sunset',
    num_images: 1,
  },
  webhookUrl, // ← Webhook URL
});

// 3. Salvar job no banco
await createFalJob({
  requestId: request_id,
  userId: user.id,
  modelId,
  type: 'image',
  input: { prompt: 'A beautiful sunset' },
});

// 4. Aguardar resultado (polling no banco)
const job = await waitForFalJob(request_id, {
  maxWaitTime: 5 * 60 * 1000, // 5 minutos
  pollInterval: 2000, // 2 segundos
});

// 5. Usar resultado
const result = job.result;
```

## Vantagens

### 1. Resposta Imediata
- Cliente não fica bloqueado esperando
- Melhor experiência do usuário

### 2. Escalabilidade
- Múltiplas requisições simultâneas
- Não sobrecarrega o servidor

### 3. Confiabilidade
- Webhook garante que resultado seja capturado
- Polling no banco é mais eficiente que polling na API

### 4. Monitoramento
- Histórico completo de jobs no banco
- Fácil debug e análise

## Desenvolvimento Local

Para testar webhooks localmente:

### Opção 1: ngrok (Recomendado)

```bash
# Instalar ngrok
brew install ngrok  # macOS
# ou baixar de https://ngrok.com/download

# Iniciar túnel
ngrok http 3000

# Usar URL fornecida
# Ex: https://abc123.ngrok.io
```

Atualizar `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### Opção 2: localtunnel

```bash
# Instalar
npm install -g localtunnel

# Iniciar túnel
lt --port 3000

# Usar URL fornecida
```

### Opção 3: Modo Fallback (Sem Webhook)

Se não puder usar túnel, o código pode fazer fallback para polling direto:

```typescript
// Se não houver NEXT_PUBLIC_APP_URL, usar polling tradicional
const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`
  : undefined;

const { request_id } = await fal.queue.submit(modelId, {
  input,
  ...(webhookUrl && { webhookUrl }),
});

// Polling direto na API do fal.ai se não houver webhook
if (!webhookUrl) {
  const result = await fal.queue.result(modelId, {
    requestId: request_id,
  });
  return result;
}

// Caso contrário, usar polling no banco
const job = await waitForFalJob(request_id);
return job.result;
```

## Migração do Código Atual

### Antes (Polling Direto)

```typescript
const { request_id } = await fal.queue.submit(modelId, { input });
const result = await fal.queue.result(modelId, { requestId: request_id });
```

### Depois (Com Webhook)

```typescript
const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`;

const { request_id } = await fal.queue.submit(modelId, {
  input,
  webhookUrl,
});

await createFalJob({
  requestId: request_id,
  userId: user.id,
  modelId,
  type: 'image',
  input,
});

const job = await waitForFalJob(request_id);
const result = job.result;
```

## Próximos Passos

1. ✅ Criar tabela `fal_jobs` no banco
2. ✅ Implementar webhook endpoint
3. ✅ Criar funções auxiliares (`createFalJob`, `waitForFalJob`)
4. ⏳ Atualizar `lib/models/image/fal.ts` para usar webhooks
5. ⏳ Atualizar `lib/models/video/fal.ts` para usar webhooks
6. ⏳ Adicionar `NEXT_PUBLIC_APP_URL` ao `.env`
7. ⏳ Testar em desenvolvimento com ngrok
8. ⏳ Testar em produção

## Referências

- [Fal.ai Webhooks Documentation](https://docs.fal.ai/model-apis/model-endpoints/webhooks)
- [Fal.ai Queue Mode](https://docs.fal.ai/model-apis/model-endpoints/queue)
- [ngrok Documentation](https://ngrok.com/docs)
