import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from '../config/env.js'

export type UserScopedSupabaseClient = SupabaseClient

export function createSupabaseUserClient(accessToken: string): UserScopedSupabaseClient {
  if (!env.SUPABASE_ANON_KEY) {
    const error = new Error('SUPABASE_ANON_KEY is required to create a user-scoped Supabase client.')
    error.name = 'ConfigurationError'
    ;(error as { status?: number }).status = 500
    throw error
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}


