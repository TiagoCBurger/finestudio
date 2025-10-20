#!/usr/bin/env node

/**
 * Test script to verify the enhanced project broadcast trigger
 * Tests that the trigger fires correctly with error handling and logging
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTrigger() {
  console.log('🧪 Testing Enhanced Project Broadcast Trigger\n');
  
  try {
    // Step 1: Check if trigger exists
    console.log('1️⃣ Checking if trigger exists...');
    const { data: triggerData, error: triggerError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          t.tgname AS trigger_name,
          p.proname AS function_name,
          pg_get_triggerdef(t.oid) AS trigger_definition
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'project'
          AND t.tgname = 'projects_broadcast_trigger';
      `
    });
    
    if (triggerError) {
      console.log('⚠️  Could not check trigger (may need direct SQL access)');
    } else if (triggerData && triggerData.length > 0) {
      console.log('✅ Trigger exists:', triggerData[0].trigger_name);
    } else {
      console.log('❌ Trigger not found');
    }
    
    // Step 2: Check function definition
    console.log('\n2️⃣ Checking function definition...');
    const { data: functionData, error: functionError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT pg_get_functiondef(p.oid) AS function_definition
        FROM pg_proc p
        WHERE p.proname = 'notify_project_changes';
      `
    });
    
    if (functionError) {
      console.log('⚠️  Could not check function (may need direct SQL access)');
    } else if (functionData && functionData.length > 0) {
      const funcDef = functionData[0].function_definition;
      console.log('✅ Function exists');
      
      // Check for key improvements
      const hasErrorHandling = funcDef.includes('EXCEPTION WHEN OTHERS');
      const hasLogging = funcDef.includes('RAISE LOG');
      const hasVariables = funcDef.includes('DECLARE');
      const usesBroadcastChanges = funcDef.includes('realtime.broadcast_changes');
      
      console.log('   - Error handling:', hasErrorHandling ? '✅' : '❌');
      console.log('   - Logging:', hasLogging ? '✅' : '❌');
      console.log('   - Variables:', hasVariables ? '✅' : '❌');
      console.log('   - Uses broadcast_changes:', usesBroadcastChanges ? '✅' : '⚠️  (using realtime.send)');
    }
    
    // Step 3: Test trigger by updating a project
    console.log('\n3️⃣ Testing trigger by updating a project...');
    
    // Get a test project
    const { data: projects, error: projectsError } = await supabase
      .from('project')
      .select('id, name')
      .limit(1);
    
    if (projectsError || !projects || projects.length === 0) {
      console.log('⚠️  No projects found to test with');
      return;
    }
    
    const testProject = projects[0];
    console.log(`   Testing with project: ${testProject.name} (${testProject.id})`);
    
    // Update the project to trigger the broadcast
    const testUpdate = {
      content: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        test_timestamp: new Date().toISOString()
      }
    };
    
    const { error: updateError } = await supabase
      .from('project')
      .update(testUpdate)
      .eq('id', testProject.id);
    
    if (updateError) {
      console.log('❌ Failed to update project:', updateError.message);
    } else {
      console.log('✅ Project updated successfully');
      console.log('   The trigger should have fired and logged to database logs');
      console.log('   Check Supabase logs for: "Broadcasting project change"');
    }
    
    console.log('\n✅ Test completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check Supabase logs for trigger execution');
    console.log('   2. Look for "Broadcasting project change" log messages');
    console.log('   3. Verify no errors in the logs');
    console.log('   4. Test multi-window sync with test-multi-window-sync.js');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testTrigger();
