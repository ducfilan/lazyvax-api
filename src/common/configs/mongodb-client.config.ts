import { MongoClient, WriteConcern } from 'mongodb'
import ConfigsDao from '@dao/configs.dao'
import UsersDao from '@dao/users.dao'

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
  const client = await MongoClient.connect(
    ConnectionString,
    Configs
  )

  UsersDao.injectDB(client)
  ConfigsDao.injectDB(client)
}

export const DatabaseName = MONGO_DB

export default {
  ConnectionString,
  DatabaseName,
  Configs
}
