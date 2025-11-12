export function AnalyticsPage() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">
            Deep-dive visualizations for reach, impressions, engagement, and conversion metrics.
          </p>
        </div>
        <span className="rounded-full border border-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-500">
          Coming soon
        </span>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {['Reach & Impressions', 'Audience Growth', 'Engagement Quality', 'Content Performance'].map((block) => (
          <article key={block} className="flex flex-col gap-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
            <header>
              <h2 className="text-lg font-semibold text-white">{block}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-500">Visualization placeholder</p>
            </header>
            <p className="text-sm text-slate-400">
              Charts powered by Recharts will render here once data endpoints are finalized in the Express API.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AnalyticsPage

