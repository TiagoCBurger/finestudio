# WAN-25 Quick Start Guide

## ✅ Implementation Complete

O modelo **WAN-25 Preview (Text-to-Video)** foi implementado com sucesso na plataforma Tersa!

## 🚀 Como Usar

### Na Interface

1. Abra um projeto
2. Adicione um nó de vídeo
3. Selecione **"WAN-25 Preview (Text-to-Video)"** no dropdown de modelos
4. Digite seu prompt de texto
5. Escolha a duração (5s ou 10s)
6. Escolha o aspect ratio (16:9, 9:16, ou 1:1)
7. Clique em "Generate"

### Características

- ✅ **Text-to-Video**: Não requer imagem de entrada
- ✅ **Webhook Support**: Processamento assíncrono
- ✅ **Realtime Updates**: Atualização automática via Supabase
- ✅ **Durações**: 5s, 10s
- ✅ **Aspect Ratios**: 16:9, 9:16, 1:1

## 📁 Arquivos Modificados

```
lib/models/video/
├── fal.ts                 ✅ Tipo FalVideoModel atualizado
├── fal.server.ts          ✅ Tipo FalVideoModel atualizado
├── index.ts               ✅ Modelo registrado (client-side)
└── index.server.ts        ✅ Modelo registrado (server-side)
```

## 🧪 Testes

Execute o teste de validação:

```bash
node test-wan-25-model.js
```

Resultado esperado: ✅ Todos os testes passam

## 💰 Preços Estimados

| Duração | Custo Estimado |
|---------|----------------|
| 5s      | $0.50          |
| 10s     | $1.00          |

**Nota**: Preços são estimativas. Verifique a [página oficial do modelo](https://fal.ai/models/wan-25-preview) para valores atualizados.

## 🔄 Fluxo de Processamento

1. **Submissão**: Job enviado para Fal.ai com webhook URL
2. **Resposta Imediata**: Retorna `pending:${requestId}`
3. **Processamento**: Fal.ai processa o vídeo (2-4 minutos)
4. **Webhook**: Fal.ai notifica quando completo
5. **Atualização**: Banco de dados atualizado
6. **Broadcast**: Supabase notifica o frontend
7. **UI Update**: Interface atualiza automaticamente

## 📊 Comparação com Outros Modelos

| Modelo | Tipo | Imagem | Duração | Preço (5s) |
|--------|------|--------|---------|------------|
| **WAN-25** | Text-to-Video | ❌ Não | 5s, 10s | ~$0.50 |
| Kling v2.5 | Ambos | ✅ Opcional | 5s, 10s | $0.35 |
| Sora 2 | Image-to-Video | ✅ Obrigatória | 4s, 8s, 12s | $1.20 |

## 🎯 Casos de Uso Ideais

- ✅ Geração de vídeo a partir de descrição textual
- ✅ Prototipagem rápida de conceitos visuais
- ✅ Criação de conteúdo sem assets de imagem
- ✅ Testes de prompts e estilos visuais

## ⚠️ Limitações

- ❌ Não suporta image-to-video (apenas text-to-video)
- ⚠️ Modelo em preview (pode ter mudanças)
- ⚠️ Preços podem ser ajustados

## 🔗 Recursos

- [Fal.ai WAN-25 Model](https://fal.ai/models/wan-25-preview)
- [Documentação Completa](./WAN_25_MODEL_IMPLEMENTATION.md)
- [Fal.ai API Docs](https://fal.ai/docs)

## 🐛 Troubleshooting

### Modelo não aparece no dropdown

1. Verifique se o servidor foi reiniciado
2. Limpe o cache do navegador
3. Verifique o console para erros

### Erro ao gerar vídeo

1. Verifique se `FAL_API_KEY` está configurada
2. Verifique se `NEXT_PUBLIC_APP_URL` está configurada (para webhook)
3. Verifique os logs do servidor

### Vídeo não atualiza automaticamente

1. Verifique se o Supabase Realtime está configurado
2. Verifique se a migração de broadcast foi aplicada
3. Verifique o console do navegador para erros de websocket

## ✨ Próximos Passos

1. Teste o modelo na interface
2. Ajuste os preços se necessário
3. Documente exemplos de prompts efetivos
4. Compare qualidade com outros modelos

---

**Status**: ✅ Pronto para uso
**Data**: 2024-12-16
**Versão**: 1.0.0
