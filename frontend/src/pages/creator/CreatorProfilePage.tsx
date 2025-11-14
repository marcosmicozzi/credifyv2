import { useParams, Link } from 'react-router-dom'

import { useUserProfile } from '../../hooks/api/users'
import { useFollowUser, useUnfollowUser } from '../../hooks/api/users'
import { useAuth } from '../../providers/AuthProvider'

export function CreatorProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const { data: profile, isLoading } = useUserProfile(userId ?? null)
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()

  const handleFollowToggle = async () => {
    if (!userId || !profile) return

    if (profile.isFollowing) {
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

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-400">Loading profile...</div>
        </div>
      </section>
    )
  }

  if (!profile) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h1 className="text-xl font-semibold text-white">Creator not found</h1>
          <p className="mt-2 text-sm text-slate-400">This creator profile doesn't exist or is unavailable.</p>
        </div>
      </section>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-6">
          {/* Avatar */}
          {profile.profileImageUrl ? (
            <img
              src={profile.profileImageUrl}
              alt={profile.name ?? profile.email}
              className="h-24 w-24 rounded-full object-cover border-2 border-slate-800"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 text-xl font-semibold text-slate-300">
              {getUserInitials(profile.name, profile.email)}
            </div>
          )}

          {/* User info */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {profile.name ?? profile.email}
            </h1>
            {profile.name && <p className="mt-1 text-sm text-slate-400">{profile.email}</p>}
            {profile.bio && <p className="mt-3 text-sm text-slate-300">{profile.bio}</p>}
            <p className="mt-2 text-xs text-slate-500">
              Joined {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Follow button (if not own profile) */}
        {!isOwnProfile && (
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={followUser.isPending || unfollowUser.isPending}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
              profile.isFollowing
                ? 'border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            {profile.isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        {isOwnProfile && (
          <Link
            to="/profile"
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-center">
          <div className="text-2xl font-semibold text-white">{profile.stats.followers}</div>
          <div className="mt-1 text-xs text-slate-400">Followers</div>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-center">
          <div className="text-2xl font-semibold text-white">{profile.stats.following}</div>
          <div className="mt-1 text-xs text-slate-400">Following</div>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-4 text-center">
          <div className="text-2xl font-semibold text-white">{profile.stats.collaborators}</div>
          <div className="mt-1 text-xs text-slate-400">Collaborators</div>
        </div>
      </div>

      {/* Projects */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Projects</h2>
        {profile.projects.length === 0 ? (
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-8 text-center">
            <p className="text-sm text-slate-400">No projects yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.projects.map((project) => (
              <div
                key={project.id}
                className="group overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/50 transition hover:border-slate-700/80"
              >
                {project.thumbnailUrl ? (
                  <div className="aspect-video overflow-hidden bg-slate-900">
                    <img
                      src={project.thumbnailUrl}
                      alt={project.title ?? 'Project thumbnail'}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-900" />
                )}
                <div className="p-4">
                  {project.title && (
                    <h3 className="mb-1 line-clamp-2 text-sm font-medium text-white">{project.title}</h3>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="capitalize">{project.platform}</span>
                    {project.role && (
                      <>
                        <span>•</span>
                        <span>{project.role}</span>
                      </>
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

export default CreatorProfilePage

