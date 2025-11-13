import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middleware/authenticate.js'
import { createSupabaseUserClient } from '../services/supabaseUserClient.js'

const rolesRouter = Router()

const roleRowSchema = z.object({
  role_id: z.number(),
  role_name: z.string(),
  category: z.string().nullable(),
})

const roleListSchema = z.array(roleRowSchema)

rolesRouter.use(authenticate)

rolesRouter.get('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const supabase = createSupabaseUserClient(req.auth.token)

    const { data, error } = await supabase
      .from('roles')
      .select('role_id, role_name, category')
      .order('category', { ascending: true })
      .order('role_name', { ascending: true })

    if (error) {
      const wrapped = new Error(`Failed to load roles: ${error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = error
      throw wrapped
    }

    const parsed = roleListSchema.safeParse(data)

    if (!parsed.success) {
      const error = new Error('Invalid role data received from Supabase.')
      error.name = 'SupabaseDataValidationError'
      ;(error as { details?: unknown }).details = parsed.error.flatten()
      throw error
    }

    // Transform snake_case to camelCase for frontend
    const roles = parsed.data.map((role) => ({
      roleId: role.role_id,
      roleName: role.role_name,
      category: role.category,
    }))

    res.json({ roles })
  } catch (error) {
    next(error)
  }
})

export { rolesRouter }

