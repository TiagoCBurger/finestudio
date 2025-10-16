# Solução: R2 Signed URLs

## Problema
Erro 401 ao acessar imagens do R2 via URL pública:
```
⨯ upstream image response failed for https://pub-53e47c76330e4238bb188ab59c62bf82.r2.dev/... 401
```

## Causa
O bucket R2 não tem acesso público habilitado, então as URLs públicas retornam 401 Unauthorized.

## Solução Implementada: Signed URLs

Em vez de depender de acesso público, agora usamos **Signed URLs** (URLs assinadas) que:
- ✅ Funcionam imediatamente sem configuração adicional
- ✅ Não requerem acesso público no bucket
- ✅ São seguras e temporárias (expiram em 7 dias)
- ✅ Usam as credenciais do R2 para autenticação

### Mudanças Realizadas

#### 1. `lib/storage/r2.ts` - Adicionado suporte a Signed URLs
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// No método upload():
if (this.publicUrl) {
  // Use public URL if configured
  url = `${this.publicUrl}/${key}`;
} else {
  // Generate a signed URL (works without public access)
  const getCommand = new GetObjectCommand({
    Bucket: this.bucketName,
    Key: key,
  });
  url = await getSignedUrl(this.client, getCommand, { 
    expiresIn: 604800 // 7 days
  });
}
```

#### 2. `.env` - Comentado R2_PUBLIC_URL
```env
# Commented out to use signed URLs (works without public access)
# R2_PUBLIC_URL=https://pub-53e47c76330e4238bb188ab59c62bf82.r2.dev
```

#### 3. `next.config.ts` - Adicionado hostname para signed URLs
```typescript
{
  protocol: 'https',
  hostname: '53e47c76330e4238bb188ab59c62bf82.r2.cloudflarestorage.com',
},
```

#### 4. Instalado pacote necessário
```bash
pnpm add @aws-sdk/s3-request-presigner
```

## Como Funciona

### Signed URLs
1. Quando um arquivo é enviado, o código gera uma URL assinada
2. A URL contém parâmetros de autenticação (X-Amz-Algorithm, X-Amz-Credential, X-Amz-Signature, etc.)
3. A URL é válida por 7 dias (604800 segundos)
4. Após 7 dias, a URL expira e uma nova precisa ser gerada

### Exemplo de URL Assinada
```
https://53e47c76330e4238bb188ab59c62bf82.r2.cloudflarestorage.com/files/user-id/image.jpg?
X-Amz-Algorithm=AWS4-HMAC-SHA256&
X-Amz-Credential=...&
X-Amz-Date=20251016T033000Z&
X-Amz-Expires=604800&
X-Amz-Signature=...&
X-Amz-SignedHeaders=host
```

## Vantagens vs Desvantagens

### Signed URLs (Solução Atual)
✅ Funciona imediatamente  
✅ Não requer configuração no Cloudflare  
✅ Mais seguro (URLs temporárias)  
✅ Controle granular de acesso  
❌ URLs expiram após 7 dias  
❌ URLs mais longas (com parâmetros de autenticação)  

### Public URLs (Alternativa)
✅ URLs mais curtas e limpas  
✅ URLs permanentes (não expiram)  
✅ Melhor para CDN e cache  
❌ Requer configuração no Cloudflare  
❌ Todo o bucket fica público  
❌ Menos controle de acesso  

## Quando Usar Cada Abordagem

### Use Signed URLs (Atual) quando:
- Você quer começar rapidamente sem configuração adicional
- Precisa de controle de acesso mais granular
- As imagens são temporárias ou privadas
- Não quer expor todo o bucket publicamente

### Use Public URLs quando:
- Você tem um domínio customizado configurado
- As imagens são permanentes e públicas
- Quer URLs mais curtas e limpas
- Precisa de melhor performance de CDN

## Migrar para Public URLs (Opcional)

Se quiser migrar para URLs públicas no futuro:

1. **Habilite Public Access no Cloudflare:**
   - Dashboard > R2 > my-bucket > Settings
   - Public Access > Allow Access

2. **Descomente R2_PUBLIC_URL no `.env`:**
   ```env
   R2_PUBLIC_URL=https://pub-53e47c76330e4238bb188ab59c62bf82.r2.dev
   ```

3. **Reinicie o servidor**

4. **Novos uploads usarão URLs públicas automaticamente**

## Notas Importantes

- ⚠️ URLs assinadas antigas continuarão funcionando até expirarem (7 dias)
- ⚠️ Se mudar para public URLs, imagens antigas com signed URLs continuarão funcionando
- ⚠️ Signed URLs são mais longas, mas funcionam perfeitamente com Next.js Image
- ✅ A solução atual funciona imediatamente sem configuração adicional

## Configuração Importante: forcePathStyle

Para que as signed URLs funcionem corretamente com Next.js Image, configuramos o S3Client com `forcePathStyle: true`:

```typescript
this.client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { ... },
  forcePathStyle: true, // Importante!
});
```

Isso gera URLs no formato:
- ✅ `https://account-id.r2.cloudflarestorage.com/bucket-name/path/file.jpg`

Em vez de:
- ❌ `https://bucket-name.account-id.r2.cloudflarestorage.com/path/file.jpg`

## Teste

Reinicie o servidor e faça upload de uma nova imagem. A URL gerada deve:
- Começar com `https://53e47c76330e4238bb188ab59c62bf82.r2.cloudflarestorage.com/my-bucket/`
- Conter parâmetros de autenticação (`X-Amz-*`)
- Funcionar sem erro 401

## Referências
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [Cloudflare R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
