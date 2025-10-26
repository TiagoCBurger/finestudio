# Requirements Document

## Introduction

O sistema está apresentando múltiplas tentativas de conexão WebSocket falhadas e timeouts no Supabase Realtime. Os logs mostram erros como "WebSocket is closed before the connection is established" e "TIMED_OUT - Subscription attempt timed out". O problema ocorre porque:

1. Múltiplas instâncias do cliente Supabase estão sendo criadas
2. Múltiplos canais estão sendo criados para o mesmo tópico
3. Não há gerenciamento centralizado das conexões realtime
4. Os hooks `use-project-realtime` e `use-queue-monitor` criam suas próprias conexões independentes

## Glossary

- **Supabase Client**: Cliente singleton que gerencia a conexão WebSocket com o Supabase
- **Realtime Channel**: Canal de comunicação para um tópico específico (ex: `project:123`)
- **Broadcast**: Método de envio de mensagens em tempo real via WebSocket
- **RLS**: Row Level Security - políticas de segurança no banco de dados
- **WebSocket**: Protocolo de comunicação bidirecional em tempo real
- **Singleton**: Padrão de design que garante apenas uma instância de um objeto

## Requirements

### Requirement 1: Gerenciamento Centralizado de Conexões

**User Story:** Como desenvolvedor, quero que o sistema use uma única conexão WebSocket para todos os canais realtime, para evitar múltiplas tentativas de conexão e melhorar a performance.

#### Acceptance Criteria

1. WHEN the application initializes, THE System SHALL create a single Supabase client instance
2. WHEN multiple components need realtime updates, THE System SHALL reuse the same Supabase client instance
3. WHEN a component unmounts, THE System SHALL NOT close the shared WebSocket connection
4. WHERE realtime is needed, THE System SHALL use the singleton client instance
5. WHILE the application is running, THE System SHALL maintain only one active WebSocket connection to Supabase

### Requirement 2: Gerenciamento de Canais por Tópico

**User Story:** Como desenvolvedor, quero que cada tópico tenha apenas um canal ativo, para evitar subscrições duplicadas e conflitos.

#### Acceptance Criteria

1. WHEN a component subscribes to a topic, THE System SHALL check if a channel for that topic already exists
2. IF a channel exists for the topic, THEN THE System SHALL reuse the existing channel
3. WHEN multiple components subscribe to the same topic, THE System SHALL share the same channel instance
4. WHEN the last subscriber unsubscribes, THE System SHALL close the channel
5. WHILE a channel is active, THE System SHALL track the number of active subscribers

### Requirement 3: Cleanup Adequado de Recursos

**User Story:** Como desenvolvedor, quero que os recursos realtime sejam liberados corretamente quando não são mais necessários, para evitar memory leaks.

#### Acceptance Criteria

1. WHEN a component unmounts, THE System SHALL decrement the subscriber count for its channels
2. IF the subscriber count reaches zero, THEN THE System SHALL close the channel
3. WHEN the application closes, THE System SHALL close all active channels
4. WHILE cleaning up, THE System SHALL remove all event listeners
5. WHEN a channel is closed, THE System SHALL remove it from the channel registry

### Requirement 4: Tratamento de Erros e Reconexão

**User Story:** Como usuário, quero que o sistema se reconecte automaticamente quando a conexão cair, sem perder dados ou causar erros visíveis.

#### Acceptance Criteria

1. WHEN a WebSocket connection fails, THE System SHALL attempt to reconnect with exponential backoff
2. WHILE reconnecting, THE System SHALL maintain the channel subscriptions
3. IF reconnection fails after max retries, THEN THE System SHALL log the error and notify the user
4. WHEN the connection is restored, THE System SHALL resubscribe to all active channels
5. WHILE offline, THE System SHALL queue messages for sending when connection is restored

### Requirement 5: Logging e Debugging

**User Story:** Como desenvolvedor, quero logs claros sobre o estado das conexões realtime, para facilitar debugging e monitoramento.

#### Acceptance Criteria

1. WHEN a connection is established, THE System SHALL log the connection details
2. WHEN a channel is created or reused, THE System SHALL log the channel topic and subscriber count
3. IF an error occurs, THEN THE System SHALL log the error with context information
4. WHILE in development mode, THE System SHALL provide detailed logs
5. WHILE in production mode, THE System SHALL log only errors and warnings

### Requirement 6: Performance e Escalabilidade

**User Story:** Como usuário, quero que o sistema seja responsivo e não trave durante operações no canvas, mesmo com realtime ativo.

#### Acceptance Criteria

1. WHEN receiving realtime updates, THE System SHALL debounce updates to prevent excessive re-renders
2. WHILE the user interacts with the canvas, THE System SHALL not block the UI thread
3. WHEN saving changes, THE System SHALL use optimistic updates
4. IF a save fails, THEN THE System SHALL revert the optimistic update
5. WHILE multiple updates arrive, THE System SHALL batch them when possible

### Requirement 7: Sincronização Multi-Janela e Multi-Usuário

**User Story:** Como usuário, quero que quando eu atualizar o canvas, as mudanças apareçam de forma fluida e responsiva em outras janelas abertas e para outros usuários.

#### Acceptance Criteria

1. WHEN a user makes changes to the canvas, THE System SHALL broadcast the changes via realtime
2. WHEN another window receives canvas updates, THE System SHALL apply the changes smoothly without flickering
3. WHEN another user receives canvas updates, THE System SHALL merge the changes with their local state
4. WHILE a user is editing, THE System SHALL show optimistic updates immediately
5. WHEN the server confirms the save, THE System SHALL reconcile any conflicts between local and remote state
6. IF multiple users edit simultaneously, THEN THE System SHALL use last-write-wins strategy
7. WHILE syncing, THE System SHALL maintain canvas responsiveness and not block user interactions
8. WHEN a broadcast is received, THE System SHALL update the canvas within 100ms for a fluid experience
