import { MongoClient } from "mongodb";
import { DatabaseName } from "../../src/common/configs/mongodb-client.config";
import { InteractionsCollectionName, ItemsInteractionsCollectionName, ItemsStatisticsCollectionName, MissionsCollectionName, SetsCollectionName, SetsStatisticsCollectionName, TagsCollectionName, TopSetsCollectionName, UsersCollectionName } from "../../src/common/consts";

export const resetDb = (mongodbClient: MongoClient) => {
  return Promise.all([
    mongodbClient.db(DatabaseName).collection(UsersCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(SetsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(TopSetsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(InteractionsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(ItemsInteractionsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(ItemsStatisticsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(SetsStatisticsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(MissionsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(TagsCollectionName).deleteMany({}),
  ])
}
