# CredifyV2 - Complete Project Description

## Table of Contents
1. [Eagle-Eye Overview](#eagle-eye-overview)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Project Claiming Flow](#project-claiming-flow)
8. [Metrics Tracking System](#metrics-tracking-system)
9. [Platform Integrations](#platform-integrations)
10. [API Endpoints Reference](#api-endpoints-reference)
11. [Frontend Pages & Components](#frontend-pages--components)
12. [Development Setup](#development-setup)

---

## Eagle-Eye Overview

**CredifyV2** is a full-stack web application that helps creative professionals (directors, editors, colorists, etc.) track their credits and performance metrics across YouTube and Instagram projects. The core concept is:

1. **Users claim projects** (YouTube videos or Instagram posts) they worked on
2. **Assign roles** to themselves (Director, Editor, Colorist, etc.)
3. **Track metrics** automatically (views, likes, comments, engagement rates)
4. **View analytics** aggregated across all their projects and roles
5. **Discover other creators** and see their portfolios

### High-Level Architecture

```
┌─────────────────┐
│   React SPA     │  (Frontend - Vite + TypeScript)
│   Port: 5173    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│  Express API    │  (Backend - Node.js + TypeScript)
│   Port: 3000    │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
┌────────▼────────┐  ┌──▼──────────────┐
│   Supabase     │  │  External APIs  │
│   PostgreSQL   │  │  - YouTube API  │
│   + Auth       │  │  - Instagram    │
│   + RLS        │  │    Graph API    │
└────────────────┘  └─────────────────┘
```

### Key Technologies

**Frontend:**
- React 19 with TypeScript
- Vite (build tool and dev server)
- React Router (client-side routing)
- Tailwind CSS (styling)
- TanStack Query (data fetching/caching)
- Recharts (data visualization)
- Supabase JS client (authentication)

**Backend:**
- Node.js with Express
- TypeScript
- Zod (schema validation)
- Supabase Admin Client (database operations)
- Google APIs (YouTube integration)
- Instagram Graph API (Instagram integration)

**Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS) policies
- Database triggers for automatic metric aggregation

---

## Architecture Overview

### Request Flow

1. **User visits frontend** → React app loads
2. **Authentication check** → `AuthProvider` checks for Supabase session or demo mode
3. **Protected routes** → `ProtectedRoute` component validates authentication
4. **API calls** → Frontend makes requests to backend Express API
5. **Backend authentication** → `authenticate` middleware validates JWT token
6. **Database queries** → Backend uses Supabase client (user-scoped or admin)
7. **Response** → Data flows back through the chain

### Data Flow for Project Claiming

```
User enters YouTube URL
    ↓
Frontend: POST /api/projects/claim/youtube
    ↓
Backend: Extract video ID from URL
    ↓
Backend: Call YouTube API (using API key) to fetch video metadata
    ↓
Backend: Upsert project in `projects` table
    ↓
Backend: Insert user assignment in `user_projects` table
    ↓
Backend: Store initial metrics snapshot in `youtube_metrics` table
    ↓
Backend: Database trigger fires → updates `user_metrics` table
    ↓
Response: Return created project to frontend
```

### Security Model

- **Row Level Security (RLS)**: Supabase enforces that users can only access their own data
- **JWT Tokens**: All authenticated requests include a JWT token from Supabase
- **Service Role Key**: Backend uses service role key for admin operations (bypasses RLS)
- **User-Scoped Client**: Backend creates user-specific Supabase clients for RLS-enforced queries

---

## Database Schema

### Core Tables

#### `users`
Stores user account information.

```sql
- u_id (uuid, primary key) - User identifier (matches Supabase auth.users.id)
- u_email (text, unique) - User email address
- u_name (text) - Display name
- u_bio (text) - User biography
- profile_image_url (text) - Profile picture URL
- u_created_at (timestamptz) - Account creation timestamp
```

**Important**: The `u_id` must match the Supabase `auth.users.id` for authentication to work.

#### `projects`
Stores all claimed projects (YouTube videos, Instagram posts, etc.).

```sql
- p_id (text, primary key) - Project identifier
  - For YouTube: YouTube video ID (11 characters)
  - For Instagram: Instagram media ID
- p_title (text) - Project title
- p_description (text) - Project description
- p_link (text) - URL to the project
- p_platform (text) - Platform name: 'youtube', 'instagram', 'tiktok', 'vimeo', 'other'
- p_channel (text) - Channel/account name
- p_posted_at (timestamptz) - When the project was published
- p_thumbnail_url (text) - Thumbnail image URL
- p_created_at (timestamptz) - When project was claimed in Credify
```

**Key Point**: Multiple users can claim the same project (same `p_id`), but each gets their own entry in `user_projects`.

#### `roles`
Predefined roles that users can assign to themselves.

```sql
- role_id (serial, primary key) - Role identifier
- role_name (text, unique) - Role name (e.g., 'Director', 'Editor')
- category (text) - Role category (e.g., 'Direction', 'Video', 'Sound')
```

**Pre-populated roles**: Director, Creative Director, Editor, Colorist, Videographer, DOP, Producer, Model, Composer, Sound Designer, Audio Engineer, Mixing Engineer, Mastering Engineer, Other

#### `user_projects`
Junction table linking users to projects with role assignments.

```sql
- up_id (uuid, primary key) - Assignment identifier
- u_id (uuid, foreign key → users.u_id) - User identifier
- p_id (text, foreign key → projects.p_id) - Project identifier
- role_id (int, foreign key → roles.role_id, nullable) - Predefined role
- u_role (text, nullable) - Custom role name
- created_at (timestamptz) - When assignment was created
```

**Critical Rule**: Only ONE of `role_id` or `u_role` should be set at a time. If `role_id` is set, `u_role` must be null. If `u_role` is set, `role_id` must be null. This is enforced in the backend.

#### `youtube_metrics`
Time-series metrics for YouTube projects.

```sql
- id (bigserial, primary key)
- p_id (text, foreign key → projects.p_id)
- platform (text, default 'youtube')
- fetched_at (timestamptz) - When metrics were fetched
- view_count (bigint) - Total views
- like_count (bigint) - Total likes
- comment_count (bigint) - Total comments
- share_count (bigint) - Total shares
- engagement_rate (numeric) - Calculated: (likes + comments + shares) / views
- UNIQUE constraint on (p_id, fetched_at)
```

**Snapshot System**: Each row represents a snapshot at a specific time. Multiple snapshots per project allow tracking metrics over time.

#### `instagram_metrics`
Time-series metrics for Instagram projects.

```sql
- id (bigserial, primary key)
- p_id (text, foreign key → projects.p_id)
- platform (text, default 'instagram')
- fetched_at (timestamptz)
- like_count (bigint)
- comment_count (bigint)
- view_count (bigint)
- reach (bigint) - Instagram-specific metric
- save_count (bigint) - Instagram-specific metric
- engagement_rate (numeric)
- UNIQUE constraint on (p_id, fetched_at)
```

#### `user_metrics`
Aggregated metrics per user (automatically updated by triggers).

```sql
- id (bigserial, primary key)
- u_id (uuid, foreign key → users.u_id)
- total_view_count (bigint) - Sum of all views across user's projects
- total_like_count (bigint) - Sum of all likes
- total_comment_count (bigint) - Sum of all comments
- total_share_count (bigint) - Sum of all shares
- avg_engagement_rate (numeric) - Average engagement rate
- updated_at (timestamptz) - Last update timestamp
```

**Auto-Update**: Database triggers automatically update this table when `youtube_metrics` or `instagram_metrics` change.

#### `user_tokens`
Stores OAuth tokens for platform integrations.

```sql
- token_id (uuid, primary key)
- u_id (uuid, foreign key → users.u_id)
- platform (text) - 'youtube', 'instagram', 'tiktok', 'vimeo'
- access_token (text) - OAuth access token
- refresh_token (text) - OAuth refresh token
- expires_at (timestamptz) - Token expiration
- account_id (text) - Platform account ID
- account_username (text) - Platform username
- created_at, updated_at (timestamptz)
- UNIQUE constraint on (u_id, platform)
```

**Security**: These tokens are stored encrypted or should be stored in Supabase Vault in production.

#### `oauth_states`
Temporary OAuth state tokens for CSRF protection.

```sql
- state (text, primary key) - Random UUID
- u_id (uuid, foreign key → users.u_id)
- created_at (timestamptz)
- expires_at (timestamptz) - 15 minutes from creation
```

**Purpose**: Prevents CSRF attacks during OAuth flows. States are consumed (deleted) after use.

#### `user_follows`
Social following relationships.

```sql
- id (uuid, primary key)
- follower_id (uuid, foreign key → users.u_id)
- followed_id (uuid, foreign key → users.u_id)
- created_at (timestamptz)
- UNIQUE constraint on (follower_id, followed_id)
```

#### `instagram_insights`
Account-level Instagram insights (follower count, reach, etc.).

```sql
- id (bigserial, primary key)
- u_id (uuid, foreign key → users.u_id)
- account_id (text) - Instagram account ID
- metric (text) - 'reach', 'profile_views', 'accounts_engaged', 'follower_count'
- value (numeric) - Metric value
- end_time (timestamptz) - When this metric was measured
- retrieved_at (timestamptz) - When we fetched it
- UNIQUE constraint on (u_id, account_id, metric, end_time)
```

### Database Views

#### `youtube_latest_metrics`
Returns the most recent metrics snapshot for each YouTube project.

```sql
SELECT DISTINCT ON (p_id)
  p_id, platform, view_count, like_count, comment_count, 
  share_count, engagement_rate, fetched_at
FROM youtube_metrics
ORDER BY p_id, fetched_at DESC
```

#### `instagram_latest_metrics`
Returns the most recent metrics snapshot for each Instagram project.

#### `instagram_account_latest_metrics`
Returns the most recent account-level insights for each user.

### Database Triggers

**`update_user_metrics()` function**: Automatically recalculates aggregated metrics in `user_metrics` table whenever `youtube_metrics` or `instagram_metrics` are inserted/updated/deleted.

**Trigger**: `trg_update_user_metrics_youtube` fires after changes to `youtube_metrics`
**Trigger**: `trg_update_user_metrics_instagram` fires after changes to `instagram_metrics`

---

## Authentication System

### Authentication Modes

CredifyV2 supports two authentication modes:

1. **Supabase OAuth** (Production)
   - Users sign in with Google via Supabase
   - Supabase handles OAuth flow
   - JWT tokens issued by Supabase
   - Session stored in browser localStorage

2. **Demo Mode** (Development/Testing)
   - No real authentication required
   - Backend generates a demo JWT token
   - Stored in browser localStorage
   - Limited functionality (no integrations)

### Authentication Flow (Supabase OAuth)

```
1. User clicks "Sign in with Google"
   ↓
2. Frontend: Redirects to Supabase OAuth URL
   ↓
3. User authenticates with Google
   ↓
4. Google redirects back to Supabase
   ↓
5. Supabase redirects to frontend /auth/callback
   ↓
6. Frontend: OAuthCallbackPage extracts session from URL
   ↓
7. Frontend: AuthProvider stores session in state
   ↓
8. Frontend: Calls POST /api/auth/provision to create user record
   ↓
9. User is authenticated
```

### Authentication Flow (Demo Mode)

```
1. User clicks "Try Demo"
   ↓
2. Frontend: POST /api/auth/demo
   ↓
3. Backend: Generates demo JWT token (valid for 6 hours)
   ↓
4. Backend: Ensures demo user exists in users table
   ↓
5. Backend: Returns token and user info
   ↓
6. Frontend: Stores in localStorage
   ↓
7. User is authenticated (demo mode)
```

### JWT Token Structure

The JWT token contains:
- `sub`: User ID (matches `users.u_id`)
- `email`: User email
- `role`: 'authenticated'
- `exp`: Expiration timestamp
- `demo`: true (for demo mode) or undefined (for real auth)

### Frontend Authentication (`AuthProvider`)

Located in `frontend/src/providers/AuthProvider.tsx`.

**Responsibilities:**
- Manages authentication state (loading, authenticated, unauthenticated)
- Restores session from Supabase on app load
- Handles Supabase auth state changes
- Provides `signInWithDemo()` and `signOut()` functions
- Exposes `useAuth()` hook for components

**State Management:**
- `status`: 'loading' | 'authenticated' | 'unauthenticated'
- `user`: User object with id, email, name, isDemo flag
- `session`: Session object with accessToken, refreshToken, expiration

**Session Restoration:**
1. On mount, checks Supabase for existing session
2. If found, provisions user record via `/api/auth/provision`
3. Fetches display name from `/api/users/me`
4. If no Supabase session, checks localStorage for demo session
5. Sets authentication state accordingly

### Backend Authentication (`authenticate` middleware)

Located in `backend/src/middleware/authenticate.ts`.

**Responsibilities:**
- Validates JWT token from `Authorization` header
- Verifies token signature using `SUPABASE_JWT_SECRET`
- Extracts user information from token
- Attaches `req.auth` object to request

**Request Object Extension:**
```typescript
req.auth = {
  userId: string,        // User ID from token
  user: { ... },        // Full user object
  token: string,         // JWT token
  isDemo: boolean,      // Whether this is demo mode
  sessionType: 'supabase' | 'demo'
}
```

**Error Handling:**
- Missing token → 401 Unauthorized
- Invalid token → 401 Unauthorized
- Expired token → 401 Unauthorized

### Protected Routes

Frontend uses `ProtectedRoute` component (`frontend/src/components/auth/ProtectedRoute.tsx`) to wrap routes that require authentication.

**Behavior:**
- If `status === 'loading'`: Shows loading state
- If `status === 'unauthenticated'`: Redirects to `/login`
- If `status === 'authenticated'`: Renders child routes

---

## Frontend Architecture

### Project Structure

```
frontend/src/
├── main.tsx              # Entry point - renders App
├── App.tsx               # Root component - sets up routing
├── index.css             # Global styles
├── components/           # Reusable UI components
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   └── layout/
│       └── RootLayout.tsx
├── pages/                # Route pages
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── OAuthCallbackPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   └── ...
├── providers/            # React context providers
│   ├── AuthProvider.tsx
│   └── AppProviders.tsx
├── hooks/                # Custom React hooks
│   └── api/              # API hooks (TanStack Query)
│       ├── projects.ts
│       ├── metrics.ts
│       └── ...
└── lib/                  # Utilities
    ├── supabaseClient.ts
    ├── apiClient.ts
    └── env.ts
```

### Routing

Defined in `frontend/src/App.tsx`:

```typescript
Routes:
- /login                    → LoginPage (public)
- /auth/callback            → OAuthCallbackPage (public)
- /                         → DashboardPage (protected)
- /explore                  → ExplorePage (protected)
- /projects                 → ProjectsPage (protected)
- /analytics                → AnalyticsPage (protected)
- /profile                  → ProfilePage (protected)
- /creator/:userId          → CreatorProfilePage (protected)
- /settings                 → SettingsPage (protected)
- /tutorial                 → TutorialPage (protected)
```

**Layout Structure:**
- Public routes (login, callback) render directly
- Protected routes are wrapped in `ProtectedRoute` → `RootLayout` → Page component

### State Management

**Authentication State:**
- Managed by `AuthProvider` (React Context)
- Accessed via `useAuth()` hook

**Server State (API Data):**
- Managed by TanStack Query
- Custom hooks in `hooks/api/` wrap TanStack Query
- Automatic caching, refetching, and error handling

**Local UI State:**
- Managed by React `useState` in components
- Modal open/close, form inputs, etc.

### API Client

Located in `frontend/src/lib/apiClient.ts`.

**Function: `apiRequest<T>(endpoint, options)`**

**Responsibilities:**
- Makes HTTP requests to backend API
- Automatically includes JWT token from auth context
- Handles errors and response parsing
- Returns typed responses

**Usage:**
```typescript
const data = await apiRequest<{ projects: Project[] }>('/api/projects', {
  method: 'GET',
  accessToken: session.accessToken
})
```

### Supabase Client

Located in `frontend/src/lib/supabaseClient.ts`.

**Purpose:**
- Handles Supabase authentication (OAuth flows)
- Manages session storage
- Provides auth state change listeners

**Configuration:**
- Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment
- Session stored in localStorage with key 'credify-supabase-auth'

### Key Frontend Patterns

**1. Protected Route Pattern:**
```typescript
<Route element={<ProtectedRoute />}>
  <Route element={<RootLayout />}>
    <Route path="/dashboard" element={<DashboardPage />} />
  </Route>
</Route>
```

**2. API Hook Pattern:**
```typescript
export function useProjects() {
  const { session } = useAuth()
  
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => apiRequest<ProjectsResponse>('/api/projects', {
      accessToken: session?.accessToken
    })
  })
}
```

**3. Form Submission Pattern:**
```typescript
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/projects', {
    method: 'POST',
    body: data,
    accessToken: session?.accessToken
  }),
  onSuccess: () => {
    queryClient.invalidateQueries(['projects'])
  }
})
```

---

## Backend Architecture

### Project Structure

```
backend/src/
├── server.ts              # Entry point - starts Express server
├── app.ts                 # Express app configuration
├── config/
│   ├── env.ts             # Environment variable validation
│   └── supabase.ts        # Supabase client initialization
├── routes/                # API route handlers
│   ├── index.ts           # Route registration
│   ├── auth.ts            # Authentication endpoints
│   ├── projects.ts        # Project CRUD operations
│   ├── metrics.ts         # Metrics queries
│   ├── integrations.ts    # OAuth integrations
│   └── ...
├── services/              # Business logic
│   ├── youtubeIntegration.ts
│   ├── instagramIntegration.ts
│   ├── youtubeApiKey.ts
│   └── ...
├── middleware/
│   ├── authenticate.ts    # JWT validation
│   ├── errorHandler.ts    # Error handling
│   ├── notFound.ts        # 404 handler
│   └── rateLimit.ts       # Rate limiting
└── types/
    └── express.d.ts       # TypeScript extensions for Express
```

### Express App Setup (`app.ts`)

**Middleware Stack:**
1. `trust proxy` - Trusts proxy headers (for production)
2. `cors` - Cross-origin resource sharing
3. `express.json()` - Parses JSON request bodies
4. `express.urlencoded()` - Parses URL-encoded bodies
5. Route handlers (`/api/*`)
6. `notFound` - 404 handler
7. `errorHandler` - Error handler (must be last)

**CORS Configuration:**
- Development: Allows all origins
- Production: Allows only specific domains (credify, localhost)

### Route Registration (`routes/index.ts`)

All routes are prefixed with `/api`:

```
/api/health          → Health check
/api/auth            → Authentication
/api/projects        → Project operations
/api/metrics         → Metrics queries
/api/integrations    → OAuth integrations
/api/users           → User operations
/api/roles           → Role management
/api/activity        → Activity feed
/api/cron            → Scheduled jobs (no auth required)
```

### Supabase Clients

**1. Admin Client** (`supabaseAdmin`):
- Uses `SUPABASE_SERVICE_ROLE_KEY`
- Bypasses Row Level Security
- Used for:
  - Creating/updating projects
  - Storing OAuth tokens
  - Admin operations

**2. User Client** (`createSupabaseUserClient(token)`):
- Uses user's JWT token
- Respects Row Level Security
- Used for:
  - User-scoped queries
  - Reading user's own data

**Location**: `backend/src/config/supabase.ts`

### Environment Variables

Validated using Zod schema in `backend/src/config/env.ts`:

**Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key
- `SUPABASE_ANON_KEY` - Anonymous key
- `SUPABASE_JWT_SECRET` - JWT secret for token validation
- `DEMO_USER_ID` - UUID for demo user
- `DEMO_USER_EMAIL` - Email for demo user
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `CRON_SECRET` - Secret for cron job authentication

**Optional:**
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_OAUTH_REDIRECT_URI` - YouTube OAuth
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI` - Instagram OAuth
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development, production)

### Error Handling

**Error Handler Middleware** (`middleware/errorHandler.ts`):

**Error Types:**
- `ValidationError` (Zod) → 400 Bad Request
- `SupabaseQueryError` → 500 Internal Server Error
- `SupabaseMutationError` → 500 Internal Server Error
- `AuthenticationError` → 401 Unauthorized
- Generic errors → 500 Internal Server Error

**Error Response Format:**
```json
{
  "error": "ErrorName",
  "message": "Human-readable error message",
  "details": { ... }  // Optional, for validation errors
}
```

### Rate Limiting

Located in `middleware/rateLimit.ts`.

**Rate Limiters:**
- `projectCreationRateLimiter` - Limits project creation (prevents spam)
- `demoAuthRateLimiter` - Limits demo auth requests
- `userProvisioningRateLimiter` - Limits user provisioning

**Implementation**: Uses `express-rate-limit` package.

---

## Project Claiming Flow

### YouTube Project Claiming

**Endpoint**: `POST /api/projects/claim/youtube`

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "roleId": 1,              // Optional: predefined role ID
  "customRole": "Director"  // Optional: custom role name
}
```

**Flow:**
1. **Extract Video ID**: Backend parses YouTube URL to extract 11-character video ID
   - Supports: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`
2. **Check Duplicates**: Verify user hasn't already claimed this project
3. **Fetch Video Metadata**: Call YouTube Data API v3 to get:
   - Title
   - Channel name
   - Published date
   - Thumbnail URL
4. **Create Project**: Upsert in `projects` table (upsert allows multiple users to claim same video)
5. **Create Assignment**: Insert in `user_projects` table with role
6. **Store Initial Metrics**: Insert snapshot in `youtube_metrics` table
7. **Return Project**: Return created project with assignment info

**YouTube API Integration** (`services/youtubeApiKey.ts`):
- Uses `YOUTUBE_API_KEY` (no OAuth required for public videos)
- Calls `youtube.v3.videos.list()` with `part=snippet,statistics`
- Calculates engagement rate: `(likes + comments + shares) / views`

### Instagram Project Claiming

**Note**: Instagram projects are automatically created during OAuth sync (see Integrations section).

**Flow:**
1. User connects Instagram account via OAuth
2. Backend fetches user's Instagram media
3. For each media item, creates project in `projects` table
4. Creates `user_projects` assignment
5. Stores metrics in `instagram_metrics` table

### Manual Project Creation

**Endpoint**: `POST /api/projects`

**Request Body:**
```json
{
  "id": "optional-custom-id",
  "title": "Project Title",
  "link": "https://example.com/project",
  "platform": "youtube",
  "channel": "Channel Name",
  "postedAt": "2024-01-01T00:00:00Z",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "assignment": {
    "roleId": 1
  }
}
```

**Use Case**: For platforms not yet integrated (TikTok, Vimeo, etc.) or custom projects.

### Project Updates

**Endpoint**: `PATCH /api/projects/:projectId`

**Request Body:**
```json
{
  "assignment": {
    "roleId": 2  // Change role
  }
}
```

**Allowed Updates:**
- Role assignment only (cannot change project metadata)

### Project Deletion

**Endpoint**: `DELETE /api/projects/:projectId`

**Restrictions:**
- Only YouTube projects can be deleted
- Instagram projects cannot be deleted (managed by sync)

**Cascade Behavior:**
- Deleting project cascades to `user_projects` and `youtube_metrics` (via foreign key constraints)

---

## Metrics Tracking System

### Metrics Storage

**Time-Series Data:**
- Each metrics table (`youtube_metrics`, `instagram_metrics`) stores snapshots over time
- Each row has a `fetched_at` timestamp
- Multiple snapshots per project allow tracking growth

**Snapshot Strategy:**
- Daily snapshots (fetched at UTC midnight)
- Stored with `fetched_at` set to start of day
- Prevents duplicate snapshots via `UNIQUE (p_id, fetched_at)` constraint

### Metrics Aggregation

**Automatic Aggregation** (via database triggers):
- When metrics are inserted/updated, `update_user_metrics()` function runs
- Aggregates all metrics for user's projects
- Updates `user_metrics` table with totals

**Manual Aggregation** (for platform-specific queries):
- Backend computes on-the-fly when filtering by platform
- Uses `youtube_latest_metrics` and `instagram_latest_metrics` views

### Metrics Endpoints

#### Get User Summary
**Endpoint**: `GET /api/metrics/summary?platform=youtube`

**Response:**
```json
{
  "summary": {
    "totalViewCount": 1000000,
    "totalLikeCount": 50000,
    "totalCommentCount": 10000,
    "totalShareCount": 5000,
    "averageEngagementRate": 6.5,
    "updatedAt": "2024-01-15T00:00:00Z",
    "viewGrowth24hPercent": 2.5,
    "followerCount": null  // Only for Instagram
  }
}
```

**Platform Filtering:**
- No `platform` param: Aggregates all platforms
- `platform=youtube`: Only YouTube metrics
- `platform=instagram`: Only Instagram metrics

#### Get Project Metrics
**Endpoint**: `GET /api/metrics/projects/:projectId?platform=youtube&limit=365`

**Response:**
```json
{
  "projectId": "VIDEO_ID",
  "filters": {
    "platform": "youtube",
    "limit": 365
  },
  "metrics": {
    "youtube": [
      {
        "fetchedAt": "2024-01-01T00:00:00Z",
        "viewCount": 1000,
        "likeCount": 50,
        "commentCount": 10,
        "shareCount": 5,
        "engagementRate": 6.5
      }
    ],
    "instagram": []
  }
}
```

#### Get Role Impact
**Endpoint**: `GET /api/metrics/role-impact?groupBy=role&metric=views&platform=all`

**Query Parameters:**
- `groupBy`: 'role' or 'category'
- `metric`: 'views', 'likes', 'comments', 'projects'
- `platform`: 'all', 'youtube', 'instagram'
- `dateRange`: '7d', '28d', '90d', 'all', 'custom'
- `startDate`, `endDate`: For custom date range

**Response:**
```json
{
  "groupBy": "role",
  "metric": "views",
  "platform": "all",
  "data": [
    {
      "label": "Director",
      "value": 500000,
      "percentage": 50.0
    },
    {
      "label": "Editor",
      "value": 300000,
      "percentage": 30.0
    }
  ],
  "total": 1000000
}
```

**Purpose**: Shows which roles drive the most impact (views, likes, etc.)

#### Get Platform Metrics
**Endpoint**: `GET /api/metrics/platform/:platform?limit=365`

**Response:**
```json
{
  "platform": "youtube",
  "filters": {
    "platform": "youtube",
    "limit": 365
  },
  "metrics": {
    "youtube": [
      {
        "fetchedAt": "2024-01-01T00:00:00Z",
        "viewCount": 10000,  // Aggregated across all user's YouTube projects
        "likeCount": 500,
        "commentCount": 100,
        "shareCount": 50,
        "engagementRate": 6.5
      }
    ],
    "instagram": []
  }
}
```

**Aggregation**: Metrics are aggregated by timestamp across all user's projects on that platform.

### Metrics Sync

**YouTube Sync**:
- **Endpoint**: `POST /api/integrations/youtube/sync`
- Uses YouTube API key (no OAuth required)
- Fetches current stats for all user's YouTube projects
- Creates new snapshot in `youtube_metrics` table

**Instagram Sync**:
- **Endpoint**: `POST /api/integrations/instagram/sync`
- Requires OAuth token
- Fetches current stats for all user's Instagram posts
- Creates new snapshot in `instagram_metrics` table

**Cron Jobs**:
- Scheduled sync jobs can call `/api/cron/sync/youtube` and `/api/cron/sync/instagram`
- Authenticated via `CRON_SECRET` header
- Syncs all projects in the system

---

## Platform Integrations

### YouTube Integration

#### OAuth Flow (Optional - for channel management)

**Purpose**: Allows users to connect their YouTube channel (for future features like managing uploads).

**Flow:**
1. User clicks "Connect YouTube" in settings
2. Frontend: `POST /api/integrations/youtube/authorize`
3. Backend: Creates OAuth state token, generates Google OAuth URL
4. Frontend: Opens OAuth URL in popup window
5. User authorizes on Google
6. Google redirects to backend: `/api/integrations/youtube/callback?code=...&state=...`
7. Backend: Exchanges code for tokens, stores in `user_tokens` table
8. Backend: Returns HTML page that posts message to popup opener
9. Frontend: Receives message, closes popup, updates UI

**Token Storage**: Stored in `user_tokens` table with platform='youtube'

**Status Check**: `GET /api/integrations/youtube/status` returns connection status

#### API Key Integration (Primary - for metrics)

**Purpose**: Fetches public video statistics (no OAuth required).

**Implementation**: `services/youtubeApiKey.ts`

**Functions:**
- `fetchYouTubeVideoData(videoId)`: Fetches single video metadata and stats
- `fetchYouTubeVideoStatsBatch(videoIds)`: Batch fetches stats for multiple videos

**API Calls:**
- `youtube.v3.videos.list()` with `part=snippet,statistics`
- Uses `YOUTUBE_API_KEY` from environment

**Rate Limits**: YouTube API allows 10,000 units per day. Each video.list call costs 1 unit.

### Instagram Integration

#### OAuth Flow (Required)

**Purpose**: Connects user's Instagram Business/Creator account to fetch posts and metrics.

**Flow:**
1. User clicks "Connect Instagram" in settings
2. Frontend: `POST /api/integrations/instagram/connect`
3. Backend: Creates OAuth state, generates Meta OAuth URL
4. Frontend: Opens OAuth URL in popup
5. User authorizes on Meta (must grant all requested scopes)
6. Meta redirects to backend: `/api/integrations/instagram/callback?code=...&state=...`
7. Backend: Exchanges short-lived token for long-lived token
8. Backend: Fetches Instagram account ID and username
9. Backend: Stores token in `user_tokens` table
10. Backend: Automatically syncs user's Instagram posts (creates projects)
11. Backend: Returns HTML page that posts message to popup opener

**Required Scopes:**
- `instagram_basic`
- `instagram_manage_insights`
- `instagram_manage_comments`
- `pages_show_list`
- `pages_read_engagement`
- `business_management`

**Token Management**:
- Short-lived token (1 hour) exchanged for long-lived token (60 days)
- Long-lived token stored in database
- Token can be refreshed before expiration

**Implementation**: `services/instagramIntegration.ts`

#### Instagram Sync

**Endpoint**: `POST /api/integrations/instagram/sync`

**Process:**
1. Loads user's Instagram token from `user_tokens`
2. Fetches user's Instagram media (posts, reels)
3. For each media item:
   - Creates/updates project in `projects` table
   - Creates `user_projects` assignment
   - Fetches current metrics
   - Stores snapshot in `instagram_metrics` table
4. Fetches account-level insights (follower count, reach, etc.)
5. Stores in `instagram_insights` table

**Instagram Graph API Calls:**
- `/{user-id}/media` - Get user's posts
- `/{media-id}` - Get post details
- `/{media-id}/insights` - Get post metrics
- `/{user-id}/insights` - Get account-level metrics

**Rate Limits**: Instagram Graph API has rate limits (varies by endpoint).

---

## API Endpoints Reference

### Authentication

#### `POST /api/auth/demo`
Creates a demo session (no authentication required).

**Response:**
```json
{
  "mode": "demo",
  "user": {
    "id": "uuid",
    "email": "demo@credify.com",
    "name": "Credify Demo User"
  },
  "session": {
    "id": "demo-uuid",
    "type": "demo",
    "issuedAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-01T06:00:00Z",
    "accessToken": "jwt-token"
  }
}
```

#### `POST /api/auth/provision`
Ensures user record exists in `users` table (idempotent).

**Authentication**: Required (Supabase users only, not demo)

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Projects

#### `GET /api/projects`
Get all projects for authenticated user.

**Authentication**: Required

**Response:**
```json
{
  "projects": [
    {
      "id": "VIDEO_ID",
      "title": "Video Title",
      "link": "https://youtube.com/watch?v=VIDEO_ID",
      "platform": "youtube",
      "channel": "Channel Name",
      "postedAt": "2024-01-01T00:00:00Z",
      "thumbnailUrl": "https://...",
      "createdAt": "2024-01-15T00:00:00Z",
      "assignment": {
        "roleId": 1,
        "roleName": "Director",
        "roleCategory": "Direction",
        "customRole": null
      }
    }
  ]
}
```

#### `GET /api/projects/:projectId`
Get single project by ID.

**Authentication**: Required

#### `POST /api/projects`
Create a new project manually.

**Authentication**: Required

**Request Body:**
```json
{
  "id": "optional-id",
  "title": "Project Title",
  "link": "https://example.com",
  "platform": "youtube",
  "channel": "Channel",
  "postedAt": "2024-01-01T00:00:00Z",
  "thumbnailUrl": "https://...",
  "assignment": {
    "roleId": 1
  }
}
```

#### `POST /api/projects/claim/youtube`
Claim a YouTube video by URL.

**Authentication**: Required

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "roleId": 1,
  "customRole": null
}
```

#### `PATCH /api/projects/:projectId`
Update project assignment (role only).

**Authentication**: Required

**Request Body:**
```json
{
  "assignment": {
    "roleId": 2
  }
}
```

#### `DELETE /api/projects/:projectId`
Delete a project (YouTube only).

**Authentication**: Required

### Metrics

#### `GET /api/metrics/summary?platform=youtube`
Get aggregated metrics summary.

**Authentication**: Required

**Query Parameters:**
- `platform`: 'youtube' | 'instagram' (optional)

#### `POST /api/metrics/summary/refresh`
Refresh metrics by syncing and returning updated summary.

**Authentication**: Required (not available in demo mode)

#### `GET /api/metrics/projects/:projectId?platform=youtube&limit=365`
Get time-series metrics for a specific project.

**Authentication**: Required

**Query Parameters:**
- `platform`: 'youtube' | 'instagram' (optional)
- `limit`: Number of data points (default: 365, max: 500)

#### `GET /api/metrics/role-impact?groupBy=role&metric=views&platform=all`
Get role-based impact analysis.

**Authentication**: Required

**Query Parameters:**
- `groupBy`: 'role' | 'category'
- `metric`: 'views' | 'likes' | 'comments' | 'projects'
- `platform`: 'all' | 'youtube' | 'instagram'
- `dateRange`: '7d' | '28d' | '90d' | 'all' | 'custom'
- `startDate`, `endDate`: For custom range
- `mode`: 'full' | 'share_weighted'

#### `GET /api/metrics/platform/:platform?limit=365`
Get aggregated platform metrics over time.

**Authentication**: Required

**Path Parameters:**
- `platform`: 'youtube' | 'instagram'

**Query Parameters:**
- `limit`: Number of data points (default: 365)

#### `GET /api/metrics/platform/instagram/account-insights?metric=follower_count&limit=365`
Get Instagram account-level insights.

**Authentication**: Required

**Query Parameters:**
- `metric`: 'follower_count' | 'reach' | 'profile_views' | 'accounts_engaged'
- `limit`: Number of data points (default: 365)

### Integrations

#### YouTube

##### `POST /api/integrations/youtube/authorize`
Initiate YouTube OAuth flow.

**Authentication**: Required (not available in demo mode)

**Response:**
```json
{
  "authorizationUrl": "https://accounts.google.com/...",
  "redirectUri": "https://api.credify.com/api/integrations/youtube/callback"
}
```

##### `GET /api/integrations/youtube/callback`
OAuth callback (handled by popup, not called directly).

##### `GET /api/integrations/youtube/status`
Get YouTube connection status.

**Authentication**: Required

**Response:**
```json
{
  "status": {
    "connected": true,
    "accountId": "channel-id",
    "accountUsername": "Channel Name",
    "expiresAt": "2024-02-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

##### `POST /api/integrations/youtube/sync`
Sync YouTube metrics for user's projects.

**Authentication**: Required (not available in demo mode)

**Response:**
```json
{
  "syncedVideoCount": 10,
  "snapshotDate": "2024-01-15T00:00:00Z"
}
```

#### Instagram

##### `POST /api/integrations/instagram/connect`
Initiate Instagram OAuth flow.

**Authentication**: Required (not available in demo mode)

**Response:**
```json
{
  "authorizationUrl": "https://www.facebook.com/...",
  "redirectUri": "https://api.credify.com/api/integrations/instagram/callback"
}
```

##### `GET /api/integrations/instagram/callback`
OAuth callback (handled by popup).

##### `GET /api/integrations/instagram/status`
Get Instagram connection status.

**Authentication**: Required

##### `POST /api/integrations/instagram/sync`
Sync Instagram posts and metrics.

**Authentication**: Required (not available in demo mode)

### Users

#### `GET /api/users/me`
Get current user profile.

**Authentication**: Required

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "bio": "User bio",
    "profileImageUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `PATCH /api/users/me`
Update user profile.

**Authentication**: Required

**Request Body:**
```json
{
  "name": "New Name",
  "bio": "New bio"
}
```

### Roles

#### `GET /api/roles`
Get all available roles.

**Authentication**: Required

**Response:**
```json
{
  "roles": [
    {
      "id": 1,
      "name": "Director",
      "category": "Direction"
    }
  ]
}
```

### Health

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T00:00:00Z"
}
```

### Cron

#### `POST /api/cron/sync/youtube`
Sync all YouTube projects (scheduled job).

**Authentication**: `CRON_SECRET` header (not JWT)

**Headers:**
```
Authorization: Bearer CRON_SECRET
```

#### `POST /api/cron/sync/instagram`
Sync all Instagram accounts (scheduled job).

**Authentication**: `CRON_SECRET` header

---

## Frontend Pages & Components

### Pages

#### `LoginPage` (`/login`)
- Public page
- Shows "Sign in with Google" button (Supabase OAuth)
- Shows "Try Demo" button (demo mode)
- Redirects to dashboard after authentication

#### `OAuthCallbackPage` (`/auth/callback`)
- Public page
- Handles Supabase OAuth callback
- Extracts session from URL hash
- Stores session and redirects to dashboard

#### `DashboardPage` (`/`)
- Protected page
- Shows user's projects in a grid
- Displays project thumbnails, titles, metrics
- Allows claiming new YouTube videos
- Allows editing/deleting projects

#### `AnalyticsPage` (`/analytics`)
- Protected page
- Shows aggregated metrics (views, likes, engagement)
- Displays charts (Recharts)
- Platform filtering (YouTube, Instagram, All)
- Role impact analysis
- Growth metrics

#### `ProjectsPage` (`/projects`)
- Protected page
- List view of all projects
- Filtering and sorting
- Project details

#### `ProfilePage` (`/profile`)
- Protected page
- User profile information
- Edit display name, bio
- Profile picture upload (if implemented)

#### `CreatorProfilePage` (`/creator/:userId`)
- Protected page
- Public view of another user's profile
- Shows their projects and metrics
- Follow/unfollow functionality

#### `ExplorePage` (`/explore`)
- Protected page
- Discover other creators
- Browse projects
- Search functionality

#### `SettingsPage` (`/settings`)
- Protected page
- YouTube integration status and connection
- Instagram integration status and connection
- Account settings

#### `TutorialPage` (`/tutorial`)
- Protected page
- Onboarding guide for new users

### Components

#### `RootLayout`
- Wraps all protected pages
- Provides navigation header
- Sidebar (if implemented)
- Footer

#### `ProtectedRoute`
- Wraps protected routes
- Checks authentication status
- Redirects to login if not authenticated
- Shows loading state during auth check

#### `ProjectCard`
- Displays project thumbnail, title, metrics
- Edit/delete actions
- Role badge

#### `MetricsChart`
- Recharts-based chart component
- Line charts for time-series data
- Bar charts for role impact

#### `IntegrationCard`
- Shows integration status (YouTube/Instagram)
- Connect/disconnect buttons
- Status indicators

---

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Google Cloud Project with YouTube Data API v3 enabled
- Meta/Facebook App (for Instagram integration)

### Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd credifyv2
```

2. **Install frontend dependencies**
```bash
cd frontend
npm install
```

3. **Install backend dependencies**
```bash
cd ../backend
npm install
```

### Environment Configuration

#### Frontend (`.env`)

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

#### Backend (`.env`)

Create `backend/.env`:
```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

DEMO_USER_ID=00000000-0000-0000-0000-000000000000
DEMO_USER_EMAIL=demo@credify.com
DEMO_USER_NAME=Credify Demo User

YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_CLIENT_ID=your-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret
YOUTUBE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/youtube/callback

INSTAGRAM_APP_ID=your-instagram-app-id
INSTAGRAM_APP_SECRET=your-instagram-app-secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/integrations/instagram/callback

CRON_SECRET=your-random-secret-string
```

### Database Setup

1. **Run migration scripts** in Supabase SQL Editor (in order):
   - `supabase/sql/001_init.sql` - Creates all tables, views, triggers
   - `supabase/sql/002_rls_policies.sql` - Sets up Row Level Security
   - `supabase/sql/003_rls_hardening.sql` - Additional security policies

2. **Configure Supabase Auth**:
   - Enable Google OAuth provider
   - Set redirect URL to: `http://localhost:5173/auth/callback`

### Running the Application

#### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

#### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```
Output in `frontend/dist/` - deploy to Vercel, Netlify, etc.

### Testing

**Linting:**
```bash
# Frontend
cd frontend
npm run lint

# Backend
cd backend
npm run lint
```

### Common Development Tasks

**Claim a YouTube video:**
1. Start both servers
2. Sign in (demo or Google)
3. Navigate to Dashboard
4. Click "Claim YouTube Video"
5. Enter YouTube URL
6. Select role
7. Submit

**Connect Instagram:**
1. Navigate to Settings
2. Click "Connect Instagram"
3. Authorize in popup
4. Wait for sync to complete

**Sync metrics:**
1. Navigate to Settings
2. Click "Sync YouTube" or "Sync Instagram"
3. Wait for completion
4. View updated metrics in Analytics

---

## Key Implementation Details

### Role Assignment Logic

**One Primary Role Rule:**
- A project assignment can have EITHER a predefined role (`role_id`) OR a custom role (`u_role`), but not both
- Backend enforces this: if `roleId` is provided, `u_role` is set to null; if `customRole` is provided, `role_id` is set to null
- This prevents ambiguity in role-based analytics

### Metrics Snapshot Strategy

**Daily Snapshots:**
- Metrics are fetched and stored with `fetched_at` set to UTC midnight
- This ensures one snapshot per day per project
- Allows tracking daily growth
- Prevents duplicate snapshots via database constraint

**Engagement Rate Calculation:**
- YouTube: `(likes + comments + shares) / views * 100`
- Instagram: `(likes + comments + saves) / reach * 100` (or views if reach unavailable)

### OAuth State Management

**CSRF Protection:**
- Each OAuth flow generates a random UUID state token
- Stored in `oauth_states` table with expiration (15 minutes)
- State is consumed (deleted) after successful OAuth callback
- Prevents replay attacks

### Error Handling Patterns

**Backend:**
- All route handlers wrapped in try-catch
- Errors passed to `errorHandler` middleware
- Consistent error response format
- Zod validation errors return 400 with details

**Frontend:**
- TanStack Query handles API errors automatically
- Shows error messages in UI
- Retry logic for transient failures

### Type Safety

**Backend:**
- Zod schemas validate all inputs
- TypeScript types inferred from Zod schemas
- Express request/response types extended

**Frontend:**
- TypeScript for all components
- API response types defined
- TanStack Query provides type inference

---

## Conclusion

CredifyV2 is a comprehensive full-stack application that demonstrates:

- Modern React patterns (hooks, context, TanStack Query)
- Express API with proper middleware and error handling
- Supabase integration (auth, database, RLS)
- OAuth integrations (Google, Meta)
- Time-series metrics tracking
- Role-based analytics
- Type-safe development (TypeScript + Zod)

The architecture is designed to be scalable, maintainable, and secure. Key design decisions:

- **Separation of concerns**: Frontend handles UI, backend handles business logic
- **Security**: RLS policies, JWT validation, OAuth state management
- **Data integrity**: Database constraints, triggers, unique constraints
- **Developer experience**: TypeScript, Zod validation, clear error messages

For questions or clarifications, refer to the codebase or this documentation.

