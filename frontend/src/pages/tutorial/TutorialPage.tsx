import { Link } from 'react-router-dom'

export function TutorialPage() {
  return (
    <section className="space-y-8">
      {/* Getting Around Credify */}
      <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <header className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Getting Around Credify</h2>
          <p className="mt-2 text-sm text-slate-400">
            An overview of the main sections in Credify and what you can do in each one.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                <Link to="/" className="hover:text-emerald-400 transition">
                  Dashboard
                </Link>
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              Your home page. View your metrics summary, recent projects from YouTube and Instagram, and claim your industry badge.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                <Link to="/projects" className="hover:text-emerald-400 transition">
                  Projects
                </Link>
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              Browse and manage all your claimed projects. Filter by platform (YouTube or Instagram), edit project details, and assign roles.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                <Link to="/analytics" className="hover:text-emerald-400 transition">
                  Analytics
                </Link>
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              View detailed analytics and metrics for your projects. See engagement trends, impact by role, and claim YouTube videos directly from here.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                <Link to="/profile" className="hover:text-emerald-400 transition">
                  Profile
                </Link>
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              View your profile information and connect your Instagram account. Your Instagram profile picture will appear in the sidebar once connected.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-6 md:col-span-2">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                <Link to="/settings" className="hover:text-emerald-400 transition">
                  Settings
                </Link>
              </h3>
            </div>
            <p className="text-sm text-slate-300">
              Configure your preferences for notifications, security, and data sync settings. Fine-tune how Credify works for you.
            </p>
          </div>
        </div>
      </article>

      {/* How to Connect Instagram */}
      <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <header className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">How to Connect Instagram</h2>
          <p className="mt-2 text-sm text-slate-400">
            Connect your Instagram business account to sync your content and track metrics automatically.
          </p>
        </header>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              1
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Go to Profile</h3>
              <p className="text-sm text-slate-300">
                Navigate to the <Link to="/profile" className="text-emerald-400 hover:underline">Profile</Link> page using the sidebar menu.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              2
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Find the Instagram Integration Card</h3>
              <p className="text-sm text-slate-300">
                Scroll down to find the "Instagram Integration" card on the Profile page. This card shows your current connection status.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              3
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Click "Connect Instagram"</h3>
              <p className="text-sm text-slate-300">
                Click the "Connect Instagram" button. A popup window will open asking you to authorize Credify to access your Instagram account.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              4
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Approve Permissions</h3>
              <p className="text-sm text-slate-300">
                In the popup, log in to your Instagram business account and approve the requested permissions. Make sure pop-ups are enabled in your browser.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              5
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Sync Your Content</h3>
              <p className="text-sm text-slate-300">
                Once connected, click "Sync latest metrics" to pull your Instagram posts and their engagement data. The sync process may take a few moments.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              6
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">View Your Projects</h3>
              <p className="text-sm text-slate-300">
                After syncing, go to the <Link to="/projects?platform=instagram" className="text-emerald-400 hover:underline">Projects</Link> page and switch to the Instagram tab to see your synced content. Your Instagram profile picture will also appear in the sidebar.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* How to Claim a YouTube Video */}
      <article className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8">
        <header className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">How to Claim a YouTube Video</h2>
          <p className="mt-2 text-sm text-slate-400">
            Claim YouTube videos you worked on to track your credits and build your portfolio.
          </p>
        </header>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              1
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Go to Analytics</h3>
              <p className="text-sm text-slate-300">
                Navigate to the <Link to="/analytics" className="text-emerald-400 hover:underline">Analytics</Link> page using the sidebar menu.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              2
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Click "Add YouTube Credit"</h3>
              <p className="text-sm text-slate-300">
                Make sure you're on the YouTube platform tab (selected by default), then click the "Add YouTube Credit" button in the top right corner.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              3
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Enter the YouTube URL</h3>
              <p className="text-sm text-slate-300">
                In the modal that opens, paste the YouTube video URL. You can use any YouTube URL format (youtube.com/watch?v=... or youtu.be/...). The system will automatically extract the video ID.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              4
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Assign Your Role</h3>
              <p className="text-sm text-slate-300">
                Select your role from the dropdown menu. Roles are organized by category (Direction, Video, Production, Talent, Sound, etc.). If your role isn't listed, you can enter a custom role in the "Custom Role" field below.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              5
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">Claim the Video</h3>
              <p className="text-sm text-slate-300">
                Click the "Claim Video" button. The system will fetch the video details from YouTube and add it to your projects. You'll see a success message when it's complete.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/70 bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              6
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-base font-semibold text-white">View Your Claimed Project</h3>
              <p className="text-sm text-slate-300">
                The claimed video will appear in your <Link to="/projects?platform=youtube" className="text-emerald-400 hover:underline">Projects</Link> page. You can also see it on your Dashboard and view its analytics on the Analytics page. You can edit the project details or assign different roles later if needed.
              </p>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

export default TutorialPage

