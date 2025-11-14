import { useAuth } from '../../providers/AuthProvider'
import { useUserStats } from '../../hooks/api/users'
import { InstagramIntegrationCard } from '../settings/InstagramIntegrationCard'

export function ProfilePage() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useUserStats(user?.id ?? null)

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

