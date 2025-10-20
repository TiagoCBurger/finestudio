# Implementation Plan

- [x] 1. Corrigir hook useProjectRealtime
  - Corrigir verificação de estado do canal usando `CHANNEL_STATES.SUBSCRIBED`
  - Adicionar chamada `supabase.realtime.setAuth()` antes de subscrever
  - Configurar canal com `self: false` para evitar processar próprios broadcasts
  - Adicionar tratamento de erros robusto no callback de subscrição
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [X] 2. Habilitar realtime no ProjectProvider
  - Remover comentário do hook `useProjectRealtime` no ProjectProvider
  - Verificar que não causa re-renders desnecessários
  - Testar com múltiplos clientes conectados ao mesmo projeto
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Implementar mutação otimista no Canvas
  - Importar `mutate` do SWR no componente Canvas
  - Atualizar função `save` para usar mutação otimista antes de salvar
  - Adicionar reversão de mutação em caso de erro
  - Configurar `revalidate: false` na mutação otimista
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Adicionar logging estruturado
  - Configurar `log_level` baseado em variável de ambiente (info em dev, error em prod)
  - Adicionar logs claros para estados de subscrição (SUBSCRIBED, CHANNEL_ERROR, etc)
  - Manter prefixo 🔴 nos logs de realtime para fácil identificação
  - Adicionar log quando revalidação de cache ocorre
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Validar configuração de banco de dados
  - Verificar que trigger `notify_project_changes` está ativo
  - Verificar que policy `users_can_receive_project_broadcasts` existe
  - Verificar que índice `idx_project_user_members` existe
  - Testar que usuário sem permissão não consegue subscrever
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Criar documentação de uso
  - Documentar como o sistema de realtime funciona
  - Adicionar exemplos de uso do hook
  - Documentar troubleshooting comum
  - Adicionar diagrama de fluxo de dados
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Adicionar testes de integração
  - Criar teste para verificar que broadcasts são recebidos
  - Criar teste para múltiplos clientes conectados
  - Criar teste para reconexão automática
  - Criar teste para validação de RLS policies
  - _Requirements: 2.3, 4.4, 6.1, 6.2_
