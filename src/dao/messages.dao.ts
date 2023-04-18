import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { MaxInt, MessagesCollectionName } from '@common/consts'
import { Message } from '@/models/Message'

let _messages: Collection
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
              timestamp: {
                bsonType: 'date'
              }
            }
          }
        }
      })
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in messagesDao: ${e}`,
      )
    }
  }

  static async insertOne(message: Message) {
    return _messages.insertOne(message)
  }

  static async insertMany(messages: Message[]) {
    return _messages.insertMany(messages, {})
  }

  static async getMessages(conversationId: ObjectId, skip: number = 0, limit: number = MaxInt) {
    return _messages.find({
      conversationId
    }, {
      skip, limit
    }).toArray()
  }
}
