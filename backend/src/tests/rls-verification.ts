/**
 * RLS Policy Verification Script
 *
 * This script verifies that Row Level Security policies are working correctly.
 * It should be run manually or as part of CI/CD to ensure data isolation.
 *
 * Usage:
 *   NODE_ENV=test tsx src/tests/rls-verification.ts
 *
 * Requirements:
 *   - Two test users in Supabase auth (user1@test.com, user2@test.com)
 *   - Test data in public.users, user_projects, projects, etc.
 *   - SUPABASE_SERVICE_ROLE_KEY set in environment
 */

import { createClient } from '@supabase/supabase-js'

import { env } from '../config/env.js'
import { supabaseAdmin } from '../config/supabase.js'

type TestResult = {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function recordTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error })
  const status = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${status}: ${name}${error ? ` - ${error}` : ''}`)
}

async function testRLSPolicy(
  testName: string,
  client: ReturnType<typeof createClient>,
  table: string,
  operation: 'select' | 'insert' | 'update' | 'delete',
  expectedResult: 'success' | 'failure',
  queryFn: (client: ReturnType<typeof createClient>) => Promise<unknown>,
) {
  try {
    await queryFn(client)
    const passed = expectedResult === 'success'
    if (!passed) {
      recordTest(
        testName,
        false,
        `Expected ${expectedResult} but operation succeeded. RLS policy may be too permissive.`,
      )
    } else {
      recordTest(testName, true)
    }
  } catch (error) {
    const passed = expectedResult === 'failure'
    if (!passed) {
      recordTest(
        testName,
        false,
        `Expected ${expectedResult} but operation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } else {
      recordTest(testName, true)
    }
  }
}

async function runRLSVerification() {
  console.log('🔒 Starting RLS Policy Verification\n')

  if (!supabaseAdmin) {
    console.error('❌ Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }

  // Create test user clients (these would need real auth tokens in practice)
  // For this script, we'll use the admin client to simulate user contexts
  // In a real test, you'd create actual Supabase auth users and get their tokens

  console.log('⚠️  Note: This is a basic verification script.')
  console.log('   For comprehensive testing, create real Supabase auth users and test with their tokens.\n')

  // Test 1: Service role can access all data
  console.log('Test 1: Service role access')
  await testRLSPolicy(
    'Service role can read users table',
    supabaseAdmin,
    'users',
    'select',
    'success',
    async (client) => {
      const { error } = await client.from('users').select('*').limit(1)
      if (error) throw error
    },
  )

  // Test 2: Users table RLS
  console.log('\nTest 2: Users table RLS')
  // Note: To properly test user-scoped access, you'd need actual user tokens
  // This is a placeholder showing the test structure
  recordTest(
    'Users can only read their own profile (requires user token)',
    false,
    'Manual test required: Create user token and verify RLS',
  )

  // Test 3: Projects table RLS
  console.log('\nTest 3: Projects table RLS')
  await testRLSPolicy(
    'Service role can read projects',
    supabaseAdmin,
    'projects',
    'select',
    'success',
    async (client) => {
      const { error } = await client.from('projects').select('*').limit(1)
      if (error) throw error
    },
  )

  recordTest(
    'Users can only read projects they are assigned to (requires user token)',
    false,
    'Manual test required: Create user token and verify RLS',
  )

  // Test 4: User projects RLS
  console.log('\nTest 4: User projects RLS')
  await testRLSPolicy(
    'Service role can read user_projects',
    supabaseAdmin,
    'user_projects',
    'select',
    'success',
    async (client) => {
      const { error } = await client.from('user_projects').select('*').limit(1)
      if (error) throw error
    },
  )

  // Test 5: Metrics tables RLS
  console.log('\nTest 5: Metrics tables RLS')
  await testRLSPolicy(
    'Service role can read youtube_metrics',
    supabaseAdmin,
    'youtube_metrics',
    'select',
    'success',
    async (client) => {
      const { error } = await client.from('youtube_metrics').select('*').limit(1)
      if (error) throw error
    },
  )

  await testRLSPolicy(
    'Service role can read instagram_metrics',
    supabaseAdmin,
    'instagram_metrics',
    'select',
    'success',
    async (client) => {
      const { error } = await client.from('instagram_metrics').select('*').limit(1)
      if (error) throw error
    },
  )

  await testRLSPolicy(
    'Service role can read user_metrics',
    supabaseAdmin,
    'user_metrics',
    'select',
    'success',
    async (client) => {
      const { error } = await client.from('user_metrics').select('*').limit(1)
      if (error) throw error
    },
  )

  // Test 6: Write operations restricted to service role
  console.log('\nTest 6: Write operation restrictions')
  recordTest(
    'Users cannot directly insert/update/delete projects (requires user token)',
    false,
    'Manual test required: Verify RLS policies prevent user writes',
  )

  recordTest(
    'Users cannot directly insert/update/delete user_projects (requires user token)',
    false,
    'Manual test required: Verify RLS policies prevent user writes',
  )

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Summary')
  console.log('='.repeat(60))
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`Total tests: ${results.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n⚠️  Some tests require manual verification with actual user tokens.')
    console.log('   To fully test RLS policies:')
    console.log('   1. Create test users in Supabase auth')
    console.log('   2. Get their access tokens')
    console.log('   3. Create user-scoped Supabase clients with those tokens')
    console.log('   4. Verify they can only access their own data')
  }

  process.exit(failed > 0 ? 1 : 0)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void runRLSVerification()
}

export { runRLSVerification }

