import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useYouTubeAuthorize, useYouTubeIntegrationStatus, useYouTubeSync } from '../../hooks/api/integrations'
import { apiBaseUrl } from '../../lib/env'

type OAuthMessagePayload = {
  source?: string
  status?: 'success' | 'error'
  message?: string
}

export function YouTubeIntegrationCard() {
  const queryClient = useQueryClient()
  const query = useYouTubeIntegrationStatus()
  const authorizeMutation = useYouTubeAuthorize()
  const syncMutation = useYouTubeSync()

  const backendOrigin = useMemo(() => {
    try {
      return new URL(apiBaseUrl).origin
    } catch {
      return apiBaseUrl
    }
  }, [])

  const [connectionMessage, setConnectionMessage] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent<OAuthMessagePayload>) => {
      if (!event.data || typeof event.data !== 'object') {
        return
      }

      if (event.data.source !== 'credify-youtube-oauth') {
        return
      }

      if (backendOrigin && event.origin !== backendOrigin) {
        return
      }

      popupRef.current?.close()
      popupRef.current = null

      if (event.data.status === 'success') {
        setConnectionMessage('YouTube connected successfully.')
        setTimeout(() => setConnectionMessage(null), 5000)
        queryClient.invalidateQueries({ queryKey: ['integrations', 'youtube', 'status'] }).catch(() => {})
      } else {
        setConnectionMessage(event.data.message ?? 'Failed to connect YouTube.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [backendOrigin, queryClient])

  const handleConnect = () => {
    setConnectionMessage(null)

    authorizeMutation.mutate(undefined, {
      onSuccess: ({ authorizationUrl }) => {
        popupRef.current = window.open(
          authorizationUrl,
          'credify-youtube-oauth',
          'width=480,height=720,noopener,noreferrer',
        )

        if (!popupRef.current) {
          setConnectionMessage('Please allow pop-ups to connect your YouTube account.')
        }
      },
      onError: (error) => {
        setConnectionMessage(error instanceof Error ? error.message : 'Unable to start YouTube connection.')
      },
    })
  }

  const handleSync = () => {
    setSyncMessage(null)
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.syncedVideoCount > 0) {
          setSyncMessage(
            `Synced ${result.syncedVideoCount} video${result.syncedVideoCount === 1 ? '' : 's'} at ${result.snapshotDate}`,
          )
        } else {
          setSyncMessage(result.details ?? 'No new metrics were available.')
        }
        setTimeout(() => setSyncMessage(null), 5000)
      },
      onError: (error) => {
        setSyncMessage(error instanceof Error ? error.message : 'Failed to sync metrics.')
      },
    })
  }

  const connected = query.data?.connected ?? false
  const account = query.data?.accountUsername ?? query.data?.accountId ?? null

  return (
    <article className="flex flex-col gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">YouTube Integration</h2>
          <p className="text-sm text-slate-400">
            Connect your YouTube account to sync metrics for claimed videos and keep analytics up to date.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.25em] ${
            connected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
              : 'border-slate-700/60 bg-slate-800/50 text-slate-400'
          }`}
        >
          {connected ? 'Connected' : 'Not Connected'}
        </span>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="space-y-2 text-sm text-slate-300">
          {connected ? (
            <>
              <p>
                <span className="text-slate-400">Channel:</span>{' '}
                <span className="text-white font-medium">{account ?? 'Unknown channel'}</span>
              </p>
              {query.data?.expiresAt && (
                <p className="text-slate-400">
                  Token refresh scheduled for{' '}
                  {new Date(query.data.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
              <p className="text-slate-500">
                Use “Sync latest metrics” to pull fresh engagement data for your claimed videos.
              </p>
            </>
          ) : (
            <p>Connect your Google account to grant read-only access to YouTube Analytics for your claimed videos.</p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConnect}
            disabled={authorizeMutation.isPending || query.isLoading}
            className="rounded-lg border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {connected ? 'Reconnect YouTube' : 'Connect YouTube'}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={!connected || syncMutation.isPending}
            className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700/60 disabled:opacity-50"
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync latest metrics'}
          </button>
        </div>
      </div>

      {(connectionMessage || syncMessage) && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-3 text-sm text-slate-200">
          {connectionMessage ?? syncMessage}
        </div>
      )}
    </article>
  )
}

export default YouTubeIntegrationCard


