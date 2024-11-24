import logger from '@/common/logger'
import { GoogleUserInfo } from '@/common/types/types'
import usersServices from '@/services/api/users.services'
import { TargetPlatformToHost, OAuth2TokenReceiver, Env, Envs, TargetPlatformWeb, GetUserInfoUrl, RegisterStep, LoginTypes, DefaultLangCode } from '@/common/consts/constants'
import { getTokenFromCode, newGoogleOAuth2Client, refreshAccessToken } from '@services/support/google-auth.service'
import fetch from 'node-fetch'

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

      const oAuth2Client = newGoogleOAuth2Client({
        refresh_token: refreshToken
      })
      const tokens = await refreshAccessToken(oAuth2Client, refreshToken)

      res.cookie('authToken', tokens?.access_token, this.cookieOptions)
      res.cookie('refreshToken', tokens?.refresh_token, this.cookieOptions)

      return res.json(tokens)
    } catch (e) {
      res.status(401).json(e)
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

        const userInfo = await getUserFromAccessToken(tokens.access_token)
        const registeredUser = await usersServices.getUserByEmail(userInfo.email)

        if (!registeredUser) {
          await usersServices.register(userInfo)
        }

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

async function getUserFromAccessToken(accessToken: string): Promise<any> {
  const resp = await fetch(GetUserInfoUrl(accessToken))
  const userInfo: GoogleUserInfo = await resp.json()
  userInfo.locale = userInfo.locale?.substring(0, 2) ?? DefaultLangCode
  const type = LoginTypes.google
  const serviceAccessToken = accessToken
  const finishedRegisterStep = RegisterStep

  return { type, serviceAccessToken, finishedRegisterStep, ...userInfo }
}
