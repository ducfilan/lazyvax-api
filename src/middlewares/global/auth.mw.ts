import UsersDao from '@dao/users.dao'
import { getEmailFromGoogleToken, newGoogleOAuth2Client } from '@services/support/google-auth.service'
import { CacheKeyUser, LoginTypes } from '@/common/consts/constants'
import { getCache, setCache } from '@common/redis'
import { ObjectId } from 'mongodb'

export default async (req, res, next) => {
  try {
    const accessToken = req.cookies['authToken'] || req.header('Authorization')?.replace('Bearer ', '')
    const refreshToken = req.cookies['refreshToken']
    const loginType = req.header('X-Login-Type')
    if (!accessToken) throw new Error('no Authorization token provided!')

    let email: string | null
    switch (loginType) {
      case LoginTypes.google:
        req.oAuth2Client = newGoogleOAuth2Client({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        email = await getEmailFromGoogleToken(accessToken)
        break

      default:
        throw new Error('invalid login type')
    }

    if (!email) throw new Error('invalid/expired token')

    const cacheKeyEmail = CacheKeyUser(email)
    let user = await getCache(cacheKeyEmail)

    if (user) {
      user._id = new ObjectId(user._id)
    } else {
      user = await UsersDao.findByEmail(email)

      if (user) {
        const cacheKeyId = CacheKeyUser(user._id.toHexString())
        await Promise.all([setCache(cacheKeyEmail, user), setCache(cacheKeyId, user)])
      }
    }

    if (!user) throw new Error('not found user with email: ' + email)

    req.user = user
    next()
  } catch (error) {
    res.status(401).send({ error: error.message })
  }
}
