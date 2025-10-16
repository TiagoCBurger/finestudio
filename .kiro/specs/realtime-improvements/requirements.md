# Requirements Document

## Introduction

Este documento define os requisitos para melhorar o sistema de realtime do Supabase no projeto, garantindo que as atualizações de projetos sejam sincronizadas em tempo real entre múltiplos clientes de forma eficiente e escalável. O sistema atual possui o hook `useProjectRealtime` implementado mas desabilitado devido a problemas de re-renders, além de não seguir completamente as melhores práticas do Supabase Realtime.

## Requirements

### Requirement 1: Corrigir Hook de Realtime

**User Story:** Como desenvolvedor, quero que o hook `useProjectRealtime` funcione corretamente sem causar re-renders desnecessários, para que possa ser habilitado no `ProjectProvider`.

#### Acceptance Criteria

1. WHEN o hook verifica o estado do canal THEN ele SHALL usar a constante correta `CHANNEL_STATES.SUBSCRIBED` ao invés da string `'subscribed'`
2. WHEN o hook é inicializado THEN ele SHALL chamar `supabase.realtime.setAuth()` antes de subscrever ao canal
3. WHEN o componente é desmontado THEN ele SHALL limpar corretamente a subscrição usando `supabase.removeChannel()`
4. WHEN o hook detecta uma mudança no projeto THEN ele SHALL revalidar o cache SWR sem causar re-renders em cascata

### Requirement 2: Habilitar Realtime no ProjectProvider

**User Story:** Como usuário, quero que as mudanças no projeto sejam sincronizadas automaticamente entre diferentes abas/dispositivos, para que eu possa colaborar em tempo real.

#### Acceptance Criteria

1. WHEN o `ProjectProvider` é montado THEN ele SHALL habilitar o hook `useProjectRealtime` com o ID do projeto
2. WHEN uma atualização é recebida via broadcast THEN o provider SHALL atualizar o contexto do projeto sem causar re-renders desnecessários
3. WHEN múltiplos clientes estão conectados ao mesmo projeto THEN todos SHALL receber as atualizações em tempo real
4. IF o usuário não está autenticado THEN o realtime SHALL falhar graciosamente sem quebrar a aplicação

### Requirement 3: Otimizar Revalidação de Cache

**User Story:** Como desenvolvedor, quero que a revalidação do cache SWR seja eficiente, para que não cause problemas de performance ou re-renders excessivos.

#### Acceptance Criteria

1. WHEN uma atualização via broadcast é recebida THEN o sistema SHALL usar `mutate` do SWR de forma otimizada
2. WHEN o salvamento local ocorre THEN ele SHALL usar mutação otimista para atualizar a UI imediatamente
3. WHEN há conflitos entre salvamento local e atualizações remotas THEN o sistema SHALL priorizar a última atualização (last-write-wins)
4. WHEN o projeto está sendo salvo localmente THEN ele SHALL evitar processar broadcasts do próprio cliente se `self: false` for configurado

### Requirement 4: Validar Configuração de Segurança

**User Story:** Como administrador de sistema, quero garantir que as políticas RLS e triggers do banco de dados estejam corretos, para que apenas usuários autorizados recebam atualizações.

#### Acceptance Criteria

1. WHEN um usuário tenta subscrever a um canal privado THEN o sistema SHALL verificar as políticas RLS em `realtime.messages`
2. WHEN um projeto é atualizado no banco THEN o trigger SHALL chamar `realtime.broadcast_changes` com o tópico correto
3. WHEN as políticas RLS são verificadas THEN elas SHALL ter índices apropriados para performance
4. IF um usuário não tem permissão para acessar um projeto THEN ele SHALL receber erro de autorização ao tentar subscrever

### Requirement 5: Adicionar Logging e Debugging

**User Story:** Como desenvolvedor, quero ter logs claros sobre o estado do realtime, para que possa debugar problemas facilmente.

#### Acceptance Criteria

1. WHEN o canal é subscrito com sucesso THEN o sistema SHALL logar o status `SUBSCRIBED` no console
2. WHEN ocorre um erro de canal THEN o sistema SHALL logar detalhes do erro incluindo código e mensagem
3. WHEN o sistema está em desenvolvimento THEN ele SHALL usar `log_level: 'info'` para debugging detalhado
4. WHEN o sistema está em produção THEN ele SHALL usar `log_level: 'error'` para minimizar logs

### Requirement 6: Implementar Reconexão Automática

**User Story:** Como usuário, quero que o sistema reconecte automaticamente quando a conexão cair, para que eu não perca atualizações em tempo real.

#### Acceptance Criteria

1. WHEN a conexão WebSocket é perdida THEN o cliente Supabase SHALL tentar reconectar automaticamente
2. WHEN a reconexão é bem-sucedida THEN o sistema SHALL resubscrever aos canais automaticamente
3. WHEN múltiplas tentativas de reconexão falham THEN o sistema SHALL usar backoff exponencial
4. WHEN o usuário volta online após estar offline THEN o sistema SHALL sincronizar o estado do projeto
