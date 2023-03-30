import setsServices from '@services/api/sets.services'
import { apiSearchSetValidator, apiGetSetsInCategoriesValidator, apiGetSetValidator } from '@validators/sets.validator'
import { delCache } from '@common/redis'
import { InteractionSubscribe, SupportingLanguages } from '@common/consts'

export default class SetsController {
  static async apiCreateSet(req, res) {
    try {
      let setInfo = req.body
      setInfo.creatorId = req.user._id

      const registeredSetId = await setsServices.createSet(setInfo)
      if (!registeredSetId) throw new Error('cannot insert set')

      await setsServices.interactSet(InteractionSubscribe, req.user._id, registeredSetId)

      res.status(200).send(registeredSetId)
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiEditSet(req, res) {
    try {
      let setInfo = req.body
      setInfo.creatorId = req.user._id

      const success = await setsServices.editSet(setInfo)
      if (!success) throw new Error('cannot update set')

      res.sendStatus(200)
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiGetSet(req, res) {
    try {
      const { itemsSkip, itemsLimit } = req.query
      const { skip, limit } = apiGetSetValidator({ skip: itemsSkip, limit: itemsLimit })
      const set = await setsServices.getSet(req.user?._id, req.params.setId, skip, limit)

      return res.json(set)
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiSearchSet(req, res) {
    try {
      const searchConditions = apiSearchSetValidator(req.query, req.user?.langCodes || SupportingLanguages)
      if (!searchConditions) res.sendStatus(400)

      return res.json(await setsServices.searchSet(req.user?._id, searchConditions))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiGetTopSets(req, res) {
    try {
      return res.json(await setsServices.getTopSets(req.user?._id, req.query.lang))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }

  static async apiGetSetsInCategories(req, res) {
    try {
      const { categoryId } = req.params
      const { skip, limit } = apiGetSetsInCategoriesValidator(req.query)

      return res.json(await setsServices.getSetsInCategory(categoryId, skip, limit))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e.message })
    }
  }

  static async apiGetTopSetsInCategories(req, res) {
    try {
      const { categoryId } = req.params
      const { lang } = req.query

      return res.json(await setsServices.getTopSetsInCategory(req.user?._id, lang, categoryId))
    } catch (e) {
      console.log(`api, ${e}`)
      res.status(500).json({ error: e })
    }
  }
}
