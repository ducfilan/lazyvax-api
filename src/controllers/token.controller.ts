import { BrowserToExtensionId, ExtensionIdChrome, OAuth2TokenReceiver } from '@common/consts'
import { getTokenFromCode, refreshAccessToken } from '@services/support/google-auth.service'

export default class TokenController {
  static async apiGetTokenFromCode(req, res, next) {
    try {
      const { code } = req.query

      const tokens = await getTokenFromCode(code)
      return res.json(tokens)
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async refreshAccessToken(req, res, next) {
    try {
      const { refreshToken } = req.query

      const tokens = await refreshAccessToken(refreshToken)
      return res.json(tokens)
    } catch (e) {
      res.status(500).json(e)
    }
  }

  static async oauth2callback(req, res, next) {
    try {
      const { state, code } = req.query
      const targetBrowser = state.split("_")[0]

      const redirectParams = new URLSearchParams(Object.entries({ state, code })).toString()

      res.redirect(`${OAuth2TokenReceiver(browserToTargetId(targetBrowser))}?${redirectParams}`)
    } catch (e) {
      console.log(`api, ${e}`)
      if (e.code) {
        res.status(parseInt(e.code)).json(e)
      } else {
        res.status(500).json(e)
      }
    }
  }
}

function browserToTargetId(browser: string) {
  return BrowserToExtensionId[browser.toLowerCase()] || ExtensionIdChrome
}
