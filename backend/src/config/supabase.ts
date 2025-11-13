import { createClient } from '@supabase/supabase-js'

import { env } from './env.js'

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export const supabasePublic = env.SUPABASE_ANON_KEY
  ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    })
  : null

