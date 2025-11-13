import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useInstagramConnect, useInstagramIntegrationStatus, useInstagramSync } from '../../hooks/api/integrations'
import { apiBaseUrl } from '../../lib/env'

type OAuthMessagePayload = {
  source?: string
  status?: 'success' | 'error'
  message?: string
}

export function InstagramIntegrationCard() {
  const queryClient = useQueryClient()
  const query = useInstagramIntegrationStatus()
  const connectMutation = useInstagramConnect()
  const syncMutation = useInstagramSync()

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

      if (event.data.source !== 'credify-instagram-oauth') {
        return
      }

      if (backendOrigin && event.origin !== backendOrigin) {
        return
      }

      popupRef.current?.close()
      popupRef.current = null

      if (event.data.status === 'success') {
        setConnectionMessage('Instagram connected successfully.')
        setTimeout(() => setConnectionMessage(null), 5000)
        queryClient.invalidateQueries({ queryKey: ['integrations', 'instagram', 'status'] }).catch(() => {})
      } else {
        setConnectionMessage(event.data.message ?? 'Failed to connect Instagram.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [backendOrigin, queryClient])

  const handleConnect = () => {
    setConnectionMessage(null)

    connectMutation.mutate(undefined, {
      onSuccess: ({ authorizationUrl }) => {
        popupRef.current = window.open(
          authorizationUrl,
          'credify-instagram-oauth',
          'width=480,height=720,noopener,noreferrer',
        )

        if (!popupRef.current) {
          setConnectionMessage('Please allow pop-ups to connect your Instagram account.')
        }
      },
      onError: (error) => {
        setConnectionMessage(error instanceof Error ? error.message : 'Unable to start Instagram connection.')
      },
    })
  }

  const handleSync = () => {
    setSyncMessage(null)
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.syncedPostCount > 0 || result.syncedInsightCount > 0) {
          setSyncMessage(
            `Synced ${result.syncedPostCount} post${result.syncedPostCount === 1 ? '' : 's'} and ${result.syncedInsightCount} insight${result.syncedInsightCount === 1 ? '' : 's'} at ${result.snapshotDate}`,
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
          <h2 className="text-lg font-semibold text-white">Instagram Integration</h2>
          <p className="text-sm text-slate-400">
            Connect your Instagram business account to sync metrics and insights for your content.
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
                <span className="text-slate-400">Account:</span>{' '}
                <span className="text-white font-medium">{account ?? 'Unknown account'}</span>
              </p>
              {query.data?.expiresAt && (
                <p className="text-slate-400">
                  Token refresh scheduled for{' '}
                  {new Date(query.data.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
              <p className="text-slate-500">
                Use "Sync latest metrics" to pull fresh engagement data and insights for your Instagram content.
              </p>
            </>
          ) : (
            <p>Connect your Instagram business account to grant access to insights and metrics for your content.</p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConnect}
            disabled={connectMutation.isPending || query.isLoading}
            className="rounded-lg border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {connected ? 'Reconnect Instagram' : 'Connect Instagram'}
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

export default InstagramIntegrationCard

