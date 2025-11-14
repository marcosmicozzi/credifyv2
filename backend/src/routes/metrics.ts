import { Router } from 'express'
import { z } from 'zod'

import { authenticate } from '../middleware/authenticate.js'
import { createSupabaseUserClient } from '../services/supabaseUserClient.js'
import { syncYouTubeMetricsForUser } from '../services/youtubeIntegration.js'

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
  followerCount: number | null
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
  platform?: 'youtube' | 'instagram',
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

  // Only load YouTube metrics if platform is not specified or is YouTube
  if (!platform || platform === 'youtube') {
    if (projectIds.length > 0) {
      // Use the latest_metrics view to get the most recent snapshot per project
      const { data: latestYoutubeRows, error: youtubeError } = await supabase
        .from('youtube_latest_metrics')
        .select(
          `
        p_id,
        view_count,
        like_count,
        comment_count,
        share_count,
        engagement_rate,
        fetched_at
      `,
        )
        .in('p_id', projectIds)

      if (youtubeError) {
        const wrapped = new Error(`Failed to load YouTube latest metrics: ${youtubeError.message}`)
        wrapped.name = 'SupabaseQueryError'
        ;(wrapped as { cause?: unknown }).cause = youtubeError
        throw wrapped
      }

      if (latestYoutubeRows && latestYoutubeRows.length > 0) {
        // Sum the latest metrics across all projects
        for (const row of latestYoutubeRows) {
          totalViewCount += (row.view_count as number) ?? 0
          totalLikeCount += (row.like_count as number) ?? 0
          totalCommentCount += (row.comment_count as number) ?? 0
          totalShareCount += (row.share_count as number) ?? 0

          if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
            engagementRateSum += Number(row.engagement_rate)
            engagementRateCount += 1
          }

          updateSummaryFromTimestamp(row.fetched_at as string)
        }
      }
    }
  }

  // Only load Instagram metrics if platform is not specified or is Instagram
  if (!platform || platform === 'instagram') {
    if (projectIds.length > 0) {
      // Use the latest_metrics view to get the most recent snapshot per project
      const { data: latestInstagramRows, error: instagramError } = await supabase
        .from('instagram_latest_metrics')
        .select(
          `
        p_id,
        view_count,
        like_count,
        comment_count,
        reach,
        save_count,
        engagement_rate,
        fetched_at
      `,
        )
        .in('p_id', projectIds)

      if (instagramError) {
        const wrapped = new Error(`Failed to load Instagram latest metrics: ${instagramError.message}`)
        wrapped.name = 'SupabaseQueryError'
        ;(wrapped as { cause?: unknown }).cause = instagramError
        throw wrapped
      }

      if (latestInstagramRows && latestInstagramRows.length > 0) {
        // Sum the latest metrics across all projects
        for (const row of latestInstagramRows) {
          totalViewCount += (row.view_count as number) ?? 0
          totalLikeCount += (row.like_count as number) ?? 0
          totalCommentCount += (row.comment_count as number) ?? 0

          if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
            engagementRateSum += Number(row.engagement_rate)
            engagementRateCount += 1
          }

          updateSummaryFromTimestamp(row.fetched_at as string)
        }
      }
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
    followerCount: null,
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

async function loadMetricsSummary(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
  platform?: 'youtube' | 'instagram',
) {
  let projectIds = await getUserProjectIds(supabase, userId)

  // Filter by platform if specified
  if (platform) {
    const { data: platformProjects, error: projectsError } = await supabase
      .from('projects')
      .select('p_id')
      .in('p_id', projectIds)
      .eq('p_platform', platform)

    if (projectsError) {
      const wrapped = new Error(`Failed to load platform projects: ${projectsError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = projectsError
      throw wrapped
    }

    projectIds = platformProjects?.map((p) => p.p_id) ?? []
  }

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
    .eq('u_id', userId)
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
        followerCount: null,
      }
    : null

  // If platform is specified, we need to compute from scratch since user_metrics is not platform-specific
  if (platform || isZeroSummary(summary)) {
    const aggregated = await computeAggregatedSummary(supabase, projectIds, platform)
    if (aggregated) {
      summary = aggregated
    }
  }

  // Fetch Instagram follower count if platform is Instagram
  let followerCount: number | null = null
  if (platform === 'instagram') {
    const { data: followerData, error: followerError } = await supabase
      .from('instagram_account_latest_metrics')
      .select('value')
      .eq('u_id', userId)
      .eq('metric', 'follower_count')
      .maybeSingle()

    if (followerError) {
      console.warn(`Failed to fetch Instagram follower count for user ${userId}:`, followerError)
    } else if (followerData && followerData.value !== null && followerData.value !== undefined) {
      // PostgreSQL numeric type may be returned as string, so parse it
      const numericValue = typeof followerData.value === 'number' 
        ? followerData.value 
        : Number.parseFloat(String(followerData.value))
      
      if (!Number.isNaN(numericValue) && Number.isFinite(numericValue)) {
        followerCount = numericValue
      } else {
        console.warn(`Invalid follower count value for user ${userId}:`, followerData.value)
      }
    } else {
      console.warn(`No follower count data found for user ${userId} (platform: ${platform})`)
    }
  }

  const baseSummary: AggregatedSummary =
    summary ?? {
      totalViewCount: 0,
      totalLikeCount: 0,
      totalCommentCount: 0,
      totalShareCount: 0,
      averageEngagementRate: 0,
      updatedAt: null,
      viewGrowth24hPercent: null,
      followerCount: null,
    }

  const viewGrowth24hPercent = await computeViewGrowth24hPercent(supabase, projectIds)

  return {
    ...baseSummary,
    viewGrowth24hPercent,
    followerCount,
  }
}

const metricsRouter = Router()

metricsRouter.use(authenticate)

const summaryQuerySchema = z.object({
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
})

metricsRouter.get('/summary', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const query = summaryQuerySchema.parse(req.query)
    const supabase = createSupabaseUserClient(req.auth.token)

    const summary = await loadMetricsSummary(supabase, req.auth.userId, query.platform)

    res.json({
      summary,
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

metricsRouter.post('/summary/refresh', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (req.auth.isDemo) {
      res.status(403).json({
        error: 'DemoModeRestricted',
        message: 'Refreshing metrics is not available in demo mode.',
      })
      return
    }

    const supabase = createSupabaseUserClient(req.auth.token)

    const syncResult = await syncYouTubeMetricsForUser(req.auth.userId)
    const summary = await loadMetricsSummary(supabase, req.auth.userId)

    res.json({
      summary,
      sync: syncResult,
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

const platformMetricsParamsSchema = z.object({
  platform: z.enum(['youtube', 'instagram']),
})

const platformMetricsQuerySchema = z.object({
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

async function loadPlatformMetrics(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
  platform: 'youtube' | 'instagram',
  limit: number,
) {
  // Get all user project IDs first
  const allProjectIds = await getUserProjectIds(supabase, userId)

  if (!allProjectIds.length) {
    return {
      platform,
      filters: {
        platform,
        limit,
      },
      metrics: {
        youtube: [],
        instagram: [],
      },
    }
  }

  // Get projects filtered by platform
  const { data: platformProjects, error: projectsError } = await supabase
    .from('projects')
    .select('p_id')
    .in('p_id', allProjectIds)
    .eq('p_platform', platform)

  if (projectsError) {
    const wrapped = new Error(`Failed to load platform projects: ${projectsError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = projectsError
    throw wrapped
  }

  const platformProjectIds = platformProjects?.map((p) => p.p_id) ?? []

  if (!platformProjectIds.length) {
    return {
      platform,
      filters: {
        platform,
        limit,
      },
      metrics: {
        youtube: [],
        instagram: [],
      },
    }
  }

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

  if (platform === 'youtube') {
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
      .in('p_id', platformProjectIds)
      .order('fetched_at', { ascending: true })
      .limit(limit * platformProjectIds.length)

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

    // Aggregate metrics by fetched_at timestamp across all projects
    const aggregatedByTimestamp = new Map<
      string,
      {
        viewCount: number
        likeCount: number
        commentCount: number
        shareCount: number
        engagementRates: number[]
      }
    >()

    for (const row of parsed.data) {
      const timestamp = row.fetched_at
      const existing = aggregatedByTimestamp.get(timestamp) ?? {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        engagementRates: [],
      }

      existing.viewCount += row.view_count ?? 0
      existing.likeCount += row.like_count ?? 0
      existing.commentCount += row.comment_count ?? 0
      existing.shareCount += row.share_count ?? 0

      if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
        existing.engagementRates.push(Number(row.engagement_rate))
      }

      aggregatedByTimestamp.set(timestamp, existing)
    }

    response.youtube = Array.from(aggregatedByTimestamp.entries())
      .map(([fetchedAt, aggregated]) => ({
        fetchedAt,
        viewCount: aggregated.viewCount,
        likeCount: aggregated.likeCount,
        commentCount: aggregated.commentCount,
        shareCount: aggregated.shareCount,
        engagementRate:
          aggregated.engagementRates.length > 0
            ? aggregated.engagementRates.reduce((sum, rate) => sum + rate, 0) / aggregated.engagementRates.length
            : null,
      }))
      .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
      .slice(-limit)
  }

  if (platform === 'instagram') {
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
      .in('p_id', platformProjectIds)
      .order('fetched_at', { ascending: true })
      .limit(limit * platformProjectIds.length)

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

    // Aggregate metrics by fetched_at timestamp across all projects
    const aggregatedByTimestamp = new Map<
      string,
      {
        viewCount: number
        likeCount: number
        commentCount: number
        reach: number
        saveCount: number
        engagementRates: number[]
      }
    >()

    for (const row of parsed.data) {
      const timestamp = row.fetched_at
      const existing = aggregatedByTimestamp.get(timestamp) ?? {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0,
        reach: 0,
        saveCount: 0,
        engagementRates: [],
      }

      existing.viewCount += row.view_count ?? 0
      existing.likeCount += row.like_count ?? 0
      existing.commentCount += row.comment_count ?? 0
      existing.reach += row.reach ?? 0
      existing.saveCount += row.save_count ?? 0

      if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
        existing.engagementRates.push(Number(row.engagement_rate))
      }

      aggregatedByTimestamp.set(timestamp, existing)
    }

    response.instagram = Array.from(aggregatedByTimestamp.entries())
      .map(([fetchedAt, aggregated]) => ({
        fetchedAt,
        viewCount: aggregated.viewCount,
        likeCount: aggregated.likeCount,
        commentCount: aggregated.commentCount,
        reach: aggregated.reach,
        saveCount: aggregated.saveCount,
        engagementRate:
          aggregated.engagementRates.length > 0
            ? aggregated.engagementRates.reduce((sum, rate) => sum + rate, 0) / aggregated.engagementRates.length
            : null,
      }))
      .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
      .slice(-limit)
  }

  return {
    platform,
    filters: {
      platform,
      limit,
    },
    metrics: response,
  }
}

metricsRouter.get('/platform/:platform', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const params = platformMetricsParamsSchema.parse(req.params)
    const query = platformMetricsQuerySchema.parse(req.query)

    const supabase = createSupabaseUserClient(req.auth.token)

    const limit = query.limit ?? 365

    const result = await loadPlatformMetrics(supabase, req.auth.userId, params.platform, limit)

    res.json(result)
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

async function loadInstagramAccountInsights(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
  metric: 'follower_count' | 'reach' | 'profile_views' | 'accounts_engaged',
  limit: number,
) {
  const { data, error } = await supabase
    .from('instagram_insights')
    .select('value, end_time')
    .eq('u_id', userId)
    .eq('metric', metric)
    .order('end_time', { ascending: true })
    .limit(limit)

  if (error) {
    const wrapped = new Error(`Failed to load Instagram account insights: ${error.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }

  return (data ?? []).map((row) => {
    const numericValue =
      typeof row.value === 'number' ? row.value : Number.parseFloat(String(row.value ?? 0))
    return {
      fetchedAt: row.end_time,
      value: Number.isNaN(numericValue) ? 0 : numericValue,
    }
  })
}

metricsRouter.get('/platform/:platform/account-insights', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const params = z.object({ platform: z.enum(['instagram']) }).parse(req.params)
    const query = z
      .object({
        metric: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .transform((value) => {
            if (Array.isArray(value)) {
              return value[0]
            }
            return value
          })
          .pipe(z.enum(['follower_count', 'reach', 'profile_views', 'accounts_engaged']).optional()),
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
      .parse(req.query)

    const supabase = createSupabaseUserClient(req.auth.token)
    const limit = query.limit ?? 365
    const metric = query.metric ?? 'follower_count'

    const insights = await loadInstagramAccountInsights(supabase, req.auth.userId, metric, limit)

    res.json({
      platform: params.platform,
      metric,
      insights,
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

const roleImpactQuerySchema = z.object({
  groupBy: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    })
    .pipe(z.enum(['role', 'category']).optional())
    .default('role'),
  metric: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    })
    .pipe(z.enum(['views', 'likes', 'comments', 'projects']).optional())
    .default('views'),
  platform: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    })
    .pipe(z.enum(['all', 'youtube', 'instagram']).optional())
    .default('all'),
  dateRange: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    })
    .pipe(z.enum(['7d', '28d', '90d', 'all', 'custom']).optional())
    .default('all'),
  startDate: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    }),
  endDate: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    }),
  mode: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    })
    .pipe(z.enum(['full', 'share_weighted']).optional())
    .default('full'),
})

type RoleImpactDataPoint = {
  label: string
  value: number
  percentage: number
}

async function loadRoleImpact(
  supabase: ReturnType<typeof createSupabaseUserClient>,
  userId: string,
  params: z.infer<typeof roleImpactQuerySchema>,
): Promise<{ data: RoleImpactDataPoint[]; total: number }> {
  // Get user_projects with roles
  let query = supabase
    .from('user_projects')
    .select(
      `
      p_id,
      role_id,
      u_role,
      roles:role_id (
        role_name,
        category
      )
    `,
    )
    .eq('u_id', userId)

  const { data: userProjects, error: userProjectsError } = await query

  if (userProjectsError) {
    const wrapped = new Error(`Failed to load user projects: ${userProjectsError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = userProjectsError
    throw wrapped
  }

  if (!userProjects || userProjects.length === 0) {
    return { data: [], total: 0 }
  }

  // Get project IDs and filter by platform if needed
  const projectIds = userProjects.map((up) => up.p_id as string)

  let platformProjectIds = projectIds
  if (params.platform !== 'all') {
    const { data: platformProjects, error: platformError } = await supabase
      .from('projects')
      .select('p_id')
      .in('p_id', projectIds)
      .eq('p_platform', params.platform)

    if (platformError) {
      const wrapped = new Error(`Failed to filter projects by platform: ${platformError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = platformError
      throw wrapped
    }

    platformProjectIds = platformProjects?.map((p) => p.p_id) ?? []
  }

  if (platformProjectIds.length === 0) {
    return { data: [], total: 0 }
  }

  // Calculate date range filter (based on project posted date)
  let dateFilter: { start?: string; end?: string } = {}
  if (params.dateRange === 'custom' && params.startDate && params.endDate) {
    dateFilter.start = params.startDate
    dateFilter.end = params.endDate
  } else if (params.dateRange !== 'all') {
    const days = params.dateRange === '7d' ? 7 : params.dateRange === '28d' ? 28 : 90
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    dateFilter.start = startDate.toISOString()
    dateFilter.end = endDate.toISOString()
  }

  // Filter projects by posted date if date range is specified
  if (dateFilter.start || dateFilter.end) {
    let projectsQuery = supabase
      .from('projects')
      .select('p_id')
      .in('p_id', platformProjectIds)

    if (dateFilter.start) {
      projectsQuery = projectsQuery.gte('p_posted_at', dateFilter.start)
    }
    if (dateFilter.end) {
      projectsQuery = projectsQuery.lte('p_posted_at', dateFilter.end)
    }

    const { data: filteredProjects, error: filteredError } = await projectsQuery

    if (filteredError) {
      const wrapped = new Error(`Failed to filter projects by date: ${filteredError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = filteredError
      throw wrapped
    }

    platformProjectIds = filteredProjects?.map((p) => p.p_id) ?? []
  }

  // Load metrics based on platform
  const roleMetricMap = new Map<string, number>()
  const projectCountMap = new Map<string, number>()

  // Handle "projects" metric separately - just count projects per role/category
  if (params.metric === 'projects') {
    for (const up of userProjects) {
      if (!platformProjectIds.includes(up.p_id as string)) {
        continue
      }

      // Handle both predefined roles and custom roles
      let groupKey: string
      if (up.u_role) {
        // Custom role
        if (params.groupBy === 'category') {
          groupKey = 'Custom' // Custom roles go into "Custom" category
        } else {
          groupKey = up.u_role as string
        }
      } else {
        const role = up.roles as { role_name: string; category: string | null } | null
        if (!role) {
          continue // Skip if no role assigned
        }
        groupKey = params.groupBy === 'category' ? (role.category ?? 'Unknown') : role.role_name
      }
      projectCountMap.set(groupKey, (projectCountMap.get(groupKey) ?? 0) + 1)
    }

    const total = Array.from(projectCountMap.values()).reduce((sum, val) => sum + val, 0)
    const data: RoleImpactDataPoint[] = Array.from(projectCountMap.entries()).map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))

    return { data, total }
  }

  // For other metrics, load from metrics tables
  if (params.platform === 'all' || params.platform === 'youtube') {
    const youtubeQuery = supabase
      .from('youtube_latest_metrics')
      .select('p_id, view_count, like_count, comment_count')
      .in('p_id', platformProjectIds)

    const { data: youtubeMetrics, error: youtubeError } = await youtubeQuery

    if (youtubeError) {
      const wrapped = new Error(`Failed to load YouTube metrics: ${youtubeError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = youtubeError
      throw wrapped
    }

    if (youtubeMetrics) {
      for (const metric of youtubeMetrics) {
        const up = userProjects.find((u) => u.p_id === metric.p_id)
        if (!up) continue

        // Handle both predefined roles and custom roles
        let groupKey: string
        if (up.u_role) {
          // Custom role
          if (params.groupBy === 'category') {
            groupKey = 'Custom' // Custom roles go into "Custom" category
          } else {
            groupKey = up.u_role as string
          }
        } else {
          const role = up.roles as { role_name: string; category: string | null } | null
          if (!role) continue // Skip if no role assigned
          groupKey = params.groupBy === 'category' ? (role.category ?? 'Unknown') : role.role_name
        }

        let metricValue = 0
        switch (params.metric) {
          case 'views':
            metricValue = (metric.view_count as number) ?? 0
            break
          case 'likes':
            metricValue = (metric.like_count as number) ?? 0
            break
          case 'comments':
            metricValue = (metric.comment_count as number) ?? 0
            break
          default:
            metricValue = (metric.view_count as number) ?? 0
        }

        roleMetricMap.set(groupKey, (roleMetricMap.get(groupKey) ?? 0) + metricValue)
      }
    }
  }

  if (params.platform === 'all' || params.platform === 'instagram') {
    const instagramQuery = supabase
      .from('instagram_latest_metrics')
      .select('p_id, view_count, like_count, comment_count')
      .in('p_id', platformProjectIds)

    const { data: instagramMetrics, error: instagramError } = await instagramQuery

    if (instagramError) {
      const wrapped = new Error(`Failed to load Instagram metrics: ${instagramError.message}`)
      wrapped.name = 'SupabaseQueryError'
      ;(wrapped as { cause?: unknown }).cause = instagramError
      throw wrapped
    }

    if (instagramMetrics) {
      for (const metric of instagramMetrics) {
        const up = userProjects.find((u) => u.p_id === metric.p_id)
        if (!up) continue

        // Handle both predefined roles and custom roles
        let groupKey: string
        if (up.u_role) {
          // Custom role
          if (params.groupBy === 'category') {
            groupKey = 'Custom' // Custom roles go into "Custom" category
          } else {
            groupKey = up.u_role as string
          }
        } else {
          const role = up.roles as { role_name: string; category: string | null } | null
          if (!role) continue // Skip if no role assigned
          groupKey = params.groupBy === 'category' ? (role.category ?? 'Unknown') : role.role_name
        }

        let metricValue = 0
        switch (params.metric) {
          case 'views':
            metricValue = (metric.view_count as number) ?? 0
            break
          case 'likes':
            metricValue = (metric.like_count as number) ?? 0
            break
          case 'comments':
            metricValue = (metric.comment_count as number) ?? 0
            break
          default:
            metricValue = (metric.view_count as number) ?? 0
        }

        roleMetricMap.set(groupKey, (roleMetricMap.get(groupKey) ?? 0) + metricValue)
      }
    }
  }

  const total = Array.from(roleMetricMap.values()).reduce((sum, val) => sum + val, 0)
  const data: RoleImpactDataPoint[] = Array.from(roleMetricMap.entries()).map(([label, value]) => ({
    label,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
  }))

  return { data, total }
}

metricsRouter.get('/role-impact', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const query = roleImpactQuerySchema.parse(req.query)
    const supabase = createSupabaseUserClient(req.auth.token)

    const result = await loadRoleImpact(supabase, req.auth.userId, query)

    res.json({
      groupBy: query.groupBy,
      metric: query.metric,
      platform: query.platform,
      dateRange: query.dateRange,
      mode: query.mode,
      data: result.data,
      total: result.total,
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


