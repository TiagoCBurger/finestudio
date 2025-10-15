// Debug das variáveis de ambiente
console.log('=== DEBUG ENVIRONMENT VARIABLES ===');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'POSTGRES_URL',
  'FAL_API_KEY'
];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}:`, value ? '✅ SET' : '❌ MISSING');
  if (value) {
    console.log(`  Length: ${value.length}`);
    console.log(`  Starts with: ${value.substring(0, 20)}...`);
  }
  console.log('');
});

console.log('=== TESTING SUPABASE CONNECTION ===');

try {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');
    
    // Teste simples
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.log('⚠️ Auth test (expected):', error.message);
      } else {
        console.log('✅ Auth connection working');
      }
    });
  } else {
    console.log('❌ Missing Supabase credentials');
  }
} catch (error) {
  console.log('❌ Error creating Supabase client:', error.message);
}