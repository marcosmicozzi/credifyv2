import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, apiRequest } from '../../lib/apiClient'
import { useAuth } from '../../providers/AuthProvider'

export type YouTubeIntegrationStatus = {
  connected: boolean
  accountId: string | null
  accountUsername: string | null
  expiresAt: string | null
  updatedAt: string | null
}

type YouTubeStatusResponse = {
  status: YouTubeIntegrationStatus
}

type YouTubeAuthorizeResponse = {
  authorizationUrl: string
  redirectUri: string
}

type YouTubeSyncResponse = {
  syncedVideoCount: number
  snapshotDate: string | null
  details?: string
}

const youtubeStatusQueryKey = ['integrations', 'youtube', 'status'] as const

export function useYouTubeIntegrationStatus() {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: youtubeStatusQueryKey,
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<YouTubeStatusResponse>('/api/integrations/youtube/status', {
        accessToken,
      })

      return response.status
    },
    staleTime: 30_000,
  })
}

export function useYouTubeAuthorize() {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async () => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'You need to be signed in to connect YouTube.', null)
      }

      return apiRequest<YouTubeAuthorizeResponse>('/api/integrations/youtube/authorize', {
        method: 'POST',
        accessToken,
      })
    },
  })
}

export function useYouTubeSync() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async () => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'You need to be signed in to sync YouTube metrics.', null)
      }

      return apiRequest<YouTubeSyncResponse>('/api/integrations/youtube/sync', {
        method: 'POST',
        accessToken,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: youtubeStatusQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })
}


