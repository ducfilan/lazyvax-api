import CategoryServices from '@services/api/categories.services'

export default class CategoriesController {
  static async apiGetCategories(req: { query: { lang: string; isTopCategory: boolean } }, res, next) {
    try {
      const { lang, isTopCategory } = req.query

      const categories = await CategoryServices.getCategories(lang, isTopCategory)
      return res.json(categories)
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
