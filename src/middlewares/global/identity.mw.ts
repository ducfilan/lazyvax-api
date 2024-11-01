import UsersDao from '@dao/users.dao'
import { getEmailFromGoogleToken } from '@services/support/google-auth.service'
import { CacheKeyUser, LoginTypes } from '@/common/consts/constants'
import { getCache, setCache } from '@/common/redis'
import { ObjectId } from 'mongodb'
import logger from '@/common/logger'

export default async (req, res, next) => {
  try {
    const token = req.cookies['authToken'] || req.header('Authorization')?.replace('Bearer ', '')
    const loginType = req.header('X-Login-Type')
    if (!token) return next()

    let email: string | null
    switch (loginType) {
      case LoginTypes.google:
        email = await getEmailFromGoogleToken(token)
        break

      default:
        return next()
    }

    if (!email) return next()

    const cacheKeyEmail = CacheKeyUser(email)
    let user = await getCache(cacheKeyEmail)

    if (user) {
      user._id = new ObjectId(user._id)
    } else {
      user = await UsersDao.findByEmail(email)

      const cacheKeyId = CacheKeyUser(user._id.toHexString())
      await Promise.all([setCache(cacheKeyEmail, user), setCache(cacheKeyId, user)])
    }

    if (!user) return next()

    req.user = user
    return next()
  } catch (error) {
    logger.error(error)
    return next()
  }
}
