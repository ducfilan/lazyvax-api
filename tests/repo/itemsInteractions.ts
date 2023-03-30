import { MongoClient, ObjectId } from "mongodb"
import { DatabaseName } from "../../src/common/configs/mongodb-client.config"
import { ItemsInteractionsCollectionName } from "../../src/common/consts"

export const addItemsInteractions = async (mongodbClient: MongoClient, item): Promise<ObjectId> => {
  return (await mongodbClient.db(DatabaseName).collection(ItemsInteractionsCollectionName).insertOne(item)).insertedId
}
