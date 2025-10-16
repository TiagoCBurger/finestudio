# Requirements Document

## Introduction

Esta feature adiciona suporte ao Cloudflare R2 como provedor de storage alternativo ao Supabase Storage. O sistema deve permitir escolher qual provedor usar através de configuração, com R2 sendo a opção preferencial mas mantendo a possibilidade de usar Supabase Storage quando necessário.

## Requirements

### Requirement 1: Configuração do Cliente R2

**User Story:** Como desenvolvedor, eu quero configurar o cliente R2 com credenciais seguras, para que o sistema possa se conectar ao Cloudflare R2.

#### Acceptance Criteria

1. WHEN o sistema inicializa THEN SHALL validar a presença das variáveis de ambiente R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME
2. IF as variáveis de ambiente estão presentes THEN SHALL criar uma instância do S3Client configurada para o endpoint R2
3. WHEN o cliente R2 é criado THEN SHALL usar 'auto' como região e o endpoint correto do Cloudflare
4. IF R2_PUBLIC_URL está definido THEN SHALL usar essa URL para gerar URLs públicas dos arquivos

### Requirement 2: Seleção de Provedor de Storage

**User Story:** Como desenvolvedor, eu quero escolher qual provedor de storage usar (R2 ou Supabase), para que eu possa controlar onde os arquivos são armazenados.

#### Acceptance Criteria

1. WHEN o sistema inicializa THEN SHALL ler a variável de ambiente STORAGE_PROVIDER
2. IF STORAGE_PROVIDER é 'r2' THEN SHALL usar Cloudflare R2 para todos os uploads
3. IF STORAGE_PROVIDER é 'supabase' THEN SHALL usar Supabase Storage para todos os uploads
4. IF STORAGE_PROVIDER não está definido THEN SHALL usar 'r2' como padrão
5. WHEN o provedor é selecionado THEN SHALL validar que as credenciais necessárias estão presentes

### Requirement 3: Interface Unificada de Upload

**User Story:** Como desenvolvedor, eu quero uma interface unificada de upload, para que eu não precise modificar código existente ao adicionar suporte ao R2.

#### Acceptance Criteria

1. WHEN a função uploadFile é chamada THEN SHALL aceitar os mesmos parâmetros que a versão atual
2. IF o provedor configurado é R2 THEN SHALL usar o cliente R2 para upload
3. IF o provedor configurado é Supabase THEN SHALL usar o cliente Supabase para upload
4. WHEN o upload é concluído THEN SHALL retornar o mesmo formato de resposta (url, type) independente do provedor
5. IF ocorrer um erro THEN SHALL lançar uma exceção com mensagem descritiva
6. WHEN o usuário não está autenticado THEN SHALL lançar erro antes de tentar upload

### Requirement 4: Suporte a Múltiplos Buckets

**User Story:** Como desenvolvedor, eu quero organizar arquivos em diferentes buckets lógicos, para que eu possa manter a mesma estrutura organizacional do Supabase Storage.

#### Acceptance Criteria

1. WHEN um arquivo é enviado para R2 THEN SHALL incluir o nome do bucket no path (avatars/, files/, screenshots/)
2. IF o bucket é 'screenshots' THEN SHALL permitir sobrescrever arquivos existentes
3. WHEN o arquivo é salvo THEN SHALL preservar o contentType original
4. IF o arquivo já existe e upsert é false THEN SHALL gerar um novo nome único

### Requirement 5: Geração de URLs Públicas

**User Story:** Como usuário, eu quero acessar arquivos enviados através de URLs públicas, para que eu possa visualizar e compartilhar conteúdo.

#### Acceptance Criteria

1. WHEN um arquivo é enviado para R2 THEN SHALL gerar uma URL pública
2. IF R2_PUBLIC_URL está configurado THEN SHALL usar esse domínio customizado
3. IF R2_PUBLIC_URL não está configurado THEN SHALL usar o endpoint padrão do R2
4. WHEN a URL é gerada THEN SHALL incluir o path completo (bucket/userId/filename)
5. WHEN a URL é retornada THEN SHALL ser imediatamente acessível

### Requirement 6: Tratamento de Erros

**User Story:** Como desenvolvedor, eu quero tratamento robusto de erros, para que falhas sejam reportadas claramente.

#### Acceptance Criteria

1. WHEN o provedor selecionado não está configurado corretamente THEN SHALL lançar erro descritivo
2. IF o upload falha THEN SHALL lançar exceção com detalhes do erro
3. WHEN credenciais são inválidas THEN SHALL reportar erro de autenticação
4. IF o bucket não existe THEN SHALL reportar erro específico
5. WHEN ocorre timeout THEN SHALL reportar erro de timeout

### Requirement 7: Compatibilidade com Código Existente

**User Story:** Como desenvolvedor, eu quero que o código existente continue funcionando sem modificações, para que a migração seja transparente.

#### Acceptance Criteria

1. WHEN uploadFile é chamado de qualquer lugar THEN SHALL funcionar sem mudanças no código cliente
2. IF STORAGE_PROVIDER não está definido THEN SHALL usar R2 como padrão
3. WHEN o provedor é alterado THEN SHALL não requerer mudanças no código da aplicação
4. IF o formato de resposta muda THEN SHALL manter compatibilidade retroativa
5. WHEN variáveis de ambiente do provedor selecionado estão ausentes THEN SHALL lançar erro claro

### Requirement 8: Segurança e Autenticação

**User Story:** Como administrador, eu quero que apenas usuários autenticados possam fazer upload, para que o sistema permaneça seguro.

#### Acceptance Criteria

1. WHEN uploadFile é chamado THEN SHALL verificar autenticação do usuário
2. IF o usuário não está autenticado THEN SHALL lançar erro antes de qualquer operação
3. WHEN o arquivo é salvo THEN SHALL usar o userId para organizar arquivos
4. IF credenciais R2 são expostas THEN SHALL estar apenas em variáveis de ambiente server-side
5. WHEN URLs públicas são geradas THEN SHALL não expor credenciais ou tokens
