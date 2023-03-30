import { MongoClient, ObjectId } from "mongodb"
import { DatabaseName } from "../../src/common/configs/mongodb-client.config"
import { ItemsStatisticsCollectionName } from "../../src/common/consts"

export const addItemsStatistics = async (mongodbClient: MongoClient, userId: ObjectId, date: Date, interactions): Promise<ObjectId> => {
  const { show, next, gotIt, ignore, correct, incorrect, star } = interactions
  return (await mongodbClient.db(DatabaseName).collection(ItemsStatisticsCollectionName).insertOne({
    userId,
    interactions: {
      show,
      next,
      gotIt,
      ignore,
      correct,
      incorrect,
      star
    },
    date
  })).insertedId
}
