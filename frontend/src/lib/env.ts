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

  const isProduction = import.meta.env.PROD

  if (isProduction && !env.VITE_API_URL) {
    console.error('Missing required environment variable: VITE_API_URL')
    throw new Error('API configuration is incomplete')
  }

  return env
}

export const env = getEnv()

export const apiBaseUrl =
  env.VITE_API_URL?.replace(/\/$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:3000' : `${window.location.origin.replace(/\/$/, '')}`)

