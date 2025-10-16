# R2 Image Hostname Fix

## Problema
Erro ao exibir imagens do Cloudflare R2 no Next.js:
```
Error: Invalid src prop (https://my-bucket.r2.cloudflarestorage.com/files/...) on `next/image`, 
hostname "my-bucket.r2.cloudflarestorage.com" is not configured under images in your `next.config.js`
```

## Causa
O Next.js Image component requer que todos os hostnames externos sejam explicitamente configurados no `next.config.ts` por questões de segurança.

## Solução Implementada

### 1. Configuração do R2 Public URL
Adicionado `R2_PUBLIC_URL` no `.env`:
```env
R2_PUBLIC_URL=https://pub-53e47c76330e4238bb188ab59c62bf82.r2.dev
```

### 2. Atualização do next.config.ts
Adicionados os hostnames do R2 na configuração de imagens:
```typescript
images: {
  remotePatterns: [
    // Cloudflare R2 storage - private endpoint (for uploads)
    {
      protocol: 'https',
      hostname: 'my-bucket.r2.cloudflarestorage.com',
    },
    // Cloudflare R2 storage - public endpoint (R2.dev domain)
    {
      protocol: 'https',
      hostname: 'pub-53e47c76330e4238bb188ab59c62bf82.r2.dev',
    },
  ]
}
```

## Como Configurar o R2 Public URL

### Opção 1: Usar o domínio R2.dev (Recomendado para desenvolvimento)
1. Acesse o Cloudflare Dashboard
2. Vá para R2 > seu bucket
3. Clique em "Settings"
4. Em "Public Access", clique em "Allow Access"
5. Copie o domínio público gerado (formato: `pub-{account-id}.r2.dev`)
6. Adicione no `.env` como `R2_PUBLIC_URL`

### Opção 2: Usar um domínio customizado (Recomendado para produção)
1. Acesse o Cloudflare Dashboard
2. Vá para R2 > seu bucket
3. Clique em "Settings" > "Custom Domains"
4. Adicione um domínio customizado (ex: `cdn.seudominio.com`)
5. Configure o DNS conforme instruções
6. Use esse domínio no `.env` como `R2_PUBLIC_URL`
7. Atualize o `next.config.ts` com o novo hostname

## Verificação

Após configurar:
1. Reinicie o servidor de desenvolvimento
2. Faça upload de uma imagem
3. Verifique se a URL retornada usa o domínio público configurado
4. Confirme que a imagem é exibida sem erros no console

## Notas Importantes

- O endpoint privado (`*.r2.cloudflarestorage.com`) é usado apenas para uploads via S3 API
- O endpoint público (`R2_PUBLIC_URL`) é usado para servir as imagens aos usuários
- Sem o `R2_PUBLIC_URL` configurado, o sistema usará o endpoint privado (que não funciona para acesso público)
- Certifique-se de que o bucket tem "Public Access" habilitado no Cloudflare Dashboard
