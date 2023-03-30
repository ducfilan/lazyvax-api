import { MongoClient, WriteConcern } from 'mongodb'
import CategoriesDao from '@dao/categories.dao';
import ConfigsDao from '@dao/configs.dao';
import InteractionsDao from '@dao/interactions.dao';
import ItemsInteractionsDao from '@dao/items-interactions.dao';
import ItemsStatisticsDao from '@dao/items-statistics.dao';
import MissionsDao from '@dao/missions.dao';
import SetsStatisticsDao from '@dao/sets-statistics.dao';
import SetsDao from '@dao/sets.dao';
import TagsDao from '@dao/tags.dao';
import TopSetsDao from '@dao/top-sets.dao';
import UsersDao from '@dao/users.dao';

const {
  NODE_ENV,
  MONGO_USERNAME,
  MONGO_PASSWORD,
  MONGO_HOSTNAME,
  MONGO_PORT,
  MONGO_DB,
  MONGO_SCHEME
} = process.env;

const portPart = MONGO_PORT ? `:${MONGO_PORT}` : ''

const ConnectionString = `${MONGO_SCHEME}://${MONGO_USERNAME}:${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOSTNAME}${portPart}/?retryWrites=true&w=majority`

const Configs = {
  maxPoolSize: 100,
  retryWrites: true,
  writeConcern: new WriteConcern('majority', 5000), // ms 
}

export const injectTables = async () => {
  return new Promise<MongoClient>((resolve, reject) => {
    MongoClient.connect(
      ConnectionString,
      Configs
    )
      .catch(err => {
        reject(err)
      })
      .then(async (client: MongoClient) => {
        await CategoriesDao.injectDB(client)
        await UsersDao.injectDB(client)
        await SetsDao.injectDB(client)
        await TagsDao.injectDB(client)
        await TopSetsDao.injectDB(client)
        await InteractionsDao.injectDB(client)
        await ConfigsDao.injectDB(client)
        await ItemsInteractionsDao.injectDB(client)
        await ItemsStatisticsDao.injectDB(client)
        await SetsStatisticsDao.injectDB(client)
        await MissionsDao.injectDB(client)

        resolve(client)
      })
  })
}

export const DatabaseName = MONGO_DB

export default {
  ConnectionString,
  DatabaseName,
  Configs
}
