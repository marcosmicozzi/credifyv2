import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middleware/authenticate.js'
import { supabaseAdmin } from '../config/supabase.js'
import { createSupabaseUserClient } from '../services/supabaseUserClient.js'

const usersRouter = Router()

usersRouter.use(authenticate)

// Test endpoint to verify route registration
usersRouter.get('/me/test', (_req, res) => {
  console.log('[GET /api/users/me/test] Test endpoint hit')
  res.json({ message: 'Route registration test - /me routes are accessible' })
})

// Get current user's profile (must be before /:userId route)
usersRouter.get('/me', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const supabase = createSupabaseUserClient(req.auth.token)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('u_id, u_email, u_name, u_created_at')
      .eq('u_id', req.auth.userId)
      .maybeSingle()

    if (userError || !userData) {
      res.status(404).json({
        error: 'UserNotFound',
        message: 'User not found.',
      })
      return
    }

    res.json({
      user: {
        id: userData.u_id,
        email: userData.u_email,
        name: userData.u_name,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Update current user's display name (must be before /:userId route)
usersRouter.patch('/me', async (req, res, next) => {
  // Log immediately when route is hit
  console.log('='.repeat(50))
  console.log('[PATCH /api/users/me] Route handler called')
  console.log('Request method:', req.method)
  console.log('Request path:', req.path)
  console.log('Request URL:', req.url)
  console.log('Request body:', req.body)
  console.log('Has auth:', !!req.auth)
  console.log('='.repeat(50))
  
  try {

    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const bodySchema = z.object({
      name: z.union([z.string().min(1).max(100), z.null()]),
    })

    const { name } = bodySchema.parse(req.body)
    console.log('[PATCH /api/users/me] Parsed name:', name)

    if (!supabaseAdmin) {
      const error = new Error('Supabase admin client is not configured.')
      error.name = 'ConfigurationError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        u_name: name,
      })
      .eq('u_id', req.auth.userId)
      .select('u_id, u_email, u_name, u_created_at')
      .single()

    if (updateError) {
      console.error('[PATCH /api/users/me] Supabase update error:', updateError)
      const wrapped = new Error(`Failed to update display name: ${updateError.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = updateError
      throw wrapped
    }

    console.log('[PATCH /api/users/me] Successfully updated user:', updatedUser.u_id, 'name:', updatedUser.u_name)

    res.json({
      user: {
        id: updatedUser.u_id,
        email: updatedUser.u_email,
        name: updatedUser.u_name,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid display name.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

// Search users
usersRouter.get('/search', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const querySchema = z.object({
      q: z.string().min(1).max(100),
    })

    const { q } = querySchema.parse(req.query)

    const supabase = createSupabaseUserClient(req.auth.token)

    // Search users by name or email (case-insensitive)
    const { data, error } = await supabase
      .from('users')
      .select('u_id, u_email, u_name, profile_image_url')
      .or(`u_name.ilike.%${q}%,u_email.ilike.%${q}%`)
      .limit(20)

    if (error) {
      const wrapped = new Error(`Failed to search users: ${error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = error
      throw wrapped
    }

    // Get main role for each user (most common role from their projects)
    const userIds = data?.map((u) => u.u_id) ?? []
    let userRoles: Record<string, string | null> = {}

    if (userIds.length > 0) {
      const { data: roleData } = await supabase
        .from('user_projects')
        .select('u_id, roles(role_name)')
        .in('u_id', userIds)
        .not('role_id', 'is', null)

      if (roleData) {
        const roleCounts: Record<string, Record<string, number>> = {}
        roleData.forEach((up) => {
          const userId = up.u_id
          // Handle roles as array or single object
          const roles = up.roles as { role_name: string } | { role_name: string }[] | null
          const roleName = Array.isArray(roles) ? roles[0]?.role_name : roles?.role_name
          if (roleName) {
            if (!roleCounts[userId]) roleCounts[userId] = {}
            roleCounts[userId][roleName] = (roleCounts[userId][roleName] || 0) + 1
          }
        })

        // Get most common role for each user
        Object.entries(roleCounts).forEach(([userId, counts]) => {
          const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
          if (mostCommon) {
            userRoles[userId] = mostCommon[0]
          }
        })
      }
    }

    // Check follow status for current user
    const { data: followData } = await supabase
      .from('user_follows')
      .select('followed_id')
      .eq('follower_id', req.auth.userId)
      .in('followed_id', userIds)

    const followedIds = new Set(followData?.map((f) => f.followed_id) ?? [])

    const users = (data ?? []).map((user) => ({
      id: user.u_id,
      email: user.u_email,
      name: user.u_name,
      profileImageUrl: user.profile_image_url,
      mainRole: userRoles[user.u_id] ?? null,
      isFollowing: followedIds.has(user.u_id),
    }))

    res.json({ users })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid search query.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

// Get user profile (public read-only)
usersRouter.get('/:userId', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const paramsSchema = z.object({
      userId: z.string().uuid(),
    })

    const { userId } = paramsSchema.parse(req.params)

    const supabase = createSupabaseUserClient(req.auth.token)

    // Get user basic info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('u_id, u_email, u_name, u_bio, profile_image_url, u_created_at')
      .eq('u_id', userId)
      .maybeSingle()

    if (userError || !userData) {
      res.status(404).json({
        error: 'UserNotFound',
        message: 'User not found.',
      })
      return
    }

    // Get user's projects (public view)
    const { data: projectsData } = await supabase
      .from('user_projects')
      .select(
        `
        p_id,
        projects(
          p_id,
          p_title,
          p_platform,
          p_thumbnail_url,
          p_created_at
        ),
        roles(role_name, category)
      `,
      )
      .eq('u_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get stats
    const [followersResult, followingResult] = await Promise.all([
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('followed_id', userId),
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId),
    ])

    // Get collaborators count (users who share projects with this user)
    const { data: userProjects } = await supabase
      .from('user_projects')
      .select('p_id')
      .eq('u_id', userId)

    const projectIds = userProjects?.map((up) => up.p_id) ?? []
    let collaboratorsCount = 0

    if (projectIds.length > 0) {
      const { data: collaboratorData } = await supabase
        .from('user_projects')
        .select('u_id')
        .in('p_id', projectIds)
        .neq('u_id', userId)

      const uniqueCollaborators = new Set(collaboratorData?.map((c) => c.u_id) ?? [])
      collaboratorsCount = uniqueCollaborators.size
    }

    // Check if current user is following this user
    const { data: followCheck } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', req.auth.userId)
      .eq('followed_id', userId)
      .maybeSingle()

    const projects =
      projectsData?.map((up) => {
        // Handle projects as array or single object
        const projectsRaw = up.projects as {
          p_id: string
          p_title: string | null
          p_platform: string
          p_thumbnail_url: string | null
          p_created_at: string
        } | {
          p_id: string
          p_title: string | null
          p_platform: string
          p_thumbnail_url: string | null
          p_created_at: string
        }[] | null
        const project = Array.isArray(projectsRaw) ? projectsRaw[0] : projectsRaw
        
        // Handle roles as array or single object
        const rolesRaw = up.roles as { role_name: string; category: string | null } | { role_name: string; category: string | null }[] | null
        const role = Array.isArray(rolesRaw) ? rolesRaw[0] : rolesRaw

        if (!project) {
          return null
        }

        return {
          id: project.p_id,
          title: project.p_title,
          platform: project.p_platform,
          thumbnailUrl: project.p_thumbnail_url,
          createdAt: project.p_created_at,
          role: role?.role_name ?? null,
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null) ?? []

    res.json({
      user: {
        id: userData.u_id,
        email: userData.u_email,
        name: userData.u_name,
        bio: userData.u_bio,
        profileImageUrl: userData.profile_image_url,
        createdAt: userData.u_created_at,
        stats: {
          followers: followersResult.count ?? 0,
          following: followingResult.count ?? 0,
          collaborators: collaboratorsCount,
        },
        isFollowing: !!followCheck?.id,
        projects,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid user ID.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

// Get user stats
usersRouter.get('/:userId/stats', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const paramsSchema = z.object({
      userId: z.string().uuid(),
    })

    const { userId } = paramsSchema.parse(req.params)

    const supabase = createSupabaseUserClient(req.auth.token)

    // Get followers count
    const { count: followersCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('followed_id', userId)

    // Get following count
    const { count: followingCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)

    // Get collaborators count (users who share projects with this user)
    // This is a bit complex - we need to find users who have projects in common
    const { data: userProjects } = await supabase
      .from('user_projects')
      .select('p_id')
      .eq('u_id', userId)

    const projectIds = userProjects?.map((up) => up.p_id) ?? []
    let collaboratorsCount = 0

    if (projectIds.length > 0) {
      const { data: collaboratorData } = await supabase
        .from('user_projects')
        .select('u_id')
        .in('p_id', projectIds)
        .neq('u_id', userId)

      const uniqueCollaborators = new Set(collaboratorData?.map((c) => c.u_id) ?? [])
      collaboratorsCount = uniqueCollaborators.size
    }

    res.json({
      stats: {
        followers: followersCount ?? 0,
        following: followingCount ?? 0,
        collaborators: collaboratorsCount,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid user ID.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

// Follow a user
usersRouter.post('/:userId/follow', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const paramsSchema = z.object({
      userId: z.string().uuid(),
    })

    const { userId } = paramsSchema.parse(req.params)

    if (userId === req.auth.userId) {
      res.status(400).json({
        error: 'InvalidOperation',
        message: 'You cannot follow yourself.',
      })
      return
    }

    if (!supabaseAdmin) {
      const error = new Error('Supabase admin client is not configured.')
      error.name = 'ConfigurationError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    // Check if user exists
    const { data: userCheck } = await supabaseAdmin
      .from('users')
      .select('u_id')
      .eq('u_id', userId)
      .maybeSingle()

    if (!userCheck) {
      res.status(404).json({
        error: 'UserNotFound',
        message: 'User not found.',
      })
      return
    }

    // Insert follow relationship
    const { error: insertError } = await supabaseAdmin
      .from('user_follows')
      .insert({
        follower_id: req.auth.userId,
        followed_id: userId,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        // Already following
        res.status(409).json({
          error: 'AlreadyFollowing',
          message: 'You are already following this user.',
        })
        return
      }

      const wrapped = new Error(`Failed to follow user: ${insertError.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = insertError
      throw wrapped
    }

    res.status(201).json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid user ID.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

// Unfollow a user
usersRouter.delete('/:userId/follow', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const paramsSchema = z.object({
      userId: z.string().uuid(),
    })

    const { userId } = paramsSchema.parse(req.params)

    if (!supabaseAdmin) {
      const error = new Error('Supabase admin client is not configured.')
      error.name = 'ConfigurationError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    const { error: deleteError } = await supabaseAdmin
      .from('user_follows')
      .delete()
      .eq('follower_id', req.auth.userId)
      .eq('followed_id', userId)

    if (deleteError) {
      const wrapped = new Error(`Failed to unfollow user: ${deleteError.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = deleteError
      throw wrapped
    }

    res.status(204).send()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid user ID.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

export { usersRouter }

