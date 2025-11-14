import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSearchUsers } from '../../hooks/api/users'
import { useFollowUser, useUnfollowUser } from '../../hooks/api/users'

export function CreatorSearch() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { data: users, isLoading } = useSearchUsers(query)
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(value.length > 0)
  }

  const handleUserClick = (userId: string) => {
    navigate(`/creator/${userId}`)
    setQuery('')
    setIsOpen(false)
  }

  const handleFollowToggle = async (e: React.MouseEvent, userId: string, isFollowing: boolean) => {
    e.stopPropagation()
    if (isFollowing) {
      await unfollowUser.mutateAsync(userId)
    } else {
      await followUser.mutateAsync(userId)
    }
  }

  const getUserInitials = (name: string | null, email: string) => {
    const source = name ?? email
    return source
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="Search creators..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          className="w-full rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-2 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700/50"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border border-slate-800/80 bg-slate-950 shadow-xl">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
          ) : !users || users.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">No creators found</div>
          ) : (
            <div className="py-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-900/80"
                >
                  {/* Avatar */}
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={user.name ?? user.email}
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-xs font-semibold text-slate-300">
                      {getUserInitials(user.name, user.email)}
                    </div>
                  )}

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{user.name ?? user.email}</div>
                    {user.name && <div className="truncate text-xs text-slate-400">{user.email}</div>}
                    {user.mainRole && (
                      <div className="mt-0.5 text-xs text-slate-500">{user.mainRole}</div>
                    )}
                  </div>

                  {/* Follow button */}
                  <button
                    type="button"
                    onClick={(e) => handleFollowToggle(e, user.id, user.isFollowing)}
                    disabled={followUser.isPending || unfollowUser.isPending}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      user.isFollowing
                        ? 'border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

