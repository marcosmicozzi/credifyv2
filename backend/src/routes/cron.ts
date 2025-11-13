import type { RequestHandler } from 'express'
import { Router } from 'express'

import { env } from '../config/env.js'
import { supabaseAdmin } from '../config/supabase.js'
import { syncInstagramMetricsForUser } from '../services/instagramIntegration.js'
import { syncYouTubeMetricsForAllProjects } from '../services/youtubeIntegration.js'

export const cronRouter = Router()

/**
 * Validates CRON_SECRET from query parameter
 */
const validateCronSecret: RequestHandler = (req, res, next) => {
  const secret = req.query.secret

  if (!secret || typeof secret !== 'string') {
    console.error('[CRON] Missing or invalid secret parameter')
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid secret parameter.',
    })
    return
  }

  if (secret !== env.CRON_SECRET) {
    console.error('[CRON] Invalid secret provided')
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid secret.',
    })
    return
  }

  next()
}

/**
 * POST /api/cron/sync/all?secret=...
 * GET /api/cron/sync/all?secret=...
 * 
 * Syncs metrics for all users with integrations:
 * - YouTube: syncs all YouTube projects (uses API key, no OAuth required)
 * - Instagram: syncs metrics for each user with Instagram integration
 * 
 * This endpoint is called by AWS Lambda on a daily schedule.
 * It does NOT require user authentication - only CRON_SECRET validation.
 * Supports both GET and POST methods for compatibility with different cron services.
 */
const syncAllHandler: RequestHandler = async (req, res) => {
  const startTime = Date.now()
  const syncStartTime = new Date().toISOString()

  console.log(`[CRON] Starting daily sync at ${syncStartTime}`)

  const results = {
    timestamp: syncStartTime,
    durationMs: 0,
    youtube: {
      success: false,
      syncedVideoCount: 0,
      snapshotDate: null as string | null,
      error: null as string | null,
    },
    instagram: {
      success: false,
      totalUsers: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalSyncedPosts: 0,
      totalSyncedInsights: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    },
  }

  try {
    // Step 1: Sync YouTube metrics for all projects
    console.log('[CRON] Starting YouTube sync for all projects...')
    try {
      const youtubeResult = await syncYouTubeMetricsForAllProjects()
      results.youtube.success = true
      results.youtube.syncedVideoCount = youtubeResult.syncedVideoCount
      results.youtube.snapshotDate = youtubeResult.snapshotDate
      console.log(
        `[CRON] YouTube sync completed: ${youtubeResult.syncedVideoCount} videos synced, snapshot: ${youtubeResult.snapshotDate}`,
      )
      if (youtubeResult.details) {
        console.log(`[CRON] YouTube sync details: ${youtubeResult.details}`)
      }
    } catch (youtubeError) {
      const errorMessage = youtubeError instanceof Error ? youtubeError.message : String(youtubeError)
      results.youtube.error = errorMessage
      console.error('[CRON] YouTube sync failed:', errorMessage)
      // Continue with Instagram sync even if YouTube fails
    }

    // Step 2: Sync Instagram metrics for all users with Instagram integration
    console.log('[CRON] Starting Instagram sync for all users...')
    try {
      // Query all users with Instagram tokens
      const { data: instagramTokens, error: tokensError } = await supabaseAdmin
        .from('user_tokens')
        .select('u_id')
        .eq('platform', 'instagram')
        .not('access_token', 'is', null)

      if (tokensError) {
        throw new Error(`Failed to query Instagram tokens: ${tokensError.message}`)
      }

      const userIds = instagramTokens?.map((row) => row.u_id) ?? []
      results.instagram.totalUsers = userIds.length

      console.log(`[CRON] Found ${userIds.length} users with Instagram integration`)

      if (userIds.length === 0) {
        console.log('[CRON] No users with Instagram integration found')
        results.instagram.success = true
      } else {
        // Sync each user's Instagram metrics
        for (const userId of userIds) {
          try {
            console.log(`[CRON] Syncing Instagram metrics for user ${userId}...`)
            const instagramResult = await syncInstagramMetricsForUser(userId)

            if (instagramResult.syncedPostCount > 0 || instagramResult.syncedInsightCount > 0) {
              results.instagram.successfulSyncs++
              results.instagram.totalSyncedPosts += instagramResult.syncedPostCount
              results.instagram.totalSyncedInsights += instagramResult.syncedInsightCount
              console.log(
                `[CRON] Instagram sync for user ${userId} completed: ${instagramResult.syncedPostCount} posts, ${instagramResult.syncedInsightCount} insights`,
              )
              if (instagramResult.details) {
                console.log(`[CRON] Instagram sync details for user ${userId}: ${instagramResult.details}`)
              }
            } else {
              // No error, but nothing synced (e.g., no account connected, token expired)
              results.instagram.successfulSyncs++
              console.log(`[CRON] Instagram sync for user ${userId}: ${instagramResult.details || 'No data to sync'}`)
            }
          } catch (userError) {
            results.instagram.failedSyncs++
            const errorMessage = userError instanceof Error ? userError.message : String(userError)
            results.instagram.errors.push({
              userId,
              error: errorMessage,
            })
            console.error(`[CRON] Instagram sync failed for user ${userId}:`, errorMessage)
            // Continue with other users even if one fails
          }
        }

        // Mark Instagram sync as successful if at least some users synced successfully
        if (results.instagram.successfulSyncs > 0 || results.instagram.totalUsers === 0) {
          results.instagram.success = true
        }
      }
    } catch (instagramError) {
      const errorMessage = instagramError instanceof Error ? instagramError.message : String(instagramError)
      console.error('[CRON] Instagram sync failed:', errorMessage)
      results.instagram.errors.push({
        userId: 'all',
        error: errorMessage,
      })
    }

    const durationMs = Date.now() - startTime
    results.durationMs = durationMs

    const overallSuccess = results.youtube.success && results.instagram.success

    console.log(`[CRON] Daily sync completed in ${durationMs}ms`)
    console.log(`[CRON] Summary:`, JSON.stringify(results, null, 2))

    if (overallSuccess) {
      res.status(200).json({
        success: true,
        message: 'Daily sync completed successfully',
        results,
      })
    } else {
      res.status(207).json({
        success: false,
        message: 'Daily sync completed with some errors',
        results,
      })
    }
  } catch (error) {
    const durationMs = Date.now() - startTime
    results.durationMs = durationMs

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[CRON] Daily sync failed after ${durationMs}ms:`, errorMessage)

    res.status(500).json({
      success: false,
      message: 'Daily sync failed',
      error: errorMessage,
      results,
    })
  }
}

// Register the handler for both GET and POST methods
cronRouter.get('/sync/all', validateCronSecret, syncAllHandler)
cronRouter.post('/sync/all', validateCronSecret, syncAllHandler)

