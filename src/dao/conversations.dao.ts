import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { CacheKeyConversation, ConversationsCollectionName } from '@common/consts'
import { Conversation } from '@/models/Conversation'
import { delCache, getConversationCache, setCache } from '@/common/redis'

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
              smartQuestions: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: [
                    'content',
                    'answerType',
                  ],
                  'properties': {
                    content: {
                      bsonType: 'string'
                    },
                    answerType: {
                      bsonType: 'string'
                    },
                    answer: {
                      bsonType: 'string'
                    },
                    answerUserId: {
                      bsonType: 'objectId'
                    },
                    selection: {
                      bsonType: 'object',
                      'required': [
                        'type',
                        'options'
                      ],
                      'properties': {
                        type: {
                          bsonType: 'string'
                        },
                        options: {
                          bsonType: 'array',
                          items: {
                            bsonType: 'string'
                          }
                        }
                      }
                    },
                    unit: {
                      bsonType: 'string'
                    }
                  }
                }
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
    return (await _conversations.insertOne(conversation)).insertedId
  }

  static async findById(id: ObjectId, projection: any = {}) {
    let conversation = await getConversationCache(CacheKeyConversation(id.toHexString()))

    if (!conversation) {
      conversation = await _conversations.findOne({ _id: id })
      conversation && setCache(CacheKeyConversation(id.toHexString()), conversation)
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

  static async findByOne(condition) {
    return _conversations.findOne(condition)
  }

  static async updateOne(findCondition, updateOperations) {
    try {
      await delCache(CacheKeyConversation(findCondition._id.toHexString()))

      await _conversations.findOneAndUpdate(findCondition, updateOperations)
      return true
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async updateOneById(_id: ObjectId, updateOperations) {
    return this.updateOne({ _id }, updateOperations)
  }
}
