import { randomUUID } from 'node:crypto'

import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middleware/authenticate.js'
import { projectCreationRateLimiter } from '../middleware/rateLimit.js'
import { supabaseAdmin } from '../config/supabase.js'
import { createSupabaseUserClient } from '../services/supabaseUserClient.js'
import { fetchYouTubeVideoData } from '../services/youtubeApiKey.js'

/**
 * Extracts YouTube video ID from various YouTube URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - VIDEO_ID (if already just an ID)
 */
function extractYouTubeVideoId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim()

  // If it's already just an ID (11 characters, alphanumeric, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)

    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com') && url.pathname === '/watch') {
      const videoId = url.searchParams.get('v')
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId
      }
    }

    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('?')[0]
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId
      }
    }

    // youtube.com/embed/VIDEO_ID
    if (url.hostname.includes('youtube.com') && url.pathname.startsWith('/embed/')) {
      const videoId = url.pathname.slice(7).split('?')[0]
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId
      }
    }
  } catch {
    // Invalid URL, try treating as ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed
    }
  }

  return null
}

const projectRowSchema = z.object({
  p_id: z.string(),
  p_title: z.string().nullable(),
  p_description: z.string().nullable(),
  p_link: z.string(),
  p_platform: z.string(),
  p_channel: z.string().nullable(),
  p_posted_at: z.string().nullable(),
  p_thumbnail_url: z.string().nullable(),
  p_created_at: z.string(),
  user_projects: z
    .array(
      z.object({
        u_role: z.string().nullable(),
        role_id: z.number().nullable(),
        roles: z
          .object({
            role_name: z.string(),
            category: z.string().nullable(),
          })
          .nullable(),
      }),
    )
    .default([]),
})

const projectListSchema = z.array(projectRowSchema)

const projectsRouter = Router()

const projectAssignmentSchema = z
  .object({
    roleId: z.number().int().positive().nullable().optional(),
    customRole: z
      .string()
      .trim()
      .max(120, 'Custom role must be 120 characters or fewer')
      .nullable()
      .optional(),
  })
  .optional()

const createProjectSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1, 'Project identifier must not be empty')
    .max(512, 'Project identifier is too long')
    .optional(),
  title: z
    .string()
    .trim()
    .max(255, 'Title must be 255 characters or fewer')
    .nullable()
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .nullable()
    .optional(),
  link: z.string().url('Project link must be a valid URL'),
  platform: z
    .enum(['youtube', 'instagram', 'tiktok', 'vimeo', 'other'])
    .default('youtube')
    .optional()
    .transform((value) => value ?? 'youtube'),
  channel: z
    .string()
    .trim()
    .max(255, 'Channel name must be 255 characters or fewer')
    .nullable()
    .optional(),
  postedAt: z
    .string()
    .datetime()
    .nullable()
    .optional(),
  thumbnailUrl: z
    .string()
    .url('Thumbnail URL must be valid')
    .nullable()
    .optional(),
  assignment: projectAssignmentSchema,
})

projectsRouter.use(authenticate)

projectsRouter.get('/', async (req, res, next) => {
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
      .from('projects')
      .select(
        `
        p_id,
        p_title,
        p_description,
        p_link,
        p_platform,
        p_channel,
        p_posted_at,
        p_thumbnail_url,
        p_created_at,
        user_projects!inner(
          u_role,
          role_id,
          roles(
            role_name,
            category
          )
        )
      `,
      )
      .eq('user_projects.u_id', req.auth.userId)
      .order('p_created_at', { ascending: false })

    if (error) {
      const wrapped = new Error(`Failed to load projects: ${error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = error
      throw wrapped
    }

    const parsed = projectListSchema.safeParse(data)

    if (!parsed.success) {
      const error = new Error('Invalid project data received from Supabase.')
      error.name = 'SupabaseDataValidationError'
      ;(error as { details?: unknown }).details = parsed.error.flatten()
      throw error
    }

    const projects = parsed.data.map((project) => {
      const assignment = project.user_projects.at(0)

      return {
        id: project.p_id,
        title: project.p_title,
        description: project.p_description,
        link: project.p_link,
        platform: project.p_platform,
        channel: project.p_channel,
        postedAt: project.p_posted_at,
        thumbnailUrl: project.p_thumbnail_url,
        createdAt: project.p_created_at,
        assignment: assignment
          ? {
              roleId: assignment.role_id,
              roleName: assignment.roles?.role_name ?? null,
              roleCategory: assignment.roles?.category ?? null,
              customRole: assignment.u_role,
            }
          : null,
      }
    })

    res.json({ projects })
  } catch (error) {
    next(error)
  }
})

const projectIdParamsSchema = z.object({
  projectId: z.string().min(1),
})

projectsRouter.get('/:projectId', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const params = projectIdParamsSchema.parse(req.params)

    const supabase = createSupabaseUserClient(req.auth.token)

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        p_id,
        p_title,
        p_description,
        p_link,
        p_platform,
        p_channel,
        p_posted_at,
        p_thumbnail_url,
        p_created_at,
        user_projects!inner(
          u_role,
          role_id,
          roles(
            role_name,
            category
          )
        )
      `,
      )
      .eq('user_projects.u_id', req.auth.userId)
      .eq('p_id', params.projectId)
      .maybeSingle()

    if (error?.code === 'PGRST116') {
      res.status(404).json({
        error: 'ProjectNotFound',
        message: 'Project not found or you do not have access.',
      })
      return
    }

    if (error) {
      const wrapped = new Error(`Failed to load project: ${error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = error
      throw wrapped
    }

    const parsed = projectRowSchema.safeParse(data)

    if (!parsed.success) {
      res.status(404).json({
        error: 'ProjectNotFound',
        message: 'Project not found or you do not have access.',
      })
      return
    }

    const assignment = parsed.data.user_projects.at(0)

    res.json({
      project: {
        id: parsed.data.p_id,
        title: parsed.data.p_title,
        description: parsed.data.p_description,
        link: parsed.data.p_link,
        platform: parsed.data.p_platform,
        channel: parsed.data.p_channel,
        postedAt: parsed.data.p_posted_at,
        thumbnailUrl: parsed.data.p_thumbnail_url,
        createdAt: parsed.data.p_created_at,
        assignment: assignment
          ? {
              roleId: assignment.role_id,
              roleName: assignment.roles?.role_name ?? null,
              roleCategory: assignment.roles?.category ?? null,
              customRole: assignment.u_role,
            }
          : null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid project identifier.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

projectsRouter.post('/', projectCreationRateLimiter, async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (!supabaseAdmin) {
      const error = new Error('Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.')
      error.name = 'ConfigurationError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    const supabase = createSupabaseUserClient(req.auth.token)

    const payload = createProjectSchema.parse(req.body ?? {})

    const projectId = payload.id ?? randomUUID()

    const insertProject = await supabaseAdmin
      .from('projects')
      .insert({
        p_id: projectId,
        p_title: payload.title ?? null,
        p_description: payload.description ?? null,
        p_link: payload.link,
        p_platform: payload.platform,
        p_channel: payload.channel ?? null,
        p_posted_at: payload.postedAt ?? null,
        p_thumbnail_url: payload.thumbnailUrl ?? null,
      })
      .select('p_id')
      .single()

    if (insertProject.error) {
      if (insertProject.error.code === '23505') {
        res.status(409).json({
          error: 'ProjectAlreadyExists',
          message: 'A project with that identifier already exists.',
        })
        return
      }

      const wrapped = new Error(`Failed to create project: ${insertProject.error.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = insertProject.error
      throw wrapped
    }

    const assignment = payload.assignment ?? null

    const membership = await supabaseAdmin
      .from('user_projects')
      .insert({
        u_id: req.auth.userId,
        p_id: projectId,
        role_id: assignment?.roleId ?? null,
        u_role: assignment?.customRole ?? null,
      })
      .select(
        `
        u_role,
        role_id,
        roles(
          role_name,
          category
        )
      `,
      )
      .single()

    if (membership.error) {
      const cleanup = await supabaseAdmin.from('projects').delete().eq('p_id', projectId)
      if (cleanup.error) {
        console.error('[projectsRouter] Failed to cleanup project after membership error:', cleanup.error)
      }

      const wrapped = new Error(`Failed to assign project membership: ${membership.error.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = membership.error
      throw wrapped
    }

    const createdProject = await supabase
      .from('projects')
      .select(
        `
        p_id,
        p_title,
        p_description,
        p_link,
        p_platform,
        p_channel,
        p_posted_at,
        p_thumbnail_url,
        p_created_at,
        user_projects!inner(
          u_role,
          role_id,
          roles(
            role_name,
            category
          )
        )
      `,
      )
      .eq('user_projects.u_id', req.auth.userId)
      .eq('p_id', projectId)
      .maybeSingle()

    if (createdProject.error) {
      const wrapped = new Error(`Failed to load created project: ${createdProject.error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = createdProject.error
      throw wrapped
    }

    const parsed = projectRowSchema.safeParse(createdProject.data)

    if (!parsed.success) {
      const error = new Error('Created project payload failed validation.')
      error.name = 'SupabaseDataValidationError'
      ;(error as { details?: unknown }).details = parsed.error.flatten()
      throw error
    }

    const assignmentRow = parsed.data.user_projects.at(0)

    res.status(201).json({
      project: {
        id: parsed.data.p_id,
        title: parsed.data.p_title,
        description: parsed.data.p_description,
        link: parsed.data.p_link,
        platform: parsed.data.p_platform,
        channel: parsed.data.p_channel,
        postedAt: parsed.data.p_posted_at,
        thumbnailUrl: parsed.data.p_thumbnail_url,
        createdAt: parsed.data.p_created_at,
        assignment: assignmentRow
          ? {
              roleId: assignmentRow.role_id,
              roleName: assignmentRow.roles?.role_name ?? null,
              roleCategory: assignmentRow.roles?.category ?? null,
              customRole: assignmentRow.u_role,
            }
          : null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid project payload.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

const claimYouTubeProjectSchema = z.object({
  url: z.string().min(1, 'YouTube URL is required'),
  roleId: z.number().int().positive().nullable().optional(),
  customRole: z
    .string()
    .trim()
    .max(120, 'Custom role must be 120 characters or fewer')
    .nullable()
    .optional(),
})

projectsRouter.post('/claim/youtube', projectCreationRateLimiter, async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (!supabaseAdmin) {
      const error = new Error('Supabase admin client is not configured. Check SUPABASE_SERVICE_ROLE_KEY.')
      error.name = 'ConfigurationError'
      ;(error as { status?: number }).status = 500
      throw error
    }

    const payload = claimYouTubeProjectSchema.parse(req.body ?? {})

    const videoId = extractYouTubeVideoId(payload.url)

    if (!videoId) {
      res.status(400).json({
        error: 'InvalidYouTubeUrl',
        message: 'Could not extract a valid YouTube video ID from the provided URL.',
      })
      return
    }

    // Check if user already has this project (use admin client to bypass RLS)
    const existingCheck = await supabaseAdmin
      .from('user_projects')
      .select('p_id')
      .eq('u_id', req.auth.userId)
      .eq('p_id', videoId)
      .maybeSingle()

    if (existingCheck.error && existingCheck.error.code !== 'PGRST116') {
      const wrapped = new Error(`Failed to check existing project: ${existingCheck.error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = existingCheck.error
      throw wrapped
    }

    if (existingCheck.data) {
      res.status(409).json({
        error: 'ProjectAlreadyClaimed',
        message: 'You have already claimed this YouTube video.',
      })
      return
    }

    // Fetch video metadata and stats from YouTube API
    let videoData
    try {
      videoData = await fetchYouTubeVideoData(videoId)
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'Failed to fetch video data from YouTube API'
      res.status(400).json({
        error: 'YouTubeApiError',
        message: errorMessage,
      })
      return
    }

    // Normalize the URL to a canonical format
    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`

    // Upsert project with metadata from YouTube API
    const upsertProject = await supabaseAdmin
      .from('projects')
      .upsert(
        {
          p_id: videoId,
          p_title: videoData.metadata.title,
          p_description: null,
          p_link: canonicalUrl,
          p_platform: 'youtube',
          p_channel: videoData.metadata.channelTitle,
          p_posted_at: videoData.metadata.publishedAt,
          p_thumbnail_url: videoData.metadata.thumbnailUrl,
        },
        {
          onConflict: 'p_id',
        },
      )
      .select('p_id')
      .single()

    if (upsertProject.error) {
      const wrapped = new Error(`Failed to upsert project: ${upsertProject.error.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = upsertProject.error
      throw wrapped
    }

    // Insert user_projects (we already checked for existence above)
    const insertMembership = await supabaseAdmin
      .from('user_projects')
      .insert({
        u_id: req.auth.userId,
        p_id: videoId,
        role_id: payload.roleId ?? null,
        u_role: payload.customRole ?? null,
      })
      .select(
        `
        u_role,
        role_id,
        roles(
          role_name,
          category
        )
      `,
      )
      .single()

    if (insertMembership.error) {
      // Handle race condition where another request claimed it between check and insert
      if (insertMembership.error.code === '23505') {
        res.status(409).json({
          error: 'ProjectAlreadyClaimed',
          message: 'You have already claimed this YouTube video.',
        })
        return
      }

      const wrapped = new Error(`Failed to assign project membership: ${insertMembership.error.message}`)
      wrapped.name = 'SupabaseMutationError'
      ;(wrapped as { cause?: unknown }).cause = insertMembership.error
      throw wrapped
    }

    // Store initial metrics snapshot for "today"
    const snapshotDate = new Date()
    snapshotDate.setUTCHours(0, 0, 0, 0)
    const snapshotDateString = snapshotDate.toISOString()

    const metricsInsert = await supabaseAdmin
      .from('youtube_metrics')
      .upsert(
        {
          p_id: videoId,
          platform: 'youtube',
          fetched_at: snapshotDateString,
          view_count: videoData.stats.viewCount,
          like_count: videoData.stats.likeCount,
          comment_count: videoData.stats.commentCount,
          share_count: videoData.stats.shareCount,
          engagement_rate: videoData.stats.engagementRate,
        },
        {
          onConflict: 'p_id,fetched_at',
        },
      )

    if (metricsInsert.error) {
      // Log but don't fail the request - metrics can be synced later
      console.error('[claim/youtube] Failed to store initial metrics:', metricsInsert.error)
    }

    // Fetch the full project with assignment
    const supabase = createSupabaseUserClient(req.auth.token)
    const createdProject = await supabase
      .from('projects')
      .select(
        `
        p_id,
        p_title,
        p_description,
        p_link,
        p_platform,
        p_channel,
        p_posted_at,
        p_thumbnail_url,
        p_created_at,
        user_projects!inner(
          u_role,
          role_id,
          roles(
            role_name,
            category
          )
        )
      `,
      )
      .eq('user_projects.u_id', req.auth.userId)
      .eq('p_id', videoId)
      .maybeSingle()

    if (createdProject.error) {
      const wrapped = new Error(`Failed to load created project: ${createdProject.error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = createdProject.error
      throw wrapped
    }

    const parsed = projectRowSchema.safeParse(createdProject.data)

    if (!parsed.success) {
      const error = new Error('Created project payload failed validation.')
      error.name = 'SupabaseDataValidationError'
      ;(error as { details?: unknown }).details = parsed.error.flatten()
      throw error
    }

    const assignmentRow = parsed.data.user_projects.at(0)

    res.status(201).json({
      project: {
        id: parsed.data.p_id,
        title: parsed.data.p_title,
        description: parsed.data.p_description,
        link: parsed.data.p_link,
        platform: parsed.data.p_platform,
        channel: parsed.data.p_channel,
        postedAt: parsed.data.p_posted_at,
        thumbnailUrl: parsed.data.p_thumbnail_url,
        createdAt: parsed.data.p_created_at,
        assignment: assignmentRow
          ? {
              roleId: assignmentRow.role_id,
              roleName: assignmentRow.roles?.role_name ?? null,
              roleCategory: assignmentRow.roles?.category ?? null,
              customRole: assignmentRow.u_role,
            }
          : null,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid claim payload.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

export { projectsRouter }


