# Requirements Document

## Introduction

Esta feature visa melhorar a experiência do usuário no seletor de modelos, tornando-o mais limpo, informativo e funcional. As melhorias incluem a remoção de logos redundantes, a exibição clara de custos em créditos, e a ocultação de modelos desabilitados para evitar confusão.

## Requirements

### Requirement 1

**User Story:** Como usuário, quero ver apenas os modelos disponíveis para uso, para que eu não tente selecionar modelos que estão desabilitados.

#### Acceptance Criteria

1. WHEN o seletor de modelo é renderizado THEN o sistema SHALL filtrar e exibir apenas modelos com `enabled !== false`
2. WHEN um modelo tem `enabled: false` THEN o sistema SHALL ocultar completamente esse modelo da lista
3. WHEN todos os modelos de um provider estão desabilitados THEN o sistema SHALL ocultar o grupo inteiro desse provider

### Requirement 2

**User Story:** Como usuário, quero ver o custo exato em créditos de cada modelo, para que eu possa tomar decisões informadas sobre qual modelo usar.

#### Acceptance Criteria

1. WHEN o seletor de modelo exibe um item THEN o sistema SHALL mostrar um ícone de moeda ao lado do custo
2. WHEN o custo é calculado THEN o sistema SHALL exibir o valor numérico de créditos de forma clara
3. WHEN o modelo não tem custo definido THEN o sistema SHALL exibir um indicador apropriado (ex: "N/A" ou ocultar o custo)
4. WHEN o usuário visualiza o custo THEN o sistema SHALL formatar o valor de forma legível (ex: "1 crédito", "0.025 créditos")

### Requirement 3

**User Story:** Como usuário, quero um layout limpo no seletor de modelo sem logos redundantes, para que eu possa focar nas informações importantes.

#### Acceptance Criteria

1. WHEN o seletor de modelo exibe um item THEN o sistema SHALL remover o ícone do provider (logo do fal) que aparece em círculo
2. WHEN o layout é renderizado THEN o sistema SHALL organizar o nome do modelo à esquerda
3. WHEN o layout é renderizado THEN o sistema SHALL organizar o ícone de moeda e custo à direita
4. WHEN o item está selecionado THEN o sistema SHALL manter a legibilidade do custo com cores apropriadas

### Requirement 4

**User Story:** Como usuário, quero que o seletor de modelo mantenha a funcionalidade existente de indicadores de preço, para que eu continue tendo contexto sobre custos relativos.

#### Acceptance Criteria

1. WHEN o modelo tem `priceIndicator` definido THEN o sistema SHALL manter o tooltip com a descrição do bracket de preço
2. WHEN o custo exato é exibido THEN o sistema SHALL também mostrar o indicador visual de bracket (setas)
3. WHEN o usuário passa o mouse sobre o indicador THEN o sistema SHALL exibir o tooltip explicativo
