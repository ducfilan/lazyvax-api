import { ObjectId } from "mongodb"
import { delCacheByKeyPattern } from "@common/redis"

export const deleteCache = async (userId: ObjectId, cacheType: string): Promise<void> => {
  switch (cacheType) {

    default:
      break
  }
}
