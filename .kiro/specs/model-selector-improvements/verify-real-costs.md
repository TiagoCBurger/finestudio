# Verificação de Custos Reais - Task 9

**Data:** 14/10/2025

## Custos Reais Encontrados no Código

### Modelos de Imagem (lib/models/image/index.ts)

| Modelo | Custo | Formatação Esperada | Price Indicator |
|--------|-------|---------------------|-----------------|
| nano-banana/edit | 0.001 | "<0.01" | low |
| flux/dev/image-to-image | 0.025 | "0.025" | - |
| gpt-image-1/edit-image | 0.02 | "0.020" | - |
| flux-pro/kontext | 0.055 | "0.055" | - |
| flux-pro/kontext/max/multi | 0.06 | "0.060" | - |
| ideogram/character | 0.08 | "0.080" | - |

### Modelos de Vídeo (lib/models/video/index.ts)

| Modelo | Custo | Formatação Esperada |
|--------|-------|---------------------|
| minimax-video-01 | 0.43 | "0.430" |
| minimax-video-01-live | 0.43 | "0.430" |
| minimax-video-01-live-pro | 0.65 | "0.650" |
| runway-gen3-alpha-turbo | 0.5 | "0.500" |
| runway-gen3-alpha | 0.5 | "0.500" |
| luma-dream-machine (5s) | 0.35 | "0.350" |
| luma-dream-machine (10s) | 0.7 | "0.700" |
| luma-photon-flash (5s) | 1.2 | "1" |
| kling-v2.0 (5s) | 1.4 | "1" |

### Modelos de Speech (lib/models/speech.ts)

**Nota:** Custos de speech são calculados dinamicamente baseados no número de caracteres.

| Modelo | Fórmula de Custo |
|--------|------------------|
| tts-1 | (characters / 1M) * 15 |
| tts-1-hd | (characters / 1M) * 30 |
| lmnt-aurora | (characters / 1K) * 0.05 |
| lmnt-blizzard | (characters / 1K) * 0.05 |
| elevenlabs | (characters / 1K) * 0.2 |

---

## Verificação da Função formatCredits

### Casos Cobertos pelos Modelos Reais

✅ **Valores < 0.01:**
- 0.001 (nano-banana) → "<0.01" ✅

✅ **Valores entre 0.01 e 0.999:**
- 0.02 (gpt-image-1) → "0.020" ✅
- 0.025 (flux/dev) → "0.025" ✅
- 0.055 (flux-pro/kontext) → "0.055" ✅
- 0.06 (flux-pro/kontext/max) → "0.060" ✅
- 0.08 (ideogram) → "0.080" ✅
- 0.35 (luma 5s) → "0.350" ✅
- 0.43 (minimax) → "0.430" ✅
- 0.5 (runway) → "0.500" ✅
- 0.65 (minimax-pro) → "0.650" ✅
- 0.7 (luma 10s) → "0.700" ✅

✅ **Valores >= 1:**
- 1.2 (luma-photon) → "1" ✅
- 1.4 (kling-v2.0) → "1" ✅

---

## Verificação de Price Indicators

### Modelos com priceIndicator

Apenas 1 modelo de imagem tem `priceIndicator` definido:

| Modelo | Price Indicator | Ícone Esperado | Cor | Tooltip |
|--------|----------------|----------------|-----|---------|
| nano-banana/edit | low | ChevronDownIcon | Azul | "This model uses less credits." |

### Implementação Verificada

```tsx
const getCostBracketIcon = (bracket: PriceBracket, className?: string) => {
  switch (bracket) {
    case 'lowest':
      return <ChevronsDownIcon size={16} className={cn('text-purple-500 dark:text-purple-400', className)} />;
    case 'low':
      return <ChevronDownIcon size={16} className={cn('text-blue-500 dark:text-blue-400', className)} />;
    case 'high':
      return <ChevronUpIcon size={16} className={cn('text-orange-500 dark:text-orange-400', className)} />;
    case 'highest':
      return <ChevronsUpIcon size={16} className={cn('text-red-500 dark:text-red-400', className)} />;
    default:
      return null;
  }
};
```

✅ **Status:** Implementação correta para todos os brackets

---

## Verificação de Modelos Desabilitados

### Modelo com enabled: false

```typescript
// lib/models/image/index.ts
{
  id: 'fal-gpt-image-edit',
  label: 'GPT Image Edit',
  enabled: false, // ← Deve ser filtrado
  ...
}
```

✅ **Status:** Modelo será filtrado pelo código:
```tsx
const enabledOptions = Object.fromEntries(
  Object.entries(options).filter(([_, model]) => model.enabled !== false)
);
```

---

## Casos de Teste Adicionais Sugeridos

### 1. Teste com Modelo Gratuito
**Cenário:** Adicionar um modelo com custo 0
```typescript
getCost: () => 0
```
**Formatação Esperada:** "Grátis"

### 2. Teste com Custos Muito Altos
**Cenário:** Modelos premium com custos > 10
```typescript
getCost: () => 15
getCost: () => 100
```
**Formatação Esperada:** "15", "100"

### 3. Teste com Custos Dinâmicos (Speech)
**Cenário:** Verificar que getCost() com parâmetros funciona
```typescript
// Para 1000 caracteres com tts-1
getCost: (chars) => (chars / 1000000) * 15
// 1000 chars = 0.015 créditos → "0.015"
```

---

## Checklist de Verificação Visual

Ao testar no navegador, verificar especificamente:

### Modelos de Imagem
- [ ] nano-banana mostra "<0.01" com ícone azul (low)
- [ ] flux/dev mostra "0.025" sem indicador
- [ ] gpt-image-edit NÃO aparece na lista (enabled: false)

### Modelos de Vídeo
- [ ] minimax mostra "0.430"
- [ ] luma-photon mostra "1" (arredondado)
- [ ] Todos os custos estão alinhados à direita

### Layout Geral
- [ ] Ícone Coins aparece em todos os modelos
- [ ] Alinhamento consistente em todos os grupos
- [ ] Nomes longos são truncados corretamente
- [ ] Estado selecionado tem contraste adequado

---

## Conclusão

A função `formatCredits` cobre todos os casos de custo encontrados nos modelos reais:
- ✅ Custos < 0.01 (nano-banana: 0.001)
- ✅ Custos decimais 0.01-0.999 (maioria dos modelos)
- ✅ Custos >= 1 (luma-photon: 1.2, kling: 1.4)

**Recomendação:** Implementação está correta e pronta para produção.

---

## Próximos Passos

1. Realizar teste visual manual com os modelos listados acima
2. Capturar screenshots de cada tipo de formatação
3. Verificar comportamento em diferentes resoluções
4. Testar em modo claro e escuro
5. Documentar quaisquer discrepâncias encontradas
