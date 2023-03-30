import { MongoClient, ObjectId } from "mongodb"
import { DatabaseName } from "../../src/common/configs/mongodb-client.config"
import { SetsCollectionName } from "../../src/common/consts"

export const addSet = async (mongodbClient: MongoClient, setInfo): Promise<ObjectId> => {
  return (await mongodbClient.db(DatabaseName).collection(SetsCollectionName).insertOne(setInfo)).insertedId
}
