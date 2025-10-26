# Fix: Realtime Flickering ao Regenerar Imagem

## Problema Identificado

Ao clicar em "Regenerar" uma imagem, ocorria um comportamento de "flickering" onde:
1. Nó de texto conectado voltava temporariamente ao texto anterior
2. Nó de imagem mostrava brevemente uma imagem antiga
3. Depois de alguns segundos, a nova imagem aparecia corretamente

Isso dava a impressão de que o sistema "voltou alguns saves antes" e depois se corrigiu.

## Causa Raiz

O Canvas tinha uma lógica de proteção que bloqueava **todas** as atualizações do Realtime por 2 segundos após cada save, para evitar race conditions. Isso impedia que atualizações de estado de nós (como imagem completando geração) fossem aplicadas imediatamente.

## Solução

Modificamos a lógica para **permitir atualizações que afetam apenas o estado do nó** (`data.state` e `data.updatedAt`), mesmo durante o período de bloqueio. Mudanças estruturais (posição, conexões, outros dados) continuam bloqueadas corretamente.

## Arquivos Modificados

1. **`components/canvas.tsx`**
   - Adicionada detecção de mudanças apenas em estado
   - Aplicação seletiva de atualizações de estado
   - Preservação de proteção contra race conditions

2. **`components/nodes/image/states/ready-state.tsx`**
   - Adicionado `unoptimized={true}` para evitar cache
   - Adicionado `priority={true}` para carregamento prioritário

## Documentação

- **[PROBLEMA_E_SOLUCAO.md](./PROBLEMA_E_SOLUCAO.md)**: Análise detalhada do problema e solução
- **[CORRECOES_APLICADAS.md](./CORRECOES_APLICADAS.md)**: Lista completa de mudanças
- **[GUIA_TESTE.md](./GUIA_TESTE.md)**: Guia para testar a correção

## Como Testar

1. Criar nó de texto + nó de imagem conectados
2. Gerar imagem
3. Clicar em "Regenerar"
4. Verificar que:
   - ✅ Texto não volta ao estado anterior
   - ✅ Imagem antiga não aparece brevemente
   - ✅ Transição é suave de "generating" → "ready"

## Status

✅ **Correção Aplicada**
- Código modificado
- Sem erros de diagnóstico
- Documentação completa
- Pronto para teste

## Próximos Passos

1. Testar em ambiente de desenvolvimento
2. Verificar logs no console
3. Testar casos de uso do GUIA_TESTE.md
4. Deploy para staging
5. Monitorar em produção
