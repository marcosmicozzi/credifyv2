import logoImage from '../../assets/logo.png'

type BadgeCardProps = {
  userName: string
  totalViews: number
  totalProjects: number
  connectedPlatforms: string[]
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function BadgeCard({ userName, totalViews, totalProjects, connectedPlatforms }: BadgeCardProps) {
  return (
    <div
      id="badge-card"
      className="relative flex flex-col items-center justify-center rounded-xl border-2 border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl"
      style={{ width: '480px', minHeight: '360px' }}
    >
      {/* Credify Logo */}
      <div className="mb-4">
        <img src={logoImage} alt="Credify" className="h-10 w-auto object-contain" />
      </div>

      {/* User Name */}
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">{userName}</h2>

      {/* Ranking Badge */}
      <div className="mb-4 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-4 py-1.5">
        <p className="text-sm font-semibold text-emerald-200">Top 5% of the creative industry on Credify</p>
      </div>

      {/* Key Stats */}
      <div className="mt-3 grid w-full max-w-xs grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-center">
          <p className="text-xl font-bold text-white">{formatNumber(totalViews)}</p>
          <p className="mt-1 text-xs text-slate-400">Total Views</p>
        </div>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-center">
          <p className="text-xl font-bold text-white">{totalProjects}</p>
          <p className="mt-1 text-xs text-slate-400">Projects</p>
        </div>
      </div>

      {/* Connected Platforms */}
      {connectedPlatforms.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <p className="text-xs text-slate-400">Connected:</p>
          <div className="flex gap-1.5">
            {connectedPlatforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-slate-800/70 bg-slate-900/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-300"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute right-4 top-4 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="absolute bottom-4 left-4 h-12 w-12 rounded-full bg-emerald-500/10 blur-xl" />
    </div>
  )
}

