import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middleware/authenticate.js'
import { createSupabaseUserClient } from '../services/supabaseUserClient.js'

const userMetricsRowSchema = z.object({
  total_view_count: z.number().nullable(),
  total_like_count: z.number().nullable(),
  total_comment_count: z.number().nullable(),
  total_share_count: z.number().nullable(),
  avg_engagement_rate: z.number().nullable(),
  updated_at: z.string().nullable(),
})

const userProjectRowSchema = z.object({
  p_id: z.string(),
})

const userProjectsSchema = z.array(userProjectRowSchema)

const youtubeMetricRowSchema = z.object({
  fetched_at: z.string(),
  view_count: z.number().nullable(),
  like_count: z.number().nullable(),
  comment_count: z.number().nullable(),
  share_count: z.number().nullable(),
  engagement_rate: z.number().nullable(),
})

const instagramMetricRowSchema = z.object({
  fetched_at: z.string(),
  view_count: z.number().nullable(),
  like_count: z.number().nullable(),
  comment_count: z.number().nullable(),
  reach: z.number().nullable(),
  save_count: z.number().nullable(),
  engagement_rate: z.number().nullable(),
})

type AggregatedSummary = {
  totalViewCount: number
  totalLikeCount: number
  totalCommentCount: number
  totalShareCount: number
  averageEngagementRate: number
  updatedAt: string | null
  viewGrowth24hPercent: number | null
}

const isZeroSummary = (summary: AggregatedSummary | null) => {
  if (!summary) {
    return true
  }

  return (
    summary.totalViewCount === 0 &&
    summary.totalLikeCount === 0 &&
    summary.totalCommentCount === 0 &&
    summary.totalShareCount === 0 &&
    summary.averageEngagementRate === 0
  )
}

async function getUserProjectIds(supabase: ReturnType<typeof createSupabaseUserClient>, userId: string) {
  const { data: projectRows, error: projectsError } = await supabase
    .from('user_projects')
    .select(
      `
      p_id
      `,
    )
    .eq('u_id', userId)

  if (projectsError) {
    const wrapped = new Error(`Failed to load project assignments: ${projectsError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = projectsError
    throw wrapped
  }

  const parsedProjects = userProjectsSchema.safeParse(projectRows)

  if (!parsedProjects.success) {
    const error = new Error('Invalid project data received from Supabase.')
    error.name = 'SupabaseDataValidationError'
    ;(error as { details?: unknown }).details = parsedProjects.error.flatten()
    throw error
  }

  return parsedProjects.data.map((row) => row.p_id)
}

async function computeAggregatedSummary(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  projectIds: string[],
): Promise<AggregatedSummary | null> {
  if (!projectIds.length) {
    return null
  }

  let totalViewCount = 0
  let totalLikeCount = 0
  let totalCommentCount = 0
  let totalShareCount = 0
  let engagementRateSum = 0
  let engagementRateCount = 0
  let updatedAt: string | null = null

  const updateSummaryFromTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return
    }

    if (!updatedAt || new Date(timestamp).getTime() > new Date(updatedAt).getTime()) {
      updatedAt = timestamp
    }
  }

  if (projectIds.length > 0) {
    const { data: youtubeRows, error: youtubeError } = await supabase
      .from('youtube_metrics')
      .select(
        `
        fetched_at,
        view_count,
        like_count,
        comment_count,
        share_count,
        engagement_rate
      `,
      )
      .in('p_id', projectIds)
      .order('fetched_at', { ascending: true })
      .limit(2000)

    if (youtubeError) {
      const wrapped = new Error(`Failed to load YouTube metrics: ${youtubeError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = youtubeError
      throw wrapped
    }

    const parsedYoutube = z.array(youtubeMetricRowSchema).safeParse(youtubeRows)
    if (!parsedYoutube.success) {
      const error = new Error('Invalid YouTube metrics data received from Supabase.')
      error.name = 'SupabaseDataValidationError'
      ;(error as { details?: unknown }).details = parsedYoutube.error.flatten()
      throw error
    }

    for (const row of parsedYoutube.data) {
      totalViewCount += row.view_count ?? 0
      totalLikeCount += row.like_count ?? 0
      totalCommentCount += row.comment_count ?? 0
      totalShareCount += row.share_count ?? 0

      if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
        engagementRateSum += Number(row.engagement_rate)
        engagementRateCount += 1
      }

      updateSummaryFromTimestamp(row.fetched_at)
    }
  }

  if (projectIds.length > 0) {
    const { data: instagramRows, error: instagramError } = await supabase
      .from('instagram_metrics')
      .select(
        `
        fetched_at,
        view_count,
        like_count,
        comment_count,
        reach,
        save_count,
        engagement_rate
      `,
      )
      .in('p_id', projectIds)
      .order('fetched_at', { ascending: true })
      .limit(2000)

    if (instagramError) {
      const wrapped = new Error(`Failed to load Instagram metrics: ${instagramError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = instagramError
      throw wrapped
    }

    const parsedInstagram = z.array(instagramMetricRowSchema).safeParse(instagramRows)
    if (!parsedInstagram.success) {
      const error = new Error('Invalid Instagram metrics data received from Supabase.')
      error.name = 'SupabaseDataValidationError'
      ;(error as { details?: unknown }).details = parsedInstagram.error.flatten()
      throw error
    }

    for (const row of parsedInstagram.data) {
      totalViewCount += row.view_count ?? 0
      totalLikeCount += row.like_count ?? 0
      totalCommentCount += row.comment_count ?? 0

      if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
        engagementRateSum += Number(row.engagement_rate)
        engagementRateCount += 1
      }

      updateSummaryFromTimestamp(row.fetched_at)
    }
  }

  if (
    totalViewCount === 0 &&
    totalLikeCount === 0 &&
    totalCommentCount === 0 &&
    totalShareCount === 0 &&
    engagementRateCount === 0
  ) {
    return null
  }

  const averageEngagementRate = engagementRateCount > 0 ? engagementRateSum / engagementRateCount : 0

  return {
    totalViewCount,
    totalLikeCount,
    totalCommentCount,
    totalShareCount,
    averageEngagementRate,
    updatedAt,
    viewGrowth24hPercent: null,
  }
}

async function computeViewGrowth24hPercent(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  projectIds: string[],
): Promise<number | null> {
  if (!projectIds.length) {
    return null
  }

  const now = Date.now()
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
  const fetchWindowStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: metricsRows, error: metricsError } = await supabase
    .from('youtube_metrics')
    .select(
      `
      p_id,
      fetched_at,
      view_count
    `,
    )
    .in('p_id', projectIds)
    .gte('fetched_at', fetchWindowStart)
    .order('fetched_at', { ascending: false })
    .limit(2000)

  if (metricsError) {
    const wrapped = new Error(`Failed to load YouTube metrics for growth calculation: ${metricsError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = metricsError
    throw wrapped
  }

  if (!metricsRows || metricsRows.length === 0) {
    return null
  }

  type MetricsRow = {
    p_id: string
    fetched_at: string
    view_count: number | null
  }

  const grouped = new Map<string, { latest: MetricsRow | null; baseline: MetricsRow | null }>()

  for (const row of metricsRows as MetricsRow[]) {
    const fetchedAtMs = new Date(row.fetched_at).getTime()
    if (Number.isNaN(fetchedAtMs)) {
      continue
    }

    const group = grouped.get(row.p_id) ?? { latest: null, baseline: null }

    if (!group.latest) {
      group.latest = row
    }

    if (!group.baseline && fetchedAtMs <= twentyFourHoursAgo) {
      group.baseline = row
    }

    grouped.set(row.p_id, group)
  }

  let totalDelta = 0
  let totalBaseline = 0
  let hasComparableProjects = false

  for (const { latest, baseline } of grouped.values()) {
    const latestViews = latest?.view_count
    const baselineViews = baseline?.view_count

    if (
      typeof latestViews === 'number' &&
      typeof baselineViews === 'number' &&
      Number.isFinite(latestViews) &&
      Number.isFinite(baselineViews)
    ) {
      hasComparableProjects = true
      totalDelta += latestViews - baselineViews
      totalBaseline += baselineViews
    }
  }

  if (!hasComparableProjects || !Number.isFinite(totalBaseline) || totalBaseline <= 0) {
    return null
  }

  const percent = (totalDelta / totalBaseline) * 100

  if (!Number.isFinite(percent)) {
    return null
  }

  return percent
}

const metricsRouter = Router()

metricsRouter.use(authenticate)

metricsRouter.get('/summary', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const supabase = createSupabaseUserClient(req.auth.token)

    const projectIds = await getUserProjectIds(supabase, req.auth.userId)

    const { data, error } = await supabase
      .from('user_metrics')
      .select(
        `
        total_view_count,
        total_like_count,
        total_comment_count,
        total_share_count,
        avg_engagement_rate,
        updated_at
      `,
      )
      .eq('u_id', req.auth.userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      const wrapped = new Error(`Failed to load metrics summary: ${error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = error
      throw wrapped
    }

    const parsed = data ? userMetricsRowSchema.parse(data) : null

    let summary: AggregatedSummary | null = parsed
      ? {
          totalViewCount: parsed.total_view_count ?? 0,
          totalLikeCount: parsed.total_like_count ?? 0,
          totalCommentCount: parsed.total_comment_count ?? 0,
          totalShareCount: parsed.total_share_count ?? 0,
          averageEngagementRate: parsed.avg_engagement_rate ?? 0,
          updatedAt: parsed.updated_at ?? null,
          viewGrowth24hPercent: null,
        }
      : null

    if (isZeroSummary(summary)) {
      const aggregated = await computeAggregatedSummary(supabase, projectIds)
      if (aggregated) {
        summary = aggregated
      }
    }

    const viewGrowth24hPercent = await computeViewGrowth24hPercent(supabase, projectIds)

    const responseSummary: AggregatedSummary = summary
      ? {
          ...summary,
          viewGrowth24hPercent,
        }
      : {
          totalViewCount: 0,
          totalLikeCount: 0,
          totalCommentCount: 0,
          totalShareCount: 0,
          averageEngagementRate: 0,
          updatedAt: null,
          viewGrowth24hPercent,
        }

    res.json({
      summary: responseSummary,
    })
  } catch (error) {
    next(error)
  }
})

const projectMetricsParamsSchema = z.object({
  projectId: z.string().min(1),
})

const projectMetricsQuerySchema = z.object({
  platform: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    })
    .pipe(z.enum(['youtube', 'instagram']).optional()),
  limit: z
    .union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        value = value[0]
      }

      if (value === undefined) {
        return undefined
      }

      const numeric = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
      return Number.isNaN(numeric) ? undefined : numeric
    })
    .pipe(z.number().int().min(1).max(500).optional()),
})

metricsRouter.get('/projects/:projectId', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const params = projectMetricsParamsSchema.parse(req.params)
    const query = projectMetricsQuerySchema.parse(req.query)

    const supabase = createSupabaseUserClient(req.auth.token)

    const membership = await supabase
      .from('user_projects')
      .select('p_id')
      .eq('p_id', params.projectId)
      .eq('u_id', req.auth.userId)
      .limit(1)
      .maybeSingle()

    if (membership.error?.code === 'PGRST116' || (!membership.error && !membership.data)) {
      res.status(404).json({
        error: 'ProjectNotFound',
        message: 'Project not found or you do not have access.',
      })
      return
    }

    if (membership.error) {
      const wrapped = new Error(`Failed to verify project access: ${membership.error.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = membership.error
      throw wrapped
    }

    const limit = query.limit ?? 365

    const response: {
      youtube: Array<{
        fetchedAt: string
        viewCount: number | null
        likeCount: number | null
        commentCount: number | null
        shareCount: number | null
        engagementRate: number | null
      }>
      instagram: Array<{
        fetchedAt: string
        viewCount: number | null
        likeCount: number | null
        commentCount: number | null
        reach: number | null
        saveCount: number | null
        engagementRate: number | null
      }>
    } = {
      youtube: [],
      instagram: [],
    }

    if (!query.platform || query.platform === 'youtube') {
      const { data, error } = await supabase
        .from('youtube_metrics')
        .select(
          `
          fetched_at,
          view_count,
          like_count,
          comment_count,
          share_count,
          engagement_rate
        `,
        )
        .eq('p_id', params.projectId)
        .order('fetched_at', { ascending: true })
        .limit(limit)

      if (error) {
        const wrapped = new Error(`Failed to load YouTube metrics: ${error.message}`)
        wrapped.name = 'SupabaseQueryError'
        ;(wrapped as { cause?: unknown }).cause = error
        throw wrapped
      }

      const parsed = z.array(youtubeMetricRowSchema).safeParse(data)

      if (!parsed.success) {
        const error = new Error('Invalid YouTube metrics data received from Supabase.')
        error.name = 'SupabaseDataValidationError'
        ;(error as { details?: unknown }).details = parsed.error.flatten()
        throw error
      }

      response.youtube = parsed.data.map((row) => ({
        fetchedAt: row.fetched_at,
        viewCount: row.view_count,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        shareCount: row.share_count,
        engagementRate: row.engagement_rate,
      }))
    }

    if (!query.platform || query.platform === 'instagram') {
      const { data, error } = await supabase
        .from('instagram_metrics')
        .select(
          `
          fetched_at,
          view_count,
          like_count,
          comment_count,
          reach,
          save_count,
          engagement_rate
        `,
        )
        .eq('p_id', params.projectId)
        .order('fetched_at', { ascending: true })
        .limit(limit)

      if (error) {
        const wrapped = new Error(`Failed to load Instagram metrics: ${error.message}`)
        wrapped.name = 'SupabaseQueryError'
        ;(wrapped as { cause?: unknown }).cause = error
        throw wrapped
      }

      const parsed = z.array(instagramMetricRowSchema).safeParse(data)

      if (!parsed.success) {
        const error = new Error('Invalid Instagram metrics data received from Supabase.')
        error.name = 'SupabaseDataValidationError'
        ;(error as { details?: unknown }).details = parsed.error.flatten()
        throw error
      }

      response.instagram = parsed.data.map((row) => ({
        fetchedAt: row.fetched_at,
        viewCount: row.view_count,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        reach: row.reach,
        saveCount: row.save_count,
        engagementRate: row.engagement_rate,
      }))
    }

    res.json({
      projectId: params.projectId,
      filters: {
        platform: query.platform ?? 'all',
        limit,
      },
      metrics: response,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid request parameters.',
        details: error.flatten(),
      })
      return
    }

    next(error)
  }
})

export { metricsRouter }


