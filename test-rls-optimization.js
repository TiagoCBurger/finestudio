#!/usr/bin/env node

/**
 * Test script to verify RLS policy optimization
 * This script tests the optimized RLS policies before and after migration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSPolicies() {
  console.log('🧪 Testing RLS Policy Optimization\n');
  
  // Test 1: Check current policies
  console.log('📋 Step 1: Checking current policies...');
  const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        policyname,
        cmd,
        CASE 
          WHEN qual IS NOT NULL THEN 'SELECT'
          WHEN with_check IS NOT NULL THEN 'INSERT'
        END as policy_type,
        CASE
          WHEN qual LIKE '%~~%' OR with_check LIKE '%~~%' THEN 'LIKE operator (needs optimization)'
          WHEN qual LIKE '%~%' OR with_check LIKE '%~%' THEN 'Regex operator (optimized)'
          ELSE 'Unknown'
        END as pattern_type
      FROM pg_policies 
      WHERE tablename = 'messages' 
        AND schemaname = 'realtime'
        AND policyname LIKE '%project%'
      ORDER BY policyname;
    `
  });
  
  if (policiesError) {
    console.error('❌ Error checking policies:', policiesError.message);
  } else {
    console.log('✅ Current policies:');
    console.table(policies);
  }
  
  // Test 2: Check indexes
  console.log('\n📋 Step 2: Checking indexes...');
  const { data: indexes, error: indexesError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        indexname,
        indexdef,
        CASE
          WHEN indexdef LIKE '%USING gin%' THEN 'GIN (optimized for arrays)'
          WHEN indexdef LIKE '%USING btree%' THEN 'BTREE (standard)'
          ELSE 'Other'
        END as index_type
      FROM pg_indexes
      WHERE schemaname = 'public' 
        AND tablename = 'project'
        AND (indexname LIKE '%members%' OR indexname LIKE '%user_id%')
      ORDER BY indexname;
    `
  });
  
  if (indexesError) {
    console.error('❌ Error checking indexes:', indexesError.message);
  } else {
    console.log('✅ Current indexes:');
    console.table(indexes);
  }
  
  // Test 3: Test query performance
  console.log('\n📋 Step 3: Testing query performance...');
  const testProjectId = 'test-performance-id';
  const testUserId = 'test-user-id';
  
  const { data: explainData, error: explainError } = await supabase.rpc('exec_sql', {
    query: `
      EXPLAIN ANALYZE
      SELECT 1
      FROM project
      WHERE id = '${testProjectId}'
        AND (user_id = '${testUserId}' OR '${testUserId}' = ANY(members));
    `
  });
  
  if (explainError) {
    console.error('❌ Error running EXPLAIN ANALYZE:', explainError.message);
  } else {
    console.log('✅ Query execution plan:');
    explainData.forEach(row => console.log(row['QUERY PLAN']));
  }
  
  // Test 4: Verify regex patterns
  console.log('\n📋 Step 4: Testing regex patterns...');
  const testTopics = [
    'project:123e4567-e89b-12d3-a456-426614174000',
    'project:invalid-format',
    'project:',
    'other:123e4567-e89b-12d3-a456-426614174000'
  ];
  
  console.log('Testing topic patterns:');
  for (const topic of testTopics) {
    const { data: regexTest } = await supabase.rpc('exec_sql', {
      query: `SELECT '${topic}' ~ '^project:[a-f0-9-]+$' as matches_regex;`
    });
    const matches = regexTest?.[0]?.matches_regex;
    console.log(`  ${matches ? '✅' : '❌'} ${topic}: ${matches ? 'matches' : 'does not match'}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('1. Migration file created: supabase/migrations/20241219000001_optimize_rls_policies.sql');
  console.log('2. Optimizations included:');
  console.log('   - Removed unnecessary type casts');
  console.log('   - Changed LIKE (~~) to regex (~) for better pattern matching');
  console.log('   - Added GIN index for array operations');
  console.log('   - Consolidated duplicate policies');
  console.log('\n⚠️  Note: Migration needs to be applied to production database');
  console.log('   Run: supabase db push (or apply via Supabase dashboard)');
}

testRLSPolicies().catch(console.error);
