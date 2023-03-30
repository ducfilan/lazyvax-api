import { ObjectId } from "mongodb"
import { CacheKeyRandomSetPrefix, CacheTypeUserRandomSet, InteractionSubscribe } from "../../common/consts"
import { delCacheByKeyPattern } from "../../common/redis"

export const deleteCache = async (userId: ObjectId, cacheType: string): Promise<void> => {
  switch (cacheType) {
    case CacheTypeUserRandomSet:
      await delCacheByKeyPattern(CacheKeyRandomSetPrefix(userId.toString(), InteractionSubscribe))

      break

    default:
      break
  }
}
