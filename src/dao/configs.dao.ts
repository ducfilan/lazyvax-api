import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { ConfigsCollectionName } from '@common/consts'
import logger from '@/common/logger'

let _configs: Collection
let _db: Db

export default class ConfigsDao {
  static injectDB(conn: MongoClient) {
    if (_configs) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _configs = _db.collection(ConfigsCollectionName)
    } catch (e) {
      logger.error(
        `Unable to establish a collection handle in ConfigsDao: ${e}`,
      )
    }
  }

  static async getAllowedOrigins(): Promise<string[]> {
    let projection = {
      _id: 0,
      origins: 1
    }

    try {
      const config = await _configs
        .findOne({
          type: 'allowed_origins'
        }, {
          projection
        })

      const origins = config?.origins || []

      return origins
    } catch (e) {
      logger.error(arguments)
      logger.error(`Error, ${e}, ${e.stack}`)
      return []
    }
  }
}
