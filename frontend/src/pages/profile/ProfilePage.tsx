export function ProfilePage() {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Creator Profile</h1>
          <p className="mt-2 text-sm text-slate-400">
            Verify identity, manage brand-safe credentials, and view Instagram linkage status.
          </p>
        </div>
        <button className="inline-flex items-center justify-center rounded-full border border-slate-700/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-slate-300 transition-colors hover:bg-slate-800/80">
          Refresh Status
        </button>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="flex flex-col gap-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
          <h2 className="text-lg font-semibold text-white">Account Basics</h2>
          <dl className="grid gap-3 text-sm text-slate-400">
            <div className="flex justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt>Email</dt>
              <dd className="font-medium text-white">kimberley@credify.app</dd>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt>Role</dt>
              <dd className="font-medium text-white">Creator</dd>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <dt>Project Slots</dt>
              <dd className="font-medium text-white">Unlimited</dd>
            </div>
          </dl>
        </article>

        <article className="flex flex-col gap-4 rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
          <h2 className="text-lg font-semibold text-white">Instagram Connection</h2>
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">OAuth handshake not yet configured in CredifyV2.</p>
            <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">
              Use the old Streamlit flow until migration completes.
            </p>
          </div>
          <button className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200">
            Link Instagram
          </button>
        </article>
      </div>
    </section>
  )
}

export default ProfilePage

