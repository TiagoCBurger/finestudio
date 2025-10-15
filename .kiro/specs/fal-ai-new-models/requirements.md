# Requirements Document

## Introduction

Este documento define os requisitos para adicionar suporte a novos modelos da Fal.ai na plataforma Tersa. A implementação incluirá 3 novos modelos de geração de imagens (FLUX Pro Kontext, FLUX Pro Kontext Max Multi, e Ideogram Character) e 2 novos modelos de geração de vídeo (Kling Video v2.5 Turbo Pro e Sora 2 Pro). Estes modelos expandirão as capacidades da plataforma, oferecendo aos usuários mais opções para criação de conteúdo visual com diferentes características e preços.

## Requirements

### Requirement 1: Adicionar Modelo FLUX Pro Kontext

**User Story:** Como usuário da plataforma, eu quero usar o modelo FLUX Pro Kontext para gerar imagens com melhor compreensão contextual, para que eu possa criar imagens mais precisas e alinhadas com minhas descrições complexas.

#### Acceptance Criteria

1. WHEN o usuário seleciona o modelo "FLUX Pro Kontext (Fal)" THEN o sistema SHALL disponibilizar o modelo `fal-ai/flux-pro/kontext` para geração de imagens
2. WHEN uma imagem é gerada com FLUX Pro Kontext THEN o sistema SHALL calcular o custo baseado na documentação oficial da Fal.ai
3. WHEN o modelo é listado na interface THEN o sistema SHALL exibir o label "FLUX Pro Kontext (Fal)"
4. WHEN o usuário gera uma imagem THEN o sistema SHALL suportar os tamanhos padrão de imagem (1024x1024, 768x1024, 1024x768)

### Requirement 2: Adicionar Modelo FLUX Pro Kontext Max Multi

**User Story:** Como usuário avançado, eu quero usar o modelo FLUX Pro Kontext Max Multi para gerar múltiplas variações de imagens com contexto aprimorado, para que eu possa explorar diferentes interpretações criativas de um mesmo prompt.

#### Acceptance Criteria

1. WHEN o usuário seleciona o modelo "FLUX Pro Kontext Max Multi (Fal)" THEN o sistema SHALL disponibilizar o modelo `fal-ai/flux-pro/kontext/max/multi` para geração de imagens
2. WHEN uma imagem é gerada com FLUX Pro Kontext Max Multi THEN o sistema SHALL calcular o custo apropriado baseado na documentação da Fal.ai
3. WHEN o modelo é listado na interface THEN o sistema SHALL exibir o label "FLUX Pro Kontext Max Multi (Fal)"
4. WHEN o usuário gera uma imagem THEN o sistema SHALL suportar os tamanhos padrão de imagem
5. IF o modelo suporta geração múltipla THEN o sistema SHALL configurar adequadamente o parâmetro `maxImagesPerCall`

### Requirement 3: Adicionar Modelo Ideogram Character

**User Story:** Como criador de conteúdo, eu quero usar o modelo Ideogram Character para gerar imagens de personagens consistentes, para que eu possa criar narrativas visuais com personagens reconhecíveis.

#### Acceptance Criteria

1. WHEN o usuário seleciona o modelo "Ideogram Character (Fal)" THEN o sistema SHALL disponibilizar o modelo `fal-ai/ideogram/character` para geração de imagens
2. WHEN uma imagem é gerada com Ideogram Character THEN o sistema SHALL calcular o custo baseado na documentação da Fal.ai
3. WHEN o modelo é listado na interface THEN o sistema SHALL exibir o label "Ideogram Character (Fal)"
4. WHEN o usuário gera uma imagem THEN o sistema SHALL suportar os tamanhos apropriados para este modelo

### Requirement 4: Adicionar Modelo Kling Video v2.5 Turbo Pro (Image-to-Video)

**User Story:** Como usuário, eu quero usar o modelo Kling Video v2.5 Turbo Pro para converter minhas imagens em vídeos de alta qualidade, para que eu possa criar conteúdo animado a partir de imagens estáticas.

#### Acceptance Criteria

1. WHEN o usuário seleciona o modelo "Kling Video v2.5 Turbo Pro (Fal)" THEN o sistema SHALL disponibilizar o modelo `fal-ai/kling-video/v2.5-turbo/pro/image-to-video` para geração de vídeos
2. WHEN um vídeo é gerado com Kling Video v2.5 Turbo Pro THEN o sistema SHALL calcular o custo baseado na duração e documentação da Fal.ai
3. WHEN o modelo é listado na interface THEN o sistema SHALL exibir o label "Kling Video v2.5 Turbo Pro (Fal)"
4. WHEN o usuário gera um vídeo THEN o sistema SHALL aceitar uma imagem como entrada (image-to-video)
5. WHEN o usuário gera um vídeo THEN o sistema SHALL suportar duração de 5 segundos
6. WHEN o usuário gera um vídeo THEN o sistema SHALL suportar diferentes aspect ratios

### Requirement 5: Adicionar Modelo Sora 2 Pro (Image-to-Video)

**User Story:** Como criador de conteúdo profissional, eu quero usar o modelo Sora 2 Pro para converter imagens em vídeos de altíssima qualidade, para que eu possa produzir conteúdo premium com animações realistas.

#### Acceptance Criteria

1. WHEN o usuário seleciona o modelo "Sora 2 Pro (Fal)" THEN o sistema SHALL disponibilizar o modelo `fal-ai/sora-2/image-to-video/pro` para geração de vídeos
2. WHEN um vídeo é gerado com Sora 2 Pro THEN o sistema SHALL calcular o custo baseado na duração e documentação da Fal.ai
3. WHEN o modelo é listado na interface THEN o sistema SHALL exibir o label "Sora 2 Pro (Fal)"
4. WHEN o usuário gera um vídeo THEN o sistema SHALL aceitar uma imagem como entrada (image-to-video)
5. WHEN o usuário gera um vídeo THEN o sistema SHALL suportar duração de 5 segundos
6. WHEN o usuário gera um vídeo THEN o sistema SHALL suportar diferentes aspect ratios

### Requirement 6: Integração com Sistema de Custos

**User Story:** Como administrador da plataforma, eu quero que todos os novos modelos estejam integrados ao sistema de custos, para que os usuários sejam cobrados corretamente pelo uso de cada modelo.

#### Acceptance Criteria

1. WHEN um novo modelo de imagem é adicionado THEN o sistema SHALL incluir a função `getCost` apropriada no arquivo `lib/models/image/index.ts`
2. WHEN um novo modelo de vídeo é adicionado THEN o sistema SHALL incluir a função `getCost` apropriada no arquivo `lib/models/video/index.ts`
3. WHEN o custo é calculado THEN o sistema SHALL usar os valores oficiais da documentação da Fal.ai
4. WHEN um modelo tem custo variável THEN o sistema SHALL calcular baseado nos parâmetros relevantes (tamanho, duração, etc.)

### Requirement 7: Manter Consistência com Arquitetura Existente

**User Story:** Como desenvolvedor, eu quero que os novos modelos sigam a mesma arquitetura dos modelos existentes, para que o código seja mantível e consistente.

#### Acceptance Criteria

1. WHEN novos modelos de imagem são adicionados THEN o sistema SHALL seguir o padrão estabelecido em `lib/models/image/fal.ts`
2. WHEN novos modelos de vídeo são adicionados THEN o sistema SHALL seguir o padrão estabelecido em `lib/models/video/`
3. WHEN modelos são registrados THEN o sistema SHALL usar a mesma estrutura de `TersaImageModel` ou `TersaVideoModel`
4. WHEN modelos são implementados THEN o sistema SHALL reutilizar as funções existentes de `falAI.image()` para modelos de imagem
5. IF novos modelos de vídeo requerem implementação específica THEN o sistema SHALL criar um arquivo dedicado em `lib/models/video/fal.ts`
