# Implementation Plan

- [x] 1. Corrigir input de texto no nó de texto
  - Remover sintaxe inválida `bg-transparent!` do className do Textarea em `components/nodes/text/transform.tsx`
  - Testar digitação, colagem e edição de texto no campo de instruções
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Adicionar variável de ambiente OpenRouter
  - Adicionar `OPENROUTER_API_KEY` como opcional em `lib/env.ts` no objeto `server`
  - Adicionar no `runtimeEnv` para carregar do `process.env`
  - Atualizar arquivo `.env.example` com a nova variável (se existir)
  - _Requirements: 3.1, 3.2_

- [x] 3. Criar provider OpenRouter
  - Criar arquivo `lib/models/text/openrouter.ts`
  - Implementar função que cria instância do OpenRouter usando `@ai-sdk/openai` com baseURL customizada
  - Exportar instância condicional (undefined se chave não configurada)
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 4. Criar registry de modelos de texto
  - Criar arquivo `lib/models/text/index.ts`
  - Definir type `TextModel` com id, label, provider, pricing, enabled, default
  - Criar objeto `textModels` com os 4 modelos OpenRouter: `openai/gpt-4.5-turbo`, `anthropic/claude-sonnet-4`, `google/gemini-2.5-pro`, `openai/gpt-4o-mini`
  - Implementar função `getEnabledTextModels()` para filtrar modelos ativos
  - _Requirements: 2.1, 2.3_

- [x] 5. Atualizar rota de chat para suportar OpenRouter
  - Modificar `app/api/chat/route.ts` para importar `textModels` e `openrouter`
  - Adicionar lógica para verificar provider do modelo (openrouter vs gateway)
  - Implementar seleção condicional do modelo baseado no provider
  - Adicionar tratamento de erro quando OpenRouter não está configurado
  - _Requirements: 2.2, 3.2, 3.3_

- [x] 6. Integrar registry de modelos no componente TextTransform
  - Modificar `components/nodes/text/transform.tsx` para usar `getEnabledTextModels()`
  - Atualizar lógica de `getDefaultModel` para usar o novo registry
  - Garantir que ModelSelector recebe os modelos corretos
  - _Requirements: 2.1, 2.2_

- [x] 7. Testar integração completa
  - Verificar que input de texto funciona corretamente
  - Testar seleção e uso de cada modelo OpenRouter
  - Verificar comportamento quando `OPENROUTER_API_KEY` não está configurada
  - Validar que modelos do Gateway continuam funcionando
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3_
