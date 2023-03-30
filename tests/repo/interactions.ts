import { MongoClient, ObjectId } from "mongodb"
import { DatabaseName } from "../../src/common/configs/mongodb-client.config"
import { InteractionsCollectionName } from "../../src/common/consts"

export const addInteraction = async (mongodbClient: MongoClient, setId: ObjectId, userId: ObjectId, actions: string[]): Promise<ObjectId> => {
  return (await mongodbClient.db(DatabaseName).collection(InteractionsCollectionName).insertOne({
    setId,
    userId,
    actions,
    lastUpdated: new Date()
  })).insertedId
}
