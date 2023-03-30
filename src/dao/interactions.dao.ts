import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { SetsCollectionName, InteractionsCollectionName, SetInteractions, MaxInt } from '@common/consts'

let _interactions: Collection
let _db: Db

export default class InteractionsDao {
  static async injectDB(conn: MongoClient) {
    if (_interactions) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _interactions = _db.collection(InteractionsCollectionName)

      _db.command({
        collMod: InteractionsCollectionName,
        validator: {
          $jsonSchema: {
            required: ['_id', 'setId', 'userId', 'actions', 'lastUpdated'],
            type: 'object',
            properties: {
              _id: {
                bsonType: 'objectId'
              },
              setId: {
                bsonType: 'objectId'
              },
              userId: {
                bsonType: 'objectId'
              },
              actions: {
                type: 'array',
                items: {
                  enum: SetInteractions,
                  type: 'string',
                }
              },
              lastUpdated: {
                bsonType: 'date'
              },
              testResults: {
                type: 'array',
                items: {
                  required: ['score', 'total', 'takenDateTime'],
                  type: 'object',
                  properties: {
                    score: {
                      bsonType: 'int'
                    },
                    total: {
                      bsonType: 'int'
                    },
                    takenDateTime: {
                      bsonType: 'date'
                    }
                  }
                }
              },

            },
            additionalProperties: false,
          }
        }
      })

      _interactions.createIndex({ userId: 1, setId: 1 }, { name: 'userId_1_setId_1' })
      _interactions.createIndex({ actions: 1 }, { name: 'actions_1' })
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in InteractionsDao: ${e}`,
      )
    }
  }

  static async interactSet(action, userId, setId) {
    try {
      await _interactions
        .updateOne(
          {
            userId: new ObjectId(userId),
            setId: new ObjectId(setId)
          },
          {
            $addToSet: {
              actions: action
            },
            $set: { lastUpdated: new Date() }
          },
          {
            upsert: true
          }
        )
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
    }
  }

  static async undoInteractSet(action, userId, setId) {
    try {
      await _interactions
        .updateOne(
          {
            userId: new ObjectId(userId),
            setId: new ObjectId(setId)
          },
          {
            $pull: {
              actions: action
            },
            $set: { lastUpdated: new Date() }
          }
        )
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
    }
  }

  static async uploadTestResult(userId, setId, result) {
    try {
      await _interactions
        .updateOne(
          {
            userId: new ObjectId(userId),
            setId: new ObjectId(setId)
          },
          {
            $addToSet: {
              testResults: {
                ...result,
                takenDateTime: new Date()
              }
            },
            $set: { lastUpdated: new Date() }
          }
        )
    } catch (e) {
      console.error(`Unable to issue find command, ${e}`)
    }
  }

  static async filterSetIds(userId: ObjectId, setIds: ObjectId[]) {
    try {
      return await _interactions
        .find({
          userId,
          setId: { $in: setIds }
        })
        .project({
          _id: 0,
          setId: 1,
          actions: 1,
        })
        .toArray()
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return []
    }
  }

  static async filterSetId(userId: ObjectId, setId: ObjectId): Promise<any> {
    try {
      return (await _interactions
        .findOne({
          userId,
          setId
        }, {
          projection: {
            _id: 0,
            setId: 1,
            actions: 1,
          }
        })) || {}
    } catch (e) {
      console.error(`Error in filterSetId, ${e}`)
      return {}
    }
  }

  static async getUserInteractedSets(userId: ObjectId, interaction: string, skip: number, limit: number) {
    try {
      const sets = await _interactions
        .aggregate([
          {
            $match: {
              userId,
              actions: { $elemMatch: { $eq: interaction } },
            },
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          },
          {
            $lookup: {
              from: SetsCollectionName,
              localField: 'setId',
              foreignField: '_id',
              as: 'set',
            },
          },
          {
            $unwind: '$set'
          },
          {
            $project: {
              'actions': 1,
              'set': 1
            }
          },
          {
            $project: {
              'set.items': 0,
              'set.delFlag': 0
            }
          }])
        .toArray()

      if (!sets || sets.length === 0) {
        return {}
      }

      let total: number = await _interactions.countDocuments({
        userId,
        actions: { $elemMatch: { $eq: interaction } },
      })

      return { total, sets }
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return { total: 0, sets: [] }
    }
  }

  static async getUserRandomSet(userId: ObjectId, interactions: string[], itemsSkip: number = 0, itemsLimit: number = MaxInt) {
    try {
      const sets = await _interactions
        .aggregate([
          {
            $match: {
              userId,
              actions: { $in: interactions },
            },
          },
          {
            $sample: { size: 1 }
          },
          {
            $lookup: {
              from: SetsCollectionName,
              localField: 'setId',
              foreignField: '_id',
              as: 'set',
            },
          },
          {
            $unwind: '$set'
          },
          {
            $addFields: {
              'set.totalItemsCount': { $size: '$set.items' },
              'set.items': { $slice: ['$set.items', itemsSkip, itemsLimit] }
            }
          },
        ])
        .project({
          _id: 0,
          setId: 0,
          userId: 0,
          lastUpdated: 0,
          'set.delFlag': 0,
        })
        .toArray()

      if (!sets || sets.length === 0) return {}

      return sets[0]
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return {}
    }
  }
}
