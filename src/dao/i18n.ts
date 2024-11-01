import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { DefaultLangCode, I18nCollectionName, SupportingUiLanguages } from '@/common/consts/constants'
import { LangCode } from '@/common/types/types'
import { I18n } from '@/entities/I18n'
import logger from '@/common/logger'

let _i18n: Collection<I18n>
let _db: Db

export default class I18nDao {
  static injectDB(conn: MongoClient) {
    if (_i18n) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _i18n = _db.collection(I18nCollectionName)

      _db.command({
        collMod: I18nCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: [
              'code',
              'type',
              'order',
              'locale',
              'content'
            ],
            properties: {
              _id: {
                bsonType: 'objectId'
              },
              code: {
                bsonType: 'string'
              },
              type: {
                bsonType: 'string'
              },
              messageType: {
                bsonType: 'int'
              },
              needFormat: {
                bsonType: 'bool'
              },
              order: {
                bsonType: 'int'
              },
              locale: {
                bsonType: 'string'
              },
              content: {
                bsonType: 'string'
              }
            }
          }
        }
      })
    } catch (e) {
      logger.error(
        `Unable to establish a collection handle in messagesDao: ${e}`,
      )
    }
  }

  static async getByCode(code: string, locale: LangCode): Promise<I18n[]> {
    if (!SupportingUiLanguages.includes(locale)) {
      locale = DefaultLangCode
    }

    return _i18n.find({
      code,
      locale
    }).toArray()
  }
}
