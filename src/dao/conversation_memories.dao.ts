import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { ConversationTypeWeek } from '@/common/consts/shared'
import logger from '@/common/logger'
import { ConversationMemoriesCollectionName } from '@/common/consts/constants'
import { ConversationMemory } from '@/entities/ConversationMemory'

let _conversationMemories: Collection<ConversationMemory>
let _db: Db

export default class ConversationMemoryDao {
  static injectDB(conn: MongoClient) {
    if (_conversationMemories) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _conversationMemories = _db.collection(ConversationMemoriesCollectionName)

      _db.command({
        collMod: ConversationMemoriesCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            properties: {
              _id: { bsonType: 'objectId' },
              conversationId: { bsonType: 'objectId' },
              meta: {
                bsonType: 'object',
                properties: {
                  type: { enum: [ConversationTypeWeek] },
                  weekAiMemory: { bsonType: 'string', maxLength: 5000 },
                  dayAiMemory: {
                    bsonType: 'array',
                    items: {
                      bsonType: 'string',
                      maxLength: 1000
                    },
                    maxItems: 7,
                    minItems: 7
                  }
                },
                required: ['type', 'weekAiMemory', 'dayAiMemory'],
                additionalProperties: false
              }
            },
            required: ['conversationId', 'meta'],
            additionalProperties: false
          }
        }
      })

      _conversationMemories.createIndex({ conversationId: 1 }, { unique: true })
    } catch (e) {
      logger.error(
        `Unable to establish a collection handle in conversationMemoryDao: ${e}`,
      )
    }
  }

  static async insertOne(memory: any) {
    return (await _conversationMemories.insertOne(memory)).insertedId
  }

  static async findByConversationId(conversationId: ObjectId) {
    return await _conversationMemories.findOne({ conversationId })
  }

  static async updateOne(findCondition: any, updateOperations: any) {
    try {
      await _conversationMemories.updateOne(findCondition, updateOperations)
      return true
    } catch (e) {
      logger.error(arguments)
      logger.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async updateByConversationId(conversationId: ObjectId, updateOperations: any) {
    return this.updateOne({ conversationId }, updateOperations)
  }
}
