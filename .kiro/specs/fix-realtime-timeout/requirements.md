# Requirements Document

## Introduction

Os usuários estão enfrentando erros de TIMED_OUT ao tentar se conectar aos canais Realtime do Supabase. O problema ocorre porque as políticas RLS (Row Level Security) no `realtime.messages` estão bloqueando as subscrições aos canais privados. Precisamos corrigir as políticas RLS para permitir que usuários autenticados se conectem aos seus próprios canais de forma adequada.

## Requirements

### Requirement 1: Corrigir Políticas RLS para Canais fal_jobs

**User Story:** Como um usuário autenticado, eu quero receber atualizações em tempo real sobre meus jobs do fal.ai, para que eu possa monitorar o progresso das minhas requisições.

#### Acceptance Criteria

1. WHEN um usuário autenticado tenta se conectar ao canal `fal_jobs:{user_id}` THEN o sistema SHALL permitir a subscrição se o user_id no tópico corresponder ao auth.uid() do usuário
2. WHEN um trigger de banco de dados tenta fazer broadcast para o canal `fal_jobs:{user_id}` THEN o sistema SHALL permitir o broadcast
3. WHEN a política RLS é avaliada THEN o sistema SHALL usar comparação de string simples ao invés de regex complexo para melhor performance
4. IF o usuário não estiver autenticado THEN o sistema SHALL negar acesso ao canal privado

### Requirement 2: Corrigir Políticas RLS para Canais de Projeto

**User Story:** Como um usuário autenticado, eu quero receber atualizações em tempo real sobre meus projetos, para que eu possa ver mudanças feitas por webhooks ou outros usuários.

#### Acceptance Criteria

1. WHEN um usuário autenticado tenta se conectar ao canal `project:{project_id}` THEN o sistema SHALL permitir a subscrição se o usuário for dono ou membro do projeto
2. WHEN um trigger de banco de dados tenta fazer broadcast para o canal `project:{project_id}` THEN o sistema SHALL permitir o broadcast
3. WHEN a política RLS é avaliada THEN o sistema SHALL usar índices apropriados para melhor performance
4. IF o projeto não existir ou o usuário não tiver acesso THEN o sistema SHALL negar acesso ao canal

### Requirement 3: Adicionar Logging e Diagnóstico

**User Story:** Como um desenvolvedor, eu quero ter visibilidade sobre falhas de autenticação no Realtime, para que eu possa diagnosticar problemas rapidamente.

#### Acceptance Criteria

1. WHEN uma subscrição falha com TIMED_OUT THEN o sistema SHALL logar informações detalhadas sobre o erro
2. WHEN uma política RLS nega acesso THEN o sistema SHALL logar o motivo da negação
3. WHEN um usuário se conecta com sucesso THEN o sistema SHALL logar a conexão bem-sucedida
4. IF houver erro de autenticação THEN o sistema SHALL fornecer mensagem clara sobre o problema

### Requirement 4: Validar Configuração do Cliente Realtime

**User Story:** Como um desenvolvedor, eu quero garantir que o cliente Realtime está configurado corretamente, para que as subscrições funcionem de forma confiável.

#### Acceptance Criteria

1. WHEN o cliente tenta se conectar a um canal privado THEN o sistema SHALL garantir que `setAuth()` foi chamado antes de `subscribe()`
2. WHEN o token de autenticação expira THEN o sistema SHALL renovar automaticamente o token
3. WHEN a conexão é perdida THEN o sistema SHALL reconectar automaticamente com backoff exponencial
4. IF o usuário não tiver sessão ativa THEN o sistema SHALL falhar rapidamente com mensagem clara
