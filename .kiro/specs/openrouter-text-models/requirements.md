# Requirements Document

## Introduction

Implementar integração com OpenRouter para adicionar modelos de texto avançados (GPT-4.5, Claude Sonnet 4, Gemini 2.5 Pro, GPT-4o Mini) ao nó de texto, e corrigir problemas no input de texto que impedem seu funcionamento adequado.

## Requirements

### Requirement 1

**User Story:** Como usuário, quero que o input de texto no nó de texto funcione corretamente, para que eu possa inserir instruções sem problemas.

#### Acceptance Criteria

1. WHEN o usuário digita no campo de instruções THEN o texto deve aparecer corretamente no input
2. WHEN o usuário cola texto no campo THEN o conteúdo deve ser inserido sem erros
3. WHEN o usuário edita o texto THEN as mudanças devem ser salvas no estado do nó

### Requirement 2

**User Story:** Como usuário, quero usar modelos avançados via OpenRouter no nó de texto, para que eu possa gerar conteúdo com os melhores modelos disponíveis.

#### Acceptance Criteria

1. WHEN o usuário abre o seletor de modelos no nó de texto THEN deve ver os modelos OpenRouter disponíveis: GPT-4.5, Claude Sonnet 4, Gemini 2.5 Pro, GPT-4o Mini
2. WHEN o usuário seleciona um modelo OpenRouter THEN o modelo deve ser usado para geração de texto
3. WHEN a geração é concluída THEN o custo deve ser calculado corretamente baseado nos preços do OpenRouter
4. IF a chave API do OpenRouter não estiver configurada THEN deve mostrar mensagem de erro clara

### Requirement 3

**User Story:** Como desenvolvedor, quero que a integração OpenRouter seja configurável via variável de ambiente, para que eu possa facilmente habilitar/desabilitar o serviço.

#### Acceptance Criteria

1. WHEN a variável OPENROUTER_API_KEY está definida THEN os modelos OpenRouter devem estar disponíveis
2. WHEN a variável não está definida THEN os modelos OpenRouter não devem aparecer no seletor
3. WHEN há erro de autenticação THEN deve retornar mensagem de erro específica
