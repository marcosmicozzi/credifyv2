const requiredEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

type RequiredEnvKey = (typeof requiredEnv)[number]

type EnvShape = Record<RequiredEnvKey, string> & {
  VITE_API_URL?: string
  [key: string]: string | undefined
}

function getEnv(): EnvShape {
  const env = import.meta.env as EnvShape

  const missing = requiredEnv.filter((key) => !env[key])

  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    throw new Error('Supabase configuration is incomplete')
  }

  return env
}

export const env = getEnv()

export const apiBaseUrl =
  env.VITE_API_URL?.replace(/\/$/, '') || `${window.location.origin.replace(/\/$/, '')}`

