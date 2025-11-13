import { type Project } from '../../hooks/api/projects'
import { ProjectKebabMenu } from '../../pages/dashboard/ProjectKebabMenu'

type ProjectCardProps = {
  project: Project
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  showActions?: boolean
}

export function ProjectCard({ project, onEdit, onDelete, showActions = false }: ProjectCardProps) {
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/40 transition-all hover:border-slate-700/70 hover:bg-slate-950/60">
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
        <div className="absolute right-2 top-2 flex items-center gap-2">
          <div className="rounded-md border border-slate-800/70 bg-slate-950/80 px-2 py-1 text-[0.65rem] uppercase tracking-[0.1em] text-slate-400 backdrop-blur-sm">
            {project.platform.toUpperCase()}
          </div>
          {showActions && project.platform === 'youtube' && onEdit && onDelete && (
            <ProjectKebabMenu
              project={project}
              onEdit={() => onEdit(project)}
              onDelete={() => onDelete(project)}
            />
          )}
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
  )
}

