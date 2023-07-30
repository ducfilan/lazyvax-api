import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName, getDbClient, transactionOptions } from '@common/configs/mongodb-client.config'
import { AgeGroupMaxLength, BotUserId, BotUserName, CacheKeyUser, ConversationTypeGoal, GoalMaxLength, I18nDbCodeFirstConversationDescription, I18nDbCodeFirstConversationTitle, I18nDbCodeFirstMessages, OccupationLength, StudyCourseLength, SupportingLanguages, UsersCollectionName } from '@common/consts'
import { User } from '@/models/User'
import ConversationsDao from './conversations.dao'
import { Conversation } from '@/models/Conversation'
import { LangCode } from '@/common/types'
import MessagesDao from './messages.dao'
import { Message, MessageGroupBuilder } from '@/models/Message'
import I18nDao from './i18n'
import { I18n } from '@/models/I18n'
import { getGreetingTime } from '@/common/utils/stringUtils'
import { delCache } from '@/common/redis'
import logger from '@/common/logger'

let _users: Collection<User>
let _db: Db
let defaultProjection = { projection: { password: 0, serviceAccessToken: 0 } }

export default class UsersDao {
  static injectDB(conn: MongoClient) {
    if (_users) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _users = _db.collection(UsersCollectionName)

      _users.createIndex({ email: 1 }, { unique: true, sparse: true })

      _db.command({
        collMod: UsersCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'locale', 'finishedRegisterStep'],
            properties: {
              _id: { bsonType: 'objectId' },
              type: { bsonType: 'string' },
              serviceAccessToken: { bsonType: 'string' },
              finishedRegisterStep: { bsonType: 'int' },
              name: { bsonType: 'string' },
              email: { bsonType: 'string' },
              locale: {
                enum: SupportingLanguages
              },
              password: { bsonType: 'string' },
              pictureUrl: { bsonType: 'string' },
              preferences: {
                bsonType: 'object',
                properties: {
                  userCategory: { bsonType: 'string', 'enum': ['professional', 'student'] },
                  age: { bsonType: 'string', maxLength: AgeGroupMaxLength },
                  gender: { bsonType: 'string', 'enum': ['male', 'female', 'other'] },
                  workerType: { bsonType: 'string', 'enum': ['individual', 'manager', 'both'] },
                  occupation: { bsonType: 'string', maxLength: OccupationLength },
                  degree: { bsonType: 'string', 'enum': ['k-12', 'undergraduate', 'graduate'] },
                  studyCourse: { bsonType: 'string', maxLength: StudyCourseLength },
                  lifeGoals: { bsonType: 'array', items: { bsonType: 'string', maxLength: GoalMaxLength } }
                },
                additionalProperties: false
              },
              conversations: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  properties: {
                    _id: { bsonType: 'objectId' },
                    type: { bsonType: 'string' },
                    title: { bsonType: 'string' },
                    description: { bsonType: 'string' },
                    unreadCount: { bsonType: 'int' }
                  },
                  required: ['_id', 'type', 'title'],
                  additionalProperties: false
                }
              }
            },
            additionalProperties: false
          }
        }
      })
    } catch (e) {
      logger.error(
        `Unable to establish a collection handle in usersDao: ${e}`,
      )
    }
  }

  static async findOne(query) {
    return _users.findOne(query, defaultProjection)
  }

  static async findByEmail(email, projection = defaultProjection) {
    try {
      return await _users.findOne({ email }, projection)
    } catch (e) {
      logger.error(arguments)
      logger.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async updateOne(findCondition, updateOperations) {
    try {
      if (!findCondition._id || !findCondition.email) throw new Error('No _id or mail in findCondition')

      await Promise.all([delCache(CacheKeyUser(findCondition.email)), delCache(CacheKeyUser(findCondition._id.toHexString()))])
      await _users.findOneAndUpdate(findCondition, updateOperations, defaultProjection)
      return true
    } catch (e) {
      logger.error(arguments)
      logger.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async isUserExists(email: string) {
    return !!this.findByEmail(email)
  }

  static async registerUserIfNotFound(userInfo: User): Promise<ObjectId> {
    let user = await this.findByEmail(userInfo.email)

    if (!!user && user._id) {
      return user._id
    }

    let insertedUserId: ObjectId

    const session = getDbClient().startSession()
    await session.withTransaction(async () => {
      userInfo._id = new ObjectId()

      const firstConversation = await generateFirstConversation(userInfo.locale, userInfo)
      const conversationId = await ConversationsDao.insertOne(firstConversation)
      firstConversation._id = conversationId

      delete firstConversation.participants
      userInfo.conversations = [firstConversation]

      const insertUserResult = await _users.insertOne(userInfo)
      insertedUserId = insertUserResult.insertedId

      const firstMessages = await generateFirstMessages(userInfo.locale, conversationId)
      MessagesDao.insertMany(firstMessages)
    }, transactionOptions)

    return insertedUserId
  }
}

async function generateFirstConversation(locale: LangCode, userInfo: User) {
  const title = ((await I18nDao.getByCode(I18nDbCodeFirstConversationTitle, locale))?.at(0) as I18n | null)?.content || ''
  const description = ((await I18nDao.getByCode(I18nDbCodeFirstConversationDescription, locale))?.at(0) as I18n | null)?.content || ''

  return {
    title,
    description,
    unreadCount: 1,
    type: ConversationTypeGoal,
    participants: [{
      _id: userInfo._id,
      name: userInfo.name,
      pictureUrl: userInfo.pictureUrl,
    }]
  } as Conversation
}

async function generateFirstMessages(locale: LangCode, conversationId: ObjectId, authorId: ObjectId = BotUserId, authorName: string = BotUserName): Promise<Message[]> {
  const i18nMessages = await I18nDao.getByCode(I18nDbCodeFirstMessages, locale)

  const orderToFormatArgs = {
    1: [getGreetingTime(locale)]
  }

  return new MessageGroupBuilder(i18nMessages, orderToFormatArgs).build(conversationId, authorId, authorName)
}
