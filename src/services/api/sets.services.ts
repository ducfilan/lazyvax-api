import SetsDao from '@dao/sets.dao'
import TopSetsDao from '@dao/top-sets.dao'
import InteractionsDao from '@dao/interactions.dao'
import ItemsInteractionsDao from '@dao/items-interactions.dao'
import CategoriesDao from '@dao/categories.dao'
import { BaseCollectionProperties, CacheKeyRandomSetPrefix, CacheKeySet, CacheKeySetPrefix, CacheKeySuggestSet, InteractionSubscribe, SupportingTopSetsTypes } from '@common/consts'
import { getCache, setCache, delCache, delCacheByKeyPattern } from '@common/redis'
import { ObjectId } from 'mongodb'

function standardizeSetInfoProperties(setInfo) {
  delete setInfo.captchaToken

  // Add _id to items.
  setInfo.items.forEach(item => item._id = item._id ? new ObjectId(item._id) : new ObjectId())
  return {
    ...setInfo,
    _id: new ObjectId(setInfo._id),
    categoryId: new ObjectId(setInfo.categoryId),
    totalItemsCount: setInfo.items.length,
    ...BaseCollectionProperties()
  }
}

export default {
  createSet: async (setInfo) => {
    setInfo = standardizeSetInfoProperties(setInfo)

    return SetsDao.createSet(setInfo)
  },

  editSet: async (setInfo) => {
    await delCache(setInfo._id)
    await delCacheByKeyPattern(CacheKeySetPrefix(setInfo._id))

    setInfo = standardizeSetInfoProperties(setInfo)

    const { creatorId, interactionCount } = (await SetsDao.getSet(setInfo._id) || {})

    const isCreatorValid = creatorId.equals(setInfo.creatorId)
    if (!isCreatorValid) throw new Error(`no permission to edit set ${creatorId} != ${setInfo.creatorId}`)

    return SetsDao.replaceSet(interactionCount ? { ...setInfo, interactionCount } : setInfo)
  },

  getSet: async (userId: ObjectId, setIdStr: string, itemsSkip: number, itemsLimit: number) => {
    const cacheKey = CacheKeySet(setIdStr, itemsSkip, itemsLimit)
    let set = await getCache(cacheKey)

    const setId = new ObjectId(setIdStr)

    if (!set) {
      set = await SetsDao.getSet(setId, itemsSkip, itemsLimit)
      if (!set) return null

      setCache(cacheKey, set)
    }

    if (userId) {
      const { actions } = await InteractionsDao.filterSetId(userId, setId)
      const itemsInteractions = await ItemsInteractionsDao.getSetItemsInteract(userId, setId)
      set = { ...set, actions, itemsInteractions }
    }

    return set
  },

  getSetsInCategory: async (categoryId, skip, limit) => {
    const subCategoriesIds = await CategoriesDao.getSubCategoriesIds(categoryId)
    return SetsDao.getSetsInCategory([new ObjectId(categoryId), ...subCategoriesIds], skip, limit)
  },

  searchSet: async (userId, searchConditions) => {
    const { sets, total } = await SetsDao.searchSet(searchConditions)

    const setIds = sets.map(({ _id }) => _id)

    let interactions: any[] = []
    if (userId) {
      interactions = await InteractionsDao.filterSetIds(userId, setIds)
    }

    return { total, sets, interactions }
  },

  suggestSets: async (userId: ObjectId, searchConditions) => {
    const { keyword, skip, limit, languages } = searchConditions

    const cacheKey = CacheKeySuggestSet(userId.toString(), keyword, skip, limit, languages)
    let suggestResult = await getCache(cacheKey)

    if (suggestResult) {
      suggestResult.sets.forEach(set => set._id = new ObjectId(set._id))
    }
    else {
      suggestResult = await SetsDao.suggestSets({ userId, ...searchConditions })
      setCache(cacheKey, suggestResult, { EX: 600 })
    }

    const { sets, total } = suggestResult

    const setIds = sets.map(({ _id }) => _id)

    let interactions: any = []
    if (userId) {
      interactions = await InteractionsDao.filterSetIds(userId, setIds)
    }

    return { total, sets, interactions }
  },

  /**
   * Get top sets global
   * @param {string} userId current user id
   * @param {string} langCode language code, e.g. 'en'
   * @returns Array of top sets
   */
  getTopSets: async (userId, langCode) => {
    const topSets = await TopSetsDao.getTopSets({
      langCode,
      type: SupportingTopSetsTypes.Global
    })

    const topSetIds = topSets.map(({ _id }) => _id)

    let interactions: any[] = []
    if (userId) {
      interactions = await InteractionsDao.filterSetIds(userId, topSetIds)
    }

    return { topSets, interactions }
  },

  /**
   * Get top sets in a category
   * @param {string} userId current user id
   * @param {string} langCode language code, e.g. 'en'
   * @param {string} categoryId id for the category
   * @returns Array of top sets
   */
  getTopSetsInCategory: async (userId: ObjectId, langCode: string, categoryId: ObjectId) => {
    const topSets = await TopSetsDao.getTopSets({
      langCode,
      type: SupportingTopSetsTypes.Category,
      categoryId
    })

    const topSetIds = topSets.map(topSet => topSet._id)

    let interactions: any[] = []
    if (userId) {
      interactions = await InteractionsDao.filterSetIds(userId, topSetIds)
    }

    return { topSets, interactions }
  },

  interactSet: async (action, userId, setId) => {
    await InteractionsDao.interactSet(action, userId, setId)

    // TODO: Use kafka, separate job to sync.
    await SetsDao.interactSet(action, setId)
  },

  interactItem: async (action, userId, setId, itemId) => {
    await ItemsInteractionsDao.interactItem(action, userId, setId, itemId)
  },

  getTopInteractItem: async (action, userId, setId, order, limit) => {
    return ItemsInteractionsDao.getTopInteractItem(action, userId, setId, order, limit)
  },

  getInteractedItems: async (userId: ObjectId, interactionInclude: string, interactionsIgnoreStr: string, skip: number, limit: number) => {
    const interactionsIgnore = interactionsIgnoreStr.split(',')

    return ItemsInteractionsDao.getInteractedItems(userId, interactionInclude, interactionsIgnore, skip, limit)
  },

  countInteractedItems: async (userId: ObjectId, interactionInclude: string, interactionsIgnoreStr: string) => {
    const interactionsIgnore = interactionsIgnoreStr.split(',')

    return ItemsInteractionsDao.countInteractedItems(userId, interactionInclude, interactionsIgnore)
  },

  undoInteractSet: async (action, userId: ObjectId, setId) => {
    if (action === InteractionSubscribe) {
      delCacheByKeyPattern(CacheKeyRandomSetPrefix(userId.toString(), action))
    }

    await InteractionsDao.undoInteractSet(action, userId, setId)

    // TODO: Use kafka, separate job to sync.
    await SetsDao.interactSet(action, setId, -1)
  },

  uploadTestResult: async (userId, setId, result) => {
    await InteractionsDao.uploadTestResult(userId, setId, result)
  }
}
