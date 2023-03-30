import CategoriesDao from '@dao/categories.dao'

export default {
  getCategories: async (lang: string, isTopCategory: boolean) => {
    const categories = await CategoriesDao.getCategories(lang, isTopCategory)

    return categories
  }
}
