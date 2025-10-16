#!/bin/bash

# Script para aplicar todas as migrations do Supabase
# Uso: ./supabase/apply-migrations.sh

echo "🚀 Aplicando migrations do Supabase..."
echo ""

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado!"
    echo "Instale com: brew install supabase/tap/supabase"
    exit 1
fi

# Verificar se está linkado a um projeto
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "❌ Projeto não está linkado!"
    echo "Execute: supabase link --project-ref <seu-project-ref>"
    exit 1
fi

# Aplicar migrations
echo "📦 Aplicando migrations..."
supabase db push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations aplicadas com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Verifique se a tabela fal_jobs foi criada"
    echo "2. Verifique se o Realtime está habilitado para 'project'"
    echo "3. Teste gerando uma imagem no app"
else
    echo ""
    echo "❌ Erro ao aplicar migrations!"
    echo "Verifique os logs acima para mais detalhes"
    exit 1
fi
