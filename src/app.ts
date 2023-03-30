import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

import publicRouteIndex from '@routes/public.index'
import securedRouteIndex from '@routes/secured.index'

import ConfigsDao from '@dao/configs.dao'

const app = express()

const isProdEnv = process.env.NODE_ENV === 'prod'

let corsOptions = {
  origin: function (origin, callback) {
    const sameSite = !origin

    ConfigsDao.getAllowedOrigins().then((origins) => {
      if (sameSite || origins.includes(origin) || !isProdEnv) {
        callback(null, origins)
      } else {
        console.error(`cors error, not allowed: ${origin}`)
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

app.use('/', publicRouteIndex);
app.use('/', securedRouteIndex);

// TODO: remove this code and handle not found exception
app.use('*', (req, res) => res.status(404).json({
  error: 'not found'
}))

export default app
