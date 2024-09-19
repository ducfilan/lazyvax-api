import logger from '@/common/logger'
import { OAuth2Client } from 'google-auth-library'

export const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  eagerRefreshThresholdMillis: 5000,
  forceRefreshOnFailure: true
})

export const isGoogleTokenValid = async (serviceAccessToken: string, requestEmail: string) => {
  try {
    const { email: tokenInfoEmail } = await oAuth2Client.getTokenInfo(serviceAccessToken)
    return tokenInfoEmail?.toLowerCase() === requestEmail.toLowerCase()
  } catch (error) {
    logger.error('isGoogleTokenValid', error)
    return false
  }
}

export const getEmailFromGoogleToken = async (serviceAccessToken: string): Promise<string | null> => {
  try {
    const { email } = await oAuth2Client.getTokenInfo(serviceAccessToken)
    return email
  } catch (error) {
    logger.error(error)
    return null
  }
}

export const getTokenFromCode = async (code: string) => {
  let { tokens: { access_token, refresh_token } } = await oAuth2Client.getToken(code)
  oAuth2Client.setCredentials({
    access_token,
    refresh_token
  })

  return { access_token, refresh_token }
}

export const refreshAccessToken = async (refreshToken: string) => {
  oAuth2Client.setCredentials({
    refresh_token: refreshToken
  })

  let { token } = await oAuth2Client.getAccessToken()
  oAuth2Client.setCredentials({
    access_token: token,
    refresh_token: refreshToken
  })

  return { access_token: token, refresh_token: refreshToken }
}
