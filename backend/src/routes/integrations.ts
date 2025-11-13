import { Router } from 'express'
import { z } from 'zod'

import { env } from '../config/env.js'
import { authenticate } from '../middleware/authenticate.js'
import {
  consumeOAuthState as consumeOAuthStateYouTube,
  createOAuthState as createOAuthStateYouTube,
  exchangeYouTubeAuthCode,
  generateYouTubeAuthUrl,
  getYouTubeStatus,
  mapTokensToStore,
  syncYouTubeMetricsForAllProjects,
  syncYouTubeMetricsForUser,
  upsertYouTubeToken,
} from '../services/youtubeIntegration.js'
import {
  consumeOAuthState as consumeOAuthStateInstagram,
  createOAuthState as createOAuthStateInstagram,
  exchangeInstagramAuthCode,
  generateInstagramAuthUrl,
  getInstagramStatus,
  syncInstagramMetricsForUser,
  upsertInstagramToken,
} from '../services/instagramIntegration.js'

const youtubeRouter = Router()

const callbackQuerySchema = z.object({
  state: z.string().min(1),
  code: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function renderPopupResponse(payload: { status: 'success' | 'error'; message: string }) {
  const json = JSON.stringify({
    source: 'credify-youtube-oauth',
    status: payload.status,
    message: payload.message,
  })

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>YouTube Integration</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; }
      main { max-width: 480px; text-align: center; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      p { font-size: 1rem; line-height: 1.5; color: #cbd5f5; }
      .status-success { color: #6ee7b7; }
      .status-error { color: #fca5a5; }
    </style>
  </head>
  <body>
    <main>
      <h1 class="status-${payload.status}">${payload.status === 'success' ? 'YouTube connected' : 'Unable to connect'}</h1>
      <p>${escapeHtml(payload.message)}</p>
    </main>
    <script>
      (function () {
        const payload = ${json};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
          }
        } catch (err) {
          console.error('Failed to notify opener', err);
        }
        setTimeout(() => {
          window.close();
        }, 1500);
      })();
    </script>
  </body>
</html>`
}

youtubeRouter.get('/callback', async (req, res, next) => {
  try {
    const query = callbackQuerySchema.parse(req.query)

    if (query.error) {
      res.status(400).send(
        renderPopupResponse({
          status: 'error',
          message: query.error_description ?? 'Google reported an error while connecting your YouTube account.',
        }),
      )
      return
    }

    const stateRecord = await consumeOAuthStateYouTube(query.state)

    if (!stateRecord) {
      res
        .status(400)
        .send(
          renderPopupResponse({ status: 'error', message: 'Session expired. Please restart the YouTube connection.' }),
        )
      return
    }

    if (new Date(stateRecord.expires_at).getTime() < Date.now()) {
      res
        .status(400)
        .send(renderPopupResponse({ status: 'error', message: 'Session expired. Please start a new connection.' }))
      return
    }

    if (!query.code) {
      res
        .status(400)
        .send(renderPopupResponse({ status: 'error', message: 'Missing authorization code from Google.' }))
      return
    }

    const { tokens, profile } = await exchangeYouTubeAuthCode(query.code)
    const mappedTokens = mapTokensToStore(tokens)

    await upsertYouTubeToken(stateRecord.u_id, {
      tokens: mappedTokens,
      profile,
    })

    res.send(
      renderPopupResponse({
        status: 'success',
        message: 'Your YouTube account is now connected. You can close this window.',
      }),
    )
  } catch (error) {
    next(error)
  }
})

youtubeRouter.use(authenticate)

youtubeRouter.post('/authorize', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (req.auth.isDemo) {
      res.status(403).json({
        error: 'DemoModeRestricted',
        message: 'Connecting YouTube is not available in demo mode.',
      })
      return
    }

    const { state } = await createOAuthStateYouTube(req.auth.userId)
    const authorizationUrl = generateYouTubeAuthUrl(state)

    res.json({
      authorizationUrl,
      redirectUri: env.YOUTUBE_OAUTH_REDIRECT_URI,
    })
  } catch (error) {
    next(error)
  }
})

youtubeRouter.get('/status', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const status = await getYouTubeStatus(req.auth.userId)

    res.json({
      status,
    })
  } catch (error) {
    next(error)
  }
})

youtubeRouter.post('/sync', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (req.auth.isDemo) {
      res.status(403).json({
        error: 'DemoModeRestricted',
        message: 'Syncing YouTube metrics is not available in demo mode.',
      })
      return
    }

    // Sync only the user's projects (uses API key, no OAuth required)
    const result = await syncYouTubeMetricsForUser(req.auth.userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

youtubeRouter.post('/sync/all', authenticate, async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    // Sync all YouTube projects (uses API key, no OAuth required)
    // This endpoint can be used by admins or scheduled jobs
    const result = await syncYouTubeMetricsForAllProjects()
    res.json(result)
  } catch (error) {
    next(error)
  }
})

const instagramRouter = Router()

function renderInstagramPopupResponse(payload: { status: 'success' | 'error'; message: string }) {
  const json = JSON.stringify({
    source: 'credify-instagram-oauth',
    status: payload.status,
    message: payload.message,
  })

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Instagram Integration</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; }
      main { max-width: 480px; text-align: center; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      p { font-size: 1rem; line-height: 1.5; color: #cbd5f5; }
      .status-success { color: #6ee7b7; }
      .status-error { color: #fca5a5; }
    </style>
  </head>
  <body>
    <main>
      <h1 class="status-${payload.status}">${payload.status === 'success' ? 'Instagram connected' : 'Unable to connect'}</h1>
      <p>${escapeHtml(payload.message)}</p>
    </main>
    <script>
      (function () {
        const payload = ${json};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, '*');
          }
        } catch (err) {
          console.error('Failed to notify opener', err);
        }
        setTimeout(() => {
          window.close();
        }, 1500);
      })();
    </script>
  </body>
</html>`
}

instagramRouter.get('/callback', async (req, res, next) => {
  try {
    const query = callbackQuerySchema.parse(req.query)

    if (query.error) {
      res.status(400).send(
        renderInstagramPopupResponse({
          status: 'error',
          message: query.error_description ?? 'Meta reported an error while connecting your Instagram account.',
        }),
      )
      return
    }

    const stateRecord = await consumeOAuthStateInstagram(query.state)

    if (!stateRecord) {
      res
        .status(400)
        .send(
          renderInstagramPopupResponse({ status: 'error', message: 'Session expired. Please restart the Instagram connection.' }),
        )
      return
    }

    if (new Date(stateRecord.expires_at).getTime() < Date.now()) {
      res
        .status(400)
        .send(renderInstagramPopupResponse({ status: 'error', message: 'Session expired. Please start a new connection.' }))
      return
    }

    if (!query.code) {
      res
        .status(400)
        .send(renderInstagramPopupResponse({ status: 'error', message: 'Missing authorization code from Meta.' }))
      return
    }

    const { longLivedToken, expiresAt, profile } = await exchangeInstagramAuthCode(query.code)

    await upsertInstagramToken(stateRecord.u_id, {
      accessToken: longLivedToken,
      expiresAt,
      profile,
    })

    res.send(
      renderInstagramPopupResponse({
        status: 'success',
        message: 'Your Instagram account is now connected. You can close this window.',
      }),
    )
  } catch (error) {
    next(error)
  }
})

instagramRouter.use(authenticate)

instagramRouter.post('/connect', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (req.auth.isDemo) {
      res.status(403).json({
        error: 'DemoModeRestricted',
        message: 'Connecting Instagram is not available in demo mode.',
      })
      return
    }

    // Always clear existing tokens and force re-authentication to ensure all scopes are requested
    // This prevents Meta from silently skipping permission prompts when scopes have changed
    const { state } = await createOAuthStateInstagram(req.auth.userId, true)
    // Force re-authentication to ensure Meta shows permission dialog with all requested scopes
    const authorizationUrl = generateInstagramAuthUrl(state, true)

    res.json({
      authorizationUrl,
      redirectUri: env.INSTAGRAM_REDIRECT_URI,
    })
  } catch (error) {
    next(error)
  }
})

instagramRouter.get('/status', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    const status = await getInstagramStatus(req.auth.userId)

    res.json({
      status,
    })
  } catch (error) {
    next(error)
  }
})

instagramRouter.post('/sync', async (req, res, next) => {
  try {
    if (!req.auth) {
      res.status(500).json({
        error: 'AuthContextMissing',
        message: 'Authentication context is not available on the request.',
      })
      return
    }

    if (req.auth.isDemo) {
      res.status(403).json({
        error: 'DemoModeRestricted',
        message: 'Syncing Instagram metrics is not available in demo mode.',
      })
      return
    }

    const result = await syncInstagramMetricsForUser(req.auth.userId)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export const integrationsRouter = Router()

integrationsRouter.use('/youtube', youtubeRouter)
integrationsRouter.use('/instagram', instagramRouter)


