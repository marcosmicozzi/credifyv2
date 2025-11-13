# Google OAuth Callback Misreporting

**Date:** 2025-11-13

## Summary
The Google OAuth sign-in flow authenticated users successfully in Supabase, but the `/auth/callback` page reported “Missing authorization response from Supabase.” Navigating away revealed the user was already logged in, confirming the issue was limited to the callback UI.

## Symptoms
- Callback page displayed an error despite Supabase successfully creating an authenticated session.
- Refreshing or visiting `/` after the error showed the dashboard with a valid session.

## Investigation & Attempts
- Confirmed Supabase received the OAuth response and established the session via local storage.
- Reviewed callback code and identified that it only handled responses containing an authorization code or implicit token payload.
- Considered race conditions caused by the asynchronous exchange completing after the component unmounted.

## Resolution
- Reworked the callback effect to:
  - Sanitize the redirect parameter and verify stored OAuth state.
  - Attempt code/token exchange when present.
  - Fallback to `supabaseClient.auth.getSession()` when no authorization payload is returned or after the exchange completes.
  - Mark success once an active session is detected, only surfacing an error when no session exists.

After these changes, the callback page correctly reflects the authenticated state and redirects users back to the requested route without misleading errors.

## Follow-up
- Monitor future auth provider integrations to ensure callback handling covers both explicit responses and pre-established sessions.
