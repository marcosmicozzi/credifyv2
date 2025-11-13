import { NavLink, Outlet } from 'react-router-dom'
import { useMemo } from 'react'

import { useAuth } from '../../providers/AuthProvider'

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'Profile', to: '/profile' },
  { label: 'Settings', to: '/settings' },
]

const badgeClasses =
  'inline-flex items-center rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-slate-400'

export function RootLayout() {
  const { user, signOut } = useAuth()

  const userInitials = useMemo(() => {
    const source = user?.name ?? user?.email ?? ''

    if (!source) {
      return 'CR'
    }

    const initials = source
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment[0] ?? '')
      .join('')
      .slice(0, 2)

    return initials.toUpperCase() || 'CR'
  }, [user?.email, user?.name])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-930 to-slate-900 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[18rem_1fr]">
        <aside className="hidden border-r border-slate-900/80 bg-slate-950/90 lg:flex lg:flex-col">
          <div className="flex items-center justify-between px-6 py-6">
            <span className="text-lg font-semibold tracking-tight text-slate-100">CredifyV2</span>
            <span className={badgeClasses}>{user?.isDemo ? 'demo' : 'beta'}</span>
          </div>
          <nav className="mt-4 flex flex-1 flex-col gap-2 px-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-xl px-4 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-slate-100 text-slate-950 shadow-[0_10px_40px_-20px_rgba(148,163,184,0.8)]'
                      : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-100',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-slate-900/80 px-6 py-6 text-xs text-slate-500">
            Signed in as {user?.email ?? 'unknown'} • Instagram sync pending
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-900/80 bg-slate-950/60 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className={badgeClasses}>Creator workspace</span>
                <span className="hidden sm:inline">Monitor reach, engagement, and collaborations</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden flex-col text-right text-xs text-slate-500 sm:flex">
                  <span className="text-sm font-medium text-slate-200">{user?.name ?? 'Credify Creator'}</span>
                  <span>{user?.email ?? 'demo@credify.ai'}</span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-sm font-semibold uppercase text-slate-300">
                  {userInitials}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void signOut()
                  }}
                  className="hidden rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:bg-slate-800/80 hover:text-slate-100 sm:inline-flex"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 pb-10 pt-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-10">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-slate-900/80 bg-slate-950/70 px-6 py-5 text-xs text-slate-500">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <span>© {new Date().getFullYear()} Credify Labs</span>
              <span>Supabase · Instagram Graph API · YouTube Data API</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default RootLayout

