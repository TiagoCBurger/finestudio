# Como Ver o Modelo KIE Nano Banana

## ✅ Status Atual

O modelo `kie-nano-banana` está **corretamente configurado** no código:
- ✅ Definido em `lib/models/image/index.ts`
- ✅ Label: "🍌 Nano Banana (Kie.ai)"
- ✅ Provider: `providers.kie`
- ✅ Enabled: `true`

## 🔧 Passos para Ver o Modelo

### 1. Reiniciar o Servidor Next.js

No terminal onde o servidor está rodando:
```bash
# Parar o servidor (Ctrl+C)
# Depois iniciar novamente:
npm run dev
```

### 2. Hard Refresh no Navegador

**Mac:** `Cmd + Shift + R`
**Windows/Linux:** `Ctrl + Shift + R`

Isso limpa o cache do navegador e força o reload completo.

### 3. Abrir o DevTools

Pressione `F12` ou:
- **Mac:** `Cmd + Option + I`
- **Windows/Linux:** `Ctrl + Shift + I`

### 4. Ir para a Aba Console

No DevTools, clique na aba **Console** (não a aba do terminal do servidor!)

### 5. Clicar em um Nó de Imagem

No canvas, clique em qualquer nó de imagem (ou crie um novo).

### 6. Clicar no Seletor de Modelo

Clique no botão que mostra o modelo atual (ex: "FLUX Dev Image-to-Image").

### 7. Verificar os Logs

No console do navegador, você deverá ver:

```
[getEnabledImageModels] fal-nano-banana: { label: "🍌 Nano Banana (Fal)", chef: "fal", ... }
[getEnabledImageModels] kie-nano-banana: { label: "🍌 Nano Banana (Kie.ai)", chef: "kie", ... }
[getEnabledImageModels] Total enabled: X
[getEnabledImageModels] Keys: [..., "fal-nano-banana", "kie-nano-banana", ...]

[ModelSelector] fal-nano-banana: { label: "🍌 Nano Banana (Fal)", ... }
[ModelSelector] kie-nano-banana: { label: "🍌 Nano Banana (Kie.ai)", ... }
[ModelSelector] Total enabled options: X
[ModelSelector] Keys: [..., "fal-nano-banana", "kie-nano-banana", ...]
```

## 🎯 Resultado Esperado

Você deverá ver **DOIS** modelos Nano Banana na lista:

### Grupo "Fal"
- 🍌 **Nano Banana (Fal)** - 2 créditos

### Grupo "Kie.ai"
- 🍌 **Nano Banana (Kie.ai)** - 0.03 créditos

## ❓ Se Ainda Não Aparecer

### Verificar se há erros no console
Procure por mensagens de erro em vermelho no console do navegador.

### Verificar se o build foi bem-sucedido
No terminal do servidor, verifique se não há erros de compilação.

### Limpar cache do Next.js
```bash
rm -rf .next
npm run dev
```

### Verificar se o arquivo foi salvo
Certifique-se de que todas as mudanças em `lib/models/image/index.ts` foram salvas.

## 🐛 Debug Adicional

Se o modelo ainda não aparecer, tire um screenshot do console do navegador mostrando:
1. Os logs `[getEnabledImageModels]`
2. Os logs `[ModelSelector]`
3. Qualquer erro em vermelho

Isso ajudará a identificar exatamente onde o modelo está sendo filtrado.
