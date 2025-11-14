import { useState, useEffect } from 'react'
import { useAuth } from '../../providers/AuthProvider'
import { useUserStats, useUpdateDisplayName } from '../../hooks/api/users'
import { InstagramIntegrationCard } from '../settings/InstagramIntegrationCard'

export function ProfilePage() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useUserStats(user?.id ?? null)
  const updateDisplayName = useUpdateDisplayName()
  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Sync displayName state when user.name changes
  useEffect(() => {
    setDisplayName(user?.name ?? '')
  }, [user?.name])

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Creator Profile</h1>
          <p className="mt-2 text-sm text-slate-400">
            Verify identity, manage brand-safe credentials, and view Instagram linkage status.
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="flex flex-col gap-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
          <h2 className="text-lg font-semibold text-white">Account Basics</h2>
          <dl className="grid gap-3 text-sm text-slate-400">
            <div className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt className="text-slate-400">Name / Display Name</dt>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-600/50"
                    maxLength={100}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSaving(true)
                      try {
                        const trimmedName = displayName.trim()
                        console.log('[ProfilePage] Attempting to save display name:', trimmedName || null)
                        const updatedUser = await updateDisplayName.mutateAsync(trimmedName || null)
                        console.log('[ProfilePage] Successfully saved display name:', updatedUser)
                        // Update local state with the response from server
                        setDisplayName(updatedUser.name ?? '')
                        setIsEditing(false)
                      } catch (error) {
                        console.error('[ProfilePage] Failed to update display name:', error)
                        // Keep editing mode open on error so user can retry
                        const errorMessage =
                          error instanceof Error
                            ? error.message
                            : 'Failed to save display name. Please try again.'
                        alert(`Failed to save: ${errorMessage}`)
                      } finally {
                        setIsSaving(false)
                      }
                    }}
                    disabled={isSaving || updateDisplayName.isPending}
                    className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving || updateDisplayName.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayName(user?.name ?? '')
                      setIsEditing(false)
                    }}
                    disabled={isSaving || updateDisplayName.isPending}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <dd className="font-medium text-white">{user?.name ?? 'Not set'}</dd>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayName(user?.name ?? '')
                      setIsEditing(true)
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt>Email</dt>
              <dd className="font-medium text-white">{user?.email ?? 'demo@credify.ai'}</dd>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt>Role</dt>
              <dd className="font-medium text-white">{user?.isDemo ? 'Demo Creator' : 'Creator'}</dd>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt>Project Slots</dt>
              <dd className="font-medium text-white">Unlimited</dd>
            </div>
          </dl>
        </article>

        <div className="lg:col-span-1">
          <InstagramIntegrationCard />
        </div>
      </div>

      {/* Social Stats */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Social Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-center">
            <div className="text-2xl font-semibold text-white">
              {statsLoading ? '...' : stats?.followers ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-400">Followers</div>
          </div>
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-center">
            <div className="text-2xl font-semibold text-white">
              {statsLoading ? '...' : stats?.following ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-400">Following</div>
          </div>
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-center">
            <div className="text-2xl font-semibold text-white">
              {statsLoading ? '...' : stats?.collaborators ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-400">Collaborators</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ProfilePage

