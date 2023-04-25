import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName, getDbClient, transactionOptions } from '@common/configs/mongodb-client.config'
import { BotUserId, BotUserName, ConversationTypeGoal, GoalMaxLength, MessageTypePlainText, SupportingLanguages, UsersCollectionName, getFirstConversationDescription, getFirstConversationTitle, getFirstMessages } from '@common/consts'
import { User } from '@/models/User'
import ConversationsDao from './conversations.dao'
import { Conversation } from '@/models/Conversation'
import { LangCode } from '@/common/types'
import MessagesDao from './messages.dao'
import { Message } from '@/models/Message'

let _users: Collection
let _db: Db
let defaultProjection = { projection: { password: 0 } }

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
                  age: { bsonType: 'int', minimum: 0, maximum: 150 },
                  gender: { bsonType: 'string', 'enum': ['male', 'female', 'other'] },
                  workerType: { bsonType: 'string', 'enum': ['individual', 'manager', 'both'] },
                  occupation: { bsonType: 'string' },
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
                  required: ['_id', 'type', 'title', 'unreadCount'],
                  additionalProperties: false
                }
              }
            },
            additionalProperties: false
          }
        }
      })
    } catch (e) {
      console.error(
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
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async updateOne(_id: ObjectId, updateOperations) {
    try {
      await _users.findOneAndUpdate({ _id }, updateOperations, defaultProjection)
      return true
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
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

      const firstConversation = generateFirstConversation(userInfo.locale, userInfo)
      const { insertedId: conversationId } = await ConversationsDao.insertOne(firstConversation)
      firstConversation._id = conversationId

      delete firstConversation.participants
      userInfo.conversations = [firstConversation]

      const insertUserResult = await _users.insertOne(userInfo)
      insertedUserId = insertUserResult.insertedId

      const firstMessages = generateFirstMessages(userInfo.locale, conversationId)
      MessagesDao.insertMany(firstMessages)
    }, transactionOptions)

    return insertedUserId
  }
}

function generateFirstConversation(locale: LangCode, userInfo: User) {
  return {
    title: getFirstConversationTitle(locale),
    description: getFirstConversationDescription(locale),
    unreadCount: 1,
    type: ConversationTypeGoal,
    participants: [{
      _id: userInfo._id,
      name: userInfo.name,
      pictureUrl: userInfo.pictureUrl,
    }]
  } as Conversation
}

function generateFirstMessages(locale: LangCode, conversationId: ObjectId, authorId: ObjectId = BotUserId, authorName: string = BotUserName): Message[] {
  return getFirstMessages(locale).map(({ message: content, type }) => ({
    authorId: authorId,
    authorName: authorName,
    content,
    conversationId,
    timestamp: new Date(),
    type,
  }))
}
