import { useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'

import { useAuth } from '../../providers/AuthProvider'
import { useMetricsSummary } from '../../hooks/api/metrics'
import { useProjects } from '../../hooks/api/projects'
import { useYouTubeIntegrationStatus, useInstagramIntegrationStatus } from '../../hooks/api/integrations'
import { BadgeCard } from './BadgeCard'
import { BadgeCardStory } from './BadgeCardStory'

type BadgeClaimModalProps = {
  isOpen: boolean
  onClose: () => void
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function BadgeClaimModal({ isOpen, onClose }: BadgeClaimModalProps) {
  const { user } = useAuth()
  const { data: summary } = useMetricsSummary()
  const { data: projects } = useProjects()
  const youtubeStatus = useYouTubeIntegrationStatus()
  const instagramStatus = useInstagramIntegrationStatus()

  const badgeCardRef = useRef<HTMLDivElement>(null)
  const badgeStoryRef = useRef<HTMLDivElement>(null)

  const totalViews = summary?.totalViewCount ?? 0
  const totalProjects = projects?.length ?? 0

  const connectedPlatforms: string[] = []
  if (youtubeStatus.data?.connected) {
    connectedPlatforms.push('YouTube')
  }
  if (instagramStatus.data?.connected) {
    connectedPlatforms.push('Instagram')
  }

  const userName = user?.name ?? user?.email ?? 'Creator'

  const handleDownload = useCallback(async () => {
    // Use the story version (hidden) for download
    const badgeElement = badgeStoryRef.current
    if (!badgeElement) {
      return
    }

    try {
      const canvas = await html2canvas(badgeElement, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 1080,
        height: 1920,
      })

      const link = document.createElement('a')
      link.download = `credify-badge-${userName.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Failed to download badge:', error)
    }
  }, [userName])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {/* Hidden story version for download */}
      <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
        <div ref={badgeStoryRef}>
          <BadgeCardStory
            userName={userName}
            totalViews={totalViews}
            totalProjects={totalProjects}
            connectedPlatforms={connectedPlatforms}
          />
        </div>
      </div>

      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-800/80 bg-slate-900/95 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800/50 hover:text-white"
          aria-label="Close modal"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Congratulations Message */}
        <div className="mb-4 text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mb-1 text-xl font-bold text-white">Congratulations!</h2>
          <p className="text-xs text-slate-400">You&apos;ve earned your Credify Industry Badge</p>
        </div>

        {/* Metrics Summary */}
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-slate-800/70 bg-slate-950/50 p-3">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{formatNumber(totalViews)}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Total Views</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{totalProjects}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{connectedPlatforms.length}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Platforms</p>
          </div>
        </div>

        {/* Badge Card */}
        <div className="mb-4 flex justify-center">
          <div ref={badgeCardRef}>
            <BadgeCard
              userName={userName}
              totalViews={totalViews}
              totalProjects={totalProjects}
              connectedPlatforms={connectedPlatforms}
            />
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-6 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download Badge
          </button>
        </div>
      </div>
    </div>
  )
}

