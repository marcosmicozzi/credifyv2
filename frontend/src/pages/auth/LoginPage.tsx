export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-16 text-slate-100">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-center shadow-[0_30px_120px_-60px_rgba(15,23,42,0.9)]">
        <span className="text-xs uppercase tracking-[0.35em] text-slate-500">Welcome back</span>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Access CredifyV2</h1>
        <p className="text-sm text-slate-400">
          Sign in with your verified creator email. A Supabase magic link will land in your inbox.
        </p>
        <form className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            className="rounded-xl border border-slate-800/80 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600/60"
            disabled
          />
          <button
            type="submit"
            disabled
            className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/50 disabled:cursor-not-allowed disabled:bg-slate-400/20 disabled:text-slate-500"
          >
            Send Magic Link
          </button>
        </form>
        <div className="flex flex-col gap-2 text-xs text-slate-500">
          <span>Instagram OAuth refresh will also live here.</span>
          <span>Legacy Streamlit app remains live until parity is achieved.</span>
        </div>
      </section>
    </div>
  )
}

export default LoginPage

