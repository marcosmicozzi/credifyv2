import { useMemo, useState } from 'react'

import { useProjects } from '../../hooks/api/projects'
import { ClaimYouTubeModal } from './ClaimYouTubeModal'
import { YouTubeAnalyticsView } from './YouTubeAnalyticsView'

type Platform = 'youtube' | 'instagram'

export function AnalyticsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('youtube')
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)

  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsErrored,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects()

  const youtubeProjects = useMemo(
    () => projects?.filter((p) => p.platform === 'youtube') ?? [],
    [projects],
  )

  const primaryProject = youtubeProjects[0] ?? null

  const hasYouTubeProjects = youtubeProjects.length > 0

  const isLoading = projectsLoading
  const hasErrors = projectsErrored

  const errorMessage =
    (projectsError as { message?: string } | null)?.message ?? null

  const handleClaimSuccess = () => {
    void refetchProjects()
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            {selectedPlatform === 'youtube'
              ? `Daily YouTube performance${primaryProject ? ` for ${primaryProject.title ?? primaryProject.link}` : ''}.`
              : 'Instagram analytics coming soon — connect your account in Settings.'}
          </p>
        </div>

        {/* Platform Switcher */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedPlatform('youtube')}
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
              onClick={() => setSelectedPlatform('instagram')}
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
          {selectedPlatform === 'youtube' && (
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(true)}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
            >
              Add YouTube Credit
            </button>
          )}
        </div>
      </header>

      {selectedPlatform === 'youtube' && (
        <>
          {!hasYouTubeProjects && !isLoading && (
            <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
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
                  <h2 className="text-xl font-semibold text-white">No YouTube Projects Yet</h2>
                  <p className="text-sm text-slate-400">
                    Claim a YouTube video to start tracking your analytics and credits.
                </p>
              </div>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="rounded-lg border border-emerald-500/70 bg-emerald-500/20 px-6 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30"
                >
                  Claim YouTube Video
                </button>
              </div>
            </article>
          )}

          {hasYouTubeProjects && (
            <YouTubeAnalyticsView
              primaryProject={primaryProject}
              isLoading={isLoading}
              hasErrors={hasErrors}
              errorMessage={errorMessage}
            />
          )}
        </>
      )}

      {selectedPlatform === 'instagram' && (
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
                </svg>
                </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Instagram Analytics Coming Soon</h2>
              <p className="text-sm text-slate-400">
                Connect your Instagram account in Settings to enable analytics when available.
              </p>
                </div>
                </div>
        </article>
      )}

      <ClaimYouTubeModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onSuccess={handleClaimSuccess}
      />
    </section>
  )
}

export default AnalyticsPage
