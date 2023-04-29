import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { DefaultLangCode, I18nCollectionName, SupportingUiLanguages } from '@common/consts'
import { LangCode } from '@/common/types'
import { I18n } from '@/models/I18n'

let _predefinedMessages: Collection<I18n>
let _db: Db

export default class I18nDao {
  static injectDB(conn: MongoClient) {
    if (_predefinedMessages) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _predefinedMessages = _db.collection(I18nCollectionName)

      _db.command({
        collMod: I18nCollectionName,
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: [
              'code',
              'type',
              'messageType',
              'needFormat',
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
      console.error(
        `Unable to establish a collection handle in messagesDao: ${e}`,
      )
    }
  }

  static async getByCode(code: string, locale: LangCode): Promise<I18n[]> {
    if (!SupportingUiLanguages.includes(locale)) {
      locale = DefaultLangCode
    }

    return _predefinedMessages.find({
      code,
      locale
    }).toArray()
  }
}
