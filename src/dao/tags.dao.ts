import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import Consts, { TagsCollectionName } from '@common/consts'

let _tags: Collection
let _db: Db

export default class TagsDao {
  static async injectDB(conn: MongoClient) {
    if (_tags) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _tags = _db.collection(TagsCollectionName)
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in TagsDao: ${e}`,
      )
    }
  }

  static async findOne(tag) {
    return _tags.findOne({ tag })
  }

  static async getTagsStartWith(startWith: string) {
    try {
      return (
        await _tags
          .find(
            { 'tag': { $regex: `^${startWith}`, $options: 'i' } },
            { limit: Consts.tagsSelectLimit }
          )
          .sort({ tag: 1 })
          .toArray()
      )
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return {}
    }
  }

  static async createTag(tag) {
    try {
      return (await _tags.insertOne({ tag })).insertedId
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return {}
    }
  }
}
