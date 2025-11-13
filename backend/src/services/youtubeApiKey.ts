import { google } from 'googleapis'

import { env } from '../config/env.js'

export type YouTubeVideoMetadata = {
  videoId: string
  title: string | null
  channelId: string | null
  channelTitle: string | null
  thumbnailUrl: string | null
  publishedAt: string | null
}

export type YouTubeVideoStats = {
  viewCount: number | null
  likeCount: number | null
  commentCount: number | null
  shareCount: number | null
  engagementRate: number | null
}

function getYouTubeApiClient() {
  if (!env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is required for YouTube API operations.')
  }

  return google.youtube({
    version: 'v3',
    auth: env.YOUTUBE_API_KEY,
  })
}

/**
 * Fetches video metadata (title, channel, thumbnail) from YouTube Data API using API key.
 * This works for any public video and doesn't require OAuth.
 */
export async function fetchYouTubeVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
  const youtube = getYouTubeApiClient()

  const response = await youtube.videos.list({
    part: ['snippet', 'contentDetails'],
    id: [videoId],
    maxResults: 1,
  })

  const item = response.data.items?.[0]

  if (!item) {
    throw new Error(`Video not found: ${videoId}. The video may be private, deleted, or the ID may be invalid.`)
  }

  const snippet = item.snippet
  const thumbnails = snippet?.thumbnails

  return {
    videoId,
    title: snippet?.title ?? null,
    channelId: snippet?.channelId ?? null,
    channelTitle: snippet?.channelTitle ?? null,
    thumbnailUrl: thumbnails?.maxres?.url ?? thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null,
    publishedAt: snippet?.publishedAt ?? null,
  }
}

/**
 * Fetches public video statistics (views, likes, comments) from YouTube Data API using API key.
 * This works for any public video and doesn't require OAuth.
 */
export async function fetchYouTubeVideoStats(videoId: string): Promise<YouTubeVideoStats> {
  const youtube = getYouTubeApiClient()

  const response = await youtube.videos.list({
    part: ['statistics'],
    id: [videoId],
    maxResults: 1,
  })

  const item = response.data.items?.[0]

  if (!item) {
    throw new Error(`Video not found: ${videoId}. The video may be private, deleted, or the ID may be invalid.`)
  }

  const stats = item.statistics

  const viewCount = stats?.viewCount ? Number.parseInt(stats.viewCount, 10) : null
  const likeCount = stats?.likeCount ? Number.parseInt(stats.likeCount, 10) : null
  const commentCount = stats?.commentCount ? Number.parseInt(stats.commentCount, 10) : null

  // YouTube API doesn't provide share count directly, so we'll set it to null
  const shareCount = null

  // Calculate engagement rate: (likes + comments) / views
  const engagementRate =
    viewCount && viewCount > 0 && (likeCount !== null || commentCount !== null)
      ? Number(((likeCount ?? 0) + (commentCount ?? 0)) / viewCount)
      : null

  return {
    viewCount: Number.isNaN(viewCount) ? null : viewCount,
    likeCount: Number.isNaN(likeCount) ? null : likeCount,
    commentCount: Number.isNaN(commentCount) ? null : commentCount,
    shareCount,
    engagementRate,
  }
}

/**
 * Fetches both metadata and stats for a video in a single API call.
 * More efficient than calling fetchYouTubeVideoMetadata and fetchYouTubeVideoStats separately.
 */
export async function fetchYouTubeVideoData(videoId: string): Promise<{
  metadata: YouTubeVideoMetadata
  stats: YouTubeVideoStats
}> {
  const youtube = getYouTubeApiClient()

  const response = await youtube.videos.list({
    part: ['snippet', 'contentDetails', 'statistics'],
    id: [videoId],
    maxResults: 1,
  })

  const item = response.data.items?.[0]

  if (!item) {
    throw new Error(`Video not found: ${videoId}. The video may be private, deleted, or the ID may be invalid.`)
  }

  const snippet = item.snippet
  const stats = item.statistics
  const thumbnails = snippet?.thumbnails

  const viewCount = stats?.viewCount ? Number.parseInt(stats.viewCount, 10) : null
  const likeCount = stats?.likeCount ? Number.parseInt(stats.likeCount, 10) : null
  const commentCount = stats?.commentCount ? Number.parseInt(stats.commentCount, 10) : null

  const engagementRate =
    viewCount && viewCount > 0 && (likeCount !== null || commentCount !== null)
      ? Number(((likeCount ?? 0) + (commentCount ?? 0)) / viewCount)
      : null

  return {
    metadata: {
      videoId,
      title: snippet?.title ?? null,
      channelId: snippet?.channelId ?? null,
      channelTitle: snippet?.channelTitle ?? null,
      thumbnailUrl: thumbnails?.maxres?.url ?? thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null,
      publishedAt: snippet?.publishedAt ?? null,
    },
    stats: {
      viewCount: Number.isNaN(viewCount) ? null : viewCount,
      likeCount: Number.isNaN(likeCount) ? null : likeCount,
      commentCount: Number.isNaN(commentCount) ? null : commentCount,
      shareCount: null, // YouTube API doesn't provide share count
      engagementRate,
    },
  }
}

/**
 * Fetches stats for multiple videos in a single batch API call.
 * YouTube API allows up to 50 video IDs per request.
 */
export async function fetchYouTubeVideoStatsBatch(videoIds: string[]): Promise<Map<string, YouTubeVideoStats>> {
  if (videoIds.length === 0) {
    return new Map()
  }

  const youtube = getYouTubeApiClient()
  const results = new Map<string, YouTubeVideoStats>()

  // YouTube API allows up to 50 IDs per request
  const chunkSize = 50
  for (let i = 0; i < videoIds.length; i += chunkSize) {
    const chunk = videoIds.slice(i, i + chunkSize)

    const response = await youtube.videos.list({
      part: ['statistics'],
      id: chunk,
      maxResults: chunk.length,
    })

    const items = response.data.items ?? []

    for (const item of items) {
      if (!item.id) {
        continue
      }

      const stats = item.statistics
      const viewCount = stats?.viewCount ? Number.parseInt(stats.viewCount, 10) : null
      const likeCount = stats?.likeCount ? Number.parseInt(stats.likeCount, 10) : null
      const commentCount = stats?.commentCount ? Number.parseInt(stats.commentCount, 10) : null

      const engagementRate =
        viewCount && viewCount > 0 && (likeCount !== null || commentCount !== null)
          ? Number(((likeCount ?? 0) + (commentCount ?? 0)) / viewCount)
          : null

      results.set(item.id, {
        viewCount: Number.isNaN(viewCount) ? null : viewCount,
        likeCount: Number.isNaN(likeCount) ? null : likeCount,
        commentCount: Number.isNaN(commentCount) ? null : commentCount,
        shareCount: null,
        engagementRate,
      })
    }
  }

  return results
}

