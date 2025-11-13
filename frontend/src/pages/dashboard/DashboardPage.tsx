import { useMemo } from 'react'

import { useMetricsSummary } from '../../hooks/api/metrics'
import { useProjects } from '../../hooks/api/projects'
import { useAuth } from '../../providers/AuthProvider'

const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const wholeNumber = new Intl.NumberFormat('en-US')
const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: 'auto',
})

const checklist = [
  'Connect Supabase credentials',
  'Enable Instagram OAuth redirect',
  'Configure YouTube ingestion webhook',
  'Schedule nightly metrics refresh',
]

const formatNumber = (value: number) => compactNumber.format(value)

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

export function DashboardPage() {
  const { session } = useAuth()
  const isDemo = session?.type === 'demo'

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsErrored,
    error: projectsError,
  } = useProjects()
  const {
    data: summary,
    isLoading: metricsLoading,
    isError: metricsErrored,
    error: metricsError,
  } = useMetricsSummary()

  const totalProjects = useMemo(() => projects?.length ?? 0, [projects])

  // Extract unique collaborators from projects
  const collaborators = useMemo(() => {
    if (!projects || projects.length === 0) {
      return []
    }

    // Group projects by channel
    const channelMap = new Map<string, number>()
    for (const project of projects) {
      if (project.channel) {
        const count = channelMap.get(project.channel) ?? 0
        channelMap.set(project.channel, count + 1)
      }
    }

    // Convert to array and sort by project count (descending)
    return Array.from(channelMap.entries())
      .map(([channel, projectCount]) => ({
        channel,
        projectCount,
      }))
      .sort((a, b) => b.projectCount - a.projectCount)
  }, [projects])

  const cardFallback = '—'
  const formatViewGrowth = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return cardFallback
    }

    if (!Number.isFinite(value)) {
      return cardFallback
    }

    return `${percentFormatter.format(value)}%`
  }
  const metricsCards = [
    {
      label: 'Views',
      helper: 'Sum of views across claimed YouTube videos',
      value: metricsLoading
        ? 'Loading…'
        : summary
          ? formatNumber(summary.totalViewCount ?? 0)
          : metricsErrored
            ? 'Error'
            : cardFallback,
    },
    {
      label: 'Likes',
      helper: 'Sum of likes across claimed videos',
      value: metricsLoading
        ? 'Loading…'
        : summary
          ? formatNumber(summary.totalLikeCount ?? 0)
          : metricsErrored
            ? 'Error'
            : cardFallback,
    },
    {
      label: 'Comments',
      helper: 'Sum of comments across claimed videos',
      value: metricsLoading
        ? 'Loading…'
        : summary
          ? formatNumber(summary.totalCommentCount ?? 0)
          : metricsErrored
            ? 'Error'
            : cardFallback,
    },
    {
      label: 'Projects',
      helper: 'Claimed YouTube projects',
      value: projectsLoading
        ? 'Loading…'
        : projectsErrored
          ? 'Error'
          : projects
            ? wholeNumber.format(totalProjects)
          : projectsErrored
            ? 'Error'
            : cardFallback,
    },
  ]

  const projectListState = (() => {
    if (projectsLoading) {
      return { type: 'loading' as const }
    }

    if (projectsErrored) {
      return { type: 'error' as const, message: getErrorMessage(projectsError) }
    }

    if (!projects || projects.length === 0) {
      return {
        type: 'empty' as const,
        message: 'No projects linked yet. Create one from the dashboard once integrations are live.',
      }
    }

    return { type: 'ready' as const }
  })()

  const metricsStateMessage = metricsErrored ? getErrorMessage(metricsError) : null

  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Creator Command Center</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Track creator growth, campaign performance, and cross-platform health in real-time.
        </p>
      </section>

      {isDemo && (
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          You&apos;re viewing the live Credify demo workspace. Data is sourced from Supabase and is read-only—connect
          with Google to see your own projects.
        </section>
      )}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {metricsCards.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.8)]"
          >
            <header className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-500">
              <span>{metric.label}</span>
              <span className="rounded-full border border-slate-800/70 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Live
              </span>
            </header>
            <p className="mt-5 text-4xl font-semibold tracking-tight text-white">{metric.value}</p>
            <p className="mt-3 text-xs text-slate-500">{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Performance Overview</h2>
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {metricsLoading ? 'Loading…' : metricsErrored ? 'Error' : 'Updated'}
            </span>
          </header>
          {metricsErrored && metricsStateMessage && (
            <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {metricsStateMessage}
            </p>
          )}
          {!metricsErrored && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-5">
                <h3 className="text-sm font-medium text-white">Latest Metrics Sync</h3>
                <p className="mt-3 text-xs text-slate-500">
                  {summary?.updatedAt ? new Date(summary.updatedAt).toLocaleString() : cardFallback}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-5">
                <h3 className="text-sm font-medium text-white">24H Growth (%)</h3>
                <p className="mt-3 text-xs text-slate-500">
                  {metricsLoading
                    ? 'Loading…'
                    : metricsErrored
                      ? 'Error'
                      : summary
                        ? formatViewGrowth(summary.viewGrowth24hPercent)
                        : cardFallback}
                </p>
              </div>
            </div>
          )}
        </article>

        <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
          <h2 className="text-lg font-semibold tracking-tight text-white">Launch Checklist</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-400">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-500/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Your Projects</h2>
            <p className="text-xs text-slate-500">Syncs directly from Supabase via the protected API.</p>
          </div>
          {projects && (
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {projects.length} linked {projects.length === 1 ? 'project' : 'projects'}
            </span>
          )}
        </header>

        {projectListState.type === 'loading' && (
          <p className="text-sm text-slate-400">Loading projects…</p>
        )}
        {projectListState.type === 'error' && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {projectListState.message}
          </p>
        )}
        {projectListState.type === 'empty' && (
          <p className="text-sm text-slate-400">{projectListState.message}</p>
        )}
        {projectListState.type === 'ready' && projects && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <article
                key={project.id}
                className="group overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/40 transition-all hover:border-slate-700/70 hover:bg-slate-950/60"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.title ?? 'Project thumbnail'}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg
                        className="h-12 w-12 text-slate-700"
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
                  )}
                  <div className="absolute right-2 top-2 rounded-md border border-slate-800/70 bg-slate-950/80 px-2 py-1 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400 backdrop-blur-sm">
                    {project.platform.toUpperCase()}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-white">
                    {project.title ?? project.link}
                  </h3>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-slate-800/70 bg-slate-900/50 px-2 py-0.5 text-xs text-slate-400">
                        {project.assignment?.roleName ?? project.assignment?.customRole ?? 'Unassigned'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {project.createdAt
                        ? new Date(project.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">My Collaborators</h2>
            <p className="text-xs text-slate-500">Creators and channels you&apos;ve collaborated with.</p>
          </div>
          {collaborators.length > 0 && (
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {collaborators.length} {collaborators.length === 1 ? 'collaborator' : 'collaborators'}
            </span>
          )}
        </header>

        {projectsLoading && (
          <p className="text-sm text-slate-400">Loading collaborators…</p>
        )}
        {projectsErrored && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {getErrorMessage(projectsError)}
          </p>
        )}
        {!projectsLoading && !projectsErrored && collaborators.length === 0 && (
          <p className="text-sm text-slate-400">No collaborators found. Claim projects to see your collaborators here.</p>
        )}
        {!projectsLoading && !projectsErrored && collaborators.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {collaborators.map((collaborator) => (
              <article
                key={collaborator.channel}
                className="group overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/40 p-4 transition-all hover:border-slate-700/70 hover:bg-slate-950/60"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-slate-800/70 bg-slate-900">
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <svg
                        className="h-6 w-6 text-slate-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-white">{collaborator.channel}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {collaborator.projectCount} {collaborator.projectCount === 1 ? 'project' : 'projects'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

export default DashboardPage

