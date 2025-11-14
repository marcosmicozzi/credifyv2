import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useActivity } from '../../hooks/api/activity'
import { useFollowUser, useUnfollowUser } from '../../hooks/api/users'
import { useAuth } from '../../providers/AuthProvider'

type FeedType = 'following' | 'foryou'

export function ExplorePage() {
  const { user } = useAuth()
  const [feedType, setFeedType] = useState<FeedType>('foryou')
  const { data: activities, isLoading } = useActivity(feedType)
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      await unfollowUser.mutateAsync(userId)
    } else {
      await followUser.mutateAsync(userId)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
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
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Explore</h1>
          <p className="mt-2 text-sm text-slate-400">Discover what the Credify community is doing.</p>
        </div>
      </header>

      <div className="mt-8">
        {/* Toggle */}
        <div className="mb-6 flex gap-2 border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setFeedType('following')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              feedType === 'following'
                ? 'border-b-2 border-slate-100 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Following
          </button>
          <button
            type="button"
            onClick={() => setFeedType('foryou')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              feedType === 'foryou'
                ? 'border-b-2 border-slate-100 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            For you
          </button>
        </div>

        {/* Activity Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-slate-400">Loading activities...</div>
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-400">
              {feedType === 'following'
                ? "You're not following anyone yet. Start following creators to see their activity here."
                : 'No activity to show yet. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={`${activity.type}-${activity.user.id}-${activity.timestamp}-${index}`}
                className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-6"
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <Link to={`/creator/${activity.user.id}`} className="flex-shrink-0">
                    {activity.user.profileImageUrl ? (
                      <img
                        src={activity.user.profileImageUrl}
                        alt={activity.user.name ?? activity.user.email}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 text-sm font-semibold text-slate-300">
                        {getUserInitials(activity.user.name, activity.user.email)}
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          to={`/creator/${activity.user.id}`}
                          className="font-medium text-white hover:text-slate-200"
                        >
                          {activity.user.name ?? activity.user.email}
                        </Link>
                        {activity.type === 'project_claimed' && (
                          <p className="mt-1 text-sm text-slate-400">
                            claimed a new {activity.data.platform} project
                            {activity.data.role && ` as ${activity.data.role}`}
                          </p>
                        )}
                        {activity.type === 'instagram_connected' && (
                          <p className="mt-1 text-sm text-slate-400">
                            connected their Instagram account
                            {activity.data.username && ` (@${activity.data.username})`}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">{formatTimestamp(activity.timestamp)}</p>
                      </div>

                      {/* Follow button (if not current user) - Note: We'd need to track follow status per activity item */}
                      {activity.user.id !== user?.id && (
                        <button
                          type="button"
                          onClick={() => handleFollowToggle(activity.user.id, false)}
                          disabled={followUser.isPending || unfollowUser.isPending}
                          className="ml-4 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700/50 hover:text-white disabled:opacity-50"
                        >
                          Follow
                        </button>
                      )}
                    </div>

                    {/* Project thumbnail if available */}
                    {activity.type === 'project_claimed' && activity.data.thumbnailUrl && (
                      <div className="mt-3">
                        <Link
                          to={`/creator/${activity.user.id}`}
                          className="block overflow-hidden rounded-lg border border-slate-800/80"
                        >
                          <img
                            src={activity.data.thumbnailUrl}
                            alt={activity.data.projectTitle ?? 'Project thumbnail'}
                            className="h-32 w-full object-cover"
                          />
                        </Link>
                        {activity.data.projectTitle && (
                          <p className="mt-2 text-sm text-slate-300">{activity.data.projectTitle}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default ExplorePage

