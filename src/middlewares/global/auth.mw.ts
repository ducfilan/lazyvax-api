import UsersDao from '@dao/users.dao'
import { getEmailFromGoogleToken } from '@services/support/google-auth.service'
import { CacheKeyUser, LoginTypes } from '@common/consts'
import { getCache, setCache } from '@common/redis'
import { ObjectId } from 'mongodb'

export default async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    const loginType = req.header('X-Login-Type')
    if (!token) throw new Error('no Authorization token provided!')

    let email: string | null
    switch (loginType) {
      case LoginTypes.google:
        email = await getEmailFromGoogleToken(token)
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

      const cacheKeyId = CacheKeyUser(user._id.toHexString())
      await Promise.all([setCache(cacheKeyEmail, user), setCache(cacheKeyId, user)])
    }

    if (!user) throw new Error('not found user with email: ' + email)

    req.user = user
    next()
  } catch (error) {
    res.status(401).send({ error: `Not authorized to access this resource, ${error.message}` })
    next(error)
  }
}
