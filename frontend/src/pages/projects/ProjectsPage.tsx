import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ProjectCard } from '../../components/projects/ProjectCard'
import { useProjects, type Project } from '../../hooks/api/projects'
import { DeleteProjectConfirmation } from '../dashboard/DeleteProjectConfirmation'
import { EditProjectModal } from '../dashboard/EditProjectModal'

type Platform = 'youtube' | 'instagram'

export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPlatform = (searchParams.get('platform') as Platform) || 'youtube'
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(initialPlatform)

  // Sync with URL params on mount and when they change
  useEffect(() => {
    const platformParam = searchParams.get('platform') as Platform
    if (platformParam && (platformParam === 'youtube' || platformParam === 'instagram')) {
      setSelectedPlatform(platformParam)
    } else if (!platformParam) {
      // Set default platform in URL if not present
      setSearchParams({ platform: 'youtube' }, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsErrored,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects()

  const handlePlatformChange = (platform: Platform) => {
    setSelectedPlatform(platform)
    setSearchParams({ platform })
  }

  const filteredProjects = useMemo(() => {
    if (!projects) return []
    return projects
      .filter((project) => project.platform === selectedPlatform)
      .sort((a, b) => {
        const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0
        const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0
        return dateB - dateA // Descending (newest first)
      })
  }, [projects, selectedPlatform])

  const getErrorMessage = (error: unknown) => {
    if (!error) {
      return null
    }

    if (error instanceof Error) {
      return error.message
    }

    if (typeof error === 'object' && error && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message
    }

    return 'Something went wrong.'
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Projects</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Browse and manage your full library of claimed projects across YouTube and Instagram.
        </p>
      </section>

      {/* Platform Switcher */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePlatformChange('youtube')}
              aria-pressed={selectedPlatform === 'youtube'}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                selectedPlatform === 'youtube'
                  ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-100'
                  : 'border-slate-700/60 bg-slate-800/50 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
              }`}
            >
              YouTube
            </button>
            <button
              type="button"
              onClick={() => handlePlatformChange('instagram')}
              aria-pressed={selectedPlatform === 'instagram'}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                selectedPlatform === 'instagram'
                  ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-100'
                  : 'border-slate-700/60 bg-slate-800/50 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
              }`}
            >
              Instagram
            </button>
          </div>
          {filteredProjects.length > 0 && (
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </span>
          )}
        </div>
      </section>

      {/* Projects Grid */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        {projectsLoading && <p className="text-sm text-slate-400">Loading projects…</p>}
        {projectsErrored && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {getErrorMessage(projectsError)}
          </p>
        )}
        {!projectsLoading && !projectsErrored && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full border border-slate-700/60 bg-slate-800/50 p-4">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">
                No {selectedPlatform === 'youtube' ? 'YouTube' : 'Instagram'} Projects Yet
              </h2>
              <p className="text-sm text-slate-400">
                {selectedPlatform === 'youtube'
                  ? 'Claim a YouTube video to start tracking your credits.'
                  : 'Connect your Instagram account in Settings to enable project syncing.'}
              </p>
            </div>
          </div>
        )}
        {!projectsLoading && !projectsErrored && filteredProjects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={selectedPlatform === 'youtube' ? setEditingProject : undefined}
                onDelete={selectedPlatform === 'youtube' ? setDeletingProject : undefined}
                showActions={selectedPlatform === 'youtube'}
              />
            ))}
          </div>
        )}
      </section>

      <EditProjectModal
        isOpen={editingProject !== null}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onSuccess={() => {
          void refetchProjects()
        }}
      />

      <DeleteProjectConfirmation
        isOpen={deletingProject !== null}
        onClose={() => setDeletingProject(null)}
        project={deletingProject}
        onSuccess={() => {
          void refetchProjects()
        }}
      />
    </>
  )
}

export default ProjectsPage

