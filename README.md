# CredifyV2

A full-stack TypeScript application for tracking credits and performance metrics for behind-the-scenes creatives across YouTube and Instagram projects.

## Overview

CredifyV2 is a modern rebuild of the Credify platform, enabling creative professionals to:
- **Claim and organize projects** with role assignments (Director, Editor, Colorist, etc.)
- **Track performance metrics** including views, likes, comments, engagement rates, and growth
- **Aggregate data** from YouTube and Instagram in unified dashboards
- **Analyze role-based insights** to understand which roles drive the most impact

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for build tooling and dev server
- **React Router** for client-side navigation
- **Tailwind CSS** for styling
- **TanStack Query** for data fetching and caching
- **Recharts** for data visualization
- **Supabase JS** for authentication and database access

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **Supabase** for database and authentication
- **Google APIs** for YouTube integration
- **Instagram Graph API** for Instagram integration
- **Zod** for schema validation

### Infrastructure
- **Supabase** (PostgreSQL database, authentication, RLS policies)
- **Vercel** (frontend deployment configuration included)

## Project Structure

```
credifyv2/
├── frontend/              # React SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and Supabase client
│   │   ├── providers/     # Context providers (Auth, etc.)
│   │   └── main.tsx       # Entry point
│   └── package.json
├── backend/               # Express API
│   ├── src/
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── config/        # Configuration (env, Supabase)
│   │   └── server.ts      # Entry point
│   └── package.json
├── supabase/
│   └── sql/               # Database migration scripts
├── docs/                  # Documentation
└── README.md
```

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase account** and project
- **Google Cloud Project** with YouTube Data API v3 enabled (for YouTube integration)
- **Meta/Facebook App** (for Instagram integration, requires Business/Creator account)

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd credifyv2
```

### 2. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 3. Environment Variables

#### Frontend Environment

Create `frontend/.env` based on `frontend/env.example`:

```bash
cd frontend
cp env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_API_URL` - Backend API URL (optional, defaults to `http://localhost:3000`)

#### Backend Environment

Create `backend/.env` based on `backend/env.example`:

```bash
cd backend
cp env.example .env
```

Required variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_JWT_SECRET` - JWT secret from Supabase
- `PORT` - Server port (default: 3000)

Optional integrations:
- **YouTube**: `YOUTUBE_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_OAUTH_REDIRECT_URI`
- **Instagram**: `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI`
- **Cron**: `CRON_SECRET` (for scheduled sync jobs)

### 4. Database Setup

Apply database migrations to your Supabase project:

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run the migration scripts from `supabase/sql/` in order:
   - `001_init.sql` - Initial schema
   - `002_rls_policies.sql` - Row Level Security policies
   - `003_rls_hardening.sql` - Additional RLS hardening

## Running the Project

### Development Mode

#### Start the Backend Server

```bash
cd backend
npm run dev
```

The API server will run on `http://localhost:3000` (or the port specified in your `.env`).

#### Start the Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite assigns).

### Production Build

#### Build Backend

```bash
cd backend
npm run build
npm start
```

#### Build Frontend

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`.

## Key Features

### Authentication
- Google OAuth via Supabase
- Demo mode for exploration
- Protected routes with role-based access

### Project Management
- Claim YouTube videos by URL
- Automatic Instagram project creation via OAuth sync
- Role assignment (Director, Editor, Colorist, etc.)
- Project metadata and thumbnail management

### Analytics & Metrics
- Real-time performance tracking
- Cross-platform aggregation (YouTube + Instagram)
- Engagement rate calculations
- Growth metrics and trends
- Role-based analytics

### Integrations
- **YouTube**: OAuth connection and API key-based metadata fetching
- **Instagram**: OAuth flow with long-lived token management
- Scheduled sync jobs for metrics updates

## Architecture

CredifyV2 follows a clean separation between frontend and backend:

- **Frontend**: React SPA that communicates with the backend API and Supabase for authentication
- **Backend**: Express API that handles integrations, metrics processing, and secure operations
- **Database**: Supabase PostgreSQL with Row Level Security (RLS) policies

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Development

### Code Style

- TypeScript with strict type checking
- ESLint for linting
- Prettier for code formatting
- Follow patterns defined in `.cursor/rules/`

### Testing

Run linting:

```bash
# Frontend
cd frontend
npm run lint

# Backend
cd backend
npm run lint
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Google OAuth Redirect URIs](docs/google-oauth-redirect-uris.md)
- [OAuth Architecture Verification](docs/oauth-architecture-verification.md)

## License

ISC

