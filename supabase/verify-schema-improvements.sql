-- Script de Verificação: Melhorias no Schema do Banco de Dados
-- Execute este script para verificar o estado atual antes de aplicar as melhorias

-- ============================================================================
-- ANÁLISE DO ESTADO ATUAL
-- ============================================================================

-- 1. Verificar estrutura da tabela project
SELECT 
  '=== ESTRUTURA DA TABELA PROJECT ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project'
ORDER BY ordinal_position;

-- 2. Verificar uso das colunas vision_model e transcription_model
SELECT 
  '=== USO DE VISION_MODEL ===' as info;

SELECT 
  vision_model,
  COUNT(*) as count
FROM project
GROUP BY vision_model;

SELECT 
  '=== USO DE TRANSCRIPTION_MODEL ===' as info;

SELECT 
  transcription_model,
  COUNT(*) as count
FROM project
GROUP BY transcription_model;

-- 3. Verificar estado do campo members
SELECT 
  '=== ESTADO DO CAMPO MEMBERS ===' as info;

SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN members IS NULL THEN 1 END) as projects_without_members,
  COUNT(CASE WHEN members IS NOT NULL AND NOT (user_id = ANY(members)) THEN 1 END) as projects_user_not_in_members
FROM project;

-- 4. Verificar projetos específicos
SELECT 
  '=== PROJETOS E SEUS MEMBROS ===' as info;

SELECT 
  id,
  name,
  user_id,
  members,
  CASE 
    WHEN members IS NULL THEN '❌ NULL'
    WHEN user_id = ANY(members) THEN '✅ Owner in members'
    ELSE '⚠️ Owner NOT in members'
  END as status
FROM project
ORDER BY created_at DESC;

-- 5. Verificar constraints existentes
SELECT 
  '=== CONSTRAINTS EXISTENTES ===' as info;

SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'project';

-- 6. Verificar foreign keys
SELECT 
  '=== FOREIGN KEYS ===' as info;

SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'project';

-- 7. Verificar índices
SELECT 
  '=== ÍNDICES ===' as info;

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'project';

-- ============================================================================
-- RESUMO E RECOMENDAÇÕES
-- ============================================================================

SELECT 
  '=== RESUMO ===' as info;

SELECT 
  'Total de projetos' as metric,
  COUNT(*)::text as value
FROM project
UNION ALL
SELECT 
  'Projetos sem members',
  COUNT(*)::text
FROM project
WHERE members IS NULL
UNION ALL
SELECT 
  'Projetos com owner fora de members',
  COUNT(*)::text
FROM project
WHERE members IS NOT NULL AND NOT (user_id = ANY(members))
UNION ALL
SELECT 
  'Valores únicos de vision_model',
  COUNT(DISTINCT vision_model)::text
FROM project
UNION ALL
SELECT 
  'Valores únicos de transcription_model',
  COUNT(DISTINCT transcription_model)::text
FROM project;
