import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { MissionsCollectionName } from '@common/consts'

let _missions: Collection
let _db: Db

export default class MissionsDao {
  static async injectDB(conn: MongoClient) {
    if (_missions) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _missions = _db.collection(MissionsCollectionName)
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in MissionsDao: ${e}`,
      )
    }
  }

  static async getMissions(ids) {
    try {
      return await _missions
        .find({
            missionId: {
                $in: ids
            }
        })
        .toArray()
    } catch (e) {
      console.error(`Unable to issue find command, ${e}`)
      return false
    }
  }
}
