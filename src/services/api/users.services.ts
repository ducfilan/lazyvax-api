import { ObjectId } from 'mongodb'
import UsersDao from '@dao/users.dao'
import { isGoogleTokenValid } from '@services/support/google-auth.service'
import { LoginTypes, SupportingLanguagesMap, DefaultLangCode, CacheKeyUser } from '@common/consts'
import { delCache } from '@common/redis'
import { User } from '@/models/User'

export default {
  register: async (requestBody): Promise<ObjectId> => {
    let { type, serviceAccessToken, finishedRegisterStep,
      name, email, locale, picture: pictureUrl
    } = requestBody

    locale = locale.substring(0, 2)
    locale = SupportingLanguagesMap[locale] ? locale : DefaultLangCode

    let userInfo = {
      type,
      serviceAccessToken,
      finishedRegisterStep,
      name,
      email,
      locale,
      pictureUrl
    } as User

    switch (type) {
      case LoginTypes.google:
        const isTokenValid = await isGoogleTokenValid(serviceAccessToken, email)
        if (!isTokenValid)
          throw new Error('Invalid token')

        break

      default:
        throw Error('Not supported register type!')
    }

    return UsersDao.registerUserIfNotFound(userInfo)
  },

  getUserInfoById: async (userId: ObjectId) => {
    return UsersDao.findOne({ _id: userId })
  },

  update: async ({ _id, email }: User, updateItems) => {
    await delCache(CacheKeyUser(email))
    return UsersDao.updateOne(_id, { $set: updateItems })
  },

  logout: async ({ email }) => {
    await delCache(CacheKeyUser(email))
  },
}
