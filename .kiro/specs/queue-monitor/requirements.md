# Requirements Document

## Introduction

Este documento define os requisitos para um sistema de monitoramento de fila de requisições assíncronas (imagens e vídeos) que permite aos usuários visualizar o status em tempo real das suas solicitações de geração de conteúdo através de um componente hover/modal no canto direito da interface.

O sistema deve fornecer feedback visual claro sobre requisições pendentes, em processamento, completadas e com erro, permitindo que os usuários acompanhem o progresso das suas gerações sem precisar ficar verificando manualmente cada nó no canvas.

## Requirements

### Requirement 1: Indicador Visual de Fila

**User Story:** Como usuário, eu quero ver um indicador visual no canto direito da tela que mostre quantas requisições estão na fila, para que eu possa saber rapidamente se tenho gerações em andamento.

#### Acceptance Criteria

1. WHEN o usuário está autenticado THEN o sistema SHALL exibir um ícone de fila no canto superior direito da interface
2. WHEN existem requisições pendentes ou em processamento THEN o ícone SHALL exibir um badge com o número total de requisições ativas
3. WHEN não existem requisições ativas THEN o badge SHALL ser ocultado ou mostrar "0"
4. WHEN o usuário passa o mouse sobre o ícone THEN o sistema SHALL exibir um tooltip com resumo rápido (ex: "3 requisições em andamento")
5. WHEN uma nova requisição é criada THEN o contador SHALL ser atualizado imediatamente
6. WHEN uma requisição é completada ou falha THEN o contador SHALL ser decrementado automaticamente

### Requirement 2: Modal de Detalhes da Fila

**User Story:** Como usuário, eu quero clicar no indicador de fila para abrir um modal com detalhes de todas as minhas requisições, para que eu possa ver o status completo de cada geração.

#### Acceptance Criteria

1. WHEN o usuário clica no ícone de fila THEN o sistema SHALL abrir um modal centralizado
2. WHEN o modal está aberto THEN o sistema SHALL exibir uma lista de todas as requisições do usuário atual
3. WHEN a lista está vazia THEN o sistema SHALL exibir uma mensagem "Nenhuma requisição na fila"
4. WHEN o modal está aberto THEN o usuário SHALL poder fechá-lo clicando fora, no botão X ou pressionando ESC
5. WHEN o modal é fechado THEN o sistema SHALL manter o estado das requisições em memória
6. WHEN o modal é reaberto THEN o sistema SHALL exibir os dados mais recentes da fila

### Requirement 3: Exibição de Status das Requisições

**User Story:** Como usuário, eu quero ver o status de cada requisição (pendente, processando, completada, erro), para que eu possa entender o que está acontecendo com cada geração.

#### Acceptance Criteria

1. WHEN uma requisição está com status "pending" THEN o sistema SHALL exibir um indicador visual de "Aguardando" com ícone de relógio
2. WHEN uma requisição está sendo processada THEN o sistema SHALL exibir um indicador de "Processando" com animação de loading
3. WHEN uma requisição é completada THEN o sistema SHALL exibir um indicador de "Completada" com ícone de check verde
4. WHEN uma requisição falha THEN o sistema SHALL exibir um indicador de "Erro" com ícone de alerta vermelho
5. WHEN uma requisição tem erro THEN o sistema SHALL exibir a mensagem de erro ao expandir os detalhes
6. WHEN o status de uma requisição muda THEN a interface SHALL atualizar automaticamente sem refresh manual

### Requirement 4: Informações da Requisição

**User Story:** Como usuário, eu quero ver informações detalhadas de cada requisição (tipo, modelo, tempo decorrido), para que eu possa identificar e acompanhar cada geração específica.

#### Acceptance Criteria

1. WHEN uma requisição é exibida THEN o sistema SHALL mostrar o tipo (imagem ou vídeo)
2. WHEN uma requisição é exibida THEN o sistema SHALL mostrar o modelo utilizado (ex: "flux-pro", "minimax-video")
3. WHEN uma requisição está pendente ou processando THEN o sistema SHALL mostrar o tempo decorrido desde a criação
4. WHEN uma requisição é completada THEN o sistema SHALL mostrar o tempo total de processamento
5. WHEN uma requisição tem thumbnail disponível THEN o sistema SHALL exibir uma prévia pequena do resultado
6. WHEN o usuário clica em uma requisição completada THEN o sistema SHALL navegar para o nó correspondente no canvas

### Requirement 5: Atualização em Tempo Real

**User Story:** Como usuário, eu quero que a fila seja atualizada automaticamente quando o webhook retorna, para que eu não precise ficar atualizando manualmente a página.

#### Acceptance Criteria

1. WHEN o webhook do fal.ai retorna uma resposta THEN o sistema SHALL atualizar o status da requisição automaticamente
2. WHEN uma requisição é completada via webhook THEN o sistema SHALL exibir uma notificação toast de sucesso
3. WHEN uma requisição falha via webhook THEN o sistema SHALL exibir uma notificação toast de erro
4. WHEN múltiplas janelas/abas estão abertas THEN todas SHALL receber as atualizações de status simultaneamente
5. WHEN a conexão com o servidor é perdida THEN o sistema SHALL tentar reconectar automaticamente
6. WHEN a conexão é restaurada THEN o sistema SHALL sincronizar o estado atual da fila

### Requirement 6: Filtragem e Ordenação

**User Story:** Como usuário, eu quero filtrar e ordenar as requisições na fila, para que eu possa encontrar facilmente requisições específicas.

#### Acceptance Criteria

1. WHEN o modal está aberto THEN o sistema SHALL exibir opções de filtro por status (todas, pendentes, completadas, erro)
2. WHEN um filtro é aplicado THEN o sistema SHALL exibir apenas requisições que correspondem ao filtro
3. WHEN nenhuma requisição corresponde ao filtro THEN o sistema SHALL exibir mensagem "Nenhuma requisição encontrada"
4. WHEN o modal está aberto THEN as requisições SHALL ser ordenadas por data de criação (mais recentes primeiro) por padrão
5. WHEN o usuário seleciona ordenação diferente THEN o sistema SHALL reordenar a lista imediatamente
6. WHEN o modal é fechado e reaberto THEN o sistema SHALL manter as preferências de filtro e ordenação

### Requirement 7: Limpeza de Requisições Antigas

**User Story:** Como usuário, eu quero poder limpar requisições completadas ou com erro da lista, para que a fila não fique muito poluída.

#### Acceptance Criteria

1. WHEN uma requisição está completada ou com erro THEN o sistema SHALL exibir um botão de "Remover" ao lado dela
2. WHEN o usuário clica em "Remover" THEN o sistema SHALL remover a requisição da visualização local
3. WHEN o usuário clica em "Limpar Completadas" THEN o sistema SHALL remover todas as requisições completadas da visualização
4. WHEN o usuário clica em "Limpar Erros" THEN o sistema SHALL remover todas as requisições com erro da visualização
5. WHEN requisições são removidas da visualização THEN elas SHALL permanecer no banco de dados para histórico
6. WHEN a página é recarregada THEN apenas requisições ativas (pending) SHALL ser carregadas automaticamente

### Requirement 8: Integração com Sistema Existente

**User Story:** Como desenvolvedor, eu quero que o sistema de fila se integre perfeitamente com o sistema existente de jobs do fal.ai, para que não haja duplicação de lógica ou inconsistências.

#### Acceptance Criteria

1. WHEN uma requisição de imagem/vídeo é criada THEN o sistema SHALL registrar automaticamente na fila de monitoramento
2. WHEN o hook `useFalJob` detecta mudança de status THEN o sistema SHALL atualizar a fila de monitoramento
3. WHEN o webhook `/api/webhooks/fal` recebe resposta THEN o sistema SHALL notificar a fila via broadcast do Supabase Realtime
4. WHEN múltiplos projetos estão abertos THEN o sistema SHALL filtrar requisições por projeto atual
5. WHEN o usuário troca de projeto THEN o sistema SHALL atualizar a fila para mostrar requisições do novo projeto
6. WHEN uma requisição é completada THEN o nó correspondente no canvas SHALL ser atualizado automaticamente
