# Guia: Colar Imagens no Whiteboard

## Funcionalidade Implementada ✅

A funcionalidade de colar imagens no whiteboard já está implementada e pronta para uso!

## Como Usar

### Método 1: Atalho de Teclado
1. Copie uma imagem (Cmd+C no Mac, Ctrl+C no Windows)
2. Clique no canvas/whiteboard
3. Pressione `Cmd+V` (Mac) ou `Ctrl+V` (Windows)
4. A imagem será automaticamente:
   - Enviada para o servidor
   - Criada como um novo nó de imagem
   - Posicionada no centro da tela

### Método 2: Menu de Contexto do Sistema
1. Copie uma imagem de qualquer lugar
2. Clique com o botão direito no canvas
3. Selecione "Colar" no menu do navegador
4. A imagem será processada automaticamente

## O Que Acontece Internamente

1. **Detecção**: O sistema detecta se há uma imagem no clipboard
2. **Validação**: Verifica se é um arquivo de imagem válido
3. **Upload**: Envia a imagem para o storage (Supabase ou R2)
4. **Criação do Nó**: Cria um nó de imagem com estado de loading
5. **Atualização**: Atualiza o nó com a URL da imagem após upload
6. **Feedback**: Mostra toast de sucesso ou erro

## Estados do Nó

- **Loading**: Enquanto a imagem está sendo enviada
- **Ready**: Quando a imagem foi carregada com sucesso
- **Error**: Se houver algum problema no upload

## Logs de Debug

O sistema gera logs detalhados no console:
- 🖼️ Verificação de imagem no clipboard
- 📋 Itens do clipboard detectados
- 📄 Tipo de cada item
- 📁 Informações do arquivo
- ⬆️ Status do upload
- ✅ Confirmação de sucesso

## Troubleshooting

### A imagem não cola?

1. **Verifique o console do navegador** para ver os logs
2. **Certifique-se de que copiou uma imagem** (não um link)
3. **Verifique se o projeto está carregado** (project?.id deve existir)
4. **Teste com diferentes formatos** (PNG, JPG, GIF, etc.)

### Formatos Suportados

Todos os formatos de imagem suportados pelo navegador:
- PNG
- JPEG/JPG
- GIF
- WebP
- SVG
- BMP

### Tamanho Máximo

O limite de tamanho é definido no componente Dropzone (10MB por padrão).

## Código Relevante

- **Canvas**: `components/canvas.tsx` (linha ~595)
- **Upload**: `lib/upload.client.ts`
- **API**: `app/api/upload/route.ts`
- **Nó de Imagem**: `components/nodes/image/primitive.tsx`

## Melhorias Futuras Possíveis

- [ ] Suporte para múltiplas imagens de uma vez
- [ ] Preview antes de colar
- [ ] Opção de redimensionar automaticamente
- [ ] Suporte para arrastar e soltar do clipboard
- [ ] Histórico de imagens coladas
