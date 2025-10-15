# Correção do Erro de Duração do Sora 2

## Problema

Ao tentar gerar vídeo com o modelo Sora 2 Pro, ocorria o seguinte erro:

```
Error generating video
Failed to generate video: {"detail":[{"loc":["body","duration"],"msg":"unexpected value; permitted: 4, 8, 12","type":"value_error.const","ctx":{"given":"5","permitted":[4,8,12]}}]}
```

## Causa

O modelo **Sora 2 Pro** da Fal.ai aceita apenas durações específicas:
- ✅ 4 segundos
- ✅ 8 segundos  
- ✅ 12 segundos

Mas o código estava enviando **5 segundos** (valor padrão hardcoded em `app/actions/video/create.ts`).

## Solução Implementada

### 1. Ajuste Automático de Duração

Modificado `lib/models/video/fal.ts` para ajustar automaticamente a duração quando o modelo for Sora 2:

```typescript
// Ajustar duração baseada no modelo
// Sora 2: aceita apenas 4, 8, ou 12 segundos
// Kling: aceita 5 ou 10 segundos
let adjustedDuration = duration;
if (modelId.includes('sora')) {
    // Para Sora 2, mapear 5 -> 4 (mais próximo)
    adjustedDuration = duration <= 5 ? 4 : duration <= 8 ? 8 : 12;
    if (adjustedDuration !== duration) {
        console.log(`Sora 2: Ajustando duração de ${duration}s para ${adjustedDuration}s (valores aceitos: 4, 8, 12)`);
    }
}
```

**Lógica de mapeamento**:
- Duração ≤ 5s → 4s
- Duração ≤ 8s → 8s
- Duração > 8s → 12s

### 2. Log Melhorado

Adicionado log para mostrar quando a duração é ajustada:

```typescript
console.log('Fal.ai video request:', {
    modelId,
    hasImage: !!imagePrompt,
    requestedDuration: duration,
    adjustedDuration,
    aspectRatio,
});
```

### 3. Documentação Atualizada

Atualizado `lib/models/video/index.ts` com comentário explicativo:

```typescript
// https://fal.ai/models - $1.20 (fixed price)
// Aceita durações: 4s, 8s, ou 12s
getCost: ({ duration }) => {
  return 1.2;
},
```

## Comparação de Modelos

### Kling Video v2.5 Turbo Pro
- **Durações**: 5s ou 10s
- **Custo**: $0.35 (5s) / $0.70 (10s)
- **Sem ajuste necessário**

### Sora 2 Pro
- **Durações**: 4s, 8s, ou 12s
- **Custo**: $1.20 (fixo)
- **Ajuste automático**: 5s → 4s

## Teste

Para testar a correção:

1. **Criar nó de vídeo**
2. **Conectar nó de imagem**
3. **Selecionar "Sora 2 Pro"**
4. **Gerar vídeo**
5. **Verificar console**:
   - Deve mostrar: `Sora 2: Ajustando duração de 5s para 4s`
   - Não deve haver erro de validação

## Arquivos Modificados

1. ✅ `lib/models/video/fal.ts` - Ajuste automático de duração
2. ✅ `lib/models/video/index.ts` - Documentação atualizada
3. ✅ `VIDEO_MODELS_FAL_MIGRATION.md` - Documentação geral

## Próximos Passos (Opcional)

### Opção 1: Adicionar Seletor de Duração na UI
Permitir que o usuário escolha a duração desejada:
- Para Kling: dropdown com [5s, 10s]
- Para Sora 2: dropdown com [4s, 8s, 12s]

### Opção 2: Manter Duração Fixa
Manter o comportamento atual (5s fixo) com ajuste automático para Sora 2.

**Recomendação**: Manter como está (Opção 2) por simplicidade. O ajuste automático é transparente e funciona bem.

## Notas Técnicas

- O ajuste é feito no lado do cliente antes de enviar para a API
- Não há impacto no custo (Sora 2 tem preço fixo)
- O log ajuda no debug e transparência
- A solução é retrocompatível com outros modelos

## Referências

- [Fal.ai Sora 2 Documentation](https://fal.ai/models/fal-ai/sora-2)
- [Fal.ai Kling Video Documentation](https://fal.ai/models/fal-ai/kling-video)
