import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest, ApiError } from '../../lib/apiClient'
import { useAuth } from '../../providers/AuthProvider'

export type User = {
  id: string
  email: string
  name: string | null
  profileImageUrl: string | null
  mainRole: string | null
  isFollowing: boolean
}

export type UserProfile = {
  id: string
  email: string
  name: string | null
  bio: string | null
  profileImageUrl: string | null
  createdAt: string
  stats: {
    followers: number
    following: number
    collaborators: number
  }
  isFollowing: boolean
  projects: Array<{
    id: string
    title: string | null
    platform: string
    thumbnailUrl: string | null
    createdAt: string
    role: string | null
  }>
}

type UsersSearchResponse = {
  users: User[]
}

type UserProfileResponse = {
  user: UserProfile
}

type UserStatsResponse = {
  stats: {
    followers: number
    following: number
    collaborators: number
  }
}

const usersQueryKey = ['users'] as const

export function useSearchUsers(query: string) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: [...usersQueryKey, 'search', query],
    enabled: authStatus === 'authenticated' && Boolean(accessToken) && query.length > 0,
    queryFn: async () => {
      const url = new URL('/api/users/search', window.location.origin)
      url.searchParams.set('q', query)
      const response = await apiRequest<UsersSearchResponse>(url.pathname + url.search, {
        accessToken,
      })

      return response.users
    },
    staleTime: 30_000,
  })
}

export function useUserProfile(userId: string | null | undefined) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: [...usersQueryKey, 'profile', userId],
    enabled: Boolean(userId) && authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<UserProfileResponse>(`/api/users/${userId}`, {
        accessToken,
      })

      return response.user
    },
  })
}

export function useUserStats(userId: string | null | undefined) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: [...usersQueryKey, 'stats', userId],
    enabled: Boolean(userId) && authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<UserStatsResponse>(`/api/users/${userId}/stats`, {
        accessToken,
      })

      return response.stats
    },
  })
}

export function useFollowUser() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async (userId: string) => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'Authentication required to follow users.', null)
      }

      await apiRequest(`/api/users/${userId}/follow`, {
        method: 'POST',
        accessToken,
      })

      return userId
    },
    onSuccess: (userId) => {
      void queryClient.invalidateQueries({ queryKey: [...usersQueryKey, 'profile', userId] })
      void queryClient.invalidateQueries({ queryKey: [...usersQueryKey, 'stats', userId] })
      void queryClient.invalidateQueries({ queryKey: [...usersQueryKey, 'search'] })
    },
  })
}

export function useUnfollowUser() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async (userId: string) => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'Authentication required to unfollow users.', null)
      }

      await apiRequest(`/api/users/${userId}/follow`, {
        method: 'DELETE',
        accessToken,
      })

      return userId
    },
    onSuccess: (userId) => {
      void queryClient.invalidateQueries({ queryKey: [...usersQueryKey, 'profile', userId] })
      void queryClient.invalidateQueries({ queryKey: [...usersQueryKey, 'stats', userId] })
      void queryClient.invalidateQueries({ queryKey: [...usersQueryKey, 'search'] })
    },
  })
}

