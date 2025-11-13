const preferences = [
  {
    title: 'Notifications',
    description: 'Control email summaries and campaign alerts.',
    actions: ['Weekly reach digest', 'Campaign status updates', 'Team invites'],
  },
  {
    title: 'Security',
    description: 'Manage session length and trusted devices.',
    actions: ['Manage Google OAuth access', 'Require OAuth refresh every 30 days', 'View active sessions'],
  },
  {
    title: 'Data Sync',
    description: 'Configure background refresh cadence.',
    actions: ['Instagram nightly sync', 'YouTube weekly sync', 'Supabase backup verification'],
  },
]

export function SettingsPage() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
      <p className="mt-2 text-sm text-slate-400">
        Fine-tune preferences, manage sessions, and supervise data flow between services.
      </p>

      <div className="mt-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {preferences.map((group) => (
            <article key={group.title} className="flex flex-col gap-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
              <header>
                <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{group.description}</p>
              </header>
              <ul className="space-y-3 text-sm text-slate-300">
                {group.actions.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-2 inline-flex w-fit items-center justify-center rounded-lg border border-slate-700/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-300 transition hover:bg-slate-800/80">
                Adjust
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SettingsPage

