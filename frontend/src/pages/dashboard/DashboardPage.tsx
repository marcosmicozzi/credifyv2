const metrics = [
  { label: 'Total Reach', value: '—', helper: 'Rolling 7-day total' },
  { label: 'Engagement Rate', value: '—', helper: 'Interactions per follower' },
  { label: 'Content Views', value: '—', helper: 'Cross-platform last 24h' },
  { label: 'Active Projects', value: '—', helper: 'Linked brand campaigns' },
]

const checklist = [
  'Connect Supabase credentials',
  'Enable Instagram OAuth redirect',
  'Configure YouTube ingestion webhook',
  'Schedule nightly metrics refresh',
]

export function DashboardPage() {
  return (
    <>
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Creator Command Center</h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Track creator growth, campaign performance, and cross-platform health in real-time once integrations are
          reconnected to the new Credify stack.
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.8)]"
          >
            <header className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-500">
              <span>{metric.label}</span>
              <span className="rounded-full border border-slate-800/70 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                Live soon
              </span>
            </header>
            <p className="mt-5 text-4xl font-semibold tracking-tight text-white">{metric.value}</p>
            <p className="mt-3 text-xs text-slate-500">{metric.helper}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">Performance Overview</h2>
            <span className="text-xs uppercase tracking-[0.28em] text-slate-500">Integrations pending</span>
          </header>
          <p className="mt-5 max-w-3xl text-sm text-slate-400">
            Historical charts for reach, impressions, and conversions will render here once the Instagram Graph API and
            YouTube jobs finish migrating to the new Express pipeline.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {['Audience growth', 'Engagement lift'].map((segment) => (
              <div key={segment} className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-5">
                <h3 className="text-sm font-medium text-white">{segment}</h3>
                <p className="mt-3 text-xs text-slate-500">Status: syncing soon</p>
              </div>
            ))}
          </div>
        </article>

        <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
          <h2 className="text-lg font-semibold tracking-tight text-white">Launch Checklist</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-400">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-500/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </>
  )
}

export default DashboardPage

