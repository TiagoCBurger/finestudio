# Implementação do GPT Image Edit (BYOK)

## Resumo

Implementado o modelo `fal-ai/gpt-image-1/edit-image/byok` para edição de imagens usando a API da OpenAI através do Fal.ai.

## Mudanças Realizadas

### 1. `lib/models/image/fal.ts`

**Adicionado ao array de modelos:**
```typescript
'fal-ai/gpt-image-1/edit-image/byok'
```

**Lógica de processamento:**
- Detecta quando o modelo é GPT Image Edit
- Aceita `image_urls` (array) ou `image` (string única)
- Requer `openai_api_key` (usa `providerOptions.fal.openai_api_key` ou `env.OPENAI_API_KEY`)
- Lança erro se a chave da OpenAI não estiver disponível

### 2. `lib/models/image/index.ts`

**Novo modelo registrado:**
```typescript
'fal-gpt-image-edit': {
  label: 'GPT Image Edit (BYOK)',
  chef: providers.fal,
  providers: [{
    ...providers.fal,
    model: falAI.image('fal-ai/gpt-image-1/edit-image/byok'),
    getCost: () => 0.02, // Custo estimado por imagem
  }],
  sizes: ['1024x1024', '768x1024', '1024x768', '512x512'],
  supportsEdit: true,
}
```

## Características do Modelo

### Parâmetros de Entrada
- `image_urls` (array, obrigatório): URLs das imagens a serem editadas
- `prompt` (string, obrigatório): Descrição da edição desejada
- `openai_api_key` (string, obrigatório): Chave da API OpenAI (BYOK)

### Características
- **BYOK (Bring Your Own Key)**: Usa a chave OpenAI do usuário
- **Edição de Imagens**: Suporta edição baseada em prompt
- **Estilo Pixel Art**: Exemplo de uso para converter imagens em pixel art
- **Múltiplas Imagens**: Suporta array de URLs de imagens

### Custo
- **Estimado**: $0.02 por imagem
- **Nota**: O custo real depende do uso da API OpenAI do usuário

## Configuração Necessária

### 1. Variável de Ambiente
Adicione ao arquivo `.env`:
```bash
OPENAI_API_KEY=sk-...
```

A variável já está configurada como opcional em `lib/env.ts`.

### 2. ⚠️ Verificação da Organização OpenAI (IMPORTANTE)

**O modelo `gpt-image-1` requer que sua organização OpenAI seja verificada.**

Se você receber o erro:
```
Your organization must be verified to use the model `gpt-image-1`
```

Siga estes passos:

1. **Acesse as configurações da organização:**
   - Vá para: https://platform.openai.com/settings/organization/general

2. **Clique em "Verify Organization"**
   - Preencha as informações solicitadas
   - Envie a documentação necessária

3. **Aguarde a aprovação**
   - Pode levar até 15 minutos após a verificação
   - Em alguns casos, pode levar até 24 horas

4. **Alternativas enquanto aguarda:**
   - Use o modelo `fal-nano-banana` para edição de imagens (mais barato e não requer verificação)
   - Use outros modelos FLUX para geração de imagens

### 3. Verificar Status da Organização

Para verificar se sua organização está verificada:
```bash
curl https://api.openai.com/v1/organization \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

Procure pelo campo `is_verified: true` na resposta.

## Exemplo de Uso

### Via API Fal.ai (Direto)
```javascript
const { fal } = require("@fal-ai/client");

const result = await fal.subscribe("fal-ai/gpt-image-1/edit-image/byok", {
  input: {
    image_urls: ["https://example.com/image.png"],
    prompt: "Make this pixel-art style.",
    openai_api_key: process.env.OPENAI_API_KEY,
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs.map((log) => log.message).forEach(console.log);
    }
  },
});
```

### Via Tersa (Integrado)
O modelo estará disponível na UI como "GPT Image Edit (BYOK)" e pode ser usado para editar imagens existentes.

## Testes

### Script de Teste
Execute o script de teste:
```bash
node .kiro/specs/fal-ai-new-models/test-gpt-image-edit.js
```

### Teste Manual na UI
1. Abra a aplicação Tersa
2. Selecione o modelo "GPT Image Edit (BYOK)"
3. Faça upload de uma imagem
4. Digite um prompt de edição (ex: "Make this pixel-art style")
5. Gere a imagem editada

## Validações

- ✅ Modelo adicionado ao array de modelos em `fal.ts`
- ✅ Lógica de processamento implementada
- ✅ Validação de chave OpenAI
- ✅ Modelo registrado no registry
- ✅ Suporte a edição habilitado (`supportsEdit: true`)
- ✅ Tamanhos de imagem configurados
- ✅ Função de custo implementada
- ✅ Script de teste criado
- ✅ Sem erros de diagnóstico

## Troubleshooting

### Erro: "Your organization must be verified"

**Causa:** Sua organização OpenAI não está verificada para usar o modelo `gpt-image-1`.

**Solução:**
1. Verifique sua organização em: https://platform.openai.com/settings/organization/general
2. Aguarde até 15 minutos após a verificação
3. Use modelos alternativos enquanto aguarda:
   - `fal-nano-banana` - Edição de imagens rápida e barata
   - `fal-flux-pro-kontext` - Geração de imagens com contexto

### Erro: "OpenAI API key is required"

**Causa:** A chave da OpenAI não está configurada.

**Solução:**
1. Adicione `OPENAI_API_KEY=sk-...` ao arquivo `.env`
2. Reinicie a aplicação
3. Ou passe a chave via `providerOptions.fal.openai_api_key`

### Erro: "Failed to generate image"

**Causa:** Erro na API da Fal.ai ou OpenAI.

**Solução:**
1. Verifique se a chave da OpenAI é válida
2. Verifique se a chave da Fal.ai (`FAL_API_KEY`) está configurada
3. Verifique os logs do console para mais detalhes
4. Verifique se a imagem de entrada é acessível publicamente

## Próximos Passos

1. **Adicionar OPENAI_API_KEY ao .env** (se ainda não estiver configurada)
2. **Verificar organização OpenAI** (https://platform.openai.com/settings/organization/general)
3. **Aguardar verificação** (até 15 minutos)
4. **Testar o modelo** usando o script de teste
5. **Testar na UI** para verificar a integração completa
6. **Ajustar custos** se necessário baseado no uso real

## Alternativas Recomendadas

Se você não pode ou não quer verificar sua organização OpenAI, considere usar:

1. **Nano Banana Edit** (`fal-nano-banana`)
   - ✅ Não requer verificação
   - ✅ Muito mais barato ($0.001 vs $0.02)
   - ✅ Rápido e eficiente
   - ✅ Suporta múltiplas imagens
   - ⚠️ Qualidade pode ser inferior ao GPT Image

2. **FLUX Pro Kontext** (`fal-flux-pro-kontext`)
   - ✅ Não requer verificação
   - ✅ Excelente qualidade
   - ✅ Melhor compreensão contextual
   - ⚠️ Não é modelo de edição (gera do zero)

## Referências

- [Fal.ai GPT Image Edit Model](https://fal.ai/models/fal-ai/gpt-image-1/edit-image/byok)
- [Documentação Fal.ai](https://fal.ai/docs)
- [OpenAI API](https://platform.openai.com/docs)
