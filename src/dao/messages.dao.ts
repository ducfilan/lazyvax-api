import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { MaxInt, MessagesCollectionName } from '@common/consts'
import { Message } from '@/models/Message'
import logger from '@/common/logger'

let _messages: Collection<Message>
let _db: Db

export default class MessagesDao {
  static injectDB(conn: MongoClient) {
    if (_messages) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _messages = _db.collection(MessagesCollectionName)

      _messages.createIndex({ conversationId: 1 }, { unique: false, sparse: true })
      _messages.createIndex({ authorId: 1 }, { unique: false, sparse: true })

      _db.command({
        collMod: MessagesCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: [
              'conversationId',
              'type',
              'authorId',
              'authorName',
              'content',
              'timestamp'
            ],
            properties: {
              _id: {
                bsonType: 'objectId'
              },
              conversationId: {
                bsonType: 'objectId'
              },
              type: {
                bsonType: 'int'
              },
              authorId: {
                bsonType: 'objectId'
              },
              authorName: {
                bsonType: 'string'
              },
              content: {
                bsonType: 'string'
              },
              parentContent: {
                bsonType: 'string'
              },
              parentId: {
                bsonType: 'objectId'
              },
              isResponded: {
                bsonType: 'bool'
              },
              timestamp: {
                bsonType: 'date'
              }
            }
          }
        }
      })
    } catch (e) {
      logger.error(
        `Unable to establish a collection handle in messagesDao: ${e}`,
      )
    }
  }

  static async insertOne(message: Message) {
    return (await _messages.insertOne(message)).insertedId
  }

  static async insertMany(messages: Message[]) {
    return _messages.insertMany(messages, {})
  }

  static async updateOne(findCondition, updateOperations, filterOption = {}) {
    try {
      if (!findCondition._id) throw new Error('No _id in findCondition')

      await _messages.updateOne(findCondition, updateOperations, filterOption)
      return true
    } catch (e) {
      logger.error(arguments)
      logger.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async getMessages(conversationId: ObjectId, skip: number = 0, limit: number = MaxInt) {
    return _messages.find({
      conversationId
    }, {
      skip, limit
    }).toArray()
  }
}
