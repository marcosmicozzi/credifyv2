import 'express-async-errors'

import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { apiRouter } from './routes/index.js'

const app = express()

app.set('trust proxy', 1)

app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? [/credify/i] : true,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/', (_req, res) => {
  res.json({
    service: 'credify-backend',
    status: 'ready',
  })
})

app.use('/api', apiRouter)

app.use(notFound)
app.use(errorHandler)

export default app

