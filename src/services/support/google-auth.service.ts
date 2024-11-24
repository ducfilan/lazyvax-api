import logger from '@/common/logger'
import { Credentials, OAuth2Client } from 'google-auth-library'

export const newGoogleOAuth2Client = (credentials?: Credentials): OAuth2Client => {
  const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    eagerRefreshThresholdMillis: 5000,
    forceRefreshOnFailure: true
  })

  if (credentials) {
    client.setCredentials(credentials)
  }

  return client
}

const oAuth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  eagerRefreshThresholdMillis: 5000,
  forceRefreshOnFailure: true
})

export const isGoogleTokenValid = async (serviceAccessToken: string, requestEmail: string) => {
  try {
    if (!serviceAccessToken || !requestEmail) return false

    const { email: tokenInfoEmail, expiry_date: expiryDate } = await oAuth2Client.getTokenInfo(serviceAccessToken)
    return tokenInfoEmail?.toLowerCase() === requestEmail.toLowerCase() && expiryDate > Date.now()
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

  return { access_token, refresh_token }
}

export const refreshAccessToken = async (oAuth2Client: OAuth2Client, refreshToken: string) => {
  if (!oAuth2Client) {
    oAuth2Client = newGoogleOAuth2Client()
  }

  oAuth2Client.setCredentials({
    refresh_token: refreshToken
  })

  try {
    const { credentials } = await oAuth2Client.refreshAccessToken()
    return {
      access_token: credentials.access_token,
      refresh_token: refreshToken
    }
  } catch (error) {
    logger.error('Failed to refresh access token:', error)
    throw error
  }
}
