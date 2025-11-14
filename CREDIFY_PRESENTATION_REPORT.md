# Credify Presentation Report

**Date:** January 2025  
**Status:** Production Ready

---

## Executive Summary

Credify is a full-stack web application designed for behind-the-scenes creatives to track their credits and performance metrics across YouTube and Instagram projects. The platform enables creators to claim projects, assign roles, and visualize their impact through comprehensive analytics dashboards.

---

## 1. What Credify Does

### Core Purpose

Credify serves as a **credits and metrics tracking platform** for creative professionals who work behind the scenes on digital content. Unlike traditional portfolio sites, Credify focuses on:

- **Credits Management**: Claim and organize projects with role assignments (Director, Editor, Colorist, etc.)
- **Performance Analytics**: Track views, likes, comments, engagement rates, and growth metrics
- **Cross-Platform Integration**: Aggregate data from YouTube and Instagram in one unified dashboard
- **Role-Based Insights**: Understand which roles and categories drive the most impact

### Main User Flows

#### Authentication & Onboarding
1. **Sign Up / Login**: Users authenticate via Google OAuth through Supabase, or use demo mode for exploration
2. **User Provisioning**: After authentication, user records are automatically created in the `users` table
3. **First-Time Setup**: Users are guided to connect integrations and claim their first projects

#### Integration Setup
1. **YouTube Integration**: 
   - Optional OAuth connection for channel management
   - Primary method: Claim public YouTube videos by URL (uses API key, no OAuth required)
   - Automatic metadata fetching (title, channel, thumbnail, publish date)
   - Initial metrics snapshot stored on claim

2. **Instagram Integration**:
   - OAuth flow via Meta/Facebook (requires Business/Creator account)
   - Long-lived token exchange (60-day expiration)
   - Automatic project creation from Instagram posts
   - Account-level insights (follower count, reach, profile views)

#### Project Management
1. **Claiming Projects**:
   - YouTube: Paste video URL → system extracts video ID → fetches metadata → creates project → assigns role
   - Instagram: Automatic via sync after OAuth connection
   
2. **Role Assignment**:
   - Choose from predefined roles (Director, Editor, Colorist, etc.) organized by category
   - Or create custom roles (e.g., "Motion Graphics Designer")
   - One role per project (either predefined or custom, not both)

3. **Editing Projects**:
   - Update role assignments
   - Delete YouTube projects (Instagram projects are managed via sync)

#### Analytics & Insights
1. **Dashboard Overview**:
   - Aggregate metrics cards (total views, likes, comments, projects)
   - 24-hour growth percentage
   - Latest projects by platform
   - Collaborator list (channels worked with)

2. **Analytics Page**:
   - Platform-specific views (YouTube or Instagram)
   - Time-series charts showing metrics over time
   - Role impact pie charts (grouped by role or category)
   - Filterable by date range (7d, 28d, 90d, all time)
   - Metric selection (views, likes, comments, project count)

3. **Metrics Refresh**:
   - Manual sync button triggers YouTube API calls
   - Instagram sync fetches latest posts and insights
   - Daily snapshots stored with UTC midnight timestamps

---

## 2. Architecture Overview

### Technology Stack

**Frontend:**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query) for server state
- **Routing**: React Router v6
- **Charts**: Recharts (pie charts, line charts)
- **HTTP Client**: Custom `apiClient` wrapper with authentication

**Backend:**
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Authentication**: JWT-based (Supabase tokens + demo tokens)
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **External APIs**: YouTube Data API v3, Instagram Graph API

**Infrastructure:**
- **Frontend Hosting**: Vercel (or similar)
- **Backend Hosting**: Render
- **Database**: Supabase Cloud
- **Environment**: Separate `.env` files for frontend (`VITE_*`) and backend

### Backend Structure

```
backend/src/
├── server.ts          # Entry point, starts Express server
├── app.ts             # Express app configuration, middleware, routes
├── config/
│   ├── env.ts         # Environment variable validation
│   └── supabase.ts     # Supabase client initialization (admin + user)
├── middleware/
│   ├── authenticate.ts # JWT validation, extracts user context
│   ├── errorHandler.ts # Global error handling
│   ├── notFound.ts     # 404 handler
│   └── rateLimit.ts    # Rate limiting for auth endpoints
├── routes/
│   ├── index.ts        # Main API router, mounts sub-routers
│   ├── auth.ts         # Demo auth, user provisioning
│   ├── projects.ts     # CRUD for projects, claim YouTube videos
│   ├── metrics.ts      # Summary, role impact, platform metrics
│   ├── integrations.ts # YouTube/Instagram OAuth, sync endpoints
│   ├── roles.ts        # Role management
│   ├── health.ts       # Health check
│   └── cron.ts        # Scheduled jobs (metrics sync)
└── services/
    ├── youtubeIntegration.ts    # OAuth, token management, sync logic
    ├── instagramIntegration.ts  # OAuth, token exchange, media sync
    ├── youtubeApiKey.ts         # YouTube API calls (no OAuth)
    ├── supabaseUserClient.ts    # Creates user-scoped Supabase client
    └── userProvisioning.ts      # Creates user records in public.users
```

**Key Backend Patterns:**
- **Service Layer**: Business logic separated from routes
- **Admin vs User Clients**: Admin client bypasses RLS for system operations; user client respects RLS
- **Error Wrapping**: Consistent error types (`SupabaseQueryError`, `SupabaseMutationError`, etc.)
- **Zod Validation**: Request/response validation at route boundaries
- **Authentication Middleware**: Extracts user context, supports both Supabase and demo sessions

### Frontend Structure

```
frontend/src/
├── main.tsx           # Entry point, React app bootstrap
├── App.tsx            # Root component, route definitions
├── providers/
│   ├── AppProviders.tsx    # Wraps app with React Query, Auth providers
│   └── AuthProvider.tsx    # Authentication state management
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── OAuthCallbackPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── analytics/
│   │   ├── AnalyticsPage.tsx
│   │   ├── YouTubeAnalyticsView.tsx
│   │   └── ImpactByRole.tsx
│   ├── projects/
│   │   └── ProjectsPage.tsx
│   ├── profile/
│   │   └── ProfilePage.tsx
│   └── settings/
│       └── SettingsPage.tsx
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── layout/
│   │   └── RootLayout.tsx
│   └── projects/
│       └── [project components]
├── hooks/
│   └── api/
│       ├── metrics.ts      # React Query hooks for metrics
│       ├── projects.ts     # React Query hooks for projects
│       ├── integrations.ts # Integration status hooks
│       └── roles.ts         # Roles hooks
└── lib/
    ├── apiClient.ts        # HTTP client with auth
    ├── env.ts              # Environment variable access
    └── supabaseClient.ts   # Supabase client configuration
```

**Key Frontend Patterns:**
- **React Query**: Server state management, caching, automatic refetching
- **Custom Hooks**: Encapsulate API calls and data transformation
- **Protected Routes**: Wrapper component checks auth before rendering
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Responsive Design**: Mobile-first Tailwind CSS approach

---

## 3. Data Model

### Core Tables

#### `users`
- `u_id` (UUID, primary key)
- `u_email` (unique, not null)
- `u_name`, `u_bio`, `profile_image_url`
- `u_created_at`

#### `projects`
- `p_id` (text, primary key) - YouTube video ID or Instagram media ID
- `p_title`, `p_description`, `p_link` (not null)
- `p_platform` (default: 'youtube') - 'youtube' | 'instagram' | 'tiktok' | 'vimeo' | 'other'
- `p_channel` - Channel/account name
- `p_posted_at` - Publication timestamp
- `p_thumbnail_url`
- `p_created_at`

#### `roles`
- `role_id` (serial, primary key)
- `role_name` (unique, not null) - e.g., "Director", "Editor"
- `category` - e.g., "Direction", "Video", "Sound", "Production"

**Predefined Roles:**
- Direction: Director, Creative Director
- Video: Editor, Colorist, Videographer, DOP
- Production: Producer
- Talent: Model
- Sound: Composer, Sound Designer, Audio Engineer, Mixing Engineer, Mastering Engineer
- Misc: Other

#### `user_projects`
- `up_id` (UUID, primary key)
- `u_id` (references `users.u_id`)
- `p_id` (references `projects.p_id`)
- `role_id` (references `roles.role_id`, nullable)
- `u_role` (text, nullable) - Custom role name
- `created_at`

**Role Assignment Logic:**
- If `role_id` is set, `u_role` must be null (predefined role)
- If `u_role` is set, `role_id` must be null (custom role)
- Both can be null (unassigned)

#### `youtube_metrics`
- `id` (bigserial, primary key)
- `p_id` (references `projects.p_id`)
- `platform` (default: 'youtube')
- `fetched_at` (not null) - UTC midnight snapshot timestamp
- `view_count`, `like_count`, `comment_count`, `share_count`
- `engagement_rate` (calculated: (likes + comments + shares) / views * 100)
- Unique constraint: `(p_id, fetched_at)`

#### `instagram_metrics`
- `id` (bigserial, primary key)
- `p_id` (references `projects.p_id`)
- `platform` (default: 'instagram')
- `fetched_at` (not null)
- `like_count`, `comment_count`, `view_count` (impressions), `reach`, `save_count`
- `engagement_rate` (calculated: (likes + comments + saves) / reach * 100)
- Unique constraint: `(p_id, fetched_at)`

#### `instagram_insights`
- `id` (bigserial, primary key)
- `u_id` (references `users.u_id`)
- `account_id` - Instagram Business Account ID
- `metric` - 'reach' | 'profile_views' | 'accounts_engaged' | 'follower_count'
- `value` (numeric)
- `end_time` (not null) - Timestamp for the metric
- `retrieved_at`
- Unique constraint: `(u_id, account_id, metric, end_time)`

#### `user_metrics`
- `id` (bigserial, primary key)
- `u_id` (references `users.u_id`, unique)
- `total_view_count`, `total_like_count`, `total_comment_count`, `total_share_count`
- `avg_engagement_rate`
- `updated_at`

**Auto-Updated via Trigger:**
- Triggered on insert/update/delete to `youtube_metrics` or `instagram_metrics`
- Aggregates latest metrics from all user's projects
- Uses `update_user_metrics()` function

#### `user_tokens`
- `token_id` (UUID, primary key)
- `u_id` (references `users.u_id`)
- `platform` - 'youtube' | 'instagram' | 'tiktok' | 'vimeo'
- `access_token`, `refresh_token` (nullable)
- `expires_at` (nullable)
- `account_id`, `account_username` - Platform account identifiers
- `created_at`, `updated_at`
- Unique constraint: `(u_id, platform)` - One token per user per platform

#### `oauth_states`
- `state` (text, primary key) - UUID for CSRF protection
- `u_id` (references `users.u_id`)
- `created_at`, `expires_at` (default: 15 minutes)

### Database Views

#### `youtube_latest_metrics`
- `DISTINCT ON (p_id)` with `ORDER BY fetched_at DESC`
- Returns most recent metrics snapshot per project

#### `instagram_latest_metrics`
- Same pattern as YouTube view
- Includes `reach` and `save_count` fields

#### `instagram_account_latest_metrics`
- `DISTINCT ON (u_id, metric)` with `ORDER BY end_time DESC`
- Latest account-level insight per user per metric type

### Relationships

```
users (1) ──< (many) user_projects (many) >── (1) projects
                │
                ├── (many) >── (1) roles
                │
                └── (many) >── (1) projects ──< (many) youtube_metrics
                                              └──< (many) instagram_metrics

users (1) ──< (many) user_tokens
users (1) ──< (many) instagram_insights
users (1) ──< (1) user_metrics
```

---

## 4. Integrations

### Google/Supabase Authentication

**Flow:**
1. User clicks "Sign in with Google" on login page
2. Frontend redirects to Supabase Auth with Google OAuth provider
3. Supabase handles OAuth exchange with Google
4. Google redirects back to `/auth/callback` with authorization code or token
5. `OAuthCallbackPage` component:
   - Extracts code/token from URL
   - Calls `supabaseClient.auth.exchangeCodeForSession()` or `setSession()`
   - Falls back to `getSession()` if no explicit payload
   - Marks success when session is detected
   - Redirects to original destination or dashboard
6. `AuthProvider` detects session change, provisions user record via `/api/auth/provision`

**Configuration:**
- Supabase dashboard: Google OAuth provider enabled
- Redirect URLs: `https://your-domain.com/auth/callback`
- Site URL: Production frontend URL
- Frontend env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**Demo Mode:**
- Alternative auth for exploration
- Backend generates JWT token with demo user ID
- Stored in localStorage (separate from Supabase session)
- Limited functionality (no integrations, read-only)

### YouTube Integration

**OAuth Flow (Optional):**
1. User clicks "Connect YouTube" in settings
2. Backend creates OAuth state (UUID) in `oauth_states` table
3. Backend generates Google OAuth URL with state parameter
4. Frontend opens popup window to Google authorization
5. User grants permissions (YouTube readonly scope)
6. Google redirects to backend callback: `/api/integrations/youtube/callback`
7. Backend:
   - Validates state (checks expiration, consumes state)
   - Exchanges code for tokens via Google OAuth2 client
   - Fetches channel profile (channel ID, title)
   - Stores tokens in `user_tokens` table
   - Returns success message to popup
8. Popup sends message to parent window, closes
9. Frontend refreshes integration status

**Token Management:**
- Access tokens expire; refresh tokens used to obtain new access tokens
- Backend checks expiration before API calls
- Auto-refresh on sync operations
- Stored securely in `user_tokens` with expiration timestamps

**Metrics Sync (API Key Method - Primary):**
- **No OAuth Required**: Uses YouTube Data API v3 with API key
- Works for any public YouTube video
- Process:
  1. User claims video via URL
  2. Backend extracts video ID
  3. Calls `youtube.videos.list()` with API key (no auth)
  4. Fetches: title, channel, thumbnail, publish date, statistics
  5. Creates/updates project in `projects` table
  6. Stores initial metrics snapshot in `youtube_metrics`
  7. Links user to project in `user_projects`

**Manual Sync:**
- User clicks "Refresh Sync" on dashboard
- Backend calls `syncYouTubeMetricsForUser(userId)`
- Fetches all user's YouTube project IDs
- Batch API calls to YouTube (50 videos per request)
- Calculates engagement rate: `(likes + comments + shares) / views * 100`
- Stores snapshot with UTC midnight timestamp
- Updates `user_metrics` via trigger

**Scheduled Sync (Cron):**
- Endpoint: `/api/cron/sync-youtube-metrics`
- Protected by `CRON_SECRET` header
- Calls `syncYouTubeMetricsForAllProjects()`
- Syncs all YouTube projects in database (not user-specific)
- Can be triggered by external cron service (e.g., Render cron jobs)

### Instagram Integration

**OAuth Flow:**
1. User clicks "Connect Instagram" in settings
2. Backend creates OAuth state, **clears existing tokens** (forces fresh permissions)
3. Generates Meta OAuth URL with required scopes:
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
   - `instagram_basic`
   - `instagram_manage_insights`
4. Frontend opens popup to Meta authorization
5. User grants permissions
6. Meta redirects to backend: `/api/integrations/instagram/callback`
7. Backend:
   - Validates state
   - Exchanges code for short-lived token
   - Exchanges short-lived token for long-lived token (60 days)
   - Fetches user's Facebook pages
   - Finds page with connected Instagram Business Account
   - Fetches Instagram account details (username, profile picture)
   - Stores long-lived token in `user_tokens`
   - Returns success message
8. Popup closes, frontend refreshes status

**Token Management:**
- Long-lived tokens expire in ~60 days
- No refresh token mechanism (Instagram doesn't support it)
- Users must reconnect when token expires
- Backend checks expiration before API calls

**Metrics Sync:**
1. User clicks "Sync Instagram" or automatic sync after connection
2. Backend calls `syncInstagramMetricsForUser(userId)`
3. Process:
   - Fetches stored token, validates expiration
   - **Account-Level Insights**:
     - Fetches `follower_count` from account object
     - Fetches `reach`, `profile_views`, `accounts_engaged` from insights endpoint (last 30 days)
     - Stores in `instagram_insights` table
   - **Post-Level Metrics**:
     - Fetches media list (posts) from Instagram Graph API
     - For each post:
       - Creates/updates project in `projects` table (uses media ID as `p_id`)
       - Creates `user_projects` link if not exists
       - Fetches post insights: `reach`, `impressions`, `saved`
       - Calculates engagement rate: `(likes + comments + saves) / reach * 100`
       - Stores metrics in `instagram_metrics` table
   - Returns sync result (post count, insight count)

**Project Creation:**
- Instagram projects are automatically created during sync
- `p_id` = Instagram media ID
- `p_link` = Instagram permalink or constructed from shortcode
- `p_title` = Truncated caption (max 255 chars)
- `p_thumbnail_url` = Thumbnail or media URL
- `p_channel` = Instagram username
- `p_posted_at` = Media timestamp

---

## 5. Analytics & Dashboard

### Dashboard Overview

**Metrics Cards:**
- **Views**: Sum of `view_count` from latest metrics across all projects
- **Likes**: Sum of `like_count`
- **Comments**: Sum of `comment_count`
- **Projects**: Total count of user's claimed projects

**Performance Overview:**
- Latest metrics sync timestamp
- 24-hour growth percentage (compares latest vs 24h ago metrics)
- Manual refresh button (triggers YouTube sync)

**Project Lists:**
- Top 6 newest YouTube projects (thumbnail grid)
- Top 6 newest Instagram projects
- Each card shows: thumbnail, title, role badge, posted date
- Links to full projects page

**Collaborators:**
- Groups projects by `p_channel`
- Shows channel name and project count
- Sorted by project count (descending)

### Analytics Page

**Platform Switcher:**
- Toggle between YouTube and Instagram views
- Platform-specific metrics and charts

**YouTube Analytics View:**
- **Summary Cards**: Same as dashboard (filtered to YouTube)
- **Time-Series Chart**: Line chart showing metrics over time
  - X-axis: Date (fetched_at)
  - Y-axis: Metric value
  - Series: Views, Likes, Comments, Engagement Rate
  - Data aggregated across all YouTube projects
  - Configurable limit (default: 365 days)
- **Role Impact Chart**: See below

**Instagram Analytics View:**
- **Summary Cards**: Includes follower count from `instagram_insights`
- **Time-Series Chart**: Similar to YouTube, includes `reach` and `save_count`
- **Account Insights Chart**: Separate chart for account-level metrics
  - Metrics: Follower Count, Reach, Profile Views, Accounts Engaged
  - Time-series showing growth over time
- **Role Impact Chart**: See below

### Role-Based Analytics

**Impact by Role Component:**
- **Visualization**: Donut pie chart (Recharts)
- **Grouping Options**:
  - **By Role**: Individual roles (Director, Editor, etc.)
  - **By Category**: Aggregated by category (Direction, Video, Sound, etc.)
- **Metric Selection**:
  - Views (sum of view_count)
  - Likes (sum of like_count)
  - Comments (sum of comment_count)
  - Projects (count of projects)
- **Date Range Filter**:
  - Last 7 days
  - Last 28 days
  - Last 90 days
  - All time
  - Custom (start/end date)
- **Platform Filter**: All, YouTube, Instagram

**Backend Logic (`/api/metrics/role-impact`):**
1. Loads user's `user_projects` with role relationships
2. Filters by platform if specified
3. Filters by date range (based on `projects.p_posted_at`)
4. Loads latest metrics from `youtube_latest_metrics` or `instagram_latest_metrics`
5. Groups metrics by role/category:
   - If `role_id` exists: uses `roles.role_name` or `roles.category`
   - If `u_role` exists: uses custom role name or "Custom" category
6. Sums metrics per group
7. Calculates percentages
8. Returns array of `{ label, value, percentage }`

**Chart Rendering:**
- Top 8 slices shown individually
- Remaining slices grouped as "Other"
- Color-coded legend
- Percentage labels on slices (>3% threshold)
- Tooltip shows: label, formatted value, percentage
- Breakdown table with color indicators

**Data Aggregation:**
- Uses `youtube_latest_metrics` and `instagram_latest_metrics` views
- Ensures one metric snapshot per project (most recent)
- Handles both predefined roles (via `role_id`) and custom roles (via `u_role`)
- Custom roles grouped into "Custom" category when grouping by category

### Metrics Query Patterns

**Summary Endpoint (`/api/metrics/summary`):**
- Optionally filters by platform
- Uses `user_metrics` table for fast aggregation (if not platform-specific)
- Falls back to computing from `*_latest_metrics` views if:
  - Platform filter is specified (user_metrics is not platform-specific)
  - user_metrics is zero/empty
- Computes 24-hour growth by comparing latest vs 24h-ago snapshots
- Fetches Instagram follower count from `instagram_account_latest_metrics` view

**Project Metrics Endpoint (`/api/metrics/projects/:projectId`):**
- Returns time-series for single project
- Supports platform filter (YouTube or Instagram)
- Configurable limit (default: 365 points)
- Ordered by `fetched_at` ascending

**Platform Metrics Endpoint (`/api/metrics/platform/:platform`):**
- Aggregates metrics across all user's projects for a platform
- Groups by `fetched_at` timestamp
- Sums metrics per timestamp
- Averages engagement rates
- Returns time-series for platform-wide trends

---

## 6. Roadblocks & Solutions

### OAuth Redirect Issues

**Problem:**
- Google OAuth callback page showed "Missing authorization response" error
- Users were actually authenticated (session existed)
- Issue was in callback page logic

**Root Cause:**
- Callback component only handled explicit code/token in URL
- Didn't check for existing session if no payload present
- Race condition: Supabase session established before component checked

**Solution:**
- Added fallback to `supabaseClient.auth.getSession()` when no explicit payload
- Only show error if no session exists after all checks
- Improved state validation and redirect handling

**Files:**
- `frontend/src/pages/auth/OAuthCallbackPage.tsx`
- Documented in: `Roadblocks/2025-11-13-google-oauth-callback-report.md`

### Supabase URL Configuration

**Problem:**
- Frontend and backend using different Supabase URLs
- Environment variables not properly validated
- Production builds failing silently

**Solution:**
- Centralized environment validation in `frontend/src/lib/env.ts`
- Enforced `VITE_API_URL` requirement in production
- Clear error messages for missing configuration
- Separate env files for frontend (`VITE_*`) and backend

**Files:**
- `frontend/src/lib/env.ts`
- `backend/src/config/env.ts`

### Route Ordering Problems

**Problem:**
- Route collision: `/api/metrics/role-impact` vs `/api/metrics/platform/:platform`
- Express matching `/role-impact` as `:platform` parameter

**Solution:**
- Reordered routes: specific routes before parameterized routes
- `/api/metrics/role-impact` defined before `/api/metrics/platform/:platform`

**Files:**
- `backend/src/routes/metrics.ts` (lines 740, 1407)

### Schema Mismatches: `user_id` vs `u_id`

**Problem:**
- Supabase Auth uses `auth.users.id` (UUID)
- Custom schema uses `public.users.u_id` (UUID)
- Mismatch in foreign key references

**Solution:**
- Consistent use of `u_id` throughout custom schema
- User provisioning creates `public.users` record with `u_id = auth.users.id`
- All foreign keys reference `u_id`, not `user_id`
- Clear separation: Supabase Auth manages `auth.users`, app manages `public.users`

**Files:**
- `backend/src/services/userProvisioning.ts`
- `supabase/sql/001_init.sql`

### Deployment Configuration Issues

**Vercel (Frontend):**
- **Issue**: Environment variables not prefixed with `VITE_`
- **Solution**: All frontend env vars must use `VITE_` prefix for Vite to expose them
- **Required Vars**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`

**Render (Backend):**
- **Issue**: CORS configuration blocking frontend requests
- **Solution**: CORS middleware configured to allow frontend origin (regex: `/credify/i`)
- **Issue**: Environment variables not set in Render dashboard
- **Solution**: All backend env vars configured in Render service settings

**Files:**
- `backend/src/app.ts` (CORS configuration)
- `PRODUCTION_READINESS_REVIEW.md`

### Instagram OAuth Permission Issues

**Problem:**
- Meta not showing permission prompts on reconnection
- Missing scopes in token (e.g., `pages_show_list`)
- Instagram Business Account not found

**Solution:**
- Force token deletion before OAuth flow (clears cached permissions)
- Use `auth_type=reauthenticate` parameter in OAuth URL
- Clear error messages guiding users to:
  - Ensure Instagram is Business/Creator account
  - Connect Instagram to Facebook Page
  - Remove app from Facebook settings before reconnecting

**Files:**
- `backend/src/services/instagramIntegration.ts` (lines 103-117, 163-182)

### Metrics Aggregation Performance

**Problem:**
- Slow queries when aggregating across many projects
- Multiple round trips to Supabase

**Solution:**
- Created database views (`youtube_latest_metrics`, `instagram_latest_metrics`)
- Uses `DISTINCT ON` for efficient latest-snapshot queries
- Single query per platform instead of per-project queries
- Database triggers auto-update `user_metrics` table

**Files:**
- `supabase/sql/001_init.sql` (views, triggers, functions)

### Token Refresh Logic

**Problem:**
- YouTube access tokens expiring during sync operations
- No automatic refresh before API calls

**Solution:**
- `ensureFreshAccessToken()` function checks expiration
- Auto-refreshes if token expires within 60 seconds
- Updates stored tokens after refresh
- Handles missing refresh tokens gracefully

**Files:**
- `backend/src/services/youtubeIntegration.ts` (lines 247-289)

---

## 7. Limitations & Future Enhancements

### Current Limitations

1. **Instagram Project Deletion**: Instagram projects cannot be deleted via UI (only YouTube projects)
   - Reason: Projects are managed via sync; deletion would be recreated on next sync
   - Workaround: Disconnect Instagram integration

2. **Share-Weighted Mode**: Role impact "share-weighted" mode is defined but not fully implemented
   - Current: All metrics count fully for each role
   - Future: Weight metrics by role share percentage (if multiple roles per project)

3. **TikTok/Vimeo Integration**: Schema supports these platforms, but no integration implemented
   - Tables and routes prepared, but no OAuth or sync logic

4. **Custom Date Ranges**: Role impact supports "custom" date range, but UI doesn't expose date pickers
   - Backend accepts `startDate` and `endDate` query params
   - Frontend only shows preset ranges (7d, 28d, 90d, all)

5. **Multi-Role Projects**: Currently one role per project
   - Schema supports it (multiple `user_projects` rows per project)
   - UI and business logic enforce single role

### Planned Enhancements

1. **TikTok Integration**: OAuth flow and metrics sync similar to Instagram
2. **Vimeo Integration**: API integration for video metrics
3. **Export Functionality**: CSV/PDF export of metrics and projects
4. **Collaboration Features**: Share projects with other users, team workspaces
5. **Advanced Analytics**: Cohort analysis, trend predictions, benchmarking
6. **Notifications**: Email alerts for milestone metrics, sync failures
7. **API Rate Limit Handling**: Better error messages when YouTube/Instagram APIs are rate-limited
8. **Batch Project Import**: CSV upload for bulk project claiming

---

## 8. Security Considerations

### Authentication
- JWT tokens validated on every request
- Supabase RLS policies enforce data isolation
- OAuth state validation prevents CSRF attacks
- Demo mode restricted from sensitive operations

### Data Access
- Users can only access their own projects (enforced by RLS)
- Admin client used only for system operations (bypasses RLS with service role)
- User client respects RLS for all queries

### Token Storage
- OAuth tokens stored in database (encrypted at rest by Supabase)
- No tokens in frontend code or localStorage
- Refresh tokens handled securely by backend

### API Keys
- YouTube API key stored in backend environment variables
- Never exposed to frontend
- Instagram app secrets stored securely

---

## Conclusion

Credify is a production-ready platform that successfully bridges the gap between creative work and performance analytics. The architecture is scalable, the data model is well-structured, and the integrations provide real-time insights into creator impact. The application demonstrates best practices in full-stack TypeScript development, with clear separation of concerns, robust error handling, and comprehensive data validation.

The platform is ready for presentation and can serve as a foundation for future enhancements in the creator economy space.

---

**Document Version:** 1.0  
**Last Updated:** January 2025

