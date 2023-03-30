import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { SupportingLanguages, UsersCollectionName } from '@common/consts'

let _users: Collection
let _db: Db
let defaultProjection = { projection: { password: 0 } }

export default class UsersDao {
  static async injectDB(conn: MongoClient) {
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
            required: ['name', 'email', 'locale', 'finishedRegisterStep', 'langCodes'],
            properties: {
              name: {
                bsonType: 'string',
              },
              email: {
                bsonType: 'string',
              },
              locale: {
                enum: SupportingLanguages
              },
              finishedRegisterStep: {
                bsonType: 'int',
              },
              langCodes: {
                bsonType: 'array',
                items: [
                  { enum: SupportingLanguages }
                ]
              }
            }
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

  static async registerUserIfNotFound(userInfo): Promise<ObjectId> {
    let user = await this.findByEmail(userInfo.email)

    if (!!user) {
      return user._id
    }

    return new Promise((resolve, reject) => {
      _users.insertOne(userInfo, null, (error, response) => {
        if (error) {
          reject(error)
        } else {
          const insertedUserId = response.insertedId
          resolve(insertedUserId)
        }
      })
    })
  }
}
