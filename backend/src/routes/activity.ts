import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middleware/authenticate.js'
import { createSupabaseUserClient } from '../services/supabaseUserClient.js'

const activityRouter = Router()

activityRouter.use(authenticate)

// Get activity feed
activityRouter.get('/', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const querySchema = z.object({
      type: z.enum(['following', 'foryou']).default('foryou'),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })

    const { type, limit } = querySchema.parse(req.query)

    const supabase = createSupabaseUserClient(req.auth.token)

    if (type === 'following') {
      // Get users the current user follows
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('followed_id')
        .eq('follower_id', req.auth.userId)

      const followingIds = followingData?.map((f) => f.followed_id) ?? []

      if (followingIds.length === 0) {
        res.json({ activities: [] })
        return
      }

      // Get activities from followed users
      // 1. Project claims (user_projects.created_at)
      const { data: projectActivities } = await supabase
        .from('user_projects')
        .select(
          `
          created_at,
          u_id,
          p_id,
          projects(
            p_title,
            p_platform,
            p_thumbnail_url
          ),
          roles(role_name),
          users!inner(
            u_id,
            u_name,
            u_email,
            profile_image_url
          )
        `,
        )
        .in('u_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(limit)

      // 2. Instagram connections (user_tokens.created_at where platform='instagram')
      const { data: instagramActivities } = await supabase
        .from('user_tokens')
        .select(
          `
          created_at,
          u_id,
          account_username,
          users!inner(
            u_id,
            u_name,
            u_email,
            profile_image_url
          )
        `,
        )
        .eq('platform', 'instagram')
        .in('u_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Combine and sort activities
      const activities: Array<{
        type: 'project_claimed' | 'instagram_connected'
        timestamp: string
        user: {
          id: string
          name: string | null
          email: string
          profileImageUrl: string | null
        }
        data: unknown
      }> = []

      projectActivities?.forEach((up) => {
        const user = up.users as {
          u_id: string
          u_name: string | null
          u_email: string
          profile_image_url: string | null
        }
        const project = up.projects as {
          p_title: string | null
          p_platform: string
          p_thumbnail_url: string | null
        } | null
        const role = up.roles as { role_name: string } | null

        activities.push({
          type: 'project_claimed',
          timestamp: up.created_at,
          user: {
            id: user.u_id,
            name: user.u_name,
            email: user.u_email,
            profileImageUrl: user.profile_image_url,
          },
          data: {
            projectId: up.p_id,
            projectTitle: project?.p_title,
            platform: project?.p_platform,
            thumbnailUrl: project?.p_thumbnail_url,
            role: role?.role_name ?? null,
          },
        })
      })

      instagramActivities?.forEach((token) => {
        const user = token.users as {
          u_id: string
          u_name: string | null
          u_email: string
          profile_image_url: string | null
        }

        activities.push({
          type: 'instagram_connected',
          timestamp: token.created_at,
          user: {
            id: user.u_id,
            name: user.u_name,
            email: user.u_email,
            profileImageUrl: user.profile_image_url,
          },
          data: {
            username: token.account_username,
          },
        })
      })

      // Sort by timestamp descending and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const limitedActivities = activities.slice(0, limit)

      res.json({ activities: limitedActivities })
    } else {
      // For you - general community activity
      // Get recent project claims from all users
      const { data: projectActivities } = await supabase
        .from('user_projects')
        .select(
          `
          created_at,
          u_id,
          p_id,
          projects(
            p_title,
            p_platform,
            p_thumbnail_url
          ),
          roles(role_name),
          users!inner(
            u_id,
            u_name,
            u_email,
            profile_image_url
          )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      // Get recent Instagram connections
      const { data: instagramActivities } = await supabase
        .from('user_tokens')
        .select(
          `
          created_at,
          u_id,
          account_username,
          users!inner(
            u_id,
            u_name,
            u_email,
            profile_image_url
          )
        `,
        )
        .eq('platform', 'instagram')
        .order('created_at', { ascending: false })
        .limit(limit)

      const activities: Array<{
        type: 'project_claimed' | 'instagram_connected'
        timestamp: string
        user: {
          id: string
          name: string | null
          email: string
          profileImageUrl: string | null
        }
        data: unknown
      }> = []

      projectActivities?.forEach((up) => {
        const user = up.users as {
          u_id: string
          u_name: string | null
          u_email: string
          profile_image_url: string | null
        }
        const project = up.projects as {
          p_title: string | null
          p_platform: string
          p_thumbnail_url: string | null
        } | null
        const role = up.roles as { role_name: string } | null

        activities.push({
          type: 'project_claimed',
          timestamp: up.created_at,
          user: {
            id: user.u_id,
            name: user.u_name,
            email: user.u_email,
            profileImageUrl: user.profile_image_url,
          },
          data: {
            projectId: up.p_id,
            projectTitle: project?.p_title,
            platform: project?.p_platform,
            thumbnailUrl: project?.p_thumbnail_url,
            role: role?.role_name ?? null,
          },
        })
      })

      instagramActivities?.forEach((token) => {
        const user = token.users as {
          u_id: string
          u_name: string | null
          u_email: string
          profile_image_url: string | null
        }

        activities.push({
          type: 'instagram_connected',
          timestamp: token.created_at,
          user: {
            id: user.u_id,
            name: user.u_name,
            email: user.u_email,
            profileImageUrl: user.profile_image_url,
          },
          data: {
            username: token.account_username,
          },
        })
      })

      // Sort by timestamp descending and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const limitedActivities = activities.slice(0, limit)

      res.json({ activities: limitedActivities })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid query parameters.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

export { activityRouter }

