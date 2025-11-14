import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, apiRequest } from '../../lib/apiClient'
import { useAuth } from '../../providers/AuthProvider'

export type MetricsSummary = {
  totalViewCount: number
  totalLikeCount: number
  totalCommentCount: number
  totalShareCount: number
  averageEngagementRate: number
  updatedAt: string | null
  viewGrowth24hPercent: number | null
  followerCount: number | null
}

type MetricsSummaryResponse = {
  summary: MetricsSummary
}

type SyncResult = {
  syncedVideoCount: number
  snapshotDate: string | null
  details?: string
}

export type RefreshMetricsResponse = {
  summary: MetricsSummary
  sync: SyncResult
}

export type MetricPoint = {
  fetchedAt: string
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
  shareCount?: number | null
  reach?: number | null
  saveCount?: number | null
  engagementRate: number | null
}

export type ProjectMetricsResponse = {
  projectId: string
  filters: {
    platform: 'all' | 'youtube' | 'instagram'
    limit: number
  }
  metrics: {
    youtube: MetricPoint[]
    instagram: MetricPoint[]
  }
}

export type ProjectMetricsParams = {
  projectId: string | null | undefined
  platform?: 'youtube' | 'instagram'
  limit?: number
}

export type PlatformMetricsParams = {
  platform: 'youtube' | 'instagram'
  limit?: number
}

export type PlatformMetricsResponse = {
  platform: 'youtube' | 'instagram'
  filters: {
    platform: 'youtube' | 'instagram'
    limit: number
  }
  metrics: {
    youtube: MetricPoint[]
    instagram: MetricPoint[]
  }
}

const summaryQueryKey = ['metrics', 'summary'] as const

export function useMetricsSummary(platform?: 'youtube' | 'instagram') {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: [...summaryQueryKey, platform],
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const query = platform ? `?platform=${platform}` : ''
      const response = await apiRequest<MetricsSummaryResponse>(`/api/metrics/summary${query}`, {
        accessToken,
      })

      return response.summary
    },
    staleTime: 60_000,
  })
}

export function useRefreshMetrics() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async () => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'Authentication required to refresh metrics.', null)
      }

      return apiRequest<RefreshMetricsResponse>('/api/metrics/summary/refresh', {
        method: 'POST',
        accessToken,
      })
    },
    onSuccess: (response) => {
      queryClient.setQueryData(summaryQueryKey, response.summary)
    },
  })
}

export function useProjectMetrics({ projectId, platform, limit }: ProjectMetricsParams) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: ['metrics', 'projects', projectId, { platform, limit }],
    enabled: Boolean(projectId) && authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (platform) {
        query.set('platform', platform)
      }
      if (typeof limit === 'number') {
        query.set('limit', String(limit))
      }

      const response = await apiRequest<ProjectMetricsResponse>(
        `/api/metrics/projects/${projectId}${query.toString() ? `?${query.toString()}` : ''}`,
        {
          accessToken,
        },
      )

      return response
    },
  })
}

export function usePlatformMetrics({ platform, limit }: PlatformMetricsParams) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: ['metrics', 'platform', platform, { limit }],
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (typeof limit === 'number') {
        query.set('limit', String(limit))
      }

      const response = await apiRequest<PlatformMetricsResponse>(
        `/api/metrics/platform/${platform}${query.toString() ? `?${query.toString()}` : ''}`,
        {
          accessToken,
        },
      )

      return response
    },
  })
}

export type InstagramAccountInsightsResponse = {
  platform: 'instagram'
  metric: 'follower_count' | 'reach' | 'profile_views' | 'accounts_engaged'
  insights: Array<{
    fetchedAt: string
    value: number
  }>
}

export type InstagramAccountInsightsParams = {
  metric?: 'follower_count' | 'reach' | 'profile_views' | 'accounts_engaged'
  limit?: number
}

export function useInstagramAccountInsights({ metric, limit, enabled }: InstagramAccountInsightsParams & { enabled?: boolean }) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: ['metrics', 'instagram', 'account-insights', { metric, limit }],
    enabled: (enabled !== false) && authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (metric) {
        query.set('metric', metric)
      }
      if (typeof limit === 'number') {
        query.set('limit', String(limit))
      }

      const response = await apiRequest<InstagramAccountInsightsResponse>(
        `/api/metrics/platform/instagram/account-insights${query.toString() ? `?${query.toString()}` : ''}`,
        {
          accessToken,
        },
      )

      return response
    },
  })
}

export type RoleImpactDataPoint = {
  label: string
  value: number
  percentage: number
}

export type RoleImpactResponse = {
  groupBy: 'role' | 'category'
  metric: 'views' | 'likes' | 'comments' | 'projects'
  platform: 'all' | 'youtube' | 'instagram'
  dateRange: '7d' | '28d' | '90d' | 'all' | 'custom'
  mode: 'full' | 'share_weighted'
  data: RoleImpactDataPoint[]
  total: number
}

export type RoleImpactParams = {
  groupBy?: 'role' | 'category'
  metric?: 'views' | 'likes' | 'comments' | 'projects'
  platform?: 'all' | 'youtube' | 'instagram'
  dateRange?: '7d' | '28d' | '90d' | 'all' | 'custom'
  startDate?: string
  endDate?: string
  mode?: 'full' | 'share_weighted'
}

export function useRoleImpact(params: RoleImpactParams) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: ['metrics', 'role-impact', params],
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params.groupBy) {
        query.set('groupBy', params.groupBy)
      }
      if (params.metric) {
        query.set('metric', params.metric)
      }
      if (params.platform) {
        query.set('platform', params.platform)
      }
      if (params.dateRange) {
        query.set('dateRange', params.dateRange)
      }
      if (params.startDate) {
        query.set('startDate', params.startDate)
      }
      if (params.endDate) {
        query.set('endDate', params.endDate)
      }
      if (params.mode) {
        query.set('mode', params.mode)
      }

      const response = await apiRequest<RoleImpactResponse>(
        `/api/metrics/role-impact${query.toString() ? `?${query.toString()}` : ''}`,
        {
          accessToken,
        },
      )

      return response
    },
    staleTime: 60_000,
  })
}


