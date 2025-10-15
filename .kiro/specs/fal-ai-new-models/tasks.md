# Implementation Plan

- [x] 1. Adicionar novos modelos de imagem ao provider Fal.ai
  - Adicionar os 3 novos model IDs ao array `models` em `lib/models/image/fal.ts`
  - Incluir: `fal-ai/flux-pro/kontext`, `fal-ai/flux-pro/kontext/max/multi`, `fal-ai/ideogram/character`
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Registrar modelos de imagem no registry
  - Adicionar entrada `fal-flux-pro-kontext` em `lib/models/image/index.ts`
  - Configurar label, provider, model, getCost ($0.055), e sizes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 7.3_

- [x] 3. Registrar FLUX Pro Kontext Max Multi no registry
  - Adicionar entrada `fal-flux-pro-kontext-max-multi` em `lib/models/image/index.ts`
  - Configurar label, provider, model, getCost ($0.06), e sizes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 7.3_

- [x] 4. Registrar Ideogram Character no registry
  - Adicionar entrada `fal-ideogram-character` em `lib/models/image/index.ts`
  - Configurar label, provider, model, getCost ($0.08), e sizes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 7.3_

- [x] 5. Criar provider Fal.ai para modelos de vídeo
  - Criar arquivo `lib/models/video/fal.ts`
  - Implementar função `fal()` que retorna `VideoModel`
  - Implementar lógica de requisição POST para `https://fal.run/${modelId}`
  - Implementar sistema de polling para aguardar conclusão do vídeo
  - Adicionar validação de que image_url é obrigatório (image-to-video)
  - Configurar timeouts apropriados: 3min para Kling, 6min para Sora
  - Adicionar tratamento de erros e logging
  - _Requirements: 4.1, 4.4, 5.1, 5.4, 7.2, 7.4, 7.5_

- [x] 6. Registrar Kling Video v2.5 Turbo Pro no registry
  - Importar `fal` provider em `lib/models/video/index.ts`
  - Adicionar entrada `fal-kling-v2.5-turbo-pro`
  - Configurar label, provider, model, e getCost ($0.35 para 5s, $0.70 para 10s)
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 6.2, 7.3_

- [x] 7. Registrar Sora 2 Pro no registry
  - Adicionar entrada `fal-sora-2-pro` em `lib/models/video/index.ts`
  - Configurar label, provider, model, e getCost ($1.20 fixo)
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 6.2, 7.3_

- [x] 8. Verificar integração com sistema de custos
  - Confirmar que todas as funções `getCost()` estão implementadas corretamente
  - Verificar que custos são calculados baseado nos parâmetros corretos
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Testar modelos de imagem manualmente
  - Verificar que os 3 novos modelos aparecem na UI
  - Gerar imagem com FLUX Pro Kontext
  - Gerar imagem com FLUX Pro Kontext Max Multi
  - Gerar imagem com Ideogram Character
  - Confirmar que custos são debitados corretamente
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.1, 3.3_

- [x] 10. Testar modelos de vídeo manualmente
  - Verificar que os 2 novos modelos aparecem na UI
  - Gerar vídeo com Kling Video v2.5 Turbo Pro (com imagem de entrada)
  - Gerar vídeo com Sora 2 Pro (com imagem de entrada)
  - Confirmar que custos são debitados corretamente
  - Verificar que polling funciona e vídeos são retornados
  - _Requirements: 4.1, 4.3, 5.1, 5.3_
