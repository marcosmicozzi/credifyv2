import { useEffect, useState } from 'react'

import { useUpdateProject, type Project } from '../../hooks/api/projects'
import { useRoles } from '../../hooks/api/roles'

type EditProjectModalProps = {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSuccess: () => void
}

export function EditProjectModal({ isOpen, onClose, project, onSuccess }: EditProjectModalProps) {
  const [roleId, setRoleId] = useState<number | null>(null)
  const [customRole, setCustomRole] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: roles, isLoading: rolesLoading } = useRoles()
  const updateMutation = useUpdateProject()

  useEffect(() => {
    if (project) {
      setRoleId(project.assignment?.roleId ?? null)
      setCustomRole(project.assignment?.customRole ?? '')
    }
  }, [project])

  if (!isOpen || !project) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await updateMutation.mutateAsync({
        projectId: project.id,
        input: {
          assignment: {
            roleId: roleId,
            customRole: customRole.trim() || null,
          },
        },
      })
      onSuccess()
      onClose()
    } catch (err) {
      const apiError = err as { message?: string; error?: string }
      setError(apiError.message ?? apiError.error ?? 'Failed to update project')
    }
  }

  const handleClose = () => {
    if (!updateMutation.isPending) {
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
      aria-labelledby="edit-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="edit-modal-title" className="text-xl font-semibold text-white">
            Edit Project
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={updateMutation.isPending}
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
            <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-300">
              Role
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
                  setRoleId(value ? Number.parseInt(value, 10) : null)
                }}
                disabled={updateMutation.isPending}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-white focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              >
                <option value="">Select a role...</option>
                {roles?.map((role) => (
                  <option key={role.roleId} value={String(role.roleId)}>
                    {role.roleName} {role.category ? `(${role.category})` : ''}
                  </option>
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
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="e.g., Motion Graphics Designer"
              disabled={updateMutation.isPending}
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
              disabled={updateMutation.isPending}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 rounded-lg border border-emerald-500/70 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

