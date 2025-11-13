import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(0).max(65535).default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),
  DEMO_USER_ID: z.string().uuid('DEMO_USER_ID must be a valid UUID'),
  DEMO_USER_EMAIL: z.string().email('DEMO_USER_EMAIL must be a valid email address'),
  DEMO_USER_NAME: z.string().min(1).default('Credify Demo User'),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  INSTAGRAM_GRAPH_API_BASE: z.string().url().default('https://graph.facebook.com/v21.0'),
  INSTAGRAM_REQUIRED_SCOPES: z.string().default('instagram_basic,instagram_manage_insights,instagram_manage_comments,pages_show_list,pages_read_engagement,business_management'),
  YOUTUBE_API_KEY: z.string().min(1, 'YOUTUBE_API_KEY is required for YouTube credits functionality'),
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required for cron-based sync endpoints'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

