# Debug: Erro ao Baixar Vídeo

## Problema
Erro ao tentar baixar vídeo gerado:
```
Error downloading file
Load failed
```

## Possíveis Causas

### 1. URL Inválida ou Expirada
- A URL retornada pelo provider (fal.ai) pode ter expirado
- A URL pode estar incorreta ou malformada

### 2. Problema de CORS
- O servidor do vídeo pode não permitir requisições do seu domínio
- Headers CORS podem estar bloqueando o download

### 3. Timeout
- O vídeo pode ser muito grande e o download está demorando muito
- O servidor pode estar lento ou indisponível

### 4. Problema de Autenticação
- A URL pode requerer autenticação que não está sendo enviada
- Token ou credenciais podem estar faltando

## Solução Implementada

### Adicionados Logs Detalhados

```typescript
console.log('[Video Generation] Downloading video from:', url);

const response = await fetch(url);

if (!response.ok) {
  throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
}

console.log('[Video Generation] Video downloaded successfully, size:', response.headers.get('content-length'));

const arrayBuffer = await response.arrayBuffer();
console.log('[Video Generation] ArrayBuffer size:', arrayBuffer.byteLength);

console.log('[Video Generation] Uploading video to storage...');

const uploadResult = await uploadFile(videoFile, 'files');

console.log('[Video Generation] Video uploaded successfully:', uploadResult.url);
```

## Como Debugar

### 1. Verificar os Logs do Servidor
Após tentar gerar um vídeo, verifique os logs do servidor Next.js:

```bash
# Os logs devem mostrar:
[Video Generation] Downloading video from: https://...
[Video Generation] Video downloaded successfully, size: 12345678
[Video Generation] ArrayBuffer size: 12345678
[Video Generation] Uploading video to storage...
[Video Generation] Video uploaded successfully: https://...
```

### 2. Identificar Onde Falha

#### Se falhar em "Downloading video from":
- A URL do provider está incorreta
- Problema de rede ou timeout
- URL expirada

#### Se falhar com status HTTP (400, 403, 404, etc.):
- 400: Requisição inválida
- 403: Sem permissão (problema de autenticação)
- 404: URL não encontrada (expirada ou incorreta)
- 500: Erro no servidor do provider

#### Se falhar em "ArrayBuffer size":
- Problema ao ler os dados do vídeo
- Vídeo corrompido ou incompleto

#### Se falhar em "Uploading video to storage":
- Problema com R2 storage
- Credenciais incorretas
- Bucket não existe

## Soluções Possíveis

### Solução 1: Aumentar Timeout
Se o vídeo é muito grande, pode precisar de mais tempo:

```typescript
const response = await fetch(url, {
  signal: AbortSignal.timeout(60000) // 60 segundos
});
```

### Solução 2: Verificar URL do Provider
Adicione validação da URL antes de fazer o download:

```typescript
if (!url || !url.startsWith('http')) {
  throw new Error(`Invalid video URL: ${url}`);
}
```

### Solução 3: Usar Webhook (Assíncrono)
Em vez de baixar o vídeo imediatamente, use webhook como nas imagens:

```typescript
// Retornar imediatamente com status pending
return {
  nodeData: {
    generated: {
      url: '', // Será preenchido pelo webhook
      type: 'video/mp4',
      status: 'pending',
      requestId: falRequestId,
    },
  },
};
```

### Solução 4: Download com Retry
Adicionar retry automático em caso de falha:

```typescript
let retries = 3;
let response;

while (retries > 0) {
  try {
    response = await fetch(url);
    if (response.ok) break;
  } catch (error) {
    retries--;
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
  }
}
```

## Próximos Passos

1. **Reinicie o servidor** para aplicar os logs
2. **Tente gerar um vídeo** novamente
3. **Verifique os logs** do servidor para identificar onde está falhando
4. **Compartilhe os logs** para análise mais detalhada

## Logs Esperados

### Sucesso:
```
[Video Generation] Downloading video from: https://fal.media/files/...
[Video Generation] Video downloaded successfully, size: 5242880
[Video Generation] ArrayBuffer size: 5242880
[Video Generation] Uploading video to storage...
[Video Generation] Video uploaded successfully: https://53e47c76330e4238bb188ab59c62bf82.r2.cloudflarestorage.com/...
```

### Falha no Download:
```
[Video Generation] Downloading video from: https://fal.media/files/...
Error: Failed to download video: 403 Forbidden
```

### Falha no Upload:
```
[Video Generation] Downloading video from: https://fal.media/files/...
[Video Generation] Video downloaded successfully, size: 5242880
[Video Generation] ArrayBuffer size: 5242880
[Video Generation] Uploading video to storage...
Error: Failed to upload file to R2: ...
```

## Informações Úteis

- Tamanho típico de vídeo: 5-50 MB
- Tempo típico de download: 5-30 segundos
- Tempo típico de upload para R2: 2-10 segundos
- Timeout padrão do fetch: 30 segundos (pode ser insuficiente)

## Teste Rápido

Para testar se o problema é com o download ou upload:

```bash
# Testar download direto da URL do fal.ai
curl -I "URL_DO_VIDEO_AQUI"

# Deve retornar 200 OK
# Se retornar 403, 404, etc., o problema é com a URL
```
