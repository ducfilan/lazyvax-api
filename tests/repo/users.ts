import { MongoClient, ObjectId } from "mongodb"
import { DatabaseName } from "../../src/common/configs/mongodb-client.config"
import { UsersCollectionName } from "../../src/common/consts"

export const addUser = async (mongodbClient: MongoClient, userInfo: object): Promise<ObjectId> => {
  return (await mongodbClient.db(DatabaseName).collection(UsersCollectionName).insertOne(userInfo)).insertedId
}

export const getById = async (mongodbClientConfig: MongoClient, userId: ObjectId) => {
  return (await mongodbClientConfig.db(DatabaseName).collection(UsersCollectionName).findOne({ _id: userId }))
}

export const mockUserFinishedSetup = {
  "_id": new ObjectId("61ced7be4d51dc003e3615a8"),
  "type": "google",
  "finishedRegisterStep": 2,
  "name": "Duc Hoang",
  "email": "ducfilan@gmail.com",
  "locale": "en",
  "pictureUrl": "https://lh3.googleusercontent.com/a-/AOh14GgQdnguHUvyPcjZsAk7Dzz7sIe5zdmZD-JD0Je19g8=s96-c",
  "langCodes": [
    "en",
    "zh",
    "vi",
    "ja"
  ],
  "pages": [
    "facebook",
    "youtube",
    "amazon",
    "twitter",
    "google",
    "reddit",
    "messenger",
    "ebay",
    "pinterest"
  ]
}