#!/usr/bin/env node

/**
 * Comprehensive Realtime Diagnostic Tool
 * Tests all components of the Supabase Realtime system
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_USER_EMAIL
const testPassword = process.env.TEST_USER_PASSWORD

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

class DiagnosticResult {
  constructor(component, status, message, details = {}) {
    this.component = component
    this.status = status // 'pass', 'fail', 'warning'
    this.message = message
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

class RealtimeDiagnostics {
  constructor() {
    this.results = []
    this.supabase = null
    this.testProjectId = null
    this.userId = null
  }

  log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60))
    this.log(title, colors.bright + colors.cyan)
    console.log('='.repeat(60))
  }

  addResult(component, status, message, details = {}) {
    const result = new DiagnosticResult(component, status, message, details)
    this.results.push(result)
    
    const statusColor = status === 'pass' ? colors.green : 
                       status === 'fail' ? colors.red : colors.yellow
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
    
    this.log(`${icon} ${component}: ${message}`, statusColor)
    if (Object.keys(details).length > 0) {
      console.log('   Details:', JSON.stringify(details, null, 2))
    }
  }

  async checkEnvironment() {
    this.logSection('1. Environment Configuration')
    
    if (!supabaseUrl) {
      this.addResult('Environment', 'fail', 'NEXT_PUBLIC_SUPABASE_URL not set')
      return false
    }
    this.addResult('Environment', 'pass', 'Supabase URL configured', { url: supabaseUrl })

    if (!supabaseAnonKey) {
      this.addResult('Environment', 'fail', 'NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
      return false
    }
    this.addResult('Environment', 'pass', 'Supabase Anon Key configured')

    if (!testEmail || !testPassword) {
      this.addResult('Environment', 'warning', 'Test credentials not set (TEST_USER_EMAIL, TEST_USER_PASSWORD)')
      return false
    }
    this.addResult('Environment', 'pass', 'Test credentials configured', { email: testEmail })

    return true
  }

  async authenticate() {
    this.logSection('2. Authentication')
    
    try {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      })

      if (error) {
        this.addResult('Authentication', 'fail', 'Login failed', { error: error.message })
        return false
      }

      this.userId = data.user.id
      this.addResult('Authentication', 'pass', 'Successfully authenticated', { 
        userId: this.userId,
        email: data.user.email 
      })

      // Test setAuth for realtime
      await this.supabase.realtime.setAuth(data.session.access_token)
      this.addResult('Authentication', 'pass', 'Realtime auth token set')

      return true
    } catch (error) {
      this.addResult('Authentication', 'fail', 'Authentication error', { error: error.message })
      return false
    }
  }

  async checkDatabaseTrigger() {
    this.logSection('3. Database Trigger')
    
    try {
      // Check if trigger exists
      const { data: triggers, error: triggerError } = await this.supabase
        .rpc('check_trigger_exists', { 
          trigger_name: 'projects_broadcast_trigger',
          table_name: 'project'
        })
        .catch(() => ({ data: null, error: null }))

      // If RPC doesn't exist, try direct query
      const { data: triggerData, error } = await this.supabase
        .from('pg_trigger')
        .select('tgname, tgrelid')
        .eq('tgname', 'projects_broadcast_trigger')
        .single()
        .catch(async () => {
          // Fallback: check via SQL query
          const { data, error } = await this.supabase.rpc('exec_sql', {
            query: `
              SELECT tgname, tgrelid::regclass::text as table_name
              FROM pg_trigger
              WHERE tgname = 'projects_broadcast_trigger'
            `
          }).catch(() => ({ data: null, error: null }))
          
          return { data, error }
        })

      if (triggerData || triggers) {
        this.addResult('Database Trigger', 'pass', 'Trigger exists', { 
          name: 'projects_broadcast_trigger',
          table: triggerData?.table_name || 'project'
        })
      } else {
        this.addResult('Database Trigger', 'warning', 'Could not verify trigger existence (may need elevated permissions)')
      }

      // Check if trigger function exists
      const { data: functionData, error: funcError } = await this.supabase
        .rpc('exec_sql', {
          query: `
            SELECT proname, prosrc
            FROM pg_proc
            WHERE proname = 'notify_project_changes'
          `
        })
        .catch(() => ({ data: null, error: null }))

      if (functionData && functionData.length > 0) {
        this.addResult('Database Trigger', 'pass', 'Trigger function exists', { 
          function: 'notify_project_changes'
        })
      } else {
        this.addResult('Database Trigger', 'warning', 'Could not verify trigger function (may need elevated permissions)')
      }

      return true
    } catch (error) {
      this.addResult('Database Trigger', 'warning', 'Could not fully verify trigger', { 
        error: error.message,
        note: 'This may require elevated database permissions'
      })
      return true // Don't fail the entire diagnostic
    }
  }

  async checkRLSPolicies() {
    this.logSection('4. RLS Policies')
    
    try {
      // Check if we can query realtime.messages (tests RLS)
      const { data, error } = await this.supabase
        .from('realtime.messages')
        .select('*')
        .limit(1)
        .catch(() => ({ data: null, error: { message: 'Table not accessible' } }))

      if (error && error.message.includes('permission denied')) {
        this.addResult('RLS Policies', 'fail', 'Cannot access realtime.messages table', { 
          error: error.message,
          hint: 'Check if SELECT policy exists for authenticated users'
        })
        return false
      }

      this.addResult('RLS Policies', 'pass', 'Can query realtime.messages table')

      // Try to check policy existence (may require elevated permissions)
      const { data: policies, error: policyError } = await this.supabase
        .rpc('exec_sql', {
          query: `
            SELECT polname, polcmd
            FROM pg_policy
            WHERE polrelid = 'realtime.messages'::regclass
            AND polname LIKE '%project%'
          `
        })
        .catch(() => ({ data: null, error: null }))

      if (policies && policies.length > 0) {
        this.addResult('RLS Policies', 'pass', 'Project-related policies found', { 
          count: policies.length,
          policies: policies.map(p => p.polname)
        })
      } else {
        this.addResult('RLS Policies', 'warning', 'Could not verify specific policies (may need elevated permissions)')
      }

      return true
    } catch (error) {
      this.addResult('RLS Policies', 'warning', 'Could not fully verify RLS policies', { 
        error: error.message 
      })
      return true
    }
  }

  async getOrCreateTestProject() {
    this.logSection('5. Test Project Setup')
    
    try {
      // Try to find an existing project
      const { data: projects, error: fetchError } = await this.supabase
        .from('project')
        .select('id, name')
        .eq('user_id', this.userId)
        .limit(1)

      if (fetchError) {
        this.addResult('Test Project', 'fail', 'Cannot query projects table', { 
          error: fetchError.message 
        })
        return null
      }

      if (projects && projects.length > 0) {
        this.testProjectId = projects[0].id
        this.addResult('Test Project', 'pass', 'Using existing project', { 
          projectId: this.testProjectId,
          name: projects[0].name
        })
        return this.testProjectId
      }

      // Create a test project
      const { data: newProject, error: createError } = await this.supabase
        .from('project')
        .insert({
          name: 'Diagnostic Test Project',
          content: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          user_id: this.userId
        })
        .select()
        .single()

      if (createError) {
        this.addResult('Test Project', 'fail', 'Cannot create test project', { 
          error: createError.message 
        })
        return null
      }

      this.testProjectId = newProject.id
      this.addResult('Test Project', 'pass', 'Created test project', { 
        projectId: this.testProjectId 
      })
      return this.testProjectId
    } catch (error) {
      this.addResult('Test Project', 'fail', 'Error setting up test project', { 
        error: error.message 
      })
      return null
    }
  }

  async testBroadcastFlow() {
    this.logSection('6. Broadcast Flow Test')
    
    if (!this.testProjectId) {
      this.addResult('Broadcast Flow', 'fail', 'No test project available')
      return false
    }

    return new Promise(async (resolve) => {
      let broadcastReceived = false
      let subscriptionStatus = null
      const timeout = 10000 // 10 seconds

      try {
        // Create channel
        const channel = this.supabase.channel(`project:${this.testProjectId}`, {
          config: {
            broadcast: { self: false, ack: true },
            private: true
          }
        })

        this.addResult('Broadcast Flow', 'pass', 'Channel created', { 
          topic: `project:${this.testProjectId}` 
        })

        // Set up broadcast listener
        channel.on('broadcast', { event: 'project_updated' }, (payload) => {
          broadcastReceived = true
          this.addResult('Broadcast Flow', 'pass', 'Broadcast received!', { 
            payload: payload,
            latency: Date.now() - updateTime
          })
        })

        // Subscribe
        channel.subscribe(async (status, err) => {
          subscriptionStatus = status
          
          if (status === 'SUBSCRIBED') {
            this.addResult('Broadcast Flow', 'pass', 'Successfully subscribed to channel')
            
            // Wait a bit for subscription to be fully ready
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Trigger an update
            this.log('\n   Triggering database update...', colors.blue)
            const updateTime = Date.now()
            
            const { error: updateError } = await this.supabase
              .from('project')
              .update({ 
                content: { 
                  nodes: [{ id: 'test-node', type: 'text', position: { x: 100, y: 100 } }],
                  edges: [],
                  viewport: { x: 0, y: 0, zoom: 1 }
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', this.testProjectId)

            if (updateError) {
              this.addResult('Broadcast Flow', 'fail', 'Failed to update project', { 
                error: updateError.message 
              })
              await this.supabase.removeChannel(channel)
              resolve(false)
              return
            }

            this.addResult('Broadcast Flow', 'pass', 'Project updated in database')
            
            // Wait for broadcast
            setTimeout(async () => {
              if (!broadcastReceived) {
                this.addResult('Broadcast Flow', 'fail', 'No broadcast received within timeout', {
                  timeout: `${timeout}ms`,
                  hint: 'Check if trigger is firing and RLS policies allow broadcast delivery'
                })
              }
              await this.supabase.removeChannel(channel)
              resolve(broadcastReceived)
            }, timeout - 1000)
            
          } else if (status === 'CHANNEL_ERROR') {
            this.addResult('Broadcast Flow', 'fail', 'Channel error', { 
              error: err?.message,
              hint: 'Check RLS policies and authentication'
            })
            await this.supabase.removeChannel(channel)
            resolve(false)
          } else if (status === 'TIMED_OUT') {
            this.addResult('Broadcast Flow', 'fail', 'Subscription timed out')
            await this.supabase.removeChannel(channel)
            resolve(false)
          }
        })

      } catch (error) {
        this.addResult('Broadcast Flow', 'fail', 'Error in broadcast flow test', { 
          error: error.message 
        })
        resolve(false)
      }
    })
  }

  async testMultipleChannels() {
    this.logSection('7. Multiple Channel Test')
    
    if (!this.testProjectId) {
      this.addResult('Multiple Channels', 'fail', 'No test project available')
      return false
    }

    try {
      const channel1 = this.supabase.channel(`project:${this.testProjectId}:window1`, {
        config: { private: true }
      })

      const channel2 = this.supabase.channel(`project:${this.testProjectId}:window2`, {
        config: { private: true }
      })

      await new Promise((resolve) => {
        let subscribed = 0
        
        channel1.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            subscribed++
            if (subscribed === 2) resolve()
          }
        })

        channel2.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            subscribed++
            if (subscribed === 2) resolve()
          }
        })
      })

      this.addResult('Multiple Channels', 'pass', 'Multiple channels can be created and subscribed')

      await this.supabase.removeChannel(channel1)
      await this.supabase.removeChannel(channel2)

      return true
    } catch (error) {
      this.addResult('Multiple Channels', 'fail', 'Error testing multiple channels', { 
        error: error.message 
      })
      return false
    }
  }

  generateReport() {
    this.logSection('Diagnostic Report')
    
    const passed = this.results.filter(r => r.status === 'pass').length
    const failed = this.results.filter(r => r.status === 'fail').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const total = this.results.length

    this.log(`\nTotal Tests: ${total}`, colors.bright)
    this.log(`Passed: ${passed}`, colors.green)
    this.log(`Failed: ${failed}`, colors.red)
    this.log(`Warnings: ${warnings}`, colors.yellow)

    const successRate = ((passed / total) * 100).toFixed(1)
    this.log(`\nSuccess Rate: ${successRate}%`, colors.bright)

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        warnings,
        successRate: parseFloat(successRate)
      },
      results: this.results
    }

    return report
  }

  async run() {
    this.log('\n🔍 Starting Realtime Diagnostics...', colors.bright + colors.cyan)
    
    const hasEnv = await this.checkEnvironment()
    if (!hasEnv) {
      this.log('\n❌ Cannot proceed without proper environment configuration', colors.red)
      return this.generateReport()
    }

    const authenticated = await this.authenticate()
    if (!authenticated) {
      this.log('\n❌ Cannot proceed without authentication', colors.red)
      return this.generateReport()
    }

    await this.checkDatabaseTrigger()
    await this.checkRLSPolicies()
    await this.getOrCreateTestProject()
    await this.testBroadcastFlow()
    await this.testMultipleChannels()

    return this.generateReport()
  }
}

// Run diagnostics
const diagnostics = new RealtimeDiagnostics()
const report = await diagnostics.run()

// Save report to file
import { writeFileSync } from 'fs'
const reportPath = 'realtime-diagnostic-report.json'
writeFileSync(reportPath, JSON.stringify(report, null, 2))

console.log(`\n📄 Full report saved to: ${reportPath}`)

// Exit with appropriate code
const hasFailed = report.results.some(r => r.status === 'fail')
process.exit(hasFailed ? 1 : 0)
