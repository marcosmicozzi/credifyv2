import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/apiClient'
import { useAuth } from '../../providers/AuthProvider'

export type Role = {
  roleId: number
  roleName: string
  category: string | null
}

type RolesResponse = {
  roles: Role[]
}

const rolesQueryKey = ['roles'] as const

export function useRoles() {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: rolesQueryKey,
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<RolesResponse>('/api/roles', {
        accessToken,
      })

      return response.roles
    },
    staleTime: 300_000, // 5 minutes - roles don't change often
  })
}

