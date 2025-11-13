import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../../providers/AuthProvider'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <span className="h-3 w-3 animate-ping rounded-full bg-slate-500" />
          <p className="text-sm uppercase tracking-[0.3em]">Preparing workspace…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ redirect: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute

