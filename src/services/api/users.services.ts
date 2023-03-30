import { ObjectId } from 'mongodb'
import UsersDao from '@dao/users.dao'
import InteractionsDao from '@dao/interactions.dao'
import SetsDao from '@dao/sets.dao'
import ItemsStatisticsDao from '@dao/items-statistics.dao'
import ItemsInteractionsDao from '@dao/items-interactions.dao'
import SetsStatisticsDao from '@dao/sets-statistics.dao'
import { isGoogleTokenValid } from '@services/support/google-auth.service'
import { LoginTypes, SupportingLanguagesMap, DefaultLangCode, CacheKeyRandomSet, CacheKeyUser } from '@common/consts'
import { delCache, getCache, setCache } from '@common/redis'
import { User } from '@common/types'

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
      langCodes: [locale]
    }

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

  getUserSets: async (creatorId: ObjectId, interaction: string, skip: number, limit: number) => {
    switch (interaction) {
      case 'create':
        let resp = await SetsDao.find({ creatorId }, skip, limit)
        const setIds = resp.sets.map(({ _id }) => _id)

        const interactions = await InteractionsDao.filterSetIds(creatorId, setIds) || []

        resp.sets.forEach((set, index) => resp.sets[index] = ({
          actions: interactions.find(i => i.setId.equals(set._id))?.actions || [],
          set
        }))

        return resp
      default:
        return InteractionsDao.getUserInteractedSets(creatorId, interaction, skip, limit)
    }
  },

  getUserRandomSet: async (userId: ObjectId, interactions: string[], itemsSkip: number, itemsLimit: number) => {
    const cacheKey = CacheKeyRandomSet(userId.toString(), interactions, itemsSkip, itemsLimit)
    userId = new ObjectId(userId)
    let result = await getCache(cacheKey)

    if (result) {
      result.set._id = new ObjectId(result.set._id)
    }
    else {
      result = await InteractionsDao.getUserRandomSet(userId, interactions, itemsSkip, itemsLimit)
      if (!result || Object.keys(result).length == 0) return {}

      setCache(cacheKey, result, { EX: 600 })
    }

    // TODO: Filter by items id, not get all.
    result.set.itemsInteractions = await ItemsInteractionsDao.getSetItemsInteract(userId, result.set._id)

    return result
  },

  update: async ({ _id, email }: User, updateItems) => {
    await delCache(CacheKeyUser(email))
    return UsersDao.updateOne(_id, { $set: updateItems })
  },

  logout: async ({ email }) => {
    await delCache(CacheKeyUser(email))
  },

  getUserStatistics: async (_id, beginDate, endDate) => {
    return ItemsStatisticsDao.getUserStatistics(_id, beginDate, endDate)
  },

  getSetsStatistics: async (_id) => {
    return SetsStatisticsDao.getUserSetsStatistics(_id)
  }
}
