import { useState, useRef, useEffect } from 'react'

import { type Project } from '../../hooks/api/projects'

type ProjectKebabMenuProps = {
  project: Project
  onEdit: () => void
  onDelete: () => void
}

export function ProjectKebabMenu({ project, onEdit, onDelete }: ProjectKebabMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleEdit = () => {
    setIsOpen(false)
    onEdit()
  }

  const handleDelete = () => {
    setIsOpen(false)
    onDelete()
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition hover:bg-black/80"
        aria-label="Project options"
        aria-expanded={isOpen}
      >
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-slate-700/80 bg-slate-900/95 shadow-xl backdrop-blur-sm"
        >
          <div className="py-1">
            <button
              type="button"
              onClick={handleEdit}
              className="w-full px-4 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800/80"
            >
              Edit Project
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm text-rose-200 transition hover:bg-slate-800/80"
            >
              Delete Project
            </button>
            <div className="my-1 border-t border-slate-700/50" />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-800/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

