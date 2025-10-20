# Debug: Erro 403 no Realtime

## Análise do Erro

O erro que você está vendo:
```
[Error] Failed to load resource: the server responded with a status of 403 (Forbidden) 
(cd882720-e06d-4a9e-8a13-a7d268871652, line 0)
```

O ID `cd882720-e06d-4a9e-8a13-a7d268871652` é o ID do seu projeto, e o erro está acontecendo na "line 0", o que indica que **não é um asset/imagem**, mas sim a **própria conexão WebSocket do Realtime**.

## Possíveis Causas

### 1. Token de Autenticação Não Está Sendo Passado ✅ CORRIGIDO
- Já corrigimos isso nos hooks
- Agora o código obtém a sessão e passa o token para `setAuth()`

### 2. Usuário Não Está Logado ⚠️ VERIFICAR
Se o usuário não estiver logado, o Realtime não conseguirá autenticar.

### 3. Políticas RLS Muito Restritivas ⚠️ VERIFICAR
As políticas podem estar bloqueando o acesso mesmo com token válido.

## Como Verificar

### Passo 1: Verificar se o Usuário Está Logado

Abra o console do navegador e execute:

```javascript
// Verificar sessão
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
console.log('Token:', session?.access_token?.substring(0, 20) + '...');
```

**Resultado esperado:**
- ✅ Session não é null
- ✅ User ID existe
- ✅ Token existe

### Passo 2: Verificar Logs do Realtime

No console do navegador, procure por:
- ✅ "Session found, setting auth for realtime"
- ✅ "Auth set for realtime"
- ✅ "SUBSCRIBED - Successfully connected"

Ou erros como:
- ❌ "No active session found"
- ❌ "Error getting session"
- ❌ "CHANNEL_ERROR"

### Passo 3: Testar Manualmente a Subscrição

No console do navegador:

```javascript
// Criar cliente Supabase
const supabase = window.supabase || createClient(
  'https://scqpyqlghrjvftvoyhau.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjcXB5cWxnaHJqdmZ0dm95aGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMzc5NDMsImV4cCI6MjA3NTgxMzk0M30.6lbFKwfV8-H3UninGgSs9qYf9laIZaWI-7FkMgEeY8Y'
);

// Obter sessão
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session ? 'Found' : 'Not found');

if (!session) {
  console.error('❌ No session - user needs to log in');
} else {
  // Tentar subscrever
  console.log('🔄 Setting auth...');
  await supabase.realtime.setAuth(session.access_token);
  
  console.log('🔄 Subscribing to channel...');
  const channel = supabase
    .channel('project:cd882720-e06d-4a9e-8a13-a7d268871652', {
      config: { private: true }
    })
    .on('broadcast', { event: 'project_updated' }, (payload) => {
      console.log('📨 Received:', payload);
    });
  
  channel.subscribe((status, err) => {
    console.log('Status:', status);
    if (err) console.error('Error:', err);
  });
}
```

## Soluções Possíveis

### Solução 1: Garantir que o Usuário Está Logado
Se não houver sessão, o usuário precisa fazer login primeiro.

### Solução 2: Usar Canal Público Temporariamente (Apenas para Debug)
**⚠️ NÃO RECOMENDADO PARA PRODUÇÃO**

Temporariamente, você pode testar com canal público para verificar se o problema é de autenticação:

```typescript
const channel = supabase.channel(`project:${projectId}`, {
  config: {
    broadcast: { self: false, ack: true },
    private: false, // ⚠️ Público - apenas para teste
  },
});
```

Se funcionar com `private: false`, o problema é definitivamente de autenticação.

### Solução 3: Verificar se o Token Está Expirado

```javascript
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  console.log('Token expires at:', expiresAt);
  console.log('Current time:', now);
  console.log('Token is valid:', expiresAt > now);
  
  if (expiresAt <= now) {
    console.log('🔄 Token expired, refreshing...');
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('❌ Failed to refresh:', error);
    } else {
      console.log('✅ Token refreshed');
    }
  }
}
```

## Próximos Passos

1. **Recarregue a página** para aplicar as correções nos hooks
2. **Faça login** se necessário
3. **Abra o console** e verifique os logs
4. **Execute os testes** acima para diagnosticar o problema
5. **Reporte os resultados** para que possamos ajustar a solução
