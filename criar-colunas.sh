#!/bin/bash

# ============================================
# Script para criar colunas via API
# ============================================

# CONFIGURAÇÃO - Substitua com seus valores
API_URL="https://sua-api.com/endpoint"
TOKEN="seu_token_aqui"

# Declarar array associativo com as colunas
declare -A COLUMNS
COLUMNS=(
  ["nome"]="text"
  ["email"]="text"
  ["telefone"]="text"
  ["data_submissao"]="text"
  ["user_agent"]="text"
  ["ip_address"]="text"
)

echo "🚀 Iniciando criação de colunas..."
echo "📍 API: $API_URL"
echo ""

# Iterar sobre as chaves do array
for NAME in "${!COLUMNS[@]}"; do
  TYPE=${COLUMNS[$NAME]}
  echo "🔧 Criando coluna: $NAME ($TYPE)..."
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL" \
    -H "Authorization: Token $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$NAME\", \"type\": \"$TYPE\"}")
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "   ✅ Status: $HTTP_CODE - Sucesso"
  else
    echo "   ❌ Status: $HTTP_CODE - Erro"
  fi
  echo ""
done

echo "✅ Processo concluído!"
