# 🧪 Guia do Mock Provider - Testes Sem Custo

## O que é?

O Mock Provider é um provider fictício que simula a geração de imagens **sem gastar nenhum crédito**. Perfeito para:

- ✅ Desenvolvimento e testes
- ✅ Validar fluxos de trabalho
- ✅ Testar UI sem custos
- ✅ Demonstrações e protótipos

## Como Funciona?

O mock provider retorna URLs de imagens reais de serviços gratuitos como:
- **picsum.photos** - Fotos aleatórias de alta qualidade
- **placeholder.com** - Placeholders personalizáveis

Ele simula:
- ⏱️ Delay de API real (500ms-2s)
- 📊 Estrutura de resposta idêntica aos providers reais
- ⚠️ Warnings para lembrar que é um teste

## Modelos Disponíveis

### 1. Mock Fast
```typescript
modelId: 'mock-fast'
```
- Geração rápida de imagens
- Não suporta edição
- Custo: R$ 0,00

### 2. Mock Edit
```typescript
modelId: 'mock-edit'
```
- Simula edição de imagens
- Suporta image-to-image
- Custo: R$ 0,00

## Como Usar

### 1. Na Interface

Os modelos mock aparecem na lista de modelos com o ícone 🧪:
- **🧪 Mock Fast (Teste Grátis)**
- **🧪 Mock Edit (Teste Edição)**

Basta selecionar um deles e usar normalmente!

### 2. No Código

```typescript
import { mockAI } from '@/lib/models/image/mock';

const model = mockAI.image('mock-fast');

const result = await model.doGenerate({
  prompt: 'Um gato fofo',
  size: '1024x1024',
  n: 1,
});

console.log('URL da imagem:', result.images[0].url);
```

### 3. Teste Rápido

Execute o script de teste:

```bash
node test-mock-provider.js
```

## Ativar/Desativar

Para desativar os modelos mock em produção, edite `lib/models/image/index.ts`:

```typescript
'mock-fast': {
  // ...
  enabled: false, // ❌ Desativa o modelo
}
```

## Vantagens

✅ **Custo Zero** - Não gasta nenhum crédito  
✅ **Rápido** - Sem espera de processamento real  
✅ **Realista** - Imagens reais de alta qualidade  
✅ **Flexível** - Suporta todos os tamanhos  
✅ **Seguro** - Não envia dados para APIs externas  

## Limitações

⚠️ **Não gera imagens baseadas no prompt** - As imagens são aleatórias  
⚠️ **Não funciona offline** - Precisa de internet para carregar as imagens  
⚠️ **Não suporta estilos específicos** - Imagens genéricas  

## Quando Usar?

### ✅ Use Mock Provider para:
- Desenvolver e testar features
- Validar fluxos de trabalho
- Criar demos e protótipos
- Testar performance e UI
- Economizar créditos durante desenvolvimento

### ❌ Não use Mock Provider para:
- Produção
- Gerar imagens reais para clientes
- Testes que dependem do conteúdo específico

## Exemplos de Uso

### Teste de Fluxo Completo
```typescript
// 1. Gerar imagem
const result = await mockAI.image('mock-fast').doGenerate({
  prompt: 'Teste',
  size: '1024x1024',
  n: 1,
});

// 2. Salvar no banco (URL mock)
await db.insert(images).values({
  url: result.images[0].url,
  prompt: 'Teste',
});

// 3. Exibir na UI
<img src={result.images[0].url} alt="Teste" />
```

### Teste de Múltiplas Gerações
```typescript
const promises = Array.from({ length: 5 }, (_, i) => 
  mockAI.image('mock-fast').doGenerate({
    prompt: `Teste ${i}`,
    size: '512x512',
    n: 1,
  })
);

const results = await Promise.all(promises);
console.log('Geradas:', results.length, 'imagens');
// Custo: R$ 0,00 🎉
```

## Dicas

💡 **Combine com providers reais**: Use mock em dev e providers reais em produção  
💡 **Variável de ambiente**: Controle via `ENABLE_MOCK_PROVIDER=true`  
💡 **Logs claros**: O mock sempre loga `[MOCK]` para fácil identificação  
💡 **Warnings visíveis**: Mostra aviso na UI quando está usando mock  

## Próximos Passos

Quer criar seu próprio mock provider customizado? Veja:
- `lib/models/image/mock.ts` - Implementação base
- `lib/models/image/index.ts` - Registro de modelos
- `lib/providers.ts` - Configuração de providers

---

**Custo total de usar mock provider: R$ 0,00** 🎉
