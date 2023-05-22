import { MongoClient } from "mongodb";
import { DatabaseName } from "../../src/common/configs/mongodb-client.config";
import {
  ConversationsCollectionName,
  MessagesCollectionName,
  I18nCollectionName,
  ConfigsCollectionName,
  UsersCollectionName
} from "../../src/common/consts";

export const resetDb = (mongodbClient: MongoClient) => {
  return Promise.all([
    mongodbClient.db(DatabaseName).collection(ConversationsCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(MessagesCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(I18nCollectionName).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(ConfigsCollectionName,).deleteMany({}),
    mongodbClient.db(DatabaseName).collection(UsersCollectionName).deleteMany({}),
  ])
}
