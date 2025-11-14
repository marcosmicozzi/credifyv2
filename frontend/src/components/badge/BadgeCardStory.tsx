import logoImage from '../../assets/logo.png'

type BadgeCardStoryProps = {
  userName: string
  totalViews: number
  totalProjects: number
  connectedPlatforms: string[]
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function BadgeCardStory({ userName, totalViews, totalProjects, connectedPlatforms }: BadgeCardStoryProps) {
  // Instagram Story format: 9:16 aspect ratio (1080x1920)
  const storyWidth = 1080
  const storyHeight = 1920

  return (
    <div
      id="badge-card-story"
      className="relative flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl"
      style={{ width: `${storyWidth}px`, height: `${storyHeight}px`, padding: '120px 80px' }}
    >
      {/* Credify Logo */}
      <div className="mb-10">
        <img src={logoImage} alt="Credify" className="h-32 w-auto object-contain" />
      </div>

      {/* User Name */}
      <h2 className="mb-8 text-7xl font-bold tracking-tight text-white leading-tight text-center">{userName}</h2>

      {/* Ranking Badge */}
      <div className="mb-12 rounded-full border-2 border-emerald-500/50 bg-emerald-500/20 px-12 py-5">
        <p className="text-2xl font-semibold text-emerald-200">Top 5% of the creative industry on Credify</p>
      </div>

      {/* Key Stats */}
      <div className="grid w-full max-w-2xl grid-cols-2 gap-8">
        <div className="rounded-3xl border-2 border-slate-800/70 bg-slate-950/50 p-10 text-center">
          <p className="text-6xl font-bold text-white leading-none">{formatNumber(totalViews)}</p>
          <p className="mt-4 text-xl text-slate-400">Total Views</p>
        </div>
        <div className="rounded-3xl border-2 border-slate-800/70 bg-slate-950/50 p-10 text-center">
          <p className="text-6xl font-bold text-white leading-none">{totalProjects}</p>
          <p className="mt-4 text-xl text-slate-400">Projects</p>
        </div>
      </div>

      {/* Connected Platforms */}
      {connectedPlatforms.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-lg text-slate-400">Connected platforms</p>
          <div className="flex gap-4">
            {connectedPlatforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full border border-slate-800/70 bg-slate-900/50 px-6 py-3 text-base font-medium uppercase tracking-wider text-slate-300"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute right-20 top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
    </div>
  )
}

