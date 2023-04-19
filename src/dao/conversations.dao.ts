import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { ConversationsCollectionName } from '@common/consts'
import { Conversation } from '@/models/Conversation'

let _conversations: Collection
let _db: Db

export default class ConversationsDao {
  static injectDB(conn: MongoClient) {
    if (_conversations) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _conversations = _db.collection(ConversationsCollectionName)

      _conversations.createIndex({ title: 1 }, { unique: false, sparse: true })

      _db.command({
        collMod: ConversationsCollectionName,
        validator: {
          $jsonSchema: {
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
                    name: { bsonType: 'string' },
                    pictureUrl: { bsonType: 'string' }
                  },
                  required: ['_id', 'name', 'pictureUrl'],
                  additionalProperties: false
                }
              }
            },
            required: ['type', 'title', 'unreadCount'],
            additionalProperties: false
          }
        }
      })
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in conversationsDao: ${e}`,
      )
    }
  }

  static async insertOne(conversation: Conversation) {
    return _conversations.insertOne(conversation)
  }
}
