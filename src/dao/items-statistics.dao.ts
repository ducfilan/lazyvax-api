import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { ItemsStatisticsCollectionName } from '@common/consts'

let _itemsStatistics: Collection<any>
let _db: Db

export default class ItemsStatisticsDao {
  static async injectDB(conn: MongoClient) {
    if (_itemsStatistics) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _itemsStatistics = _db.collection(ItemsStatisticsCollectionName)
      _itemsStatistics.createIndex({ userId: -1, date: -1 }, { name: 'userId_-1_date_-1' })
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in ItemsStatisticsDao: ${e}`,
      )
    }
  }

  static async getUserStatistics(userId: ObjectId, beginDate: Date, endDate: Date) {
    try {
      return await _itemsStatistics
        .find({
          userId,
          date: {
            $gte: beginDate,
            $lte: endDate
          }
        })
        .sort({ date: 1 })
        .toArray()
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return false
    }
  }
}
