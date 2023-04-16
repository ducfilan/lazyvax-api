import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { SupportingLanguages, UsersCollectionName } from '@common/consts'
import { User } from '@/models/User'

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
                  age: { bsonType: 'int' },
                  gender: { bsonType: 'string', 'enum': ['male', 'female', 'other'] },
                  workerType: { bsonType: 'string', 'enum': ['individual', 'manager', 'both'] },
                  occupation: { bsonType: 'string' },
                  lifeGoals: { bsonType: 'array', items: { bsonType: 'string' } }
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
                    unreadCount: { bsonType: 'int' },
                    participants: {
                      bsonType: 'array',
                      items: {
                        bsonType: 'object',
                        properties: {
                          _id: { bsonType: 'objectId' },
                          userId: { bsonType: 'objectId' },
                          name: { bsonType: 'string' },
                          pictureUrl: { bsonType: 'string' }
                        },
                        required: ['_id', 'userId', 'name', 'pictureUrl'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['_id', 'type', 'title', 'unreadCount', 'participants'],
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

    const insertResult = await _users.insertOne(userInfo)
    return insertResult.insertedId
  }
}
