import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(0).max(65535).default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_EMAIL_REDIRECT_URL: z.string().url().optional(),
  INSTAGRAM_CLIENT_ID: z.string().optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

