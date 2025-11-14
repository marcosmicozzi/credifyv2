const requiredEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

type RequiredEnvKey = (typeof requiredEnv)[number]

type EnvShape = Record<RequiredEnvKey, string> & {
  VITE_API_URL?: string
  [key: string]: string | undefined
}

function getEnv(): EnvShape {
  const env = import.meta.env as unknown as EnvShape

  const missing = requiredEnv.filter((key) => !env[key])

  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    throw new Error('Supabase configuration is incomplete')
  }

  // Note: VITE_API_URL is optional - will default to same origin in production
  // Only warn in production if not set, but don't throw (allows build to complete)
  const isProduction = import.meta.env.PROD

  if (isProduction && !env.VITE_API_URL) {
    console.warn('VITE_API_URL not set in production - will default to same origin')
  }

  return env
}

export const env = getEnv()

// In development, prefer localhost unless explicitly set
// In production, require VITE_API_URL to be set
export const apiBaseUrl = (() => {
  if (import.meta.env.DEV) {
    // Development: use localhost:3000 unless VITE_API_URL is explicitly set
    return env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  } else {
    // Production: use VITE_API_URL if set, otherwise same origin
    return env.VITE_API_URL?.replace(/\/$/, '') || window.location.origin.replace(/\/$/, '')
  }
})()

// Log API base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('[env] API base URL configured:', apiBaseUrl, {
    hasViteApiUrl: !!env.VITE_API_URL,
    viteApiUrl: env.VITE_API_URL,
    isDev: import.meta.env.DEV,
  })
}

