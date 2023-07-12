import logger from '@/common/logger'
import { TargetPlatformToHost, OAuth2TokenReceiver, Env, Envs, TargetPlatformWeb } from '@common/consts'
import { getTokenFromCode, refreshAccessToken } from '@services/support/google-auth.service'

export default class TokenController {
  private static cookieOptions = {
    httpOnly: true,
    secure: Env == Envs.prod,
    sameSite: 'none'
  }

  static async apiGetTokenFromCode(req, res, next) {
    try {
      const { code } = req.query

      const tokens = await getTokenFromCode(code)

      return res.json(tokens)
    } catch (e) {
      logger.error(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async refreshAccessToken(req, res, next) {
    try {
      const refreshToken = req.query.refreshToken || req.cookies['refreshToken']

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token not found' })
      }

      const tokens = await refreshAccessToken(refreshToken)

      res.cookie('authToken', tokens.access_token, this.cookieOptions)
      res.cookie('refreshToken', tokens.refresh_token, this.cookieOptions)

      return res.json(tokens)
    } catch (e) {
      res.status(500).json(e)
    }
  }

  static async oauth2callback(req, res, next) {
    try {
      const { state, code } = req.query
      const targetPlatform = state.split("_")[0]

      if (targetPlatform === TargetPlatformWeb) {
        const tokens = await getTokenFromCode(code)

        res.cookie('authToken', tokens.access_token, this.cookieOptions)
        res.cookie('refreshToken', tokens.refresh_token, this.cookieOptions)

        res.redirect(OAuth2TokenReceiver(getClientHostFromPlatform(targetPlatform), targetPlatform))
      } else {
        const redirectParams = new URLSearchParams(Object.entries({ state, code })).toString()
        res.redirect(`${OAuth2TokenReceiver(getClientHostFromPlatform(targetPlatform), targetPlatform)}?${redirectParams}`)
      }
    } catch (e) {
      logger.error(`api, ${e}`)
      if (e.code) {
        res.status(parseInt(e.code)).json(e)
      } else {
        res.status(500).json(e)
      }
    }
  }
}

function getClientHostFromPlatform(targetPlatform: string) {
  return TargetPlatformToHost[targetPlatform.toLowerCase()] || TargetPlatformToHost.chrome
}
