import { MongoClient, TransactionOptions, WriteConcern } from 'mongodb'
import ConfigsDao from '@dao/configs.dao'
import UsersDao from '@dao/users.dao'
import ConversationsDao from '@/dao/conversations.dao';
import MessagesDao from '@/dao/messages.dao';
import I18nDao from '@/dao/i18n';
import ObjectivesDao from '@/dao/objectives.dao';
import EventsDao from '@/dao/events.dao';
import HabitsDao from '@/dao/habits.dao';
import CheckpointDao from '@/dao/checkpoint.dao';
import ConversationMemoryDao from '@/dao/conversation_memory';

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

let client: MongoClient

export const injectTables = async () => {
  client = await MongoClient.connect(
    ConnectionString,
    Configs
  )

  UsersDao.injectDB(client)
  ConversationsDao.injectDB(client)
  ConversationMemoryDao.injectDB(client)
  MessagesDao.injectDB(client)
  ConfigsDao.injectDB(client)
  I18nDao.injectDB(client)
  ObjectivesDao.injectDB(client)
  EventsDao.injectDB(client)
  HabitsDao.injectDB(client)
  CheckpointDao.injectDB(client)

  return client
}

export const DatabaseName = MONGO_DB

export default {
  ConnectionString,
  DatabaseName,
  Configs
}

export const getDbClient = () => client

export const transactionOptions: TransactionOptions = {
  readPreference: 'primary',
  readConcern: { level: 'local' },
  writeConcern: { w: 'majority' }
}
