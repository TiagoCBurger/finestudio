# Guia de Flags de Modelos

## 📋 Visão Geral

Implementamos um sistema de flags `enabled` para ativar/desativar modelos rapidamente sem precisar comentar código ou deletar entradas.

## 🎯 Como Usar

### Ativar um Modelo
```typescript
'nome-do-modelo': {
  label: 'Nome do Modelo',
  // ... outras configurações ...
  enabled: true, // ✅ Ativo - aparece na UI
}
```

### Desativar um Modelo
```typescript
'nome-do-modelo': {
  label: 'Nome do Modelo',
  // ... outras configurações ...
  enabled: false, // ❌ Desativado - não aparece na UI
}
```

### Padrão (sem flag)
```typescript
'nome-do-modelo': {
  label: 'Nome do Modelo',
  // ... outras configurações ...
  // Sem flag = enabled: true (ativo por padrão)
}
```

## 📁 Arquivos Modificados

### Modelos de Imagem
**Arquivo:** `lib/models/image/index.ts`

**Modelos Ativos:**
- ✅ `fal-nano-banana` - Nano Banana Edit
- ✅ `fal-flux-dev-image-to-image` - FLUX Dev Image-to-Image
- ✅ `fal-flux-pro-kontext` - FLUX Pro Kontext
- ✅ `fal-flux-pro-kontext-max-multi` - FLUX Pro Kontext Max Multi
- ✅ `fal-ideogram-character` - Ideogram Character

**Modelos Desativados:**
- ❌ `fal-gpt-image-edit` - GPT Image Edit (requer verificação OpenAI)

### Modelos de Vídeo
**Arquivo:** `lib/models/video/index.ts`

**Modelos Ativos:**
- ✅ `minimax-t2v-01-director` - T2V-01-Director
- ✅ `runway-gen4-turbo` - Gen4 Turbo
- ✅ `fal-kling-v2.5-turbo-pro` - Kling Video v2.5 Turbo Pro
- ✅ `fal-sora-2-pro` - Sora 2 Pro
- ✅ Todos os outros modelos (por padrão)

## 🔧 Funções Helper

### Para Modelos de Imagem

```typescript
import { getEnabledImageModels, getAllImageModels } from '@/lib/models/image';

// Retorna apenas modelos ativos (para UI)
const activeModels = getEnabledImageModels();

// Retorna todos os modelos (para admin/config)
const allModels = getAllImageModels();
```

### Para Modelos de Vídeo

```typescript
import { getEnabledVideoModels, getAllVideoModels } from '@/lib/models/video';

// Retorna apenas modelos ativos (para UI)
const activeModels = getEnabledVideoModels();

// Retorna todos os modelos (para admin/config)
const allModels = getAllVideoModels();
```

## 💡 Casos de Uso

### 1. Desativar Modelo Temporariamente
```typescript
// Antes de manutenção ou testes
'modelo-em-manutencao': {
  // ...
  enabled: false, // Desativa temporariamente
}
```

### 2. Ativar Modelo Após Configuração
```typescript
// Após configurar chaves de API ou verificações
'modelo-novo': {
  // ...
  enabled: true, // Ativa após setup completo
}
```

### 3. Modelos Beta/Experimental
```typescript
// Manter desativado até testes completos
'modelo-beta': {
  // ...
  enabled: false, // Desativado até aprovação
}
```

### 4. Modelos com Requisitos Especiais
```typescript
// GPT Image Edit requer verificação OpenAI
'fal-gpt-image-edit': {
  // ...
  enabled: false, // Desativado até verificação
}
```

## 🚀 Exemplo Prático

### Cenário: Ativar GPT Image Edit após verificação

1. **Antes (Desativado):**
```typescript
'fal-gpt-image-edit': {
  label: 'GPT Image Edit (BYOK)',
  // ...
  enabled: false, // ❌ Requer verificação OpenAI
}
```

2. **Depois (Ativado):**
```typescript
'fal-gpt-image-edit': {
  label: 'GPT Image Edit (BYOK)',
  // ...
  enabled: true, // ✅ Organização verificada!
}
```

3. **Resultado:**
   - Modelo aparece na UI
   - Usuários podem selecionar e usar
   - Sem necessidade de reiniciar a aplicação

## 📊 Status Atual dos Modelos

### Modelos de Imagem (6 total)
- ✅ **5 Ativos** - Prontos para uso
- ❌ **1 Desativado** - GPT Image Edit (requer verificação)

### Modelos de Vídeo (18 total)
- ✅ **18 Ativos** - Todos funcionando

## 🔍 Como Verificar Status

### Via Código
```typescript
import { imageModels } from '@/lib/models/image';

// Verificar status de um modelo específico
const isEnabled = imageModels['fal-gpt-image-edit'].enabled;
console.log('GPT Image Edit ativo?', isEnabled); // false

// Contar modelos ativos
const activeCount = Object.values(imageModels)
  .filter(m => m.enabled !== false).length;
console.log('Modelos ativos:', activeCount);
```

### Via UI
- Modelos desativados **não aparecem** na lista de seleção
- Apenas modelos com `enabled: true` ou sem flag são exibidos

## ⚡ Dicas Rápidas

1. **Ativar/Desativar é Instantâneo**
   - Basta mudar `enabled: true/false`
   - Não precisa reiniciar (hot reload)

2. **Padrão é Ativo**
   - Se não especificar `enabled`, o modelo fica ativo
   - Use `enabled: false` apenas quando necessário

3. **Comentários Ajudam**
   - Adicione comentários explicando por que está desativado
   - Exemplo: `enabled: false, // ❌ Requer verificação OpenAI`

4. **Use as Funções Helper**
   - `getEnabledImageModels()` para UI
   - `getAllImageModels()` para admin

## 🎨 Convenções de Comentários

```typescript
enabled: true,  // ✅ Ativo
enabled: false, // ❌ Desativado (motivo aqui)
```

## 📝 Checklist de Implementação

- ✅ Tipo `TersaImageModel` atualizado com `enabled?: boolean`
- ✅ Tipo `TersaVideoModel` atualizado com `enabled?: boolean`
- ✅ Todos os modelos de imagem com flag `enabled`
- ✅ Modelos de vídeo principais com flag `enabled`
- ✅ Funções helper `getEnabledImageModels()` criadas
- ✅ Funções helper `getEnabledVideoModels()` criadas
- ✅ GPT Image Edit desativado por padrão
- ✅ Documentação criada

## 🔗 Arquivos Relacionados

- `lib/models/image/index.ts` - Modelos de imagem
- `lib/models/video/index.ts` - Modelos de vídeo
- `lib/models/image/fal.ts` - Provider Fal.ai (imagens)
- `lib/models/video/fal.ts` - Provider Fal.ai (vídeos)

## 🎯 Próximos Passos

1. **Testar Modelos Ativos**
   - Verificar que modelos com `enabled: true` aparecem na UI
   - Confirmar que modelos com `enabled: false` não aparecem

2. **Ativar GPT Image Edit** (quando pronto)
   - Verificar organização OpenAI
   - Mudar `enabled: false` para `enabled: true`

3. **Adicionar Mais Modelos**
   - Sempre incluir flag `enabled`
   - Documentar motivo se desativado

---

**Última atualização:** Implementação completa do sistema de flags ✅
