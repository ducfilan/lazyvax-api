import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'

import publicRouteIndex from '@routes/public.index'
import securedRouteIndex from '@routes/secured.index'

import ConfigsDao from '@dao/configs.dao'
import logger from './common/logger'

const app = express()

const isProdEnv = ['prod', 'live'].includes(process.env.NODE_ENV)

let configuredOrigins: string[] = [];

export async function getOrigins() {
  if (configuredOrigins.length > 0) { // TODO: This requires restart when adding origins.
    return configuredOrigins
  }

  configuredOrigins = await ConfigsDao.getAllowedOrigins()

  return configuredOrigins
}

let corsOptions = {
  origin: function (origin, callback) {
    const sameSite = !origin

    getOrigins().then(origins => {
      if (sameSite || origins.includes(origin) || !isProdEnv) {
        callback(null, origin)
      } else {
        logger.error(`cors error, not allowed: ${origin}`)
        callback(`cors error, not allowed: ${origin}`)
      }
    })
  },
  preflightContinue: true
}

app.use(cors(corsOptions))
isProdEnv ? app.use(morgan('combined')) : app.use(morgan('dev'))
app.use(express.urlencoded({
  extended: true
}))
app.use(express.json())

app.use(cookieParser(process.env.COOKIE_SECRET))

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", "true")

  getOrigins().then(origins => {
    if (origins.includes(req.headers.origin)) {
      res.header("Access-Control-Allow-Origin", req.headers.origin)
    }

    next()
  })
})

app.use('/', publicRouteIndex);
app.use('/', securedRouteIndex);

// TODO: remove this code and handle not found exception
app.use('*', (req, res) => res.status(404).json({
  error: 'not found'
}))

export default app
