import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiRequest, ApiError } from '../../lib/apiClient'
import { useAuth } from '../../providers/AuthProvider'

export type ProjectAssignment = {
  roleId: number | null
  roleName: string | null
  roleCategory: string | null
  customRole: string | null
}

export type Project = {
  id: string
  title: string | null
  description: string | null
  link: string
  platform: string
  channel: string | null
  postedAt: string | null
  thumbnailUrl: string | null
  createdAt: string
  assignment: ProjectAssignment | null
}

type ProjectsResponse = {
  projects: Project[]
}

type ProjectResponse = {
  project: Project
}

export type CreateProjectInput = {
  id?: string
  title?: string | null
  description?: string | null
  link: string
  platform?: 'youtube' | 'instagram' | 'tiktok' | 'vimeo' | 'other'
  channel?: string | null
  postedAt?: string | null
  thumbnailUrl?: string | null
  assignment?: {
    roleId?: number | null
    customRole?: string | null
  }
}

const projectsQueryKey = ['projects'] as const

export function useProjects() {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: projectsQueryKey,
    enabled: authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<ProjectsResponse>('/api/projects', {
        accessToken,
      })

      return response.projects
    },
    staleTime: 60_000,
  })
}

export function useProject(projectId: string | null | undefined) {
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useQuery({
    queryKey: [...projectsQueryKey, projectId],
    enabled: Boolean(projectId) && authStatus === 'authenticated' && Boolean(accessToken),
    queryFn: async () => {
      const response = await apiRequest<ProjectResponse>(`/api/projects/${projectId}`, {
        accessToken,
      })

      return response.project
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.type === 'supabase' ? session.accessToken : null

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (authStatus !== 'authenticated' || session?.type !== 'supabase' || !accessToken) {
        throw new ApiError(401, 'Authentication required to create projects.', null)
      }

      const response = await apiRequest<ProjectResponse>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(input),
        accessToken,
      })

      return response.project
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      void queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        previous ? [project, ...previous] : [project],
      )
    },
  })
}

export type ClaimYouTubeProjectInput = {
  url: string
  roleId?: number | null
  customRole?: string | null
}

export function useClaimYouTubeProject() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async (input: ClaimYouTubeProjectInput) => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'Authentication required to claim projects.', null)
      }

      const response = await apiRequest<ProjectResponse>('/api/projects/claim/youtube', {
        method: 'POST',
        body: JSON.stringify(input),
        accessToken,
      })

      return response.project
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      void queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        previous ? [project, ...previous] : [project],
      )
    },
  })
}

export type UpdateProjectInput = {
  assignment?: {
    roleId?: number | null
    customRole?: string | null
  }
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async ({ projectId, input }: { projectId: string; input: UpdateProjectInput }) => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'Authentication required to update projects.', null)
      }

      const response = await apiRequest<ProjectResponse>(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
        accessToken,
      })

      return response.project
    },
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      void queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        previous ? previous.map((p) => (p.id === project.id ? project : p)) : [project],
      )
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { status: authStatus, session } = useAuth()
  const accessToken = session?.accessToken ?? null

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (authStatus !== 'authenticated' || !accessToken) {
        throw new ApiError(401, 'Authentication required to delete projects.', null)
      }

      await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
        accessToken,
      })

      return projectId
    },
    onSuccess: (projectId) => {
      void queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      void queryClient.setQueryData<Project[]>(projectsQueryKey, (previous) =>
        previous ? previous.filter((p) => p.id !== projectId) : [],
      )
    },
  })
}


