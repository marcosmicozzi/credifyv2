import { useDeleteProject, type Project } from '../../hooks/api/projects'

type DeleteProjectConfirmationProps = {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  onSuccess: () => void
}

export function DeleteProjectConfirmation({
  isOpen,
  onClose,
  project,
  onSuccess,
}: DeleteProjectConfirmationProps) {
  const deleteMutation = useDeleteProject()

  if (!isOpen || !project) {
    return null
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(project.id)
      onSuccess()
      onClose()
    } catch (err) {
      // Error handling is done by the mutation
      console.error('Failed to delete project:', err)
    }
  }

  const handleClose = () => {
    if (!deleteMutation.isPending) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="delete-modal-title" className="text-xl font-semibold text-white">
            Delete Project
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={deleteMutation.isPending}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete this project? This will permanently remove the project and all
            associated metrics.
          </p>

          {project.title && (
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
              <p className="text-xs text-slate-500">Project:</p>
              <p className="mt-1 text-sm font-medium text-white">{project.title}</p>
            </div>
          )}

          {deleteMutation.isError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Failed to delete project'}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleteMutation.isPending}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex-1 rounded-lg border border-rose-500/70 bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

