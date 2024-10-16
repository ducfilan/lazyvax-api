import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { CacheKeyConversation, ConversationsCollectionName, ConversationTypes, ConversationTypeWeek, MilestoneSources } from '@common/consts'
import { Conversation } from '@/entities/Conversation'
import { delCache, getConversationCache, setCache } from '@/common/redis'
import logger from '@/common/logger'

let _conversations: Collection<Conversation>
let _db: Db

export default class ConversationsDao {
  static injectDB(conn: MongoClient) {
    if (_conversations) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _conversations = _db.collection(ConversationsCollectionName)

      _conversations.createIndex({ type: 1 }, { unique: false, sparse: true })

      _db.command({
        collMod: ConversationsCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            properties: {
              _id: { bsonType: 'objectId' },
              type: { enum: ConversationTypes },
              unreadCount: { bsonType: 'int' },
              meta: {
                bsonType: 'object',
                oneOf: [
                  {
                    properties: {
                      type: { enum: ConversationTypes },
                      meta: {
                        properties: {
                          startDate: { "bsonType": "date" }
                        },
                        required: ["startDate"],
                        additionalProperties: false
                      },
                    },
                    additionalProperties: false
                  }
                ]
              },
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
            required: ['type', 'unreadCount'],
            additionalProperties: false
          }
        }
      })
    } catch (e) {
      logger.error(
        `Unable to establish a collection handle in conversationsDao: ${e}`,
      )
    }
  }

  static async insertOne(conversation: Conversation) {
    return (await _conversations.insertOne(conversation)).insertedId
  }

  static async findById(id: ObjectId, projection: any = {}) {
    let conversation = await getConversationCache(CacheKeyConversation(id.toHexString()))

    if (!conversation) {
      conversation = await _conversations.findOne({ _id: id })
      conversation && await setCache(CacheKeyConversation(id.toHexString()), conversation)
    }

    if (conversation) {
      for (const key in projection) {
        if (Object.prototype.hasOwnProperty.call(projection, key)) {
          const element = projection[key]
          if (element && element === 0) {
            delete conversation[key]
          }
        }
      }
    }

    return conversation
  }

  static async findByType(type: string, meta: any, projection: any = {}) {
    const findCondition = { type }
    switch (type) {
      case ConversationTypeWeek:
        findCondition["meta.meta.startDate"] = meta.startDate
        break

      default:
        break
    }

    const conversation = await _conversations.findOne(findCondition)

    if (conversation) {
      for (const key in projection) {
        if (Object.prototype.hasOwnProperty.call(projection, key)) {
          const element = projection[key]
          if (element && element === 0) {
            delete conversation[key]
          }
        }
      }
    }

    return conversation
  }

  static async updateOne(findCondition, updateOperations, filterOption = {}) {
    try {
      if (!findCondition._id) throw new Error('No _id in findCondition')

      await delCache(CacheKeyConversation(findCondition._id.toHexString()))
      await _conversations.updateOne(findCondition, updateOperations, filterOption)
      return true
    } catch (e) {
      logger.error(arguments)
      logger.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async updateById(_id: ObjectId, updateOperations) {
    return this.updateOne({ _id }, updateOperations)
  }
}
