import type { User } from '@supabase/supabase-js'

declare global {
  namespace Express {
    type SupabaseSessionType = 'supabase' | 'demo'

    interface SupabaseAuthBaseContext {
      userId: string
      token: string
      sessionType: SupabaseSessionType
      isDemo: boolean
    }

    interface SupabaseUserAuthContext extends SupabaseAuthBaseContext {
      sessionType: 'supabase'
      isDemo: false
      user: User
    }

    interface DemoAuthUser {
      id: string
      email: string | null
      name?: string | null
    }

    interface DemoUserAuthContext extends SupabaseAuthBaseContext {
      sessionType: 'demo'
      isDemo: true
      user: DemoAuthUser
    }

    type SupabaseAuthContext = SupabaseUserAuthContext | DemoUserAuthContext

    // Extend Express Request object to include Supabase auth context populated by authenticate middleware
    interface Request {
      auth?: SupabaseAuthContext
    }
  }
}

export {}

