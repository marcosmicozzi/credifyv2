import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/apiClient'
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

const summaryQueryKey = ['metrics', 'summary'] as const

export function useMetricsSummary() {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: summaryQueryKey,
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<MetricsSummaryResponse>('/api/metrics/summary', {
        accessToken,
      })

      return response.summary
    },
    staleTime: 60_000,
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


