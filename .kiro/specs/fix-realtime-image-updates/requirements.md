# Requirements Document

## Introduction

Este documento define os requisitos para corrigir dois problemas críticos relacionados a atualizações em tempo real (realtime) no sistema de geração de imagens:

1. **Fila de requisições não atualiza automaticamente**: Quando uma nova imagem é gerada, o componente de fila (QueueMonitor) não é atualizado em tempo real, exigindo que o usuário recarregue a página manualmente para ver a nova requisição.

2. **Imagem não atualiza no nó após webhook**: Quando o webhook de um provider processa a imagem e faz upload no storage, o nó visual não é atualizado automaticamente com a imagem gerada. Não está claro se o problema é:
   - O banco de dados não está sendo atualizado corretamente com a nova URL da imagem
   - O banco está sendo atualizado mas o trigger realtime não está disparando
   - O trigger está disparando mas o cliente não está recebendo/processando o evento

Ambos os problemas indicam possíveis falhas na cadeia de atualização (banco → trigger → broadcast → cliente → UI), exigindo investigação para identificar onde a propagação está falhando.

**Escopo de Providers**: A solução deve ser agnóstica ao provider (funcionar com KIE.ai, Fal.ai, Replicate, etc), mas os testes serão realizados apenas com **KIE.ai** por ser o provider atualmente configurado e em uso.

## Glossary

- **System**: O sistema de geração de imagens com fila de requisições e atualização em tempo real
- **QueueMonitor**: Componente React que exibe a fila de requisições de geração de imagens
- **GenerationJob**: Registro no banco de dados que representa uma requisição de geração de imagem (atualmente tabela fal_jobs, mas nome será refatorado)
- **ImageNode**: Nó visual no canvas que exibe a imagem gerada
- **Webhook**: Endpoint HTTP que recebe notificações de provedores de IA quando uma imagem é processada (agnóstico ao provider, mas testado com KIE.ai)
- **Realtime Broadcast**: Mecanismo do Supabase para propagar mudanças do banco de dados para clientes conectados
- **Project Content**: Estrutura JSON que contém os nós e edges do projeto visual
- **Optimistic Update**: Atualização imediata da UI antes da confirmação do servidor
- **Provider**: Serviço externo de geração de IA (KIE.ai, Fal.ai, Replicate, etc)

## Requirements

### Requirement 1: Atualização Imediata da Fila

**User Story:** Como um usuário gerando imagens, eu quero ver a nova requisição aparecer imediatamente na fila de requisições, para que eu possa acompanhar o progresso sem recarregar a página.

#### Acceptance Criteria

1. WHEN THE System cria um novo GenerationJob no banco de dados, THE QueueMonitor SHALL receber uma notificação realtime via broadcast dentro de 500ms
2. WHEN THE QueueMonitor recebe um evento INSERT de GenerationJob, THE System SHALL adicionar o job à lista de jobs exibidos sem duplicação
3. WHEN THE System cria uma requisição de imagem, THE QueueMonitor SHALL exibir o job com status "pending" imediatamente após a criação
4. WHEN THE GenerationJob é criado antes da submissão ao Provider, THE System SHALL garantir que o job apareça na fila antes do webhook ser recebido
5. WHERE THE usuário tem múltiplas abas abertas, THE QueueMonitor SHALL sincronizar a lista de jobs em todas as abas

### Requirement 2: Atualização do Nó Após Webhook

**User Story:** Como um usuário gerando imagens, eu quero ver a imagem gerada aparecer automaticamente no nó visual assim que o processamento for concluído, para que eu não precise recarregar a página manualmente.

#### Acceptance Criteria

1. WHEN THE Webhook executa database.update() no projeto, THE System SHALL persistir a URL da imagem no campo content.nodes[].data.generated.url
2. WHEN THE database.update() é executado com updatedAt modificado, THE System SHALL disparar o trigger projects_broadcast_trigger
3. WHEN THE trigger dispara, THE System SHALL enviar broadcast para o tópico project:{project_id} com payload contendo NEW e OLD
4. WHEN THE ImageNode recebe evento UPDATE via realtime, THE System SHALL chamar mutate() do SWR para revalidar o cache
5. WHEN THE mutate() revalida, THE ImageNode SHALL buscar dados atualizados da API e renderizar a imagem gerada
6. IF THE qualquer etapa da cadeia falhar, THEN THE System SHALL logar erro detalhado indicando onde a falha ocorreu
7. WHERE THE realtime não funciona, THE System SHALL implementar fallback polling a cada 5 segundos durante estado "generating"

### Requirement 3: Sincronização de Estado

**User Story:** Como um desenvolvedor, eu quero garantir que todos os eventos de banco de dados disparem broadcasts realtime corretamente, para que a UI sempre reflita o estado atual do sistema.

#### Acceptance Criteria

1. WHEN THE GenerationJob é inserido no banco de dados, THE System SHALL disparar trigger generation_jobs_broadcast_trigger com payload completo
2. WHEN THE Project é atualizado no banco de dados, THE System SHALL disparar trigger projects_broadcast_trigger com payload completo
3. WHEN THE Webhook atualiza o GenerationJob para status "completed", THE System SHALL disparar broadcast para o tópico generation_jobs:{user_id}
4. WHEN THE Webhook atualiza o Project, THE System SHALL disparar broadcast para o tópico project:{project_id}
5. WHERE THE trigger falha ao disparar broadcast, THE System SHALL logar erro detalhado sem falhar a transação

### Requirement 4: Atualização Otimista da Fila

**User Story:** Como um usuário gerando imagens, eu quero ver a requisição aparecer instantaneamente na fila, mesmo antes da confirmação do servidor, para uma experiência mais responsiva.

#### Acceptance Criteria

1. WHEN THE usuário inicia geração de imagem, THE System SHALL adicionar job otimisticamente à fila antes da resposta da API
2. WHEN THE API retorna o job_id real, THE System SHALL atualizar o job otimista com os dados corretos
3. IF THE API falha ao criar o job, THEN THE System SHALL remover o job otimista da fila e exibir erro
4. WHEN THE job otimista é adicionado, THE System SHALL usar o job_id retornado no header x-job-id da resposta
5. WHEN THE broadcast realtime confirma o job, THE System SHALL evitar duplicação comparando job_id

### Requirement 5: Diagnóstico e Logging

**User Story:** Como um desenvolvedor, eu quero ter logs detalhados de todos os eventos realtime e atualizações de banco, para que eu possa diagnosticar onde a cadeia de atualização está falhando.

#### Acceptance Criteria

1. WHEN THE webhook executa database.update(), THE System SHALL logar projectId, nodeId, imageUrl e resultado da operação
2. WHEN THE trigger de banco dispara broadcast, THE System SHALL logar tópico, operação, timestamp e se broadcast foi enviado com sucesso
3. WHEN THE cliente recebe broadcast, THE System SHALL logar tópico, evento, payload (sanitizado) e ação tomada
4. WHEN THE mutate() do SWR é chamado, THE System SHALL logar cache key, se revalidação foi forçada e resultado
5. WHEN THE componente renderiza após atualização, THE System SHALL logar se dados novos foram recebidos e aplicados
6. WHERE THE qualquer etapa falha, THE System SHALL logar erro com contexto completo incluindo etapa anterior bem-sucedida
7. WHEN THE usuário reporta problema, THE System SHALL permitir verificação de logs para identificar etapa falhando
