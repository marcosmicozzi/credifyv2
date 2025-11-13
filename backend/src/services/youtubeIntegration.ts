import { google } from 'googleapis'
import type { OAuth2Client } from 'googleapis-common'
import { randomUUID } from 'node:crypto'

import { env } from '../config/env.js'
import { supabaseAdmin } from '../config/supabase.js'
import { fetchYouTubeVideoStatsBatch } from './youtubeApiKey.js'

if (!supabaseAdmin) {
  throw new Error('Supabase admin client is required for YouTube integration.')
}

const YOUTUBE_SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

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

type ChannelProfile = {
  channelId: string | null
  channelTitle: string | null
}

type SyncResult = {
  syncedVideoCount: number
  snapshotDate: string | null
  details?: string
}

export function createYouTubeOAuthClient(): OAuth2Client {
  if (!env.YOUTUBE_CLIENT_ID || !env.YOUTUBE_CLIENT_SECRET || !env.YOUTUBE_OAUTH_REDIRECT_URI) {
    throw new Error('YouTube OAuth credentials are not configured. Please set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_OAUTH_REDIRECT_URI.')
  }
  return new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET, env.YOUTUBE_OAUTH_REDIRECT_URI)
}

export async function createOAuthState(userId: string): Promise<{ state: string; expiresAt: string }> {
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

export function mapTokensToStore(tokens: {
  access_token?: string | null
  refresh_token?: string | null
  expiry_date?: number | null
}) {
  return {
    access_token: tokens.access_token ?? null,
    refresh_token: tokens.refresh_token ?? null,
    expires_at:
      typeof tokens.expiry_date === 'number'
        ? new Date(tokens.expiry_date).toISOString()
        : tokens.expiry_date ?? null,
  }
}

export async function exchangeYouTubeAuthCode(code: string) {
  const client = createYouTubeOAuthClient()
  const response = await client.getToken(code);
  const tokens = response.tokens;

  client.setCredentials(tokens)

  const youtube = google.youtube({ version: 'v3', auth: client })
  const channelResponse = await youtube.channels.list({
    mine: true,
    part: ['snippet'],
    maxResults: 1,
  })

  const channel = channelResponse.data.items?.[0]
  const profile: ChannelProfile = {
    channelId: channel?.id ?? null,
    channelTitle: channel?.snippet?.title ?? null,
  }

  return {
    tokens,
    profile,
  }
}

export async function upsertYouTubeToken(
  userId: string,
  payload: { tokens: { access_token: string | null; refresh_token: string | null; expires_at: string | null }; profile: ChannelProfile },
) {
  const { tokens, profile } = payload

  let refreshTokenToStore = tokens.refresh_token
  let accountId = profile.channelId
  let accountUsername = profile.channelTitle

  if (!refreshTokenToStore || !accountId || !accountUsername) {
    const existing = await fetchStoredYouTubeToken(userId)
    if (!refreshTokenToStore) {
      refreshTokenToStore = existing?.refresh_token ?? null
    }
    if (!accountId) {
      accountId = existing?.account_id ?? null
    }
    if (!accountUsername) {
      accountUsername = existing?.account_username ?? null
    }
  }

  const { error } = await supabaseAdmin
    .from('user_tokens')
    .upsert(
      {
        u_id: userId,
        platform: 'youtube',
        access_token: tokens.access_token,
        refresh_token: refreshTokenToStore,
        expires_at: tokens.expires_at,
        account_id: accountId,
        account_username: accountUsername,
      },
      {
        onConflict: 'u_id,platform',
      },
    )

  if (error) {
    const wrapped = new Error(`Failed to persist YouTube credentials: ${error.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }
}

async function fetchStoredYouTubeToken(userId: string): Promise<StoredTokenRow | null> {
  const { data, error } = await supabaseAdmin
    .from('user_tokens')
    .select('*')
    .eq('u_id', userId)
    .eq('platform', 'youtube')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    const wrapped = new Error(`Failed to load existing YouTube credentials: ${error.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }

  return (data as StoredTokenRow | null) ?? null
}

async function updateStoredCredentials(
  userId: string,
  tokens: { access_token?: string | null; expires_at?: string | null; refresh_token?: string | null },
  profile?: ChannelProfile,
) {
  const updates: Partial<StoredTokenRow> = {
    access_token: tokens.access_token ?? null,
    expires_at: tokens.expires_at ?? null,
  }

  if (tokens.refresh_token !== undefined) {
    updates.refresh_token = tokens.refresh_token
  }

  if (profile) {
    updates.account_id = profile.channelId
    updates.account_username = profile.channelTitle
  }

  const { error } = await supabaseAdmin
    .from('user_tokens')
    .update(updates)
    .eq('u_id', userId)
    .eq('platform', 'youtube')

  if (error) {
    const wrapped = new Error(`Failed to update YouTube credentials: ${error.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = error
    throw wrapped
  }
}

function isTokenExpired(expiresAt: string | null | undefined) {
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

async function ensureFreshAccessToken(userId: string, client: OAuth2Client, storedToken: StoredTokenRow | null) {
  if (!storedToken) {
    throw new Error('No YouTube credentials stored for this user.')
  }

  client.setCredentials({
    access_token: storedToken.access_token || "",
    refresh_token: storedToken.refresh_token ?? null,
    expiry_date: storedToken.expires_at ? new Date(storedToken.expires_at).getTime() : 0,
  })

  if (!storedToken.refresh_token) {
    throw new Error('Missing refresh token for YouTube integration.')
  }

  if (!isTokenExpired(storedToken.expires_at)) {
    return
  }

  const refreshed = await client.refreshAccessToken()
  client.setCredentials(refreshed.credentials)

  const mapped = mapTokensToStore(refreshed.credentials)
  await updateStoredCredentials(userId, {
    access_token: mapped.access_token,
    expires_at: mapped.expires_at,
    refresh_token: mapped.refresh_token ?? storedToken.refresh_token,
  })
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function getSnapshotDate(): string {
  const now = new Date()
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return utcMidnight.toISOString()
}

function toNumber(value: string | null | undefined): number | null {
  if (typeof value !== 'string') {
    return null
  }

  const numeric = Number.parseInt(value, 10)
  return Number.isNaN(numeric) ? null : numeric
}

/**
 * Syncs YouTube metrics for all YouTube projects using API key (no OAuth required).
 * This is the primary sync method for credits on any public YouTube video.
 */
export async function syncYouTubeMetricsForAllProjects(): Promise<SyncResult> {
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('p_id')
    .eq('p_platform', 'youtube')

  if (projectsError) {
    const wrapped = new Error(`Failed to load YouTube projects: ${projectsError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = projectsError
    throw wrapped
  }

  const youtubeVideoIds = projects?.map((row) => row.p_id) ?? []

  if (!youtubeVideoIds.length) {
    return {
      syncedVideoCount: 0,
      snapshotDate: null,
      details: 'No YouTube projects found to sync.',
    }
  }

  const snapshotDate = getSnapshotDate()
  const statsMap = await fetchYouTubeVideoStatsBatch(youtubeVideoIds)

  if (statsMap.size === 0) {
    return {
      syncedVideoCount: 0,
      snapshotDate,
      details: 'No statistics returned from YouTube API.',
    }
  }

  const metricsRows: Array<{
    p_id: string
    fetched_at: string
    platform: 'youtube'
    view_count: number | null
    like_count: number | null
    comment_count: number | null
    share_count: number | null
    engagement_rate: number | null
  }> = []

  for (const [videoId, stats] of statsMap.entries()) {
    metricsRows.push({
      p_id: videoId,
      fetched_at: snapshotDate,
      platform: 'youtube',
      view_count: stats.viewCount,
      like_count: stats.likeCount,
      comment_count: stats.commentCount,
      share_count: stats.shareCount,
      engagement_rate: stats.engagementRate,
    })
  }

  const { error: upsertError } = await supabaseAdmin
    .from('youtube_metrics')
    .upsert(metricsRows, {
      onConflict: 'p_id,fetched_at',
    })

  if (upsertError) {
    const wrapped = new Error(`Failed to persist YouTube metrics: ${upsertError.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = upsertError
    throw wrapped
  }

  return {
    syncedVideoCount: metricsRows.length,
    snapshotDate,
  }
}

/**
 * Syncs YouTube metrics for a specific user's projects using API key (no OAuth required).
 * This is a convenience wrapper that filters to a user's projects.
 */
export async function syncYouTubeMetricsForUser(userId: string): Promise<SyncResult> {
  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from('user_projects')
    .select(
      `
      p_id,
      projects!inner (
        p_platform
      )
    `,
    )
    .eq('u_id', userId)

  if (assignmentError) {
    const wrapped = new Error(`Failed to load user projects: ${assignmentError.message}`)
    wrapped.name = 'SupabaseQueryError'
    ;(wrapped as { cause?: unknown }).cause = assignmentError
    throw wrapped
  }

  const youtubeVideoIds =
    assignments
      ?.filter((row: any) => row.projects?.p_platform === 'youtube')
      .map((row: { p_id: string }) => row.p_id) ?? []

  if (!youtubeVideoIds.length) {
    return {
      syncedVideoCount: 0,
      snapshotDate: null,
      details: 'User has no claimed YouTube videos.',
    }
  }

  const snapshotDate = getSnapshotDate()
  const statsMap = await fetchYouTubeVideoStatsBatch(youtubeVideoIds)

  if (statsMap.size === 0) {
    return {
      syncedVideoCount: 0,
      snapshotDate,
      details: 'No statistics returned from YouTube API.',
    }
  }

  const metricsRows: Array<{
    p_id: string
    fetched_at: string
    platform: 'youtube'
    view_count: number | null
    like_count: number | null
    comment_count: number | null
    share_count: number | null
    engagement_rate: number | null
  }> = []

  for (const [videoId, stats] of statsMap.entries()) {
    metricsRows.push({
      p_id: videoId,
      fetched_at: snapshotDate,
      platform: 'youtube',
      view_count: stats.viewCount,
      like_count: stats.likeCount,
      comment_count: stats.commentCount,
      share_count: stats.shareCount,
      engagement_rate: stats.engagementRate,
    })
  }

  const { error: upsertError } = await supabaseAdmin
    .from('youtube_metrics')
    .upsert(metricsRows, {
      onConflict: 'p_id,fetched_at',
    })

  if (upsertError) {
    const wrapped = new Error(`Failed to persist YouTube metrics: ${upsertError.message}`)
    wrapped.name = 'SupabaseMutationError'
    ;(wrapped as { cause?: unknown }).cause = upsertError
    throw wrapped
  }

  return {
    syncedVideoCount: metricsRows.length,
    snapshotDate,
  }
}

export async function getYouTubeStatus(userId: string) {
  const tokenRow = await fetchStoredYouTubeToken(userId)
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


