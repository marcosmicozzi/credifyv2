## CredifyV2 Architecture Overview

CredifyV2 is a clean rebuild of the original Credify experience. The legacy repository remains untouched and serves only as a conceptual reference. All new implementation lives inside this project, with no shared code or dependencies.

### Legacy Continuity
- **Supabase schema**: Continue using the existing Supabase project, preserving core tables for users, projects, metrics, and roles. Future schema changes are documented and versioned via SQL files in `supabase/sql/`.
- **Authentication flows**: Supabase email magic-link login and Instagram OAuth remain the primary identity mechanisms.
- **Data integrations**: Maintain current Instagram Graph API ingestion pipeline concepts and YouTube metadata enrichment patterns.

### Rebuilt Differently
- **Frontend**: React 18 SPA bootstrapped with Vite and TypeScript. Tailwind CSS will drive styling, with reusable components under `frontend/src/components/`. Client-side routing powers all navigation.
- **Backend**: Node.js/Express service written in TypeScript. The server orchestrates Supabase auth validation, Instagram OAuth exchanges, and metrics endpoints under `backend/src/routes/`.
- **State & Data**: React Query (or equivalent) handles client caching, while the backend exposes REST endpoints mirroring the previous app's features.
- **Testing & Tooling**: JavaScript/TypeScript linting via ESLint + Prettier, shared configs, and modern build tooling optimized for CI/CD.

### Repository Layout
```
credifyv2/
├── frontend/          # React SPA (Vite + TypeScript + Tailwind)
│   └── src/
├── backend/           # Express API (TypeScript)
│   └── src/
├── supabase/
│   └── sql/           # Migration scripts applied to existing Supabase project
└── docs/
    └── architecture.md
```

### Data & Integration Notes
- **Supabase**: Service role keys used server-side only. RLS policies mirror legacy logic; new migrations will evolve schema incrementally.
- **Instagram OAuth**: Backend initiates authorization and stores long-lived tokens securely via Supabase using encrypted columns or vault functions.
- **YouTube**: Optional ingestion utilities will live under `backend/src/services/` when rebuilt, mirroring prior metrics enrichment.

### Environment & Deployment
- Define shared environment contracts in forthcoming `.env.example` files for frontend (`VITE_`-prefixed variables) and backend (Supabase keys, Instagram secrets).
- Containerization and CI/CD pipelines will be introduced later, keeping parity with original deployment expectations.

### Migration Strategy
1. Establish baseline SQL migration (`supabase/sql/001_init.sql`) representing current Supabase schema.
2. Introduce incremental migrations for new tables or policy changes.
3. Validate backward compatibility with existing users and data before applying production changes.

### Next Steps
- Scaffold frontend and backend projects with TypeScript, linting, and testing defaults.
- Wire Supabase clients and authentication guards in both layers.
- Recreate dashboard, analytics, and profile flows with improved UI/UX.

