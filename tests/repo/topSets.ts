import { MongoClient, ObjectId } from "mongodb"
import { DatabaseName } from "../../src/common/configs/mongodb-client.config"
import { TopSetsCollectionName } from "../../src/common/consts"

export const addTopSet = async (mongodbClient: MongoClient, setInfo): Promise<ObjectId> => {
  return (await mongodbClient.db(DatabaseName).collection(TopSetsCollectionName).insertOne(setInfo)).insertedId
}
