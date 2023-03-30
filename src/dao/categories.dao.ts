import { Collection, Db, MongoClient } from 'mongodb'
import { DatabaseName } from '@common/configs/mongodb-client.config'
import { CategoriesCollectionName } from '@common/consts'

let _categories: Collection
let _db: Db

export default class CategoriesDao {
  static async injectDB(conn: MongoClient) {
    if (_categories) {
      return
    }

    try {
      _db = conn.db(DatabaseName)
      _categories = _db.collection(CategoriesCollectionName)
    } catch (e) {
      console.error(
        `Unable to establish a collection handle in CategoriesDao: ${e}`,
      )
    }
  }

  /**
   * 
   * @param {string} lang - Target language for displaying in UI
   * @param {boolean} isTopCategory - If true, get only top categories
   * @returns {Array} - Returns the list of categories and subs
   */
  static async getCategories(lang: string, isTopCategory: boolean = false) {
    let projectRules = {
      [`name.${lang}`]: 1,
      [`description.${lang}`]: 1,
      'path': 1,
      isTopCategory: 1
    }

    const findCondition = isTopCategory ? { isTopCategory } : {}

    try {
      return await _categories
        .find(findCondition)
        .project(projectRules)
        .toArray()
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return []
    }
  }

  static async getSubCategoriesIds(categoryId) {
    try {
      const categories = await _categories
        .find({
          path: { $regex: `,${categoryId},` }
        })
        .project({
          _id: 1
        })
        .toArray()

      if (!categories || !categories.length) {
        return []
      }

      return categories.map(category => category._id)
    } catch (e) {
      console.log(arguments)
      console.error(`Error, ${e}, ${e.stack}`)
      return []
    }
  }
}
