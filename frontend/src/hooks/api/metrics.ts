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


