import { createClient } from '@supabase/supabase-js'

import { env } from './env'

export const supabaseClient = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'credify-supabase-auth',
    autoRefreshToken: true,
    persistSession: true,
  },
})

