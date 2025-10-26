# 🚀 Comece Aqui - Teste Rápido V2

## ⚡ Setup Rápido (2 minutos)

### 1. Criar Feature Flag

```bash
cat > lib/feature-flags.ts << 'EOF'
/**
 * Feature flags para controlar rollout de novas funcionalidades
 */

export const USE_IMAGE_V2 = process.env.NEXT_PUBLIC_USE_IMAGE_V2 === 'true';
EOF
```

### 2. Atualizar Index do Nó de Imagem

```bash
# Backup do arquivo atual
cp components/nodes/image/index.tsx components/nodes/image/index.tsx.backup

# Adicionar import e condicional
cat > components/nodes/image/index.tsx << 'EOF'
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { USE_IMAGE_V2 } from '@/lib/feature-flags';
import { ImageTransform } from './transform';
import { ImageTransformV2 } from './transform.v2';

export type ImageNodeData = {
  instructions?: string;
  generated?: {
    url: string;
    type: string;
  };
  model?: string;
  size?: string;
  updatedAt?: string;
  // V2: Estado da máquina de estados
  state?: any;
};

export type ImageNodeProps = NodeProps<ImageNodeData>;

const ImageNodeComponent = (props: ImageNodeProps) => {
  const Component = USE_IMAGE_V2 ? ImageTransformV2 : ImageTransform;
  return <Component {...props} title="Image" />;
};

export const ImageNode = memo(ImageNodeComponent);
EOF
```

### 3. Ativar V2 e Rodar

```bash
# Ativar V2
export NEXT_PUBLIC_USE_IMAGE_V2=true

# Rodar dev server
npm run dev
```

## 🧪 Teste 1: Geração Simples (5 min)

### Passos:
1. Abrir http://localhost:3000
2. Criar novo projeto
3. Adicionar nó de **Text** (Shift+A → Text)
4. Escrever: "A beautiful sunset over mountains"
5. Adicionar nó de **Image** (Shift+A → Image)
6. Selecionar modelo: **🍌 Nano Banana (Kie.ai)**
7. Conectar Text → Image
8. Clicar no botão ▶️ (Play) no nó de imagem

### Verificar:
- ✅ Skeleton aparece imediatamente
- ✅ Job aparece na fila (ícone de lista no topo)
- ✅ Console mostra: `[KIE] Job submitted successfully`
- ✅ Após ~10-30s: imagem aparece
- ✅ Toast verde: "Image generated successfully"

### Logs Esperados:
```
🎨 [GenerateImageV2] Starting generation
✅ [GenerateImageV2] Provider selected: KIE
🚀 [KIE] Starting generation: mode=WEBHOOK
✅ [KIE] Job pre-created
✅ [KIE] Project updated with generating state
✅ [KIE] Job submitted to external API
✅ [GenerateImageV2] Generation completed: status=generating
```

## 🧪 Teste 2: Edit Mode (5 min)

### Passos:
1. Usar imagem gerada no Teste 1
2. Adicionar novo nó de **Image**
3. Selecionar modelo: **🍌 Nano Banana (Kie.ai)** (mesmo modelo)
4. Conectar Image (gerada) → Image (novo)
5. No novo nó, adicionar instruções: "Make it more vibrant and colorful"
6. Clicar ▶️

### Verificar:
- ✅ Mesmo fluxo do Teste 1
- ✅ Nova imagem é variação da original
- ✅ Console mostra: `hasImages: true, imageCount: 1`

## 🧪 Teste 3: Reload Durante Geração (3 min)

### Passos:
1. Iniciar geração (Teste 1 ou 2)
2. **Imediatamente** recarregar página (F5)
3. Aguardar

### Verificar:
- ✅ Após reload, skeleton ainda aparece
- ✅ Job ainda está na fila
- ✅ Quando webhook completa, imagem aparece normalmente
- ✅ Estado foi persistido no banco

## 🧪 Teste 4: Múltiplas Janelas (5 min)

### Passos:
1. Abrir projeto em 2 abas/janelas
2. Na janela 1: iniciar geração
3. Observar janela 2

### Verificar:
- ✅ Janela 2 atualiza automaticamente
- ✅ Ambas mostram skeleton
- ✅ Ambas mostram imagem quando pronta
- ✅ Realtime está funcionando

## 🐛 Troubleshooting

### Erro: "Cannot find module './transform.v2'"

```bash
# Verificar que arquivo existe
ls -la components/nodes/image/transform.v2.tsx

# Se não existir, foi um problema na criação
# Verificar todos os arquivos criados
```

### Erro: "getProviderByModelId is not a function"

```bash
# Verificar que arquivo existe
ls -la lib/models/image/provider-factory.ts

# Verificar import em create.v2.ts
grep "getProviderByModelId" app/actions/image/create.v2.ts
```

### Erro: "KIE requires webhook configuration"

```bash
# Verificar variável de ambiente
echo $NEXT_PUBLIC_APP_URL

# Se vazio, configurar
export NEXT_PUBLIC_APP_URL=http://localhost:3000

# Ou usar ngrok para webhook real
./scripts/tunnel-ngrok.sh
```

### Skeleton não aparece

```bash
# Verificar estado do nó no React DevTools
# Procurar por: data.state.status === 'generating'

# Verificar logs
# Procurar por: "Project updated with generating state"
```

### Imagem não aparece após webhook

```bash
# Verificar logs do webhook
# Terminal do servidor deve mostrar:
# 🔔 KIE.ai webhook received
# ✅ Webhook processed successfully
# ✅ Node state updated successfully

# Verificar Realtime
# Console do browser deve mostrar:
# 📡 Realtime update received
```

## 📊 Comparação V1 vs V2

### Console Logs

**V1 (Antigo):**
```
🔍 [ImageNode] State check: hasLoadingFlag=true
🔄 [ImageNode] Ativando loading state
⚠️ [ImageNode] Nó com status generating mas não está em loading!
🧹 [ImageNode] Limpando flags de loading obsoletas
```

**V2 (Novo):**
```
🎨 [GenerateImageV2] Starting generation
✅ [KIE] Job submitted successfully
🔔 Processing image webhook
✅ Webhook processed successfully
```

### Componente

**V1:** 700+ linhas, 5 estados locais, 3 useEffects complexos

**V2:** 350 linhas, 1 estado (do banco), 2 useEffects simples

## ✅ Checklist de Validação

Após rodar os 4 testes:

- [ ] Teste 1 passou (geração simples)
- [ ] Teste 2 passou (edit mode)
- [ ] Teste 3 passou (reload)
- [ ] Teste 4 passou (múltiplas janelas)
- [ ] Sem erros no console
- [ ] Sem warnings no console
- [ ] Toast sempre aparece
- [ ] Skeleton sempre aparece
- [ ] Imagem sempre carrega

## 🎯 Se Tudo Funcionou

**Parabéns! V2 está funcionando perfeitamente.**

### Próximos passos:

1. **Testar em staging:**
   ```bash
   npm run build
   npm start
   ```

2. **Deploy gradual:**
   - 10% dos usuários
   - Monitorar métricas
   - Aumentar para 50%
   - Aumentar para 100%

3. **Remover V1:**
   - Após 1 semana sem problemas
   - Remover feature flag
   - Deletar arquivos antigos

## 🎯 Se Algo Falhou

1. **Verificar logs** (acima)
2. **Verificar arquivos criados:**
   ```bash
   ls -la lib/models/image/types.ts
   ls -la lib/models/image/provider-base.ts
   ls -la lib/models/image/kie.server.v2.ts
   ls -la lib/models/image/provider-factory.ts
   ls -la lib/webhooks/image-webhook-handler.ts
   ls -la app/api/webhooks/kie/route.v2.ts
   ls -la components/nodes/image/transform.v2.tsx
   ls -la app/actions/image/create.v2.ts
   ```

3. **Desativar V2 e voltar para V1:**
   ```bash
   unset NEXT_PUBLIC_USE_IMAGE_V2
   npm run dev
   ```

4. **Reportar problema** com logs completos

## 📞 Comandos Úteis

```bash
# Ver logs do servidor em tempo real
npm run dev | grep -E "\[KIE\]|\[GenerateImageV2\]|webhook"

# Ver jobs no banco
psql $DATABASE_URL -c "SELECT id, status, model_id, created_at FROM fal_jobs ORDER BY created_at DESC LIMIT 5;"

# Ver projetos atualizados recentemente
psql $DATABASE_URL -c "SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC LIMIT 5;"

# Limpar jobs antigos (opcional)
psql $DATABASE_URL -c "DELETE FROM fal_jobs WHERE created_at < NOW() - INTERVAL '1 day';"
```

## 🎉 Pronto!

Você está pronto para testar o sistema V2 focado nos modelos **Nano Banana (KIE)**.

**Tempo estimado:** 20 minutos para todos os testes

**Dificuldade:** Fácil

**Risco:** Baixo (V1 continua funcionando)

---

**Dúvidas?** Consulte `GUIA_MIGRACAO_V2.md` para detalhes completos.
