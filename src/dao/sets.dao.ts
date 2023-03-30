import { DatabaseName } from '@common/configs/mongodb-client.config'
import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import {
  SetsCollectionName,
  UsersCollectionName,
  InteractionsCollectionName,
  SupportingSetTypes,
  SupportingLanguages,
  StaticBaseUrl,
  SetInteractions,
  InteractionSubscribe,
  InteractionDislike,
  MaxInt,
  ItemsInteractions
} from '@common/consts'

let _sets: Collection
let _db: Db

export default class SetsDao {
  static async injectDB(conn: MongoClient) {
    if (_sets) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _sets = _db.collection(SetsCollectionName)

      _db.command({
        collMod: SetsCollectionName,
        validator: {
          $jsonSchema: {
            required: ['_id', 'name', 'categoryId', 'fromLanguage', 'toLanguage', 'items', 'lastUpdated', 'delFlag'],
            type: 'object',
            properties: {
              _id: {
                bsonType: 'objectId'
              },
              imgUrl: {
                type: 'string',
                pattern: `^${StaticBaseUrl}/[A-z0-9_]+?.(png|jpg|jpeg|PNG|JPG|JPEG)$`
              },
              name: {
                maxLength: 100,
                minLength: 1,
                type: 'string'
              },
              creatorId: {
                bsonType: 'objectId',
              },
              categoryId: {
                bsonType: 'objectId'
              },
              description: {
                maxLength: 500,
                type: 'string'
              },
              tags: {
                maxItems: 20,
                type: 'array',
                items: {
                  uniqueItems: true,
                  type: 'string'
                }
              },
              interactionCount: {
                type: 'object',
                properties: {
                  ...SetInteractions.reduce((previousValue, interaction) => ({
                    ...previousValue, [interaction]: ({
                      bsonType: 'int'
                    })
                  }), {})
                },
                additionalProperties: false
              },
              totalItemsCount: {
                bsonType: 'int'
              },
              fromLanguage: {
                enum: SupportingLanguages,
                type: 'string'
              },
              toLanguage: {
                enum: ['', ...SupportingLanguages],
                type: 'string'
              },
              items: {
                minItems: 2,
                type: 'array',
                items: {
                  type: 'object',
                  oneOf: [{
                    required: ['_id', 'type', 'term', 'definition'],
                    type: 'object',
                    properties: {
                      _id: {
                        bsonType: 'objectId'
                      },
                      type: {
                        enum: SupportingSetTypes,
                        type: 'string'
                      },
                      term: {
                        minLength: 1,
                        type: 'string'
                      },
                      definition: {
                        minLength: 1,
                        type: 'string'
                      },
                      interactionCount: {
                        type: 'object',
                        properties: {
                          ...ItemsInteractions.reduce((previousValue, interaction) => ({
                            ...previousValue, [interaction]: ({
                              bsonType: 'int'
                            })
                          }), {})
                        },
                        additionalProperties: false
                      },
                    },
                  }, {
                    required: ['_id', 'type', 'answers', 'question'],
                    type: 'object',
                    properties: {
                      _id: {
                        bsonType: 'objectId'
                      },
                      type: {
                        enum: SupportingSetTypes,
                        type: 'string'
                      },
                      answers: {
                        minItems: 2,
                        type: 'array',
                        items: {
                          required: [
                            'answer'
                          ],
                          type: 'object',
                          properties: {
                            isCorrect: {
                              type: 'boolean'
                            },
                            answer: {
                              type: 'string'
                            }
                          },
                        }
                      },
                      question: {
                        minLength: 1,
                        type: 'string'
                      },
                      moreInfo: {
                        minLength: 1,
                        type: 'string'
                      },
                      interactionCount: {
                        type: 'object',
                        properties: {
                          ...ItemsInteractions.reduce((previousValue, interaction) => ({
                            ...previousValue, [interaction]: ({
                              bsonType: 'int'
                            })
                          }), {})
                        },
                        additionalProperties: false
                      },
                    },
                  }, {
                    required: ['_id', 'type', 'content'],
                    type: 'object',
                    properties: {
                      _id: {
                        bsonType: 'objectId'
                      },
                      type: {
                        enum: SupportingSetTypes,
                        type: 'string'
                      },
                      content: {
                        minLength: 1,
                        type: 'string'
                      },
                      interactionCount: {
                        type: 'object',
                        properties: {
                          ...ItemsInteractions.reduce((previousValue, interaction) => ({
                            ...previousValue, [interaction]: ({
                              bsonType: 'int'
                            })
                          }), {})
                        },
                        additionalProperties: false
                      },
                    },
                  }]
                }
              },
              lastUpdated: {
                bsonType: 'date'
              },
              delFlag: {
                type: 'boolean'
              }
            },
            additionalProperties: false,
          }
        }
      })

      _sets.createIndex({ creatorId: 1 })
      _sets.createIndex({ categoryId: 1 })
      _sets.createIndex({ 'items._id': 1 })
    } catch (e) {
      console.error(`Unable to establish a collection handle in setsDao: ${e}`)
    }
  }

  static async findOneById(_id: ObjectId, itemsSkip: number = 0, itemsLimit: number = MaxInt) {
    try {
      let set = await _sets
        .aggregate([
          {
            $match: {
              _id,
              delFlag: false,
            },
          },
          {
            $lookup: {
              from: UsersCollectionName,
              localField: 'creatorId',
              foreignField: '_id',
              as: 'creator',
            },
          },
          {
            $unwind: '$creator',
          },
          {
            $project: {
              name: 1,
              categoryId: 1,
              description: 1,
              tags: 1,
              fromLanguage: 1,
              toLanguage: 1,
              creatorId: 1,
              creatorName: '$creator.name',
              imgUrl: 1,
              lastUpdated: 1,
              items: { $slice: ['$items', itemsSkip, itemsLimit] },
              totalItemsCount: { $size: '$items' },
              interactionCount: 1,
            },
          },
        ])
        .limit(1)
        .toArray()

      if (!set || set.length === 0) return {}

      return set[0]
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async find(matchCondition: {}, skip, limit) {
    try {
      let sets = await _sets
        .aggregate([
          {
            $match: {
              ...matchCondition,
              delFlag: false,
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
              from: UsersCollectionName,
              localField: 'creatorId',
              foreignField: '_id',
              as: 'creator',
            },
          },
          {
            $unwind: '$creator'
          },
          {
            $project: {
              creatorName: '$creator.name',
              name: 1,
              categoryId: 1,
              description: 1,
              tags: 1,
              fromLanguage: 1,
              toLanguage: 1,
              creatorId: 1,
              imgUrl: 1,
              lastUpdated: 1,
              interactionCount: 1
            }
          }])
        .toArray()

      if (!sets || sets.length === 0) {
        return {
          total: 0,
          sets: []
        }
      }

      let total: number = await _sets.countDocuments({
        ...matchCondition,
        delFlag: false,
      }) || 0

      return { total, sets }
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return { total: 0, sets: [] }
    }
  }

  static async createSet(set) {
    try {
      const insertResult = await _sets.insertOne(set)

      return insertResult.insertedId
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async replaceSet(set) {
    try {
      const _id = set._id
      delete set._id

      await _sets.findOneAndReplace({ _id }, set)

      return true
    } catch (e) {
      console.log(JSON.stringify(arguments[0]))
      console.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }

  static async getSet(_id: ObjectId, itemsSkip: number = 0, itemsLimit: number = MaxInt) {
    try {
      return await this.findOneById(_id, itemsSkip, itemsLimit)
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return null
    }
  }

  static async searchSet(searchConditions) {
    try {
      const { keyword, skip, limit, languages } = searchConditions

      const languagesConditions = this.toLanguagesConditions(languages)

      const sets = await _sets
        .aggregate([
          {
            $search: {
              index: 'setSearchIndex',
              compound: {
                must: languagesConditions,
                should: [{
                  text: {
                    query: keyword,
                    path: 'name',
                    fuzzy: {},
                    score: { boost: { 'value': 2 } }
                  }
                }, {
                  text: {
                    query: keyword,
                    path: 'description',
                    fuzzy: {}
                  }
                }, {
                  text: {
                    query: keyword,
                    path: 'tags',
                    fuzzy: {}
                  }
                }],
                minimumShouldMatch: 1
              },
              count: {
                type: 'total'
              }
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
              from: 'users',
              localField: 'creatorId',
              foreignField: '_id',
              as: 'creator',
            },
          },
          {
            $unwind: '$creator',
          },
          {
            $project: {
              total: '$$SEARCH_META.count.total',
              name: 1,
              description: 1,
              creatorName: '$creator.name',
              creatorImageUrl: '$creator.pictureUrl',
              fromLanguage: 1,
              toLanguage: 1,
              tags: 1,
              imgUrl: 1,
              lastUpdated: 1,
            },
          },
          {
            $facet: {
              sets: []
            }
          },
          {
            $project: {
              total: { $first: '$sets.total' },
              sets: 1
            }
          },
          {
            $project: {
              'sets.total': 0
            }
          }
        ])
        .toArray()

      if (!sets || sets.length === 0) {
        return {}
      }

      return sets[0]
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return []
    }
  }

  static toLanguagesConditions(languages: string[]): any[] {
    return (languages && languages.length > 0) ? [
      {
        compound: {
          should: [
            ...languages.map(lang => ({
              text: {
                query: lang,
                path: 'fromLanguage'
              }
            })),
            ...languages.map(lang => ({
              text: {
                query: lang,
                path: 'toLanguage'
              }
            }))
          ],
          minimumShouldMatch: 1
        }
      }
    ] : []
  }

  /**
   * 
   * @param {Array(ObjectId)} categoryIds - category Ids
   * @param {int} skip - number of items to skip
   * @param {int} limit - number of items to limit
   * @returns {Promise(Array)} - Returns the list of sets in the category
   */
  static async getSetsInCategory(categoryIds, skip, limit) {
    try {
      const sets = await _sets
        .aggregate([
          {
            $match: {
              categoryId: { $in: categoryIds },
              delFlag: false
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
              from: 'users',
              localField: 'creatorId',
              foreignField: '_id',
              as: 'creator',
            },
          },
          {
            $unwind: '$creator',
          },
          {
            $project: {
              name: 1,
              description: 1,
              creatorName: '$creator.name',
              creatorImageUrl: '$creator.pictureUrl',
              fromLanguage: 1,
              toLanguage: 1,
              tags: 1,
              imgUrl: 1,
              lastUpdated: 1,
            },
          },
        ])
        .toArray()

      if (!sets || sets.length === 0) {
        return {}
      }

      let total = await _sets.countDocuments({
        categoryId: { $in: categoryIds },
        delFlag: false
      }) || 0

      return { total, sets }
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return {}
    }
  }

  static async interactSet(action, setId, increment = 1) {
    try {
      return await _sets
        .updateOne(
          {
            _id: new ObjectId(setId)
          },
          {
            $inc: {
              [`interactionCount.${action}`]: increment
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
      return false
    }
  }

  static async suggestSets(searchConditions) {
    try {
      const { userId, keyword, skip, limit, languages } = searchConditions

      const languagesConditions = this.toLanguagesConditions(languages)
      const maxItemsToSearchRelevantSets = 20
      const resultLimit = Math.max(limit, maxItemsToSearchRelevantSets)

      const sets = await _sets
        .aggregate([
          {
            $search: {
              index: 'setSearchIndex',
              compound: {
                must: languagesConditions,
                should: [{
                  text: {
                    query: keyword,
                    path: 'name',
                    fuzzy: {},
                    score: { boost: { 'value': 2 } }
                  }
                }, {
                  text: {
                    query: keyword,
                    path: 'description',
                    fuzzy: {}
                  }
                }, {
                  text: {
                    query: keyword,
                    path: 'tags',
                    fuzzy: {}
                  }
                }],
                minimumShouldMatch: 1
              },
              count: {
                type: 'total'
              }
            },
          }, {
            $lookup: {
              from: InteractionsCollectionName,
              localField: '_id',
              foreignField: 'setId',
              pipeline: [
                {
                  $match: {
                    '$expr': {
                      '$and': [
                        {
                          '$eq': [
                            '$userId', userId
                          ]
                        }, {
                          '$not': {
                            '$in': [
                              '$actions', [
                                InteractionSubscribe, InteractionDislike
                              ]
                            ]
                          }
                        }
                      ]
                    }
                  }
                }
              ],
              'as': 'ignored_sets'
            }
          }, {
            $match: {
              'ignored_sets': {
                '$eq': []
              }
            }
          },
          {
            $limit: resultLimit
          },
          {
            $sample: { size: 1 }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          }, {
            $project: {
              'ignored_sets': 0
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'creatorId',
              foreignField: '_id',
              as: 'creator',
            },
          },
          {
            $unwind: '$creator',
          },
          {
            $project: {
              total: '$$SEARCH_META.count.total',
              name: 1,
              description: 1,
              creatorName: '$creator.name',
              creatorImageUrl: '$creator.pictureUrl',
              fromLanguage: 1,
              toLanguage: 1,
              tags: 1,
              imgUrl: 1,
              lastUpdated: 1,
            },
          },
          {
            $facet: {
              sets: []
            }
          },
          {
            $project: {
              total: { $first: '$sets.total' },
              sets: 1
            }
          },
          {
            $project: {
              'sets.total': 0
            }
          }
        ])
        .toArray()

      if (!sets || sets.length === 0) {
        return []
      }

      return sets[0]
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return []
    }
  }
}