import { useMemo, useState } from 'react'

import { useClaimYouTubeProject } from '../../hooks/api/projects'
import { useRoles, type Role } from '../../hooks/api/roles'

type ClaimYouTubeModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ClaimYouTubeModal({ isOpen, onClose, onSuccess }: ClaimYouTubeModalProps) {
  const [url, setUrl] = useState('')
  const [roleId, setRoleId] = useState<number | null>(null)
  const [customRole, setCustomRole] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: roles, isLoading: rolesLoading } = useRoles()
  const claimMutation = useClaimYouTubeProject()

  // Group roles by category for optgroups
  const rolesByCategory = useMemo(() => {
    if (!roles) return new Map<string, Role[]>()
    
    const grouped = new Map<string, Role[]>()
    for (const role of roles) {
      const category = role.category ?? 'Other'
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(role)
    }
    
    // Sort categories and roles within each category
    const sorted = new Map<string, Role[]>()
    const sortedCategories = Array.from(grouped.keys()).sort()
    for (const category of sortedCategories) {
      const categoryRoles = grouped.get(category)!
      sorted.set(category, categoryRoles.sort((a, b) => a.roleName.localeCompare(b.roleName)))
    }
    
    return sorted
  }, [roles])

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    try {
      await claimMutation.mutateAsync({
        url: url.trim(),
        roleId: roleId,
        customRole: customRole.trim() || null,
      })
      setUrl('')
      setRoleId(null)
      setCustomRole('')
      onSuccess()
      onClose()
    } catch (err) {
      const apiError = err as { message?: string; error?: string }
      setError(apiError.message ?? apiError.error ?? 'Failed to claim project')
    }
  }

  const handleClose = () => {
    if (!claimMutation.isPending) {
      setUrl('')
      setRoleId(null)
      setCustomRole('')
      setError(null)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="claim-modal-title" className="text-xl font-semibold text-white">
            Claim YouTube Video
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={claimMutation.isPending}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="youtube-url" className="mb-2 block text-sm font-medium text-slate-300">
              YouTube Video URL
            </label>
            <input
              id="youtube-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={claimMutation.isPending}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Paste any YouTube video URL (youtube.com, youtu.be, etc.)
            </p>
          </div>

          <div>
            <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-300">
              Your Role (Optional)
            </label>
            {rolesLoading ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
                Loading roles...
              </div>
            ) : (
              <select
                id="role"
                value={roleId !== null ? String(roleId) : ''}
                onChange={(e) => {
                  const value = e.target.value
                  const newRoleId = value ? Number.parseInt(value, 10) : null
                  setRoleId(newRoleId)
                  // Clear custom role when a predefined role is selected
                  if (newRoleId !== null) {
                    setCustomRole('')
                  }
                }}
                disabled={claimMutation.isPending}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              >
                <option value="">Select a role...</option>
                {Array.from(rolesByCategory.entries()).map(([category, categoryRoles]) => (
                  <optgroup key={category} label={category}>
                    {categoryRoles.map((role) => (
                      <option key={role.roleId} value={String(role.roleId)}>
                        {role.roleName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="custom-role" className="mb-2 block text-sm font-medium text-slate-300">
              Custom Role (Optional)
            </label>
            <input
              id="custom-role"
              type="text"
              value={customRole}
              onChange={(e) => {
                const value = e.target.value
                setCustomRole(value)
                // Clear predefined role when custom role is entered
                if (value.trim()) {
                  setRoleId(null)
                }
              }}
              placeholder="e.g., Motion Graphics Designer"
              disabled={claimMutation.isPending}
              maxLength={120}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              If your role isn't in the list above, enter it here
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={claimMutation.isPending}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={claimMutation.isPending || !url.trim()}
              className="flex-1 rounded-lg border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {claimMutation.isPending ? 'Claiming...' : 'Claim Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

