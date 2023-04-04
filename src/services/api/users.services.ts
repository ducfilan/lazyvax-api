import { ObjectId } from 'mongodb'
import UsersDao from '@dao/users.dao'
import { isGoogleTokenValid } from '@services/support/google-auth.service'
import { LoginTypes, SupportingLanguagesMap, DefaultLangCode, CacheKeyRandomSet, CacheKeyUser } from '@common/consts'
import { delCache, getCache, setCache } from '@common/redis'
import User from '@/models/User'
import dogNames from 'dog-names'

export default {
  register: async (requestBody): Promise<ObjectId> => {
    let { type, serviceAccessToken, finishedRegisterStep,
      name, email, locale, password, picture: pictureUrl
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
      password,
      pictureUrl,
      preferences: {
        botName: dogNames.allRandom()
      }
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
