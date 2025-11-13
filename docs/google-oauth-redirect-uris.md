# Google OAuth Redirect URI Configuration Guide

## Overview

This project uses **two separate Google OAuth flows** that require different redirect URI configurations:

1. **User Authentication (Google Sign-In)** - Uses Supabase OAuth
2. **YouTube Integration** - Direct OAuth with Google

---

## Flow 1: User Authentication (Google Sign-In)

### How It Works

```
User → Frontend Login → Supabase OAuth → Google → Supabase Callback → Frontend /auth/callback
```

1. User clicks "Sign in with Google" on frontend
2. Frontend calls `supabaseClient.auth.signInWithOAuth()` with `redirectTo: ${window.location.origin}/auth/callback`
3. Supabase generates OAuth URL pointing to Google
4. Google redirects to **Supabase's OAuth callback URL** (not your frontend)
5. Supabase processes OAuth and redirects to your frontend callback

### Code Reference

```35:35:frontend/src/pages/auth/LoginPage.tsx
      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`
```

### Google Cloud Console Configuration

**You must whitelist Supabase's OAuth callback URL**, not your frontend URL.

**Format:** `https://[your-project-ref].supabase.co/auth/v1/callback`

**To find your Supabase callback URL:**
1. Go to Supabase Dashboard → Your Project → Authentication → URL Configuration
2. Look for "Redirect URLs" section
3. The callback URL format is: `https://[project-ref].supabase.co/auth/v1/callback`

**Required Redirect URIs in Google Cloud Console:**
- ✅ `https://[your-project-ref].supabase.co/auth/v1/callback` (required for both dev and prod)

**Note:** Since Supabase handles the OAuth flow, you only need to whitelist Supabase's callback URL in Google Cloud Console. The frontend callback URL (`/auth/callback`) is configured in Supabase Dashboard, not Google Cloud Console.

### Supabase Dashboard Configuration

**Site URL:**
- Production: `https://credifyv2-finalv2.vercel.app`
- Development: `http://localhost:3000` (or your local dev port)

**Redirect URLs (Allowed Redirect URLs):**
- Production: `https://credifyv2-finalv2.vercel.app/auth/callback`
- Development: `http://localhost:3000/auth/callback`

**Optional:** You can use wildcards for development:
- `http://localhost:*/auth/callback` (matches any port)

---

## Flow 2: YouTube Integration OAuth

### How It Works

```
User → Frontend Settings → Backend /authorize → Google → Backend /callback
```

1. User clicks "Connect YouTube" in Settings
2. Frontend calls backend `/api/integrations/youtube/authorize`
3. Backend generates OAuth URL using `YOUTUBE_OAUTH_REDIRECT_URI`
4. Google redirects directly to backend callback
5. Backend processes OAuth and stores tokens

### Code Reference

```96:104:backend/src/services/youtubeIntegration.ts
export function generateYouTubeAuthUrl(state: string): string {
  const client = createYouTubeOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: YOUTUBE_SCOPES,
    include_granted_scopes: true,
    prompt: 'consent',
    state,
  })
}
```

```85:141:backend/src/routes/integrations.ts
youtubeRouter.get('/callback', async (req, res, next) => {
  // ... callback handler
})
```

### Google Cloud Console Configuration

**You must whitelist the backend callback URL** specified in `YOUTUBE_OAUTH_REDIRECT_URI`.

**Required Redirect URIs in Google Cloud Console:**
- Production: `https://credify-backend-v6tv.onrender.com/api/integrations/youtube/callback`
- Development: `http://localhost:4000/api/integrations/youtube/callback` (or your local backend port)

### Backend Environment Variable

**`YOUTUBE_OAUTH_REDIRECT_URI`** must match the callback URL:
- Production: `https://credify-backend-v6tv.onrender.com/api/integrations/youtube/callback`
- Development: `http://localhost:4000/api/integrations/youtube/callback`

---

## Complete Google Cloud Console Checklist

### OAuth 2.0 Client ID Configuration

**Authorized JavaScript origins:**
- `https://credifyv2-finalv2.vercel.app` (production frontend)
- `http://localhost:3000` (local development - optional, only if needed)

**Authorized redirect URIs:**

**For User Authentication (Supabase OAuth):**
- ✅ `https://[your-project-ref].supabase.co/auth/v1/callback`

**For YouTube Integration:**
- ✅ `https://credify-backend-v6tv.onrender.com/api/integrations/youtube/callback` (production)
- ✅ `http://localhost:4000/api/integrations/youtube/callback` (local development)

**Total redirect URIs needed:**
1. Supabase callback (for user auth)
2. Backend YouTube callback (production)
3. Backend YouTube callback (local dev - optional)

---

## Localhost Configuration

### Should You Keep Localhost?

**Yes, keep localhost redirect URIs for local development.** Google allows `http://localhost` for development purposes.

**Benefits:**
- Enables local testing without deploying
- No risk of production issues (Google validates the redirect URI matches exactly)
- Standard practice for OAuth development

**Security:**
- Google only redirects to whitelisted URIs
- Localhost URIs only work when running locally
- Production redirects won't work on localhost and vice versa

### Recommended Approach

**Option 1: Single OAuth Client (Recommended for simplicity)**
- Keep both production and localhost URIs in one OAuth client
- Use the same client for both environments
- Google validates the exact redirect URI, so there's no conflict

**Option 2: Separate OAuth Clients (Recommended for production)**
- Create separate OAuth clients for development and production
- Use different client IDs via environment variables
- Better security isolation

---

## Verification Steps

1. **Verify Supabase callback URL:**
   - Check Supabase Dashboard → Authentication → URL Configuration
   - Confirm the callback URL format matches: `https://[project-ref].supabase.co/auth/v1/callback`

2. **Test User Authentication:**
   - Production: Visit `https://credifyv2-finalv2.vercel.app/login`
   - Local: Visit `http://localhost:3000/login`
   - Click "Sign in with Google"
   - Should redirect: Google → Supabase → Frontend callback

3. **Test YouTube Integration:**
   - Production: Visit `https://credifyv2-finalv2.vercel.app/settings`
   - Local: Visit `http://localhost:3000/settings`
   - Click "Connect YouTube"
   - Should redirect: Google → Backend callback

4. **Check Environment Variables:**
   - Backend: Verify `YOUTUBE_OAUTH_REDIRECT_URI` matches the callback URL
   - Frontend: Verify `VITE_SUPABASE_URL` is correct

---

## Common Issues

### Issue: "redirect_uri_mismatch" Error

**Cause:** The redirect URI in the OAuth request doesn't match what's whitelisted in Google Cloud Console.

**Solutions:**
- For User Auth: Verify Supabase callback URL is whitelisted
- For YouTube: Verify `YOUTUBE_OAUTH_REDIRECT_URI` matches whitelisted URL
- Check for trailing slashes, http vs https, port numbers

### Issue: Redirecting to localhost in Production

**Cause:** Hardcoded localhost URL or incorrect `window.location.origin` usage.

**Solution:** The code already uses `window.location.origin` correctly, so this shouldn't happen. If it does, check:
- Browser console for the actual redirect URL
- Supabase Dashboard redirect URL configuration
- Environment variables

### Issue: YouTube Integration Not Working

**Cause:** Backend `YOUTUBE_OAUTH_REDIRECT_URI` doesn't match Google Cloud Console.

**Solution:**
- Verify backend env var matches exactly (including protocol, port, path)
- Check Google Cloud Console whitelist
- Ensure backend is accessible at that URL

---

## Summary

**For User Authentication:**
- Google Cloud Console: Whitelist Supabase callback URL
- Supabase Dashboard: Whitelist frontend callback URLs

**For YouTube Integration:**
- Google Cloud Console: Whitelist backend callback URL
- Backend Env: Set `YOUTUBE_OAUTH_REDIRECT_URI` to match

**Localhost:**
- Keep localhost URIs for local development
- Google allows `http://localhost` for development
- No security risk as long as production URIs are also configured

