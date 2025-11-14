import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/apiClient'
import { useAuth } from '../../providers/AuthProvider'

export type ActivityItem = {
  type: 'project_claimed' | 'instagram_connected'
  timestamp: string
  user: {
    id: string
    name: string | null
    email: string
    profileImageUrl: string | null
  }
  data: {
    projectId?: string
    projectTitle?: string | null
    platform?: string
    thumbnailUrl?: string | null
    role?: string | null
    username?: string
  }
}

type ActivityResponse = {
  activities: ActivityItem[]
}

const activityQueryKey = ['activity'] as const

export function useActivity(type: 'following' | 'foryou', limit = 20) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: [...activityQueryKey, type, limit],
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const url = new URL('/api/activity', window.location.origin)
      url.searchParams.set('type', type)
      url.searchParams.set('limit', limit.toString())
      const response = await apiRequest<ActivityResponse>(url.pathname + url.search, {
        accessToken,
      })

      return response.activities
    },
    staleTime: 60_000,
    refetchInterval: 120_000, // Refetch every 2 minutes
  })
}

