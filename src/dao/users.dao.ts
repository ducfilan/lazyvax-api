import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName, getDbClient, transactionOptions } from '@common/configs/mongodb-client.config'
import {
  AgeGroupMaxLength,
  AspectMaxLength,
  LavaUserId,
  LavaUserName,
  CacheKeyUser,
  GoalMaxLength,
  I18nDbCodeFirstMessages,
  OccupationLength,
  StudyCourseLength,
  SupportingLanguages,
  UsersCollectionName,
  GeneralMaxLength
} from '@/common/consts/constants'
import { User } from '@/entities/User'
import { LangCode } from '@/common/types/types'
import { Message, MessageGroupBuilder } from '@/entities/Message'
import I18nDao from './i18n'
import { getGreetingTime } from '@/common/utils/stringUtils'
import { delCache } from '@/common/redis'
import logger from '@/common/logger'
import { JobStatusMax, MaritalStatusMax, workLifeBalanceTypes } from '@/common/consts/shared'

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
                  jobStatus: { bsonType: 'int', minimum: 0, maximum: JobStatusMax },
                  yearsOfExperience: { bsonType: 'int', minimum: 0, maximum: 100 },
                  maritalStatus: { bsonType: 'int', minimum: 0, maximum: MaritalStatusMax },
                  degree: { bsonType: 'string', 'enum': ['k-12', 'undergraduate', 'graduate'] },
                  studyCourse: { bsonType: 'string', maxLength: StudyCourseLength },
                  futureSelf: { bsonType: 'array', items: { bsonType: 'string', maxLength: GoalMaxLength } },
                  aspects: { bsonType: 'array', items: { bsonType: 'string', maxLength: AspectMaxLength } },
                  workLifeBalance: { bsonType: 'int', 'enum': workLifeBalanceTypes },
                  preferredFocusSessionLengthMinutes: { bsonType: 'int', minimum: 15, maximum: 600 },
                  goalSettingCategory: { bsonType: 'string', maxLength: GeneralMaxLength },
                  dob: { bsonType: 'date' },
                  otherPreferences: { bsonType: 'string', maxLength: 2000 },
                  timezone: { bsonType: 'string' }
                },
                additionalProperties: false
              },
              aiMemory: { bsonType: 'string', maxLength: 5000 },
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
      return null
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

      const insertUserResult = await _users.insertOne(userInfo)
      insertedUserId = insertUserResult.insertedId

      // TODO: Consider some welcome messages.
    }, transactionOptions)

    return insertedUserId
  }
}

async function generateFirstMessages(locale: LangCode, conversationId: ObjectId, authorId: ObjectId = LavaUserId, authorName: string = LavaUserName): Promise<Message[]> {
  const i18nMessages = await I18nDao.getByCode(I18nDbCodeFirstMessages, locale)

  const orderToFormatArgs = {
    1: [getGreetingTime(locale)]
  }

  return new MessageGroupBuilder(i18nMessages, orderToFormatArgs).build(conversationId, authorId, authorName)
}
