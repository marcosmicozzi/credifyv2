import { randomUUID } from 'node:crypto'

import { env } from '../config/env.js'
import { supabaseAdmin } from '../config/supabase.js'

if (!supabaseAdmin) {
  throw new Error('Supabase admin client is required for Instagram integration.')
}

const INSTAGRAM_GRAPH_API_BASE = env.INSTAGRAM_GRAPH_API_BASE
const INSTAGRAM_SCOPES = env.INSTAGRAM_REQUIRED_SCOPES.split(',').map((s) => s.trim())

type StoredTokenRow = {
  u_id: string
  platform: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  account_id: string | null
  account_username: string | null
  updated_at?: string | null
}

type OAuthStateRow = {
  state: string
  u_id: string
  created_at: string
  expires_at: string
}

type InstagramProfile = {
  accountId: string | null
  username: string | null
}

type InstagramTokenResponse = {
  access_token: string
  token_type: string
  expires_in?: number
}

type InstagramLongLivedTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

type InstagramPageResponse = {
  data: Array<{
    id: string
    name: string
    instagram_business_account?: {
      id: string
      username: string
    }
  }>
}

type InstagramAccountResponse = {
  id: string
  username: string
  followers_count?: number
}

type InstagramInsightsResponse = {
  data: Array<{
    name: string
    values: Array<{
      value: number | string
      end_time: string
    }>
  }>
}

type InstagramMediaResponse = {
  data: Array<{
    id: string
    timestamp: string
    caption?: string
    media_type?: string
    media_url?: string
    thumbnail_url?: string
    permalink?: string
    shortcode?: string
    like_count?: number
    comments_count?: number
    reach?: number
    impressions?: number
    saves?: number
  }>
  paging?: {
    next?: string
  }
}

type SyncResult = {
  syncedPostCount: number
  syncedInsightCount: number
  snapshotDate: string | null
  details?: string
}

export async function createOAuthState(userId: string, clearExistingTokens = false): Promise<{ state: string; expiresAt: string }> {
  // Clear existing Instagram tokens to force fresh OAuth flow with all permissions
  // This ensures Meta will show permission prompts even if the app was previously authorized
  if (clearExistingTokens) {
    const { error: deleteError } = await supabaseAdmin
      .from('user_tokens')
      .delete()
      .eq('u_id', userId)
      .eq('platform', 'instagram')

    if (deleteError) {
      console.warn(`Failed to clear existing Instagram tokens for user ${userId}:`, deleteError)
      // Don't throw - continue with OAuth flow anyway
    }
  }

  const state = randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('oauth_states')
    .insert({
      state,
      u_id: userId,
      expires_at: expiresAt,
    })

  if (error) {
    const wrapped = new Error(`Failed to create OAuth state: ${error.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }

  return { state, expiresAt }
}

export async function consumeOAuthState(state: string): Promise<OAuthStateRow | null> {
  const { data, error } = await supabaseAdmin
    .from('oauth_states')
    .select('*')
    .eq('state', state)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    const wrapped = new Error(`Failed to verify OAuth state: ${error.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }

  if (!data) {
    return null
  }

  await supabaseAdmin.from('oauth_states').delete().eq('state', state)

  return data satisfies OAuthStateRow
}

export function generateInstagramAuthUrl(state: string, forceReauth = false): string {
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_REDIRECT_URI) {
    throw new Error('Instagram OAuth credentials are not configured. Please set INSTAGRAM_APP_ID and INSTAGRAM_REDIRECT_URI.')
  }

  const params = new URLSearchParams({
    client_id: env.INSTAGRAM_APP_ID,
    redirect_uri: env.INSTAGRAM_REDIRECT_URI,
    scope: INSTAGRAM_SCOPES.join(','),
    response_type: 'code',
    state,
  })

  // Force re-authentication to ensure all scopes are requested
  // This prevents Meta from silently skipping permission prompts when scopes have changed
  if (forceReauth) {
    params.set('auth_type', 'reauthenticate')
  }

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
}

export async function exchangeInstagramAuthCode(code: string): Promise<{
  shortLivedToken: string
  longLivedToken: string
  expiresAt: string
  profile: InstagramProfile
}> {
  if (!env.INSTAGRAM_APP_ID || !env.INSTAGRAM_APP_SECRET || !env.INSTAGRAM_REDIRECT_URI) {
    throw new Error('Instagram OAuth credentials are not configured.')
  }

  // Step 1: Exchange code for short-lived token
  const tokenUrl = `${INSTAGRAM_GRAPH_API_BASE}/oauth/access_token`
  const tokenParams = new URLSearchParams({
    client_id: env.INSTAGRAM_APP_ID,
    client_secret: env.INSTAGRAM_APP_SECRET,
    redirect_uri: env.INSTAGRAM_REDIRECT_URI,
    code,
  })

  const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
    method: 'GET',
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Failed to exchange code for token: ${tokenResponse.status} ${errorText}`)
  }

  const tokenData = (await tokenResponse.json()) as InstagramTokenResponse

  if (!tokenData.access_token) {
    throw new Error('No access token received from Instagram')
  }

  const shortLivedToken = tokenData.access_token

  // Step 2: Exchange short-lived token for long-lived token
  const longLivedUrl = `${INSTAGRAM_GRAPH_API_BASE}/oauth/access_token`
  const longLivedParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env.INSTAGRAM_APP_ID,
    client_secret: env.INSTAGRAM_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  })

  const longLivedResponse = await fetch(`${longLivedUrl}?${longLivedParams.toString()}`, {
    method: 'GET',
  })

  if (!longLivedResponse.ok) {
    const errorText = await longLivedResponse.text()
    throw new Error(`Failed to exchange for long-lived token: ${longLivedResponse.status} ${errorText}`)
  }

  const longLivedData = (await longLivedResponse.json()) as InstagramLongLivedTokenResponse

  if (!longLivedData.access_token) {
    throw new Error('No long-lived access token received from Instagram')
  }

  const longLivedToken = longLivedData.access_token
  const expiresIn = longLivedData.expires_in ?? 5184000 // Default to 60 days if not provided
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  // Step 3: Get user's pages to find Instagram business account
  // IMPORTANT: Must request 'instagram_business_account' field explicitly
  // and include all necessary permissions (pages_show_list, pages_read_engagement, business_management)
  const pagesUrl = `${INSTAGRAM_GRAPH_API_BASE}/me/accounts`
  const pagesParams = new URLSearchParams({
    fields: 'id,name,instagram_business_account',
    access_token: longLivedToken,
  })

  const pagesResponse = await fetch(`${pagesUrl}?${pagesParams.toString()}`)

  if (!pagesResponse.ok) {
    const errorText = await pagesResponse.text()
    let errorData: unknown
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { error: { message: errorText } }
    }
    throw new Error(`Failed to fetch pages: ${pagesResponse.status} ${errorText}. Error details: ${JSON.stringify(errorData)}`)
  }

  const pagesData = (await pagesResponse.json()) as InstagramPageResponse

  // Find page with Instagram business account
  let instagramAccountId: string | null = null
  let instagramUsername: string | null = null

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error(
      'No Facebook pages returned. This indicates missing Page permissions. Please ensure you granted pages_show_list, pages_read_engagement, and business_management permissions during the OAuth flow. Remove the app from Facebook settings and reconnect to grant all required permissions.',
    )
  }

  for (const page of pagesData.data) {
    if (page.instagram_business_account?.id) {
      instagramAccountId = page.instagram_business_account.id
      // Fetch Instagram account details
      const accountUrl = `${INSTAGRAM_GRAPH_API_BASE}/${instagramAccountId}`
      const accountParams = new URLSearchParams({
        fields: 'id,username',
        access_token: longLivedToken,
      })

      const accountResponse = await fetch(`${accountUrl}?${accountParams.toString()}`)

      if (accountResponse.ok) {
        const accountData = (await accountResponse.json()) as InstagramAccountResponse
        instagramUsername = accountData.username ?? null
      }

      break
    }
  }

  if (!instagramAccountId) {
    // Check if we have pages but none have Instagram business accounts
    const pagesWithNames = pagesData.data.map((p) => p.name || p.id).join(', ')
    throw new Error(
      `No Instagram business account found in any of your Facebook pages (${pagesWithNames || 'none found'}). Please ensure: 1) Your Instagram account is a Business or Creator account, 2) It is connected to a Facebook Page, 3) The Page is visible in your Facebook account settings. If you recently connected the account, try removing the app from Facebook settings and reconnecting to refresh permissions.`,
    )
  }

  return {
    shortLivedToken,
    longLivedToken,
    expiresAt,
    profile: {
      accountId: instagramAccountId,
      username: instagramUsername,
    },
  }
}

export async function upsertInstagramToken(
  userId: string,
  payload: {
    accessToken: string
    expiresAt: string
    profile: InstagramProfile
  },
) {
  const { accessToken, expiresAt, profile } = payload

  const { error } = await supabaseAdmin
    .from('user_tokens')
    .upsert(
      {
        u_id: userId,
        platform: 'instagram',
        access_token: accessToken,
        refresh_token: null, // Instagram long-lived tokens don't use refresh tokens
        expires_at: expiresAt,
        account_id: profile.accountId,
        account_username: profile.username,
      },
      {
        onConflict: 'u_id,platform',
      },
    )

  if (error) {
    const wrapped = new Error(`Failed to persist Instagram credentials: ${error.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }
}

async function fetchStoredInstagramToken(userId: string): Promise<StoredTokenRow | null> {
  const { data, error } = await supabaseAdmin
    .from('user_tokens')
    .select('*')
    .eq('u_id', userId)
    .eq('platform', 'instagram')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    const wrapped = new Error(`Failed to load existing Instagram credentials: ${error.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }

  return (data as StoredTokenRow | null) ?? null
}

function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return true
  }

  const expiry = new Date(expiresAt).getTime()
  if (Number.isNaN(expiry)) {
    return true
  }

  const now = Date.now()
  return expiry <= now + 60 * 1000
}

async function ensureValidAccessToken(userId: string): Promise<string> {
  const storedToken = await fetchStoredInstagramToken(userId)

  if (!storedToken || !storedToken.access_token) {
    throw new Error('No Instagram credentials stored for this user.')
  }

  if (isTokenExpired(storedToken.expires_at)) {
    throw new Error('Instagram access token has expired. Please reconnect your account.')
  }

  return storedToken.access_token
}

function getSnapshotDate(): string {
  const now = new Date()
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return utcMidnight.toISOString()
}

/**
 * Syncs Instagram metrics for a user's connected account.
 * Fetches account-level insights and post-level metrics.
 */
export async function syncInstagramMetricsForUser(userId: string): Promise<SyncResult> {
  const storedToken = await fetchStoredInstagramToken(userId)

  if (!storedToken || !storedToken.access_token || !storedToken.account_id) {
    return {
      syncedPostCount: 0,
      syncedInsightCount: 0,
      snapshotDate: null,
      details: 'No Instagram account connected.',
    }
  }

  if (isTokenExpired(storedToken.expires_at)) {
    return {
      syncedPostCount: 0,
      syncedInsightCount: 0,
      snapshotDate: null,
      details: 'Instagram access token has expired. Please reconnect your account.',
    }
  }

  const accessToken = storedToken.access_token
  const accountId = storedToken.account_id
  const snapshotDate = getSnapshotDate()

  try {
    // Fetch account-level insights - Instagram requires separate calls for each metric
    const insightRows: Array<{
      u_id: string
      account_id: string
      metric: 'reach' | 'profile_views' | 'accounts_engaged' | 'follower_count'
      value: number | null
      end_time: string
    }> = []

    // Fetch follower_count from the account object (not from insights endpoint)
    try {
      const accountUrl = `${INSTAGRAM_GRAPH_API_BASE}/${accountId}`
      const accountParams = new URLSearchParams({
        fields: 'id,username,followers_count',
        access_token: accessToken,
      })

      const accountResponse = await fetch(`${accountUrl}?${accountParams.toString()}`)

      if (accountResponse.ok) {
        const accountData = (await accountResponse.json()) as InstagramAccountResponse

        if (typeof accountData.followers_count === 'number' && !Number.isNaN(accountData.followers_count)) {
          const now = new Date().toISOString()
          insightRows.push({
            u_id: userId,
            account_id: accountId,
            metric: 'follower_count',
            value: accountData.followers_count,
            end_time: now,
          })
        }
      } else {
        const errorText = await accountResponse.text()
        console.warn(`Failed to fetch account followers_count: ${accountResponse.status} ${errorText}`)
      }
    } catch (accountError) {
      console.warn('Failed to fetch account followers_count:', accountError)
    }

    // Fetch other insights metrics (reach, profile_views, accounts_engaged)
    const metrics = ['reach', 'profile_views', 'accounts_engaged'] as const
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
    const until = Math.floor(Date.now() / 1000)

    for (const metric of metrics) {
      try {
        const insightsUrl = `${INSTAGRAM_GRAPH_API_BASE}/${accountId}/insights`
        const insightsParams = new URLSearchParams({
          metric,
          period: 'day',
          since: String(since),
          until: String(until),
          access_token: accessToken,
        })

        const insightsResponse = await fetch(`${insightsUrl}?${insightsParams.toString()}`)

        if (insightsResponse.ok) {
          const insightsData = (await insightsResponse.json()) as InstagramInsightsResponse

          for (const metricData of insightsData.data ?? []) {
            for (const value of metricData.values ?? []) {
              const numericValue = typeof value.value === 'number' ? value.value : Number.parseFloat(String(value.value))
              if (!Number.isNaN(numericValue)) {
                insightRows.push({
                  u_id: userId,
                  account_id: accountId,
                  metric,
                  value: numericValue,
                  end_time: value.end_time,
                })
              }
            }
          }
        }
      } catch (metricError) {
        // Continue with other metrics if one fails
        console.warn(`Failed to fetch ${metric} insight:`, metricError)
      }
    }

    if (insightRows.length > 0) {
      const { error: insightsError } = await supabaseAdmin.from('instagram_insights').upsert(insightRows, {
        onConflict: 'u_id,account_id,metric,end_time',
      })

      if (insightsError) {
        throw new Error(`Failed to persist Instagram insights: ${insightsError.message}`)
      }
    }

    // Fetch media (posts) list first
    // Request all fields needed for project creation
    const mediaUrl = `${INSTAGRAM_GRAPH_API_BASE}/${accountId}/media`
    const mediaParams = new URLSearchParams({
      fields: 'id,timestamp,caption,media_type,media_url,thumbnail_url,permalink,shortcode,like_count,comments_count',
      limit: '100',
      access_token: accessToken,
    })

    const mediaResponse = await fetch(`${mediaUrl}?${mediaParams.toString()}`)

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text()
      throw new Error(`Failed to fetch media: ${mediaResponse.status} ${errorText}`)
    }

    const mediaData = (await mediaResponse.json()) as InstagramMediaResponse

    // Get Instagram username for p_channel
    const instagramUsername = storedToken.account_username ?? 'instagram'

    // Helper function to construct Instagram post URL
    const buildInstagramLink = (media: InstagramMediaResponse['data'][0]): string => {
      if (media.permalink) {
        return media.permalink
      }
      if (media.shortcode) {
        return `https://www.instagram.com/p/${media.shortcode}/`
      }
      // Fallback: construct from media ID (less reliable but better than nothing)
      return `https://www.instagram.com/p/${media.id}/`
    }

    // Helper function to truncate caption for title
    const truncateCaption = (caption: string | undefined, maxLength = 255): string | null => {
      if (!caption) {
        return null
      }
      return caption.length > maxLength ? caption.substring(0, maxLength - 3) + '...' : caption
    }

    // Store post-level metrics
    const metricsRows: Array<{
      p_id: string
      fetched_at: string
      platform: 'instagram'
      like_count: number | null
      comment_count: number | null
      view_count: number | null
      reach: number | null
      save_count: number | null
      engagement_rate: number | null
    }> = []

    // Process each media item: create project, link user, then collect metrics
    for (const media of mediaData.data ?? []) {
      try {
        // Step 1: Create or update project entry
        const projectLink = buildInstagramLink(media)
        const projectTitle = truncateCaption(media.caption)
        const thumbnailUrl = media.thumbnail_url ?? media.media_url ?? null
        const postedAt = media.timestamp ? new Date(media.timestamp).toISOString() : null

        const { error: projectError } = await supabaseAdmin
          .from('projects')
          .upsert(
            {
              p_id: media.id,
              p_title: projectTitle,
              p_description: null, // Instagram doesn't have separate description
              p_link: projectLink,
              p_platform: 'instagram',
              p_channel: instagramUsername,
              p_posted_at: postedAt,
              p_thumbnail_url: thumbnailUrl,
            },
            {
              onConflict: 'p_id',
            },
          )

        if (projectError) {
          console.warn(`Failed to upsert project for media ${media.id}:`, projectError)
          // Continue to next media item
          continue
        }

        // Step 2: Ensure user_projects link exists
        // Check if link already exists first
        const { data: existingLink, error: checkError } = await supabaseAdmin
          .from('user_projects')
          .select('up_id')
          .eq('u_id', userId)
          .eq('p_id', media.id)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          console.warn(`Failed to check user_projects for media ${media.id}:`, checkError)
          // Continue to next media item
          continue
        }

        // Only insert if link doesn't exist
        if (!existingLink) {
          const { error: userProjectError } = await supabaseAdmin.from('user_projects').insert({
            u_id: userId,
            p_id: media.id,
            role_id: null,
            u_role: null,
          })

          if (userProjectError) {
            // Handle race condition where another sync created it
            if (userProjectError.code === '23505') {
              // Unique constraint violation - link already exists, that's fine
            } else {
              console.warn(`Failed to insert user_projects for media ${media.id}:`, userProjectError)
              // Continue to next media item
              continue
            }
          }
        }

        // Step 3: Fetch insights for this specific media item
        const mediaInsightsUrl = `${INSTAGRAM_GRAPH_API_BASE}/${media.id}/insights`
        const mediaInsightsParams = new URLSearchParams({
          metric: 'reach,impressions,saved',
          access_token: accessToken,
        })

        const mediaInsightsResponse = await fetch(`${mediaInsightsUrl}?${mediaInsightsParams.toString()}`)

        let reach = 0
        let impressions = 0
        let saves = 0

        if (mediaInsightsResponse.ok) {
          const mediaInsightsData = (await mediaInsightsResponse.json()) as InstagramInsightsResponse
          for (const metricData of mediaInsightsData.data ?? []) {
            if (metricData.name === 'reach' && metricData.values?.[0]) {
              reach = typeof metricData.values[0].value === 'number' ? metricData.values[0].value : Number.parseFloat(String(metricData.values[0].value)) || 0
            }
            if (metricData.name === 'impressions' && metricData.values?.[0]) {
              impressions = typeof metricData.values[0].value === 'number' ? metricData.values[0].value : Number.parseFloat(String(metricData.values[0].value)) || 0
            }
            if (metricData.name === 'saved' && metricData.values?.[0]) {
              saves = typeof metricData.values[0].value === 'number' ? metricData.values[0].value : Number.parseFloat(String(metricData.values[0].value)) || 0
            }
          }
        }

        const likeCount = media.like_count ?? 0
        const commentCount = media.comments_count ?? 0

        // Calculate engagement rate: (likes + comments + saves) / reach (or impressions if reach is 0)
        const denominator = reach > 0 ? reach : impressions > 0 ? impressions : 1
        const engagementRate = ((likeCount + commentCount + saves) / denominator) * 100

        metricsRows.push({
          p_id: media.id,
          fetched_at: snapshotDate,
          platform: 'instagram',
          like_count: likeCount,
          comment_count: commentCount,
          view_count: impressions, // Using impressions as view_count
          reach: reach,
          save_count: saves,
          engagement_rate: Number.isNaN(engagementRate) ? null : engagementRate,
        })
      } catch (mediaError) {
        // Continue with other media if one fails
        console.warn(`Failed to process media ${media.id}:`, mediaError)
      }
    }

    // Step 4: Insert all metrics now that projects exist
    if (metricsRows.length > 0) {
      const { error: metricsError } = await supabaseAdmin.from('instagram_metrics').upsert(metricsRows, {
        onConflict: 'p_id,fetched_at',
      })

      if (metricsError) {
        throw new Error(`Failed to persist Instagram metrics: ${metricsError.message}`)
      }
    }

    return {
      syncedPostCount: metricsRows.length,
      syncedInsightCount: insightRows.length,
      snapshotDate,
    }
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error('Unknown error during Instagram sync')
    wrapped.name = 'InstagramSyncError'
    throw wrapped
  }
}

export async function getInstagramStatus(userId: string) {
  const tokenRow = await fetchStoredInstagramToken(userId)
  if (!tokenRow) {
    return {
      connected: false,
      accountId: null,
      accountUsername: null,
      expiresAt: null,
      updatedAt: null,
    }
  }

  return {
    connected: true,
    accountId: tokenRow.account_id,
    accountUsername: tokenRow.account_username,
    expiresAt: tokenRow.expires_at,
    updatedAt: tokenRow.updated_at ?? null,
  }
}

