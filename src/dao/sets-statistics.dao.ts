import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { SetsStatisticsCollectionName } from '@common/consts'

let _setsStatistics: Collection
let _db: Db

export default class SetsStatisticsDao {
  static async injectDB(conn: MongoClient) {
    if (_setsStatistics) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _setsStatistics = _db.collection(SetsStatisticsCollectionName)
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in SetsStatisticsDao: ${e}`,
      )
    }
  }

  static async getUserSetsStatistics(userId) {
    try {
      const result = await _setsStatistics
        .findOne({
          _id: userId,
        })

      if (!result) {
        return {
          learntItemsCount: 0,
          subscribedSetsCount: 0,
          totalItemsCount: 0,
          _id: ''
        }
      }

      return result
    } catch (e) {
      console.error(`Unable to issue find command, ${e}`)
      return false
    }
  }
}
