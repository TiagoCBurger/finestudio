# Requirements Document

## Introduction

O sistema de sincronização em tempo real entre múltiplas janelas/abas não está funcionando corretamente. Quando um usuário move um nó em uma janela, a alteração é salva no Supabase, mas não é refletida automaticamente em outras janelas abertas com o mesmo projeto. Este documento define os requisitos para diagnosticar e corrigir esse problema crítico de experiência do usuário.

## Requirements

### Requirement 1: Diagnóstico do Sistema Realtime

**User Story:** Como desenvolvedor, eu quero diagnosticar o sistema de realtime atual, para que eu possa identificar exatamente onde está o problema de sincronização.

#### Acceptance Criteria

1. WHEN o sistema é testado THEN deve verificar se o trigger `projects_broadcast_trigger` está disparando corretamente
2. WHEN uma atualização é feita no banco THEN deve verificar se `realtime.broadcast_changes()` está sendo chamado
3. WHEN um broadcast é enviado THEN deve verificar se as políticas RLS estão permitindo a leitura das mensagens
4. WHEN um cliente se conecta THEN deve verificar se a autenticação está configurada corretamente com `setAuth()`
5. IF o trigger não dispara THEN deve identificar erros na função `notify_project_changes()`
6. IF broadcasts não chegam THEN deve verificar se o canal está configurado como `private: true`

### Requirement 2: Correção da Sincronização Multi-Janela

**User Story:** Como usuário, eu quero que mudanças feitas em uma janela apareçam automaticamente em outras janelas abertas, para que eu possa trabalhar com múltiplas visualizações do mesmo projeto.

#### Acceptance Criteria

1. WHEN um nó é movido na Janela A THEN a Janela B deve receber a atualização em até 1 segundo
2. WHEN um nó é criado na Janela A THEN a Janela B deve mostrar o novo nó automaticamente
3. WHEN um nó é deletado na Janela A THEN a Janela B deve remover o nó da visualização
4. WHEN múltiplas janelas estão abertas THEN todas devem receber broadcasts de qualquer janela que fizer alterações
5. IF uma janela perde conexão THEN deve reconectar automaticamente e sincronizar o estado
6. WHEN um usuário faz alterações THEN a própria janela não deve receber seu próprio broadcast (self: false)

### Requirement 3: Validação e Testes

**User Story:** Como desenvolvedor, eu quero testes automatizados para sincronização multi-janela, para que eu possa garantir que o sistema funciona corretamente.

#### Acceptance Criteria

1. WHEN o teste multi-janela é executado THEN deve simular duas janelas conectadas ao mesmo projeto
2. WHEN uma janela faz uma alteração THEN o teste deve verificar se a outra janela recebe o broadcast
3. WHEN o teste é executado THEN deve validar que o trigger está funcionando
4. WHEN o teste é executado THEN deve validar que as políticas RLS estão corretas
5. IF o teste falhar THEN deve fornecer informações detalhadas sobre qual componente falhou
6. WHEN todos os componentes funcionam THEN o teste deve passar com sucesso

### Requirement 4: Logging e Debugging

**User Story:** Como desenvolvedor, eu quero logs detalhados do sistema de realtime, para que eu possa debugar problemas de sincronização facilmente.

#### Acceptance Criteria

1. WHEN um broadcast é enviado THEN deve logar o evento com timestamp e payload
2. WHEN um broadcast é recebido THEN deve logar o evento com detalhes do canal
3. WHEN uma conexão falha THEN deve logar o erro com contexto completo
4. WHEN o trigger dispara THEN deve ser possível ver nos logs do Supabase
5. IF há erro de autenticação THEN deve logar claramente o problema de auth
6. WHEN em modo de desenvolvimento THEN deve mostrar logs detalhados no console
